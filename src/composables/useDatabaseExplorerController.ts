import { computed, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'
import connections from '@/api/connections'
import type { FileSystemEntry } from '@/api/fileSystem'
import { getConnectionHost, getConnectionPort, getConnectionDatabase } from '@/utils/specBuilder'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import type { ShowDiagramPayload } from '@/types/diagram'
import type { PaneId, PaneTab, PaneState } from '@/stores/paneTabs'
import { useExplorerViewStateStore } from '@/stores/explorerViewState'
import type SearchInput from '@/components/common/SearchInput.vue'
import type { useExplorerState } from '@/composables/useExplorerState'
import type { useSidebar } from '@/composables/useSidebar'
import type { useRecentConnections } from '@/composables/useRecentConnections'
import type { useCommonStore } from '@/stores/common'
import type { useConnectionsStore } from '@/stores/connections'
import type { useSchemaStore } from '@/stores/schema'
import type { usePaneTabsStore } from '@/stores/paneTabs'
import type { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import type { useFileExplorerStore } from '@/stores/fileExplorer'

type ExplorerState = ReturnType<typeof useExplorerState>
type SidebarManager = ReturnType<typeof useSidebar>
type RecentConnectionsManager = ReturnType<typeof useRecentConnections>
type CommonStore = ReturnType<typeof useCommonStore>
type ConnectionsStore = ReturnType<typeof useConnectionsStore>
type SchemaStore = ReturnType<typeof useSchemaStore>
type PaneTabsStore = ReturnType<typeof usePaneTabsStore>
type NavigationStore = ReturnType<typeof useExplorerNavigationStore>
type FileExplorerStore = ReturnType<typeof useFileExplorerStore>

interface UseDatabaseExplorerControllerOptions {
  route: RouteLocationNormalizedLoaded
  router: Router
  explorerState: ExplorerState
  navigationStore: NavigationStore
  connectionsStore: ConnectionsStore
  schemaStore: SchemaStore
  paneTabsStore: PaneTabsStore
  fileExplorerStore: FileExplorerStore
  commonStore: CommonStore
  sidebar: SidebarManager
  searchInputRef: Ref<InstanceType<typeof SearchInput> | null>
  recentConnectionsManager: RecentConnectionsManager
  alwaysOpenNewTab: Ref<boolean>
}

export function useDatabaseExplorerController({
  route,
  router,
  explorerState,
  navigationStore,
  connectionsStore,
  schemaStore,
  paneTabsStore,
  fileExplorerStore,
  commonStore,
  sidebar,
  searchInputRef,
  recentConnectionsManager,
  alwaysOpenNewTab
}: UseDatabaseExplorerControllerOptions) {
  // Use the new view state store as the single source of truth
  const viewState = useExplorerViewStateStore()

  function pushExplorerRoute(connectionId: string, query: Record<string, string>) {
    const nextPath = `/explorer/${connectionId}`
    const currentQuery = JSON.stringify(route.query)
    const nextQuery = JSON.stringify(query)
    if (route.path === nextPath && currentQuery === nextQuery) return
    void router.push({ path: nextPath, query })
  }

  const restoreToken = ref(0)

  async function ensureLeftPaneMatchesViewState(payload: {
    connectionId: string
    database: string
    schema?: string | null
    type: 'table' | 'view'
    name: string
  }) {
    const token = ++restoreToken.value

    const leftState = paneTabsStore.getPaneState('left')
    const schema = payload.schema || undefined
    const matchesSelection = (tab: PaneTab | null | undefined) =>
      Boolean(
        tab &&
          tab.tabType === 'database' &&
          tab.connectionId === payload.connectionId &&
          tab.database === payload.database &&
          tab.type === payload.type &&
          tab.name === payload.name &&
          (tab.schema || undefined) === (schema || undefined)
      )

    // If the matching tab already exists, just activate it.
    const pinnedIndex = leftState.pinnedTabs.findIndex((t) => matchesSelection(t))
    if (pinnedIndex >= 0) {
      paneTabsStore.activateTab('left', pinnedIndex)
      return
    }
    if (matchesSelection(leftState.previewTab)) {
      paneTabsStore.activatePreviewTab('left')
      return
    }

    // Otherwise restore by fetching metadata and creating a preview tab.
    let obj: SQLTableMeta | SQLViewMeta | undefined
    try {
      const meta = await connections.getMetadata(payload.connectionId, payload.database)
      if (token !== restoreToken.value) return

      if (payload.type === 'table') {
        obj = Object.values(meta.tables || {}).find(
          (t) => t.name === payload.name && (!schema || t.schema === schema)
        )
      } else {
        obj = Object.values(meta.views || {}).find(
          (v) => v.name === payload.name && (!schema || v.schema === schema)
        )
      }
    } catch (error) {
      console.warn('Failed to restore left pane tab from URL/viewState:', error)
      return
    }

    if (!obj) {
      console.warn('Could not restore left pane tab (object not found):', payload)
      return
    }

    paneTabsStore.addTab(
      'left',
      {
        id: `${payload.connectionId}:${payload.database || ''}:${schema || ''}:${payload.name}:${payload.type || ''}`,
        connectionId: payload.connectionId,
        database: payload.database,
        schema: schema || undefined,
        name: payload.name,
        type: payload.type,
        meta: obj,
        tabType: 'database'
      },
      'preview'
    )
  }

  function ensureDiagramTabMatchesRoute(connectionId: string, database: string) {
    const leftState = paneTabsStore.getPaneState('left')
    const tabId = `diagram:${connectionId}:${database}`

    const existingIndex = leftState.pinnedTabs.findIndex(
      (t) => t.tabType === 'diagram' && t.id === tabId
    )
    if (existingIndex >= 0) {
      paneTabsStore.activateTab('left', existingIndex)
      return
    }

    paneTabsStore.addTab(
      'left',
      {
        id: tabId,
        connectionId,
        database,
        name: `Diagram: ${database}`,
        tabType: 'diagram',
        objectKey: tabId
      },
      'pinned'
    )
  }

  // Loading state to prevent multiple file clicks during loading
  const isLoadingFile = ref(false)

  // Derived from store (no longer from URL)
  // Use computed to maintain reactivity when store values change
  const showConnectionDetails = computed(() => viewState.showConnectionDetails)
  const showDeleteConfirm = ref(false)
  const pendingDeleteConnectionId = ref<string | null>(null)
  const pendingDeleteName = ref('')

  const currentFileEntries = computed<FileSystemEntry[]>(() => {
    const id = explorerState.currentConnectionId.value
    if (!id) return []
    return fileExplorerStore.getEntries(id)
  })

  // Tree selection is derived from store (single source of truth)
  // Use computed to maintain reactivity when store values change
  const treeSelection = computed(() => viewState.treeSelection)

  const deleteConnectionMessage = computed(() => {
    const label = pendingDeleteName.value || 'this connection'
    return `Delete ${label}? This cannot be undone.`
  })

  const emptyPaneState: PaneState = { pinnedTabs: [], previewTab: null, activePinnedIndex: null }
  const hasPaneContent = computed(() => {
    const leftState = paneTabsStore.leftPaneState ?? emptyPaneState
    const rightState = paneTabsStore.rightPaneState ?? emptyPaneState
    return (
      leftState.pinnedTabs.length > 0 ||
      leftState.previewTab !== null ||
      rightState.pinnedTabs.length > 0 ||
      rightState.previewTab !== null
    )
  })

  const lacksExplorerContent = computed(() => {
    if (showConnectionDetails.value) return false
    if (explorerState.selectedDatabaseName.value) return false
    if (explorerState.selectedFileEntry.value) return false
    return !hasPaneContent.value
  })

  function clearRightPaneQueryParams() {
    const nextQuery = { ...route.query }
    delete nextQuery.rightDb
    delete nextQuery.rightType
    delete nextQuery.rightName
    delete nextQuery.rightSchema
    if (nextQuery.pane === 'right') {
      delete nextQuery.pane
    }

    router.replace({ path: route.path, query: nextQuery })
  }

  function handleOpenFromTree(payload: {
    connectionId: string
    database: string
    schema?: string
    type: 'table' | 'view'
    name: string
    meta: SQLTableMeta | SQLViewMeta
    mode: 'preview' | 'pinned'
    defaultTab?: 'structure' | 'data'
    openInRightSplit?: boolean
    skipUrlUpdate?: boolean
  }) {
    const previousConnectionId = explorerState.currentConnectionId.value

    // Update store
    viewState.selectTable(
      payload.connectionId,
      payload.database,
      payload.type,
      payload.name,
      payload.schema
    )

    if (!payload.skipUrlUpdate) {
      const query: Record<string, string> = {
        db: payload.database,
        type: payload.type,
        name: payload.name
      }
      if (payload.schema) query.schema = payload.schema
      pushExplorerRoute(payload.connectionId, query)
    }

    navigationStore.setActiveConnectionId(payload.connectionId)
    connectionsStore.setCurrentConnection(payload.connectionId)

    // Clear panel states and file selection - database selection will be synced by watcher
    explorerState.clearPanelStates()
    explorerState.clearFileSelection()

    if (payload.connectionId !== previousConnectionId && previousConnectionId) {
      fileExplorerStore.clearSelection(previousConnectionId)
    }

    const targetPane: PaneId = payload.openInRightSplit
      ? 'right'
      : paneTabsStore.activePane || 'left'

    paneTabsStore.addTab(
      targetPane,
      {
        id: `${payload.connectionId}:${payload.database || ''}:${payload.schema || ''}:${payload.name}:${payload.type || ''}`,
        connectionId: payload.connectionId,
        database: payload.database,
        schema: payload.schema,
        name: payload.name,
        type: payload.type,
        meta: payload.meta,
        tabType: 'database'
      },
      alwaysOpenNewTab.value ? 'pinned' : payload.mode
    )
  }

  async function handleOpenFile(payload: {
    connectionId: string
    path: string
    entry: FileSystemEntry
    mode: 'preview' | 'pinned'
    defaultTab?: 'structure' | 'data'
    openInRightSplit?: boolean
    skipUrlUpdate?: boolean
  }) {
    // Prevent multiple clicks while loading
    if (isLoadingFile.value) {
      return
    }

    const isTableFolder = payload.entry.type === 'dir' && payload.entry.isTable

    // Guard: only allow opening files or table folders
    if (payload.entry.type !== 'file' && !isTableFolder) {
      console.warn('Attempted to open a directory as a file:', payload.path)
      return
    }

    // Update viewState
    viewState.selectFile(payload.connectionId, payload.path)

    if (!payload.skipUrlUpdate) {
      pushExplorerRoute(payload.connectionId, { file: payload.path })
    }

    navigationStore.setActiveConnectionId(payload.connectionId)
    connectionsStore.setCurrentConnection(payload.connectionId)

    // Clear panel states - file selection will be synced by watcher
    explorerState.clearPanelStates()

    const targetPane: PaneId = payload.openInRightSplit
      ? 'right'
      : paneTabsStore.activePane || 'left'

    if (!payload.openInRightSplit) {
      explorerState.setFileSelection(payload.entry)
      // Clear selections from other connections to avoid double highlights
      fileExplorerStore.clearAllSelectionsExcept(payload.connectionId)
      fileExplorerStore.setSelectedPath(payload.connectionId, payload.path)
    }

    const tabId = `file:${payload.path}`

    // Set loading state to prevent additional clicks
    isLoadingFile.value = true

    // Add tab immediately with null metadata - data grid will load data directly
    // This allows the data to show immediately without waiting for metadata
    paneTabsStore.addTab(
      targetPane,
      {
        id: tabId,
        connectionId: payload.connectionId,
        name: payload.entry.name,
        filePath: payload.path,
        fileEntry: payload.entry,
        fileMetadata: null, // Data grid will fetch data; metadata loaded lazily in background
        fileType: payload.entry.type,
        tabType: 'file'
      },
      alwaysOpenNewTab.value ? 'pinned' : payload.mode
    )

    // Clear loading state immediately - let the data grid handle its own loading
    isLoadingFile.value = false

    // Fetch metadata lazily in background (for structure tab, not blocking data display)
    const isS3 = payload.path.startsWith('s3://')

    // For S3: fetch schema only (no stats) to populate structure tab
    // For local: fetch with stats since it's fast
    fileExplorerStore
      .loadFileMetadata(payload.entry, !isS3, payload.connectionId)
      .then((metadata) => {
        paneTabsStore.updateTabFileMetadata(targetPane, tabId, metadata)
      })
  }

  function handleShowDiagram(payload: ShowDiagramPayload & { skipUrlUpdate?: boolean }) {
    navigationStore.setActiveConnectionId(payload.connectionId)

    explorerState.clearPanelStates()
    explorerState.setDatabaseSelection({ database: payload.database })

    // Set viewType to 'table-data' so showDatabaseOverview becomes false
    viewState.setViewType('table-data')

    if (!payload.skipUrlUpdate) {
      const query: Record<string, string> = {
        db: payload.database,
        diagram: 'true'
      }
      if (payload.focus) {
        query.focusType = payload.focus.type
        query.focusName = payload.focus.name
        if (payload.focus.schema) query.focusSchema = payload.focus.schema
      }
      pushExplorerRoute(payload.connectionId, query)
    }

    // Create a diagram tab
    const tabId = `diagram:${payload.connectionId}:${payload.database}`

    paneTabsStore.addTab(
      'left',
      {
        id: tabId,
        connectionId: payload.connectionId,
        database: payload.database,
        name: `Diagram: ${payload.database}`,
        tabType: 'diagram',
        objectKey: tabId
      },
      'pinned'
    )

    // Pre-load schema data for the diagram
    schemaStore.setConnectionId(payload.connectionId)
    schemaStore.setDatabaseName(payload.database)
    if (payload.focus) {
      const focusName = payload.focus.schema
        ? `${payload.focus.schema}.${payload.focus.name}`
        : payload.focus.name
      schemaStore.setSelectedTable(focusName)
    }
    schemaStore.fetchSchema(false)
  }

  function handleRefreshMetadata() {
    schemaStore.fetchSchema(true)
  }

  function handleSelectConnection(payload: { connectionId: string }) {
    // Update store
    viewState.selectConnection(payload.connectionId)

    pushExplorerRoute(payload.connectionId, { details: 'true' })

    navigationStore.setActiveConnectionId(payload.connectionId)
    connectionsStore.setCurrentConnection(payload.connectionId)

    // Only close preview tabs, not pinned tabs - preserve user's open tabs
    if (paneTabsStore.leftPaneState.previewTab) {
      paneTabsStore.closePreviewTab('left')
    }
    if (paneTabsStore.rightPaneState.previewTab) {
      paneTabsStore.closePreviewTab('right')
    }

    explorerState.clearPanelStates()
    explorerState.clearDatabaseSelection()

    fileExplorerStore.clearSelection(payload.connectionId)

    if (fileExplorerStore.isFilesConnectionType(payload.connectionId)) {
      // Load entries if not already cached - don't force reload to preserve expanded folders
      void fileExplorerStore.loadEntries(payload.connectionId, false)
    }
  }

  function handleSelectDatabase(payload: { connectionId: string; database: string }) {
    // Update store
    viewState.selectDatabase(payload.connectionId, payload.database)

    pushExplorerRoute(payload.connectionId, { db: payload.database })

    navigationStore.setActiveConnectionId(payload.connectionId)
    connectionsStore.setCurrentConnection(payload.connectionId)

    explorerState.clearPanelStates()
    explorerState.setDatabaseSelection({ database: payload.database })
    explorerState.activePane.value = 'left'

    schemaStore.setConnectionId(payload.connectionId)
    schemaStore.setDatabaseName(payload.database)
    schemaStore.fetchSchema(false)
  }

  async function handleFileSelect(payload: {
    connectionId: string
    path: string
    entry?: FileSystemEntry
    skipUrlUpdate?: boolean
  }) {
    // Prevent multiple clicks while loading
    if (isLoadingFile.value) {
      return
    }

    // Skip if this file is already selected (prevents double processing from URL watcher)
    const currentSelectedPath = fileExplorerStore.getSelectedPath(payload.connectionId)
    if (currentSelectedPath === payload.path) {
      return
    }

    navigationStore.setActiveConnectionId(payload.connectionId)

    // Find entry if not provided (e.g., from router/URL navigation)
    let entry = payload.entry
    if (!entry) {
      const findEntry = (
        entries: FileSystemEntry[],
        targetPath: string
      ): FileSystemEntry | null => {
        for (const e of entries) {
          if (e.path === targetPath) return e
          if (e.children) {
            const found = findEntry(e.children, targetPath)
            if (found) return found
          }
        }
        return null
      }

      entry = findEntry(currentFileEntries.value, payload.path) || undefined

      // If entry not found, try expanding parent folders and search again
      if (!entry) {
        const pathSegments = payload.path.split('/')

        // Expand each parent folder in the path
        for (let i = pathSegments.length - 1; i > 0; i--) {
          const parentPath = pathSegments.slice(0, i).join('/')
          const parentEntry = findEntry(currentFileEntries.value, parentPath)

          if (parentEntry && parentEntry.type === 'dir' && !parentEntry.isLoaded) {
            // Load folder contents if not already loaded
            await fileExplorerStore.loadFolderContents(payload.connectionId, parentPath)
            // Retry finding the entry after loading
            entry = findEntry(currentFileEntries.value, payload.path) || undefined
            if (entry) break
          }
        }
      }
    }

    // Guard: if we still don't have an entry, bail out
    if (!entry) {
      console.warn('handleFileSelect: Could not find entry for path:', payload.path)
      return
    }

    const isTableFolder = entry.type === 'dir' && entry.isTable

    // Only open files or table folders for preview
    if (entry.type !== 'file' && !isTableFolder) {
      // Don't set selected path for folders - they should just expand/collapse
      return
    }

    void handleOpenFile({
      connectionId: payload.connectionId,
      path: payload.path,
      entry: entry,
      mode: 'preview',
      defaultTab: 'data',
      skipUrlUpdate: payload.skipUrlUpdate
    })
  }

  function handleRequestFileEntries(payload: { connectionId: string }) {
    void fileExplorerStore.loadEntries(payload.connectionId, true)
  }

  async function handlePickFromBreadcrumb(
    paneId: PaneId,
    o: {
      name: string
      type: 'table' | 'view'
      schema?: string
    }
  ) {
    const activeTab = paneTabsStore.getActiveTab(paneId)
    if (!activeTab || activeTab.tabType !== 'database' || !activeTab.database) return

    const targetConnId = activeTab.connectionId
    const targetDb = activeTab.database

    try {
      const meta = await connections.getMetadata(targetConnId, targetDb)
      let obj: SQLTableMeta | SQLViewMeta | undefined
      if (o.type === 'table') {
        obj = Object.values(meta.tables || {}).find(
          (t) => t.name === o.name && (o.schema ? t.schema === o.schema : true)
        )
      } else {
        obj = Object.values(meta.views || {}).find(
          (v) => v.name === o.name && (o.schema ? v.schema === o.schema : true)
        )
      }
      if (!obj) return

      handleOpenFromTree({
        connectionId: targetConnId,
        database: targetDb,
        schema: o.schema,
        type: o.type,
        name: o.name,
        meta: obj,
        mode: 'preview',
        defaultTab: 'data',
        openInRightSplit: paneId === 'right'
      })
    } catch {
      // ignore open errors
    }
  }

  function handleBreadcrumbNavigate(
    paneId: PaneId,
    payload: { level: 'database' | 'schema' | 'type' | 'name' }
  ) {
    const paneState = paneTabsStore.getPaneState(paneId)

    if (payload.level === 'database') {
      paneTabsStore.closeAllTabs(paneId)
      if (paneState.previewTab) {
        paneTabsStore.closePreviewTab(paneId)
      }
    } else if (payload.level === 'schema' || payload.level === 'type') {
      if (paneState.activePinnedIndex !== null) {
        paneTabsStore.closeTab(paneId, paneState.activePinnedIndex)
      } else if (paneState.previewTab) {
        paneTabsStore.closePreviewTab(paneId)
      }
    }
  }

  const onAddConnection = () => router.push('/explorer/add')

  const onEditConnection = () => {
    if (!explorerState.activeConnectionId.value) return
    router.push(`/explorer/edit/${explorerState.activeConnectionId.value}`)
  }

  const onEditConnectionJson = () => {
    if (!explorerState.activeConnectionId.value) return
    router.push(`/explorer/edit-json/${explorerState.activeConnectionId.value}`)
  }

  const onDeleteConnection = () => {
    const id = explorerState.activeConnectionId.value
    if (!id) return
    const conn = connectionsStore.connections.find((c) => c.id === id)
    pendingDeleteConnectionId.value = id
    pendingDeleteName.value =
      conn?.name || (conn ? getConnectionHost(conn) : '') || 'this connection'
    showDeleteConfirm.value = true
  }

  async function confirmDeleteConnection() {
    if (!pendingDeleteConnectionId.value) return
    try {
      await connectionsStore.deleteConnection(pendingDeleteConnectionId.value)
      recentConnectionsManager.removeFromRecent(pendingDeleteConnectionId.value)
      router.push('/explorer')
    } catch (e) {
      console.error('Failed to delete connection from Explorer:', e)
    } finally {
      pendingDeleteConnectionId.value = null
      pendingDeleteName.value = ''
      showDeleteConfirm.value = false
    }
  }

  function cancelDeleteConnection() {
    pendingDeleteConnectionId.value = null
    pendingDeleteName.value = ''
    showDeleteConfirm.value = false
  }

  async function onCloneConnection() {
    const id = explorerState.activeConnectionId.value
    if (!id) return
    try {
      connectionsStore.setCurrentConnection(id)
      await connectionsStore.cloneConnection(id)
      const newId = connectionsStore.currentConnection?.id
      await connectionsStore.refreshConnections()
      if (newId) router.push(`/explorer/edit/${newId}`)
    } catch (e) {
      console.error('Failed to clone connection from Explorer:', e)
    }
  }

  function handleKeyboardShortcut(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault()
      sidebar.toggleSidebar()
    }

    // Check if user is typing in an input field or editor
    const target = e.target as HTMLElement
    const isInputField =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.closest('.monaco-editor') !== null

    if (e.key === '/' && !isInputField) {
      e.preventDefault()
      searchInputRef.value?.focus()
    }
  }

  watch(
    lacksExplorerContent,
    (isEmpty) => {
      if (isEmpty && !sidebar.sidebarVisible.value) {
        sidebar.sidebarVisible.value = true
      }
    },
    { immediate: true }
  )

  watch(explorerState.currentConnectionId, async (newId) => {
    navigationStore.setActiveConnectionId(newId)

    if (newId && explorerState.currentConnection.value) {
      const conn = explorerState.currentConnection.value
      recentConnectionsManager.addToRecent({
        id: conn.id,
        name: conn.name,
        type: conn.type,
        host: getConnectionHost(conn),
        port: getConnectionPort(conn)?.toString(),
        defaultDatabase: getConnectionDatabase(conn),
        cloud_provider: conn.cloud_provider || ''
      })
      if (fileExplorerStore.isFilesConnectionType(newId)) {
        await fileExplorerStore.loadEntries(newId, true)
        const fileParam = route.query.file as string
        if (fileParam && currentFileEntries.value.length > 0) {
          // handleFileSelect will find the entry if needed (runs async)
          void handleFileSelect({ connectionId: newId, path: fileParam })
        }
      }
    }
  })

  watch(
    () =>
      [
        route.query.rightDb,
        route.query.rightType,
        route.query.rightName,
        route.query.pane
      ] as const,
    async ([rightDb, rightType, rightName, activePane]) => {
      if (
        rightDb &&
        rightType &&
        rightName &&
        explorerState.currentConnectionId.value &&
        (rightType === 'table' || rightType === 'view')
      ) {
        const rightSchema = route.query.rightSchema as string | undefined

        const rightState = paneTabsStore.getPaneState('right')
        const matchesSelection = (tab: PaneTab | null | undefined) =>
          Boolean(
            tab &&
              tab.tabType === 'database' &&
              tab.connectionId === explorerState.currentConnectionId.value &&
              tab.database === rightDb &&
              tab.type === rightType &&
              tab.name === rightName &&
              (tab.schema || undefined) === (rightSchema || undefined)
          )

        const hasMatchingTab =
          matchesSelection(rightState.previewTab) ||
          rightState.pinnedTabs.some((tab) => matchesSelection(tab))

        if (!hasMatchingTab) {
          let obj: SQLTableMeta | SQLViewMeta | undefined
          try {
            const meta = await connections.getMetadata(
              explorerState.currentConnectionId.value,
              rightDb as string
            )
            if (rightType === 'table') {
              obj = Object.values(meta.tables || {}).find(
                (t) => t.name === rightName && (!rightSchema || t.schema === rightSchema)
              )
            } else {
              obj = Object.values(meta.views || {}).find(
                (v) => v.name === rightName && (!rightSchema || v.schema === rightSchema)
              )
            }
          } catch (error) {
            console.warn('Failed to restore right pane tab from URL:', error)
            clearRightPaneQueryParams()
            return
          }

          if (obj) {
            handleOpenFromTree({
              connectionId: explorerState.currentConnectionId.value,
              database: rightDb as string,
              schema: rightSchema,
              type: rightType as 'table' | 'view',
              name: rightName as string,
              meta: obj,
              mode: 'preview',
              openInRightSplit: true,
              skipUrlUpdate: true
            })
          } else {
            clearRightPaneQueryParams()
          }
        }
      }

      if (activePane === 'right' || activePane === 'left') {
        paneTabsStore.setActivePane(activePane)
      }
    },
    { immediate: false }
  )

  watch(
    () => commonStore.isBackendConnected,
    async (isConnected) => {
      if (isConnected) {
        try {
          await connectionsStore.refreshConnections()
        } catch (error) {
          console.error('Failed to load connections when backend connected:', error)
        }
      }
    }
  )

  // Watch viewState changes to sync with explorerState and fetch data
  // This handles URL sync updates and store changes
  watch(
    () => ({
      viewType: viewState.viewType,
      connectionId: viewState.connectionId,
      databaseName: viewState.databaseName,
      schemaName: viewState.schemaName,
      objectType: viewState.objectType,
      objectName: viewState.objectName,
      filePath: viewState.filePath
    }),
    (state) => {
      if (!state.connectionId) return

      // Sync connection
      if (state.connectionId !== explorerState.currentConnectionId.value) {
        navigationStore.setActiveConnectionId(state.connectionId)
        connectionsStore.setCurrentConnection(state.connectionId)
      }

      // Sync database selection
      if (state.viewType === 'database-overview' || state.viewType === 'table-data') {
        if (state.databaseName) {
          explorerState.setDatabaseSelection({
            database: state.databaseName,
            schema: state.schemaName || undefined,
            type: state.objectType || undefined,
            name: state.objectName || undefined
          })

          schemaStore.setConnectionId(state.connectionId)
          schemaStore.setDatabaseName(state.databaseName)
          schemaStore.fetchSchema(false)
        }
      } else if (state.viewType === 'connection-details') {
        explorerState.clearDatabaseSelection()
      }

      // Ensure the visible content matches URL/viewState when navigating with browser back/forward.
      if (
        state.viewType === 'table-data' &&
        state.databaseName &&
        state.objectType &&
        state.objectName
      ) {
        void ensureLeftPaneMatchesViewState({
          connectionId: state.connectionId,
          database: state.databaseName,
          schema: state.schemaName,
          type: state.objectType,
          name: state.objectName
        })
      }

      // Restore/activate diagram tab from URL
      if (state.viewType === 'table-data' && state.databaseName && route.query.diagram === 'true') {
        ensureDiagramTabMatchesRoute(state.connectionId, state.databaseName)

        // Apply optional focus from URL
        schemaStore.setConnectionId(state.connectionId)
        schemaStore.setDatabaseName(state.databaseName)
        const focusType = route.query.focusType
        const focusName = route.query.focusName
        const focusSchema = route.query.focusSchema
        if (
          (focusType === 'table' || focusType === 'view') &&
          typeof focusName === 'string' &&
          focusName
        ) {
          const fullName =
            typeof focusSchema === 'string' && focusSchema
              ? `${focusSchema}.${focusName}`
              : focusName
          schemaStore.setSelectedTable(fullName)
        }
        schemaStore.fetchSchema(false)
      }

      // Sync file selection (and content) when URL/viewState changes
      if (state.viewType === 'file-browser' && state.filePath) {
        const targetConnectionId = state.connectionId
        const targetFilePath = state.filePath

        if (targetConnectionId && fileExplorerStore.isFilesConnectionType(targetConnectionId)) {
          void (async () => {
            await fileExplorerStore.loadEntries(targetConnectionId)
            if (!targetFilePath) return

            // Open/activate the tab for this file so the right-side content matches the URL
            await handleFileSelect({
              connectionId: targetConnectionId,
              path: targetFilePath,
              skipUrlUpdate: true
            })
          })()
        }
      }
    },
    { immediate: true, deep: true }
  )

  onMounted(async () => {
    commonStore.setCurrentPage('Data Explorer')
    sidebar.initializeSidebar()

    if (commonStore.isBackendConnected) {
      try {
        await connectionsStore.refreshConnections()
      } catch (error) {
        console.error('Failed to load connections on explorer mount:', error)
      }
    }

    const focusConnIdFromStream = window.sessionStorage.getItem('explorerFocusConnectionId')
    if (focusConnIdFromStream) {
      // Navigation from stream config - select the connection
      viewState.selectConnection(focusConnIdFromStream)
      window.sessionStorage.removeItem('explorerFocusConnectionId')
    }

    window.addEventListener('keydown', handleKeyboardShortcut)

    if (
      explorerState.currentConnection.value &&
      !recentConnectionsManager.recentConnections.value.find(
        (c) => c.id === explorerState.currentConnectionId.value
      )
    ) {
      const conn = explorerState.currentConnection.value
      recentConnectionsManager.addToRecent({
        id: conn.id,
        name: conn.name,
        type: conn.type,
        host: getConnectionHost(conn),
        port: getConnectionPort(conn)?.toString(),
        defaultDatabase: getConnectionDatabase(conn),
        cloud_provider: conn.cloud_provider || ''
      })
    }

    // REMOVED: All URL reading logic and state sync
    // State sync is now handled by the viewState watcher above
    // URL sync is handled by useExplorerUrlSync

    // If no view state at all, default to connection details for current connection
    if (!viewState.viewType && explorerState.currentConnectionId.value) {
      viewState.selectConnection(explorerState.currentConnectionId.value)
    }
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyboardShortcut)
  })

  return {
    showConnectionDetails,
    showDeleteConfirm,
    pendingDeleteName,
    deleteConnectionMessage,
    currentFileEntries,
    treeSelection,
    isLoadingFile,
    handleOpenFromTree,
    handleOpenFile,
    handleShowDiagram,
    handleRefreshMetadata,
    handleSelectConnection,
    handleSelectDatabase,
    handleFileSelect,
    handleRequestFileEntries,
    handlePickFromBreadcrumb,
    handleBreadcrumbNavigate,
    onAddConnection,
    onEditConnection,
    onEditConnectionJson,
    onDeleteConnection,
    confirmDeleteConnection,
    cancelDeleteConnection,
    onCloneConnection
  }
}
