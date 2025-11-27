import { computed, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'
import connections from '@/api/connections'
import type { FileSystemEntry } from '@/api/fileSystem'
import { getConnectionHost, getConnectionPort, getConnectionDatabase } from '@/utils/specBuilder'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'
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

  // Derived from store (no longer from URL)
  const showConnectionDetails = viewState.showConnectionDetails
  const showDeleteConfirm = ref(false)
  const pendingDeleteConnectionId = ref<string | null>(null)
  const pendingDeleteName = ref('')
  const focusConnectionId = ref<string | null>(null)

  const currentFileEntries = computed<FileSystemEntry[]>(() => {
    const id = explorerState.currentConnectionId.value
    if (!id) return []
    return fileExplorerStore.getEntries(id)
  })

  // Tree selection is derived from store (single source of truth)
  const treeSelection = viewState.treeSelection

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
    if (showConnectionDetails) return false
    if (explorerState.showDiagram.value) return false
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
  }) {
    const previousConnectionId = explorerState.currentConnectionId.value

    // Update store - URL will sync automatically via useExplorerUrlSync
    viewState.selectTable(
      payload.connectionId,
      payload.database,
      payload.type,
      payload.name,
      payload.schema
    )

    navigationStore.setActiveConnectionId(payload.connectionId)
    connectionsStore.setCurrentConnection(payload.connectionId)

    focusConnectionId.value = null

    explorerState.clearPanelStates()
    explorerState.clearDatabaseSelection()
    explorerState.clearFileSelection()

    if (payload.connectionId !== previousConnectionId && previousConnectionId) {
      fileExplorerStore.clearSelection(previousConnectionId)
    }

    if (payload.database) {
      schemaStore.setConnectionId(payload.connectionId)
      schemaStore.setDatabaseName(payload.database)
      schemaStore.fetchSchema(false)
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
  }) {
    const isTableFolder = payload.entry.type === 'dir' && payload.entry.isTable

    // Guard: only allow opening files or table folders
    if (payload.entry.type !== 'file' && !isTableFolder) {
      console.warn('Attempted to open a directory as a file:', payload.path)
      return
    }

    navigationStore.setActiveConnectionId(payload.connectionId)
    connectionsStore.setCurrentConnection(payload.connectionId)

    explorerState.clearPanelStates()
    explorerState.clearDatabaseSelection()

    const targetPane: PaneId = payload.openInRightSplit
      ? 'right'
      : paneTabsStore.activePane || 'left'

    if (!payload.openInRightSplit) {
      explorerState.setFileSelection(payload.entry)
      // Clear selections from other connections to avoid double highlights
      fileExplorerStore.clearAllSelectionsExcept(payload.connectionId)
      fileExplorerStore.setSelectedPath(payload.connectionId, payload.path)
    }

    const metadata = await fileExplorerStore.loadFileMetadata(payload.entry)

    paneTabsStore.addTab(
      targetPane,
      {
        id: `file:${payload.path}`,
        connectionId: payload.connectionId,
        name: payload.entry.name,
        filePath: payload.path,
        fileEntry: payload.entry,
        fileMetadata: metadata,
        fileType: payload.entry.type,
        tabType: 'file'
      },
      alwaysOpenNewTab.value ? 'pinned' : payload.mode
    )
  }

  function handleShowDiagram(payload: { connectionId: string; database: string }) {
    navigationStore.setActiveConnectionId(payload.connectionId)

    explorerState.clearPanelStates()
    explorerState.setDatabaseSelection({ database: payload.database })
    explorerState.showDiagram.value = true

    schemaStore.setConnectionId(payload.connectionId)
    schemaStore.setDatabaseName(payload.database)
    schemaStore.fetchSchema(false)
  }

  function handleRefreshMetadata() {
    schemaStore.fetchSchema(true)
  }

  function handleSelectConnection(payload: { connectionId: string }) {
    // Update store - URL will sync automatically via useExplorerUrlSync
    viewState.selectConnection(payload.connectionId)

    navigationStore.setActiveConnectionId(payload.connectionId)
    connectionsStore.setCurrentConnection(payload.connectionId)

    // Clear pane tabs when transitioning to Connection Details view
    paneTabsStore.closeAllTabs('left')
    paneTabsStore.closeAllTabs('right')
    if (paneTabsStore.leftPaneState.previewTab) {
      paneTabsStore.closePreviewTab('left')
    }
    if (paneTabsStore.rightPaneState.previewTab) {
      paneTabsStore.closePreviewTab('right')
    }

    focusConnectionId.value = payload.connectionId
    explorerState.clearPanelStates()
    explorerState.clearDatabaseSelection()

    fileExplorerStore.clearSelection(payload.connectionId)

    if (fileExplorerStore.isFilesConnectionType(payload.connectionId)) {
      void fileExplorerStore.loadEntries(payload.connectionId, true)
    }
  }

  function handleSelectDatabase(payload: { connectionId: string; database: string }) {
    // Update store - URL will sync automatically via useExplorerUrlSync
    viewState.selectDatabase(payload.connectionId, payload.database)

    navigationStore.setActiveConnectionId(payload.connectionId)
    connectionsStore.setCurrentConnection(payload.connectionId)

    explorerState.clearPanelStates()
    explorerState.setDatabaseSelection({ database: payload.database })
    explorerState.activePane.value = 'left'
    explorerState.showDiagram.value = false
    focusConnectionId.value = null

    schemaStore.setConnectionId(payload.connectionId)
    schemaStore.setDatabaseName(payload.database)
    schemaStore.fetchSchema(false)
  }

  async function handleFileSelect(payload: {
    connectionId: string
    path: string
    entry?: FileSystemEntry
  }) {
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
      focusConnectionId.value = null
      return
    }

    void handleOpenFile({
      connectionId: payload.connectionId,
      path: payload.path,
      entry: entry,
      mode: 'preview',
      defaultTab: 'data'
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

  function setFocusConnectionId(id: string | null) {
    focusConnectionId.value = id
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
              openInRightSplit: true
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
      focusConnectionId.value = focusConnIdFromStream
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

    // REMOVED: All URL reading logic
    // State is now loaded from store (which loads from localStorage)
    // URL sync is handled by useExplorerUrlSync watcher

    // If no view state at all, default to connection details for current connection
    if (!viewState.viewType && explorerState.currentConnectionId.value) {
      viewState.selectConnection(explorerState.currentConnectionId.value)
    }

    // Sync explorerState with viewState if database is selected
    if (viewState.databaseName && explorerState.currentConnectionId.value) {
      explorerState.setDatabaseSelection({
        database: viewState.databaseName,
        schema: viewState.schemaName || undefined,
        type: viewState.objectType || undefined,
        name: viewState.objectName || undefined
      })

      schemaStore.setConnectionId(explorerState.currentConnectionId.value)
      schemaStore.setDatabaseName(viewState.databaseName)
      schemaStore.fetchSchema(false)
    }

    // Load file entries for file connections
    if (
      viewState.filePath &&
      fileExplorerStore.isFilesConnectionType(explorerState.currentConnectionId.value)
    ) {
      void fileExplorerStore
        .loadEntries(explorerState.currentConnectionId.value as string, true)
        .then(() => {
          if (viewState.filePath) {
            fileExplorerStore.setSelectedPath(
              explorerState.currentConnectionId.value || '',
              viewState.filePath
            )
            focusConnectionId.value = null
          }
        })
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
    focusConnectionId,
    currentFileEntries,
    treeSelection,
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
    onCloneConnection,
    setFocusConnectionId
  }
}
