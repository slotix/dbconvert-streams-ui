import { ref } from 'vue'
import type { SQLRoutineMeta, SQLSequenceMeta, SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import type { PaneId, PaneTab } from '@/stores/paneTabs'
import type { usePaneTabsStore } from '@/stores/paneTabs'
import type { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import type { useConnectionsStore } from '@/stores/connections'
import { getConnectionHost } from '@/utils/specBuilder'
import { getConnectionTypeLabel } from '@/types/specs'
import { parseRoutineName } from '@/utils/routineUtils'

type PaneTabsStore = ReturnType<typeof usePaneTabsStore>
type NavigationStore = ReturnType<typeof useExplorerNavigationStore>
type ConnectionsStore = ReturnType<typeof useConnectionsStore>

interface UseExplorerTabManagerOptions {
  paneTabsStore: PaneTabsStore
  navigationStore: NavigationStore
  connectionsStore: ConnectionsStore
}

export function useExplorerTabManager({
  paneTabsStore,
  navigationStore,
  connectionsStore
}: UseExplorerTabManagerOptions) {
  const restoreToken = ref(0)

  async function ensureLeftPaneMatchesViewState(payload: {
    connectionId: string
    database: string
    schema?: string | null
    type: 'table' | 'view' | 'function' | 'procedure' | 'sequence'
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
    const existingIndex = leftState.tabs.findIndex((t) => matchesSelection(t))
    if (existingIndex >= 0) {
      paneTabsStore.activateTab('left', existingIndex)
      return
    }
    if (matchesSelection(paneTabsStore.getPreviewTab('left'))) {
      paneTabsStore.activatePreviewTab('left')
      return
    }

    // Otherwise restore by fetching metadata and creating a preview tab.
    let obj: SQLTableMeta | SQLViewMeta | SQLRoutineMeta | SQLSequenceMeta | undefined
    try {
      await navigationStore.ensureMetadata(payload.connectionId, payload.database)
      if (token !== restoreToken.value) return

      if (payload.type === 'table') {
        obj = navigationStore.findTableMeta(
          payload.connectionId,
          payload.database,
          payload.name,
          schema
        )
      } else if (payload.type === 'view') {
        obj = navigationStore.findViewMeta(
          payload.connectionId,
          payload.database,
          payload.name,
          schema
        )
      } else if (payload.type === 'sequence') {
        obj = navigationStore.findSequenceMeta(
          payload.connectionId,
          payload.database,
          payload.name,
          schema
        )
      } else {
        const { routineName, signature } = parseRoutineName(payload.name)
        obj = navigationStore.findRoutineMeta(
          payload.connectionId,
          payload.database,
          routineName,
          payload.type === 'function' ? 'function' : 'procedure',
          schema,
          signature
        )
      }
    } catch (error) {
      console.warn('Failed to restore left pane tab from viewState:', error)
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
        tabType: 'database'
      },
      'preview'
    )
  }

  function getConnectionTabName(connectionId: string): string {
    const conn = connectionsStore.connectionByID(connectionId) || undefined
    const label =
      conn?.name?.trim() ||
      getConnectionHost(conn) ||
      getConnectionTypeLabel(conn?.spec, conn?.type) ||
      'Connection'
    return label
  }

  function openConnectionDetailsTab(
    connectionId: string,
    mode: 'preview' | 'pinned',
    paneId: PaneId = 'left'
  ) {
    const tabId = `connection-details:${connectionId}`
    const tabName = getConnectionTabName(connectionId)

    if (mode === 'pinned') {
      const preview = paneTabsStore.getPreviewTab(paneId)
      if (preview?.tabType === 'connection-details' && preview.connectionId === connectionId) {
        paneTabsStore.pinPreviewTab(paneId)
        return
      }
    }

    paneTabsStore.addTab(
      paneId,
      {
        id: tabId,
        connectionId,
        name: tabName,
        tabType: 'connection-details'
      },
      mode
    )
  }

  function openDatabaseOverviewTab(
    connectionId: string,
    database: string,
    mode: 'preview' | 'pinned',
    paneId: PaneId = 'left'
  ) {
    const tabId = `db-overview:${connectionId}:${database}`
    const tabName = `DB: ${database}`

    if (mode === 'pinned') {
      const preview = paneTabsStore.getPreviewTab(paneId)
      if (
        preview?.tabType === 'database-overview' &&
        preview.connectionId === connectionId &&
        preview.database === database
      ) {
        paneTabsStore.pinPreviewTab(paneId)
        return
      }
    }

    paneTabsStore.addTab(
      paneId,
      {
        id: tabId,
        connectionId,
        database,
        name: tabName,
        tabType: 'database-overview'
      },
      mode
    )
  }

  /**
   * Preload metadata for all restored database tabs.
   * This ensures tabs display data immediately after page reload
   * instead of showing empty until the user clicks on a database.
   */
  function preloadMetadataForRestoredTabs() {
    // Collect all database tabs from both panes
    const allTabs: PaneTab[] = []
    for (const paneId of ['left', 'right'] as const) {
      const state = paneTabsStore.getPaneState(paneId)
      allTabs.push(...state.tabs)
    }

    // Extract unique connectionId + database pairs from database tabs
    const seen = new Set<string>()
    for (const tab of allTabs) {
      if (tab.tabType === 'database' && tab.connectionId && tab.database) {
        const key = `${tab.connectionId}:${tab.database}`
        if (!seen.has(key)) {
          seen.add(key)
          // Fire and forget - ensureMetadata handles deduplication internally
          void navigationStore.ensureMetadata(tab.connectionId, tab.database, false)
        }
      }
    }
  }

  return {
    ensureLeftPaneMatchesViewState,
    getConnectionTabName,
    openConnectionDetailsTab,
    openDatabaseOverviewTab,
    preloadMetadataForRestoredTabs
  }
}
