import { computed, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import type { Router } from 'vue-router'
import { getConnectionHost, getConnectionPort, getConnectionDatabase } from '@/utils/specBuilder'
import { useExplorerViewStateStore } from '@/stores/explorerViewState'
import type { useExplorerState } from '@/composables/useExplorerState'
import type { useSidebar } from '@/composables/useSidebar'
import type { useRecentConnections } from '@/composables/useRecentConnections'
import type { useCommonStore } from '@/stores/common'
import type { useConnectionsStore } from '@/stores/connections'
import type { usePaneTabsStore } from '@/stores/paneTabs'
import type { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import type { useFileExplorerStore } from '@/stores/fileExplorer'
import { getConnectionTypeLabel } from '@/types/specs'

import { useExplorerTabManager } from '@/composables/useExplorerTabManager'
import { useExplorerFileHandlers } from '@/composables/useExplorerFileHandlers'
import { useExplorerTreeHandlers } from '@/composables/useExplorerTreeHandlers'

type ExplorerState = ReturnType<typeof useExplorerState>
type SidebarManager = ReturnType<typeof useSidebar>
type RecentConnectionsManager = ReturnType<typeof useRecentConnections>
type CommonStore = ReturnType<typeof useCommonStore>
type ConnectionsStore = ReturnType<typeof useConnectionsStore>
type PaneTabsStore = ReturnType<typeof usePaneTabsStore>
type NavigationStore = ReturnType<typeof useExplorerNavigationStore>
type FileExplorerStore = ReturnType<typeof useFileExplorerStore>
type FocusableSearchInput = { focus: () => void }

interface UseDatabaseExplorerControllerOptions {
  router: Router
  explorerState: ExplorerState
  navigationStore: NavigationStore
  connectionsStore: ConnectionsStore
  paneTabsStore: PaneTabsStore
  fileExplorerStore: FileExplorerStore
  commonStore: CommonStore
  sidebar: SidebarManager
  searchInputRef: Ref<FocusableSearchInput | null>
  recentConnectionsManager: RecentConnectionsManager
  alwaysOpenNewTab: Ref<boolean>
}

export function useDatabaseExplorerController({
  router,
  explorerState,
  navigationStore,
  connectionsStore,
  paneTabsStore,
  fileExplorerStore,
  commonStore,
  sidebar,
  searchInputRef,
  recentConnectionsManager,
  alwaysOpenNewTab
}: UseDatabaseExplorerControllerOptions) {
  // Use the view state store as the single source of truth
  const viewState = useExplorerViewStateStore()

  // Skip tab restoration on initial load - let the persisted paneTabs state take precedence
  const isInitialLoad = ref(true)

  // Initialize tab manager
  const tabManager = useExplorerTabManager({
    paneTabsStore,
    navigationStore,
    connectionsStore
  })

  // Initialize file handlers
  const fileHandlers = useExplorerFileHandlers({
    paneTabsStore,
    navigationStore,
    connectionsStore,
    fileExplorerStore,
    explorerState,
    viewState,
    alwaysOpenNewTab
  })

  // Initialize tree handlers
  const treeHandlers = useExplorerTreeHandlers({
    paneTabsStore,
    navigationStore,
    connectionsStore,
    fileExplorerStore,
    explorerState,
    viewState,
    tabManager,
    alwaysOpenNewTab
  })

  // Connection actions (inlined - simple routing and delete confirmation)
  const showDeleteConfirm = ref(false)
  const pendingDeleteConnectionId = ref<string | null>(null)
  const pendingDeleteName = ref('')

  const deleteConnectionMessage = computed(() => {
    const label = pendingDeleteName.value || 'this connection'
    return `Delete ${label}? This cannot be undone.`
  })

  const onAddConnection = () => router.push('/explorer/add')

  const onEditConnection = (connectionId?: string) => {
    const id = connectionId || explorerState.activeConnectionId.value
    if (!id) return
    router.push(`/explorer/edit/${id}`)
  }

  const onEditConnectionJson = (connectionId?: string) => {
    const id = connectionId || explorerState.activeConnectionId.value
    if (!id) return
    router.push(`/explorer/edit-json/${id}`)
  }

  const onDeleteConnection = (connectionId?: string) => {
    const id = connectionId || explorerState.activeConnectionId.value
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

  async function onCloneConnection(connectionId?: string) {
    const id = connectionId || explorerState.activeConnectionId.value
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

  // Computed properties
  const hasPaneContent = computed(() => {
    return paneTabsStore.hasPaneContent('left') || paneTabsStore.hasPaneContent('right')
  })

  const lacksExplorerContent = computed(() => !hasPaneContent.value)

  // Keyboard shortcuts handler
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
      target.closest('.monaco-editor') !== null ||
      target.closest('.cm-editor') !== null

    if (e.key === '/' && !isInputField) {
      e.preventDefault()
      searchInputRef.value?.focus()
    }
  }

  // Watchers
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
        type: getConnectionTypeLabel(conn.spec, conn.type) || '',
        host: getConnectionHost(conn),
        port: getConnectionPort(conn)?.toString(),
        defaultDatabase: getConnectionDatabase(conn),
        cloud_provider: conn.cloud_provider || ''
      })
      if (fileExplorerStore.isFilesConnectionType(newId)) {
        // Don't force reload - preserves existing entries and prevents search results from disappearing
        // if the reload fails. Force reload wipes expanded folder children and breaks deep search.
        await fileExplorerStore.loadEntries(newId, false)
      }
    }
  })

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

          // Ensure metadata is available for breadcrumb/object panels.
          void navigationStore.ensureMetadata(state.connectionId, state.databaseName, false)
        }
      } else if (state.viewType === 'connection-details') {
        explorerState.clearDatabaseSelection()
      }

      // Skip opening tabs on initial load to let persisted paneTabs state take precedence
      if (!isInitialLoad.value && state.viewType === 'connection-details') {
        const effectiveMode: 'preview' | 'pinned' = alwaysOpenNewTab.value ? 'pinned' : 'preview'
        tabManager.openConnectionDetailsTab(state.connectionId, effectiveMode, 'left')
      }

      if (!isInitialLoad.value && state.viewType === 'database-overview' && state.databaseName) {
        const effectiveMode: 'preview' | 'pinned' = alwaysOpenNewTab.value ? 'pinned' : 'preview'
        tabManager.openDatabaseOverviewTab(
          state.connectionId,
          state.databaseName,
          effectiveMode,
          'left'
        )
      }

      // Ensure the visible content matches viewState.
      // Skip on initial load to let persisted paneTabs state take precedence.
      if (
        !isInitialLoad.value &&
        state.viewType === 'table-data' &&
        state.databaseName &&
        state.objectType &&
        state.objectName
      ) {
        void tabManager.ensureLeftPaneMatchesViewState({
          connectionId: state.connectionId,
          database: state.databaseName,
          schema: state.schemaName,
          type: state.objectType,
          name: state.objectName
        })
      }

      // Mark initial load as complete after first watcher run
      if (isInitialLoad.value) {
        isInitialLoad.value = false
      }

      // Sync file selection (and content) when viewState changes
      if (state.viewType === 'file-browser' && state.filePath) {
        const targetConnectionId = state.connectionId
        const targetFilePath = state.filePath

        if (targetConnectionId && fileExplorerStore.isFilesConnectionType(targetConnectionId)) {
          void (async () => {
            await fileExplorerStore.loadEntries(targetConnectionId)
            if (!targetFilePath) return

            // Open/activate the tab for this file so the right-side content matches view state
            await fileHandlers.handleFileSelect({
              connectionId: targetConnectionId,
              path: targetFilePath
            })
          })()
        }
      }
    },
    { immediate: true, deep: true }
  )

  // Lifecycle hooks
  onMounted(async () => {
    commonStore.setCurrentPage('Data Explorer')

    if (commonStore.isBackendConnected) {
      try {
        await connectionsStore.refreshConnections()
      } catch (error) {
        console.error('Failed to load connections on explorer mount:', error)
      }

      // Preload metadata for all restored database tabs
      tabManager.preloadMetadataForRestoredTabs()
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
        type: getConnectionTypeLabel(conn.spec, conn.type) || '',
        host: getConnectionHost(conn),
        port: getConnectionPort(conn)?.toString(),
        defaultDatabase: getConnectionDatabase(conn),
        cloud_provider: conn.cloud_provider || ''
      })
    }

    // If no view state at all, default to connection details for current connection
    if (!viewState.viewType && explorerState.currentConnectionId.value) {
      viewState.selectConnection(explorerState.currentConnectionId.value)
    }
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyboardShortcut)
  })

  return {
    // Connection actions
    showDeleteConfirm,
    deleteConnectionMessage,
    onAddConnection,
    onEditConnection,
    onEditConnectionJson,
    onDeleteConnection,
    confirmDeleteConnection,
    cancelDeleteConnection,
    onCloneConnection,

    // File handlers
    handleOpenFile: fileHandlers.handleOpenFile,
    handleFileSelect: fileHandlers.handleFileSelect,
    handleRequestFileEntries: fileHandlers.handleRequestFileEntries,
    handlePickFileFromBreadcrumb: fileHandlers.handlePickFileFromBreadcrumb,

    // Tree handlers
    treeSelection: treeHandlers.treeSelection,
    handleOpenFromTree: treeHandlers.handleOpenFromTree,
    handleShowDiagram: treeHandlers.handleShowDiagram,
    handleRefreshMetadata: treeHandlers.handleRefreshMetadata,
    handleSelectConnection: treeHandlers.handleSelectConnection,
    handleSelectDatabase: treeHandlers.handleSelectDatabase,
    handlePickFromBreadcrumb: treeHandlers.handlePickFromBreadcrumb
  }
}
