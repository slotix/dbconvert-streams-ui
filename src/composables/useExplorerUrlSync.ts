import { watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useExplorerViewStateStore } from '@/stores/explorerViewState'

/**
 * Syncs explorer view state with URL (two-way)
 *
 * Data Flow:
 * 1. On mount: URL → Store (for shared URLs)
 * 2. Store → URL: When user navigates via UI (click connection/database/table)
 * 3. URL → Store: When user uses back/forward buttons
 *
 * Usage:
 * Call this once in DatabaseExplorerView.vue setup:
 *   useExplorerUrlSync()
 */
export function useExplorerUrlSync() {
  const route = useRoute()
  const router = useRouter()
  const viewState = useExplorerViewStateStore()

  // Helper to parse URL and update store
  function syncUrlToStore() {
    const connId = route.params.id as string
    if (!connId) return

    const query = route.query

    // Parse URL params and update store
    viewState._updateFromUrl({
      connId,
      details: query.details === 'true',
      database: query.db as string | undefined,
      schema: query.schema as string | undefined,
      type: query.type as 'table' | 'view' | undefined,
      name: query.name as string | undefined,
      file: query.file as string | undefined
    })
  }

  // On mount: Read URL and update store
  // This handles shared URLs - the URL takes precedence over localStorage
  onMounted(() => {
    const connId = route.params.id as string
    if (connId) {
      // URL has a connection - sync to store
      syncUrlToStore()
    }
  })

  // Watcher 1: Store → URL (when user navigates via UI)
  // This updates the URL to reflect the current store state
  watch(
    () => ({
      viewType: viewState.viewType,
      connectionId: viewState.connectionId,
      database: viewState.databaseName,
      schema: viewState.schemaName,
      type: viewState.objectType,
      name: viewState.objectName,
      file: viewState.filePath
    }),
    (state) => {
      // Don't sync if no connection selected
      if (!state.connectionId) return

      // Build query params based on view type
      const query: Record<string, string> = {}

      switch (state.viewType) {
        case 'connection-details':
          query.details = 'true'
          break

        case 'database-overview':
          if (state.database) query.db = state.database
          break

        case 'table-data':
          if (state.database) query.db = state.database
          if (state.schema) query.schema = state.schema
          if (state.type) query.type = state.type
          if (state.name) query.name = state.name
          break

        case 'file-browser':
          if (state.file) query.file = state.file
          break

        default:
          // Default to connection details if viewType is null
          query.details = 'true'
      }

      // Only update if different from current URL to avoid infinite loops
      const currentQuery = JSON.stringify(route.query)
      const newQuery = JSON.stringify(query)
      const currentPath = route.path
      const newPath = `/explorer/${state.connectionId}`

      if (currentQuery !== newQuery || currentPath !== newPath) {
        router.replace({
          path: newPath,
          query
        })
      }
    },
    { deep: true }
  )

  // Watcher 2: URL → Store (when user uses back/forward buttons)
  watch(
    [() => route.params.id, () => route.query] as const,
    ([connId, query], [oldConnId, oldQuery]) => {
      if (!connId) return

      // Skip if this is the initial trigger (handled by onMounted)
      if (oldConnId === undefined && oldQuery === undefined) return

      syncUrlToStore()
    },
    {
      // immediate: false - onMounted handles initial sync
      immediate: false
    }
  )
}
