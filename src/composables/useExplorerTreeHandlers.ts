import { computed, type Ref } from 'vue'
import type { PaneId } from '@/stores/paneTabs'
import type { ShowDiagramPayload } from '@/types/diagram'
import type { usePaneTabsStore } from '@/stores/paneTabs'
import type { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import type { useConnectionsStore } from '@/stores/connections'
import type { useFileExplorerStore } from '@/stores/fileExplorer'
import type { useExplorerViewStateStore } from '@/stores/explorerViewState'
import type { useExplorerState } from '@/composables/useExplorerState'
import type { useExplorerTabManager } from '@/composables/useExplorerTabManager'
import { parseRoutineName } from '@/utils/routineUtils'

type PaneTabsStore = ReturnType<typeof usePaneTabsStore>
type NavigationStore = ReturnType<typeof useExplorerNavigationStore>
type ConnectionsStore = ReturnType<typeof useConnectionsStore>
type FileExplorerStore = ReturnType<typeof useFileExplorerStore>
type ExplorerState = ReturnType<typeof useExplorerState>
type ViewStateStore = ReturnType<typeof useExplorerViewStateStore>
type TabManager = ReturnType<typeof useExplorerTabManager>

interface UseExplorerTreeHandlersOptions {
  paneTabsStore: PaneTabsStore
  navigationStore: NavigationStore
  connectionsStore: ConnectionsStore
  fileExplorerStore: FileExplorerStore
  explorerState: ExplorerState
  viewState: ViewStateStore
  tabManager: TabManager
  alwaysOpenNewTab: Ref<boolean>
}

export function useExplorerTreeHandlers({
  paneTabsStore,
  navigationStore,
  connectionsStore,
  fileExplorerStore,
  explorerState,
  viewState,
  tabManager,
  alwaysOpenNewTab
}: UseExplorerTreeHandlersOptions) {
  // Tree selection is derived from store (single source of truth)
  const treeSelection = computed(() => viewState.treeSelection)

  function handleOpenFromTree(payload: {
    connectionId: string
    database: string
    schema?: string
    type: 'table' | 'view' | 'function' | 'procedure' | 'sequence'
    name: string
    mode: 'preview' | 'pinned'
    defaultTab?: 'structure' | 'data'
    openInRightSplit?: boolean
  }) {
    const previousConnectionId = explorerState.currentConnectionId.value

    // If explicitly opening in the right split (context menu / breadcrumb pick),
    // always target the right pane regardless of the currently active pane.
    const targetPane: PaneId = payload.openInRightSplit
      ? 'right'
      : paneTabsStore.activePane || 'left'

    // For right-pane opens, do NOT update the global (left) selection.
    // The viewState watcher restores the selected object into the left pane;
    // updating it here would cause the left pane to change even when the user
    // intended to open in the active/right pane.
    if (targetPane === 'left') {
      viewState.selectTable(
        payload.connectionId,
        payload.database,
        payload.type,
        payload.name,
        payload.schema
      )
    } else {
      // Ensure we are in the tab view (not connection details / overview), but
      // avoid selecting a left-pane object.
      if (viewState.viewType !== 'table-data') {
        viewState.selectDatabaseTabView(payload.connectionId, payload.database)
      }
    }

    navigationStore.setActiveConnectionId(payload.connectionId)
    connectionsStore.setCurrentConnection(payload.connectionId)

    // Clear panel states and file selection - database selection will be synced by watcher
    explorerState.clearFileSelection()

    if (payload.connectionId !== previousConnectionId && previousConnectionId) {
      fileExplorerStore.clearSelection(previousConnectionId)
    }

    paneTabsStore.addTab(
      targetPane,
      {
        id: `${payload.connectionId}:${payload.database || ''}:${payload.schema || ''}:${payload.name}:${payload.type || ''}`,
        connectionId: payload.connectionId,
        database: payload.database,
        schema: payload.schema,
        name: payload.name,
        type: payload.type,
        tabType: 'database'
      },
      alwaysOpenNewTab.value ? 'pinned' : payload.mode
    )

    // Opening in the right split should always make the right pane active,
    // even if other watchers also open/restore left-pane content in the same flow.
    if (payload.openInRightSplit) {
      paneTabsStore.setActivePane('right')
    }
  }

  function handleShowDiagram(payload: ShowDiagramPayload) {
    navigationStore.setActiveConnectionId(payload.connectionId)

    explorerState.setDatabaseSelection({ database: payload.database })

    // Set viewType to 'table-data' so showDatabaseOverview becomes false
    viewState.setViewType('table-data')

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
  }

  function handleRefreshMetadata() {
    const connectionId = viewState.connectionId
    const database = viewState.databaseName
    if (connectionId && database) {
      void navigationStore.ensureMetadata(connectionId, database, true)
    }
  }

  function handleSelectConnection(payload: { connectionId: string; mode?: 'preview' | 'pinned' }) {
    const targetPane: PaneId = paneTabsStore.activePane || 'left'

    // Only update the global viewState when targeting the left pane.
    // Right pane selection should not force the left pane to open/activate.
    if (targetPane === 'left') {
      viewState.selectConnection(payload.connectionId)
    }

    navigationStore.setActiveConnectionId(payload.connectionId)
    connectionsStore.setCurrentConnection(payload.connectionId)

    explorerState.clearDatabaseSelection()

    fileExplorerStore.clearSelection(payload.connectionId)

    const effectiveMode: 'preview' | 'pinned' =
      payload.mode || (alwaysOpenNewTab.value ? 'pinned' : 'preview')
    tabManager.openConnectionDetailsTab(payload.connectionId, effectiveMode, targetPane)

    if (fileExplorerStore.isFilesConnectionType(payload.connectionId)) {
      // Load entries if not already cached - don't force reload to preserve expanded folders
      void fileExplorerStore.loadEntries(payload.connectionId, false)
    }
  }

  function handleSelectDatabase(payload: {
    connectionId: string
    database: string
    mode?: 'preview' | 'pinned'
  }) {
    const targetPane: PaneId = paneTabsStore.activePane || 'left'

    // Only update the global viewState when targeting the left pane.
    // Right pane selection should not force the left pane to open/activate.
    if (targetPane === 'left') {
      viewState.selectDatabase(payload.connectionId, payload.database)
    }

    navigationStore.setActiveConnectionId(payload.connectionId)
    connectionsStore.setCurrentConnection(payload.connectionId)

    explorerState.setDatabaseSelection({ database: payload.database })

    const effectiveMode: 'preview' | 'pinned' =
      payload.mode || (alwaysOpenNewTab.value ? 'pinned' : 'preview')
    tabManager.openDatabaseOverviewTab(
      payload.connectionId,
      payload.database,
      effectiveMode,
      targetPane
    )

    // Ensure metadata is available for breadcrumb/object panels.
    void navigationStore.ensureMetadata(payload.connectionId, payload.database, false)
  }

  async function handlePickFromBreadcrumb(
    paneId: PaneId,
    o: {
      name: string
      type: 'table' | 'view' | 'function' | 'procedure' | 'sequence'
      schema?: string
    }
  ) {
    const activeTab = paneTabsStore.getActiveTab(paneId)
    if (!activeTab || activeTab.tabType !== 'database' || !activeTab.database) return

    const targetConnId = activeTab.connectionId
    const targetDb = activeTab.database

    try {
      await navigationStore.ensureMetadata(targetConnId, targetDb)
      let obj
      if (o.type === 'table') {
        obj = navigationStore.findTableMeta(targetConnId, targetDb, o.name, o.schema)
      } else if (o.type === 'view') {
        obj = navigationStore.findViewMeta(targetConnId, targetDb, o.name, o.schema)
      } else if (o.type === 'sequence') {
        obj = navigationStore.findSequenceMeta(targetConnId, targetDb, o.name, o.schema)
      } else {
        const { routineName, signature } = parseRoutineName(o.name)
        obj = navigationStore.findRoutineMeta(
          targetConnId,
          targetDb,
          routineName,
          o.type === 'function' ? 'function' : 'procedure',
          o.schema,
          signature
        )
      }
      if (!obj) return

      handleOpenFromTree({
        connectionId: targetConnId,
        database: targetDb,
        schema: o.schema,
        type: o.type,
        name: o.name,
        mode: 'preview',
        defaultTab: 'data',
        openInRightSplit: paneId === 'right'
      })
    } catch {
      // ignore open errors
    }
  }

  return {
    treeSelection,
    handleOpenFromTree,
    handleShowDiagram,
    handleRefreshMetadata,
    handleSelectConnection,
    handleSelectDatabase,
    handlePickFromBreadcrumb
  }
}
