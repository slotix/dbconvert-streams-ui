import { watch, nextTick, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/**
 * Composable for handling route synchronization and navigation
 * in the Database Explorer view.
 */
export function useExplorerRouter(options: {
  recentConnections: Ref<Array<{ id: string }>>
  lastViewedConnectionId: Ref<string>
  currentConnectionId: Ref<string | null>
  currentFileEntries: Ref<any[]>
  onSelectConnection: (payload: { connectionId: string }) => void
  onFileSelect: (payload: { connectionId: string; path: string }) => void
  setFocusConnectionId: (id: string | null) => void
}) {
  const route = useRoute()
  const router = useRouter()

  // Watch for /explorer root path and redirect to recent connection
  watch(
    () => route.path,
    (newPath) => {
      if (newPath === '/explorer' && options.recentConnections.value.length > 0) {
        const existsInRecent =
          !!options.lastViewedConnectionId.value &&
          options.recentConnections.value.some((c) => c.id === options.lastViewedConnectionId.value)
        const connectionToUse = existsInRecent
          ? options.lastViewedConnectionId.value
          : options.recentConnections.value[options.recentConnections.value.length - 1].id

        router.replace(`/explorer/${connectionToUse}`)
      }
    },
    { immediate: true }
  )

  // Watch for focus/new query params
  watch(
    () => route.query.focus || route.query.new,
    async (flag) => {
      if (!flag) return
      const id = options.currentConnectionId.value
      if (!id) return
      options.onSelectConnection({ connectionId: id })
      options.setFocusConnectionId(id)
      await nextTick()
      // After onSelectConnection sets details=true in the route, we need to preserve it
      // while removing the focus/new params
      router.replace({ path: `/explorer/${id}`, query: { details: 'true' } })
    },
    { immediate: true }
  )

  // Watch for file query param changes
  watch(
    () => route.query.file,
    (filePath) => {
      if (
        filePath &&
        options.currentConnectionId.value &&
        options.currentFileEntries.value.length > 0
      ) {
        options.onFileSelect({
          connectionId: options.currentConnectionId.value,
          path: filePath as string
        })
      }
    }
  )

  // Navigation helpers
  function navigateToConnection(connectionId: string) {
    router.replace({ path: `/explorer/${connectionId}` })
  }

  function navigateToDatabase(connectionId: string, database: string) {
    router.replace({ path: `/explorer/${connectionId}`, query: { db: database } })
  }

  function navigateToTable(
    connectionId: string,
    database: string,
    schema?: string,
    type?: string,
    name?: string,
    paneId?: 'left' | 'right'
  ) {
    const query: Record<string, string | undefined> = {
      db: database,
      schema: schema || undefined,
      type: type || undefined,
      name: name || undefined
    }

    // Add pane-specific parameters if specified
    if (paneId === 'right' && type && name) {
      query.rightType = type
      query.rightName = name
      if (schema) query.rightSchema = schema
    } else if (paneId === 'left' && type && name) {
      // Left pane uses the default parameters (for backwards compatibility)
      query.type = type
      query.name = name
      if (schema) query.schema = schema
    }

    router.replace({
      path: `/explorer/${connectionId}`,
      query
    })
  }

  function navigateToFile(connectionId: string, filePath: string) {
    router.replace({
      path: `/explorer/${connectionId}`,
      query: {
        file: filePath,
        db: undefined,
        schema: undefined,
        type: undefined,
        name: undefined
      }
    })
  }

  return {
    navigateToConnection,
    navigateToDatabase,
    navigateToTable,
    navigateToFile
  }
}
