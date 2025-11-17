import { computed, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'
import connections from '@/api/connections'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import type { PaneId, PaneTab, PaneState } from '@/stores/paneTabs'
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
  const showConnectionDetails = ref(route.query.details === 'true')
  const showDeleteConfirm = ref(false)
  const pendingDeleteConnectionId = ref<string | null>(null)
  const pendingDeleteName = ref('')
  const focusConnectionId = ref<string | null>(null)

  const currentFileEntries = computed<FileSystemEntry[]>(() => {
    const id = explorerState.currentConnectionId.value
    if (!id) return []
    return fileExplorerStore.getEntries(id)
  })

  const treeSelection = computed(() => {
    const activePane = paneTabsStore.activePane
    const activeState = paneTabsStore.getPaneState(activePane)
    const activePinnedIndex = activeState.activePinnedIndex
    const activePinnedTab =
      activePinnedIndex !== null ? activeState.pinnedTabs[activePinnedIndex] : null
    const activePreviewTab = activeState.previewTab
    const activeTab = activePinnedTab || activePreviewTab

    if (activeTab && activeTab.tabType === 'database' && activeTab.database) {
      return {
        connectionId: activeTab.connectionId,
        database: activeTab.database,
        schema: activeTab.schema || undefined,
        type: activeTab.type || undefined,
        name: activeTab.name || undefined
      }
    }

    return {
      connectionId: explorerState.activeConnectionId.value || undefined,
      database: explorerState.selectedDatabaseName.value || undefined,
      schema: explorerState.selectedSchemaName.value || undefined,
      type: explorerState.selectedObjectType.value || undefined,
      name: explorerState.selectedObjectName.value || undefined
    }
  })

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
    if (explorerState.showDiagram.value) return false
    if (explorerState.selectedDatabaseName.value) return false
    if (explorerState.selectedFileEntry.value) return false
    return !hasPaneContent.value
  })

  const activeConnectionId = computed(() => navigationStore.activeConnectionId)
  const selectedDatabase = computed(() => explorerState.selectedDatabaseName.value)
  const selectedSchema = computed(() => explorerState.selectedSchemaName.value)
  const selectedObjectType = computed(() => explorerState.selectedObjectType.value)
  const selectedObjectName = computed(() => explorerState.selectedObjectName.value)
  const selectedFilePath = computed(() => explorerState.selectedFileEntry.value?.path || null)
  const leftActiveTab = computed<PaneTab | null>(() => paneTabsStore.getActiveTab('left'))
  const rightActiveTab = computed<PaneTab | null>(() => paneTabsStore.getActiveTab('right'))

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

    navigationStore.setActiveConnectionId(payload.connectionId)
    connectionsStore.setCurrentConnection(payload.connectionId)

    showConnectionDetails.value = false
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
    // Guard: only allow opening files, not directories
    if (payload.entry.type !== 'file') {
      console.warn('Attempted to open a directory as a file:', payload.path)
      return
    }

    navigationStore.setActiveConnectionId(payload.connectionId)
    connectionsStore.setCurrentConnection(payload.connectionId)

    showConnectionDetails.value = false

    explorerState.clearPanelStates()
    explorerState.clearDatabaseSelection()

    const targetPane: PaneId = payload.openInRightSplit
      ? 'right'
      : paneTabsStore.activePane || 'left'

    if (!payload.openInRightSplit) {
      explorerState.setFileSelection(payload.entry)
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

    showConnectionDetails.value = false

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
    navigationStore.setActiveConnectionId(payload.connectionId)

    connectionsStore.setCurrentConnection(payload.connectionId)
    showConnectionDetails.value = true

    router.replace({
      query: {
        details: 'true',
        file: undefined,
        db: undefined,
        schema: undefined,
        type: undefined,
        name: undefined,
        diagram: undefined
      }
    })

    focusConnectionId.value = payload.connectionId
    explorerState.clearPanelStates()
    explorerState.clearDatabaseSelection()

    fileExplorerStore.clearSelection(payload.connectionId)

    if (fileExplorerStore.isFilesConnectionType(payload.connectionId)) {
      void fileExplorerStore.loadEntries(payload.connectionId, true)
    }
  }

  function handleSelectDatabase(payload: { connectionId: string; database: string }) {
    navigationStore.setActiveConnectionId(payload.connectionId)

    connectionsStore.setCurrentConnection(payload.connectionId)
    showConnectionDetails.value = false

    explorerState.clearPanelStates()
    explorerState.setDatabaseSelection({ database: payload.database })
    explorerState.activePane.value = 'left'
    explorerState.showDiagram.value = false
    focusConnectionId.value = null

    schemaStore.setConnectionId(payload.connectionId)
    schemaStore.setDatabaseName(payload.database)
    schemaStore.fetchSchema(false)
  }

  function handleFileSelect(payload: {
    connectionId: string
    path: string
    entry: FileSystemEntry
  }) {
    navigationStore.setActiveConnectionId(payload.connectionId)

    showConnectionDetails.value = false

    // Only open files for preview, not directories
    if (payload.entry.type !== 'file') {
      fileExplorerStore.setSelectedPath(payload.connectionId, payload.path)
      focusConnectionId.value = null
      return
    }

    void handleOpenFile({
      connectionId: payload.connectionId,
      path: payload.path,
      entry: payload.entry,
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

  const onDeleteConnection = () => {
    const id = explorerState.activeConnectionId.value
    if (!id) return
    const conn = connectionsStore.connections.find((c) => c.id === id)
    pendingDeleteConnectionId.value = id
    pendingDeleteName.value = conn?.name || conn?.host || 'this connection'
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
    if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
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

  watch(
    [
      activeConnectionId,
      selectedDatabase,
      selectedSchema,
      selectedObjectType,
      selectedObjectName,
      selectedFilePath,
      () => explorerState.showDiagram.value,
      () => showConnectionDetails.value,
      leftActiveTab,
      rightActiveTab,
      () => paneTabsStore.activePane
    ],
    ([
      connId,
      db,
      schema,
      type,
      name,
      file,
      diagram,
      connectionDetails,
      leftTab,
      rightTab,
      activePane
    ]) => {
      if (!connId) return

      const currentPath = route.path
      const newPath = `/explorer/${connId}`

      const query: Record<string, string | undefined> = {}
      const hasFile = Boolean(file)
      const hasDatabaseSelection = Boolean(db)
      const hasDiagram = Boolean(diagram) && hasDatabaseSelection
      const shouldShowDetails =
        Boolean(connectionDetails) && !hasFile && !hasDatabaseSelection && !hasDiagram

      if (hasFile) {
        if (file != null) query.file = file
      } else if (hasDatabaseSelection) {
        if (db != null) query.db = db
        if (schema) query.schema = schema
        if (type) query.type = type
        if (name) query.name = name
        if (hasDiagram) query.diagram = 'true'
      } else if (shouldShowDetails) {
        query.details = 'true'
      }

      if (
        leftTab &&
        leftTab.tabType === 'database' &&
        leftTab.type &&
        leftTab.name &&
        leftTab.database &&
        leftTab.connectionId === connId
      ) {
        query.db = leftTab.database
        query.type = leftTab.type
        query.name = leftTab.name
        if (leftTab.schema) query.schema = leftTab.schema
      }

      if (
        rightTab &&
        rightTab.tabType === 'database' &&
        rightTab.type &&
        rightTab.name &&
        rightTab.database &&
        rightTab.connectionId === connId
      ) {
        query.rightDb = rightTab.database
        query.rightType = rightTab.type
        query.rightName = rightTab.name
        if (rightTab.schema) query.rightSchema = rightTab.schema
      }

      if (activePane === 'right' && rightTab && rightTab.connectionId === connId) {
        query.pane = 'right'
      } else if (activePane === 'left' && leftTab && leftTab.connectionId === connId) {
        query.pane = 'left'
      }

      const pathChanged = newPath !== currentPath
      const queryChanged = JSON.stringify(query) !== JSON.stringify(route.query)

      if (pathChanged || queryChanged) {
        router.replace({ path: newPath, query })
      }
    },
    { flush: 'post' }
  )

  watch(
    () => route.query.details,
    (val) => {
      const wantsDetails = val === 'true'
      if (wantsDetails !== showConnectionDetails.value) {
        showConnectionDetails.value = wantsDetails
      }
    }
  )

  watch(explorerState.currentConnectionId, async (newId) => {
    navigationStore.setActiveConnectionId(newId)

    if (newId && explorerState.currentConnection.value) {
      recentConnectionsManager.addToRecent({
        id: explorerState.currentConnection.value.id,
        name: explorerState.currentConnection.value.name,
        type: explorerState.currentConnection.value.type,
        host: explorerState.currentConnection.value.host,
        port: explorerState.currentConnection.value.port?.toString(),
        defaultDatabase: explorerState.currentConnection.value.defaultDatabase,
        cloud_provider: explorerState.currentConnection.value.cloud_provider || ''
      })
      if (fileExplorerStore.isFilesConnectionType(newId)) {
        await fileExplorerStore.loadEntries(newId, true)
        const fileParam = route.query.file as string
        if (fileParam && currentFileEntries.value.length > 0) {
          // Find the entry recursively
          const findEntry = (
            entries: FileSystemEntry[],
            targetPath: string
          ): FileSystemEntry | null => {
            for (const entry of entries) {
              if (entry.path === targetPath) return entry
              if (entry.children) {
                const found = findEntry(entry.children, targetPath)
                if (found) return found
              }
            }
            return null
          }
          const entry = findEntry(currentFileEntries.value, fileParam)
          if (entry) {
            handleFileSelect({ connectionId: newId, path: fileParam, entry })
          }
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
      recentConnectionsManager.addToRecent({
        id: explorerState.currentConnection.value.id,
        name: explorerState.currentConnection.value.name,
        type: explorerState.currentConnection.value.type,
        host: explorerState.currentConnection.value.host,
        port: explorerState.currentConnection.value.port?.toString(),
        defaultDatabase: explorerState.currentConnection.value.defaultDatabase,
        cloud_provider: explorerState.currentConnection.value.cloud_provider || ''
      })
    }

    const { db, schema, type, name, file } = route.query as Record<string, string | undefined>
    if (file && fileExplorerStore.isFilesConnectionType(explorerState.currentConnectionId.value)) {
      explorerState.clearDatabaseSelection()
    } else if (db) {
      explorerState.clearFileSelection()
      fileExplorerStore.clearSelection(explorerState.currentConnectionId.value || '')

      explorerState.setDatabaseSelection({
        database: db,
        schema,
        type: type as 'table' | 'view',
        name
      })

      if (type && name) {
        connections
          .getMetadata(explorerState.currentConnectionId.value || '', db)
          .then((m) => {
            const obj =
              type === 'table'
                ? Object.values(m.tables).find((t) => t.name === name)
                : Object.values(m.views).find((v) => v.name === name)
            if (obj) explorerState.selectedMeta.value = obj
          })
          .catch(() => void 0)
      }

      schemaStore.setConnectionId(explorerState.currentConnectionId.value || '')
      schemaStore.setDatabaseName(db)
      schemaStore.fetchSchema(false)
    }

    if (fileExplorerStore.isFilesConnectionType(explorerState.currentConnectionId.value)) {
      void fileExplorerStore
        .loadEntries(explorerState.currentConnectionId.value as string, true)
        .then(() => {
          if (file) {
            fileExplorerStore.setSelectedPath(explorerState.currentConnectionId.value || '', file)
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
    onDeleteConnection,
    confirmDeleteConnection,
    cancelDeleteConnection,
    onCloneConnection,
    setFocusConnectionId
  }
}
