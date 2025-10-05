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
      await nextTick()
      const clearedQuery = { ...route.query }
      delete clearedQuery.new
      delete clearedQuery.focus
      options.setFocusConnectionId(id)
      router.replace({ path: `/explorer/${id}`, query: clearedQuery })
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
    name?: string
  ) {
    router.replace({
      path: `/explorer/${connectionId}`,
      query: {
        db: database,
        schema: schema || undefined,
        type: type || undefined,
        name: name || undefined
      }
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
