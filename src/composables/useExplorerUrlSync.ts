import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useExplorerViewStateStore } from '@/stores/explorerViewState'

/**
 * Syncs explorer view state with URL (two-way)
 *
 * CRITICAL: This runs in watchers, NOT in onMounted, so it doesn't suffer
 * from Vue Router timing issues.
 *
 * Data Flow:
 * 1. Store → URL: When user navigates via UI (click connection/database/table)
 * 2. URL → Store: When user uses back/forward buttons or opens shared URL
 *
 * Usage:
 * Call this once in DatabaseExplorerView.vue setup:
 *   useExplorerUrlSync()
 */
export function useExplorerUrlSync() {
  const route = useRoute()
  const router = useRouter()
  const viewState = useExplorerViewStateStore()

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

  // Watcher 2: URL → Store (when user uses back/forward buttons or shares URL)
  // This updates the store to reflect the current URL
  watch(
    [() => route.params.id, () => route.query] as const,
    ([connId, query]) => {
      if (!connId) return

      const connIdStr = connId as string

      // Parse URL params and update store
      // Use the internal _updateFromUrl method to avoid double-saving to localStorage
      viewState._updateFromUrl({
        connId: connIdStr,
        details: query.details === 'true',
        database: query.db as string | undefined,
        schema: query.schema as string | undefined,
        type: query.type as 'table' | 'view' | undefined,
        name: query.name as string | undefined,
        file: query.file as string | undefined
      })
    },
    {
      // immediate: false is CRITICAL
      // We don't want this to run on mount because:
      // 1. Store already has correct state from localStorage
      // 2. Store→URL watcher will sync URL to match store
      // 3. Running immediately would cause URL to override localStorage state
      immediate: false
    }
  )
}
