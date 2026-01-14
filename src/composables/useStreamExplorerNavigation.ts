import { computed, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useConnectionsStore } from '@/stores/connections'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useExplorerViewStateStore } from '@/stores/explorerViewState'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection } from '@/types/connections'
import { getConnectionKindFromSpec, isFileBasedKind } from '@/types/specs'

interface UseStreamExplorerNavigationOptions {
  stream: Ref<StreamConfig>
  source: Ref<Connection | undefined>
  target: Ref<Connection | undefined>
  allConnections?: Ref<Connection[]>
}

export function useStreamExplorerNavigation({
  stream,
  source,
  target,
  allConnections
}: UseStreamExplorerNavigationOptions) {
  const router = useRouter()
  const connectionsStore = useConnectionsStore()
  const fileExplorerStore = useFileExplorerStore()
  const explorerNavigationStore = useExplorerNavigationStore()
  const explorerViewStateStore = useExplorerViewStateStore()

  const isFileTarget = computed(() => {
    const kind = getConnectionKindFromSpec(target.value?.spec)
    return isFileBasedKind(kind)
  })

  const sourceDatabase = computed(
    () => stream.value?.source?.connections?.[0]?.database || undefined
  )
  const targetDatabase = computed(
    () =>
      stream.value?.targetDatabase || stream.value?.target?.spec?.database?.database || undefined
  )

  async function navigateToSourceExplorer() {
    if (!source.value?.id) return

    explorerNavigationStore.setActiveConnectionId(source.value.id)
    connectionsStore.setCurrentConnection(source.value.id)

    const sourceKind = getConnectionKindFromSpec(source.value.spec)
    const isSourceFile = isFileBasedKind(sourceKind)

    if (isSourceFile) {
      await fileExplorerStore.loadEntries(source.value.id, true)
      explorerNavigationStore.selectConnection(source.value.id)
    } else if (sourceDatabase.value) {
      explorerNavigationStore.selectDatabase(source.value.id, sourceDatabase.value)
    }

    if (isSourceFile) {
      explorerViewStateStore.selectConnection(source.value.id)
    } else if (sourceDatabase.value) {
      explorerViewStateStore.selectDatabase(source.value.id, sourceDatabase.value)
    } else {
      explorerViewStateStore.selectConnection(source.value.id)
    }

    router.push({
      name: 'DatabaseExplorer',
      query: {
        details: 'true',
        db: isSourceFile ? undefined : sourceDatabase.value || undefined
      }
    })
  }

  async function navigateToTargetExplorer() {
    if (!target.value?.id) return

    explorerNavigationStore.setActiveConnectionId(target.value.id)
    connectionsStore.setCurrentConnection(target.value.id)

    if (isFileTarget.value) {
      await fileExplorerStore.loadEntries(target.value.id, true)
      explorerNavigationStore.selectConnection(target.value.id)
    } else if (targetDatabase.value) {
      explorerNavigationStore.selectDatabase(target.value.id, targetDatabase.value)
    }

    if (isFileTarget.value) {
      explorerViewStateStore.selectConnection(target.value.id)
    } else if (targetDatabase.value) {
      explorerViewStateStore.selectDatabase(target.value.id, targetDatabase.value)
    } else {
      explorerViewStateStore.selectConnection(target.value.id)
    }

    router.push({
      name: 'DatabaseExplorer',
      query: {
        details: 'true',
        db: isFileTarget.value ? undefined : targetDatabase.value || undefined
      }
    })
  }

  async function navigateToConnectionExplorer(connectionId: string) {
    // Find connection from allConnections or from the store
    const connection =
      allConnections?.value?.find((c) => c.id === connectionId) ||
      connectionsStore.connections.find((c) => c.id === connectionId)

    if (!connection?.id) return

    explorerNavigationStore.setActiveConnectionId(connection.id)
    connectionsStore.setCurrentConnection(connection.id)

    const connectionKind = getConnectionKindFromSpec(connection.spec)
    const isFileBased = isFileBasedKind(connectionKind)

    if (isFileBased) {
      await fileExplorerStore.loadEntries(connection.id, true)
      explorerNavigationStore.selectConnection(connection.id)
    }

    // Find the database from stream config for this connection
    const connMapping = stream.value?.source?.connections?.find(
      (c) => c.connectionId === connectionId
    )
    const database = connMapping?.database

    if (!isFileBased && database) {
      explorerNavigationStore.selectDatabase(connection.id, database)
    }

    if (isFileBased) {
      explorerViewStateStore.selectConnection(connection.id)
    } else if (database) {
      explorerViewStateStore.selectDatabase(connection.id, database)
    } else {
      explorerViewStateStore.selectConnection(connection.id)
    }

    router.push({
      name: 'DatabaseExplorer',
      query: {
        details: 'true',
        db: isFileBased ? undefined : database || undefined
      }
    })
  }

  return {
    isFileTarget,
    navigateToSourceExplorer,
    navigateToTargetExplorer,
    navigateToConnectionExplorer
  }
}
