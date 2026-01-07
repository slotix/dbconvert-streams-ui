import { watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
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
      diagram: query.diagram === 'true',
      schema: query.schema as string | undefined,
      type: query.type as 'table' | 'view' | 'function' | 'procedure' | undefined,
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

  // URL → Store (when user uses back/forward buttons or loads a shared URL)
  watch(
    [() => route.params.id, () => route.query] as const,
    ([connId, _query], [oldConnId, oldQuery]) => {
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
