import { computed, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useConnectionsStore } from '@/stores/connections'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection } from '@/types/connections'

interface UseStreamExplorerNavigationOptions {
  stream: Ref<StreamConfig>
  source: Ref<Connection | undefined>
  target: Ref<Connection | undefined>
}

const FILE_TYPES = ['csv', 'jsonl', 'parquet']

export function useStreamExplorerNavigation({
  stream,
  source,
  target
}: UseStreamExplorerNavigationOptions) {
  const router = useRouter()
  const connectionsStore = useConnectionsStore()
  const fileExplorerStore = useFileExplorerStore()
  const explorerNavigationStore = useExplorerNavigationStore()

  const isFileTarget = computed(() => {
    const type = target.value?.type?.toLowerCase() || ''
    return type.includes('file') || FILE_TYPES.includes(type)
  })

  async function navigateToSourceExplorer() {
    if (!source.value?.id) return

    explorerNavigationStore.setActiveConnectionId(source.value.id)
    connectionsStore.setCurrentConnection(source.value.id)

    const sourceType = source.value.type?.toLowerCase() || ''
    const isSourceFile = FILE_TYPES.includes(sourceType) || sourceType.includes('file')

    if (isSourceFile) {
      await fileExplorerStore.loadEntries(source.value.id, true)
      explorerNavigationStore.selectConnection(source.value.id)
      window.sessionStorage.setItem('explorerFocusConnectionId', source.value.id)
    } else if (stream.value?.sourceDatabase) {
      explorerNavigationStore.selectDatabase(source.value.id, stream.value.sourceDatabase)
    }

    router.push({
      name: 'DatabaseMetadata',
      params: { id: source.value.id },
      query: {
        details: 'true',
        db: isSourceFile ? undefined : stream.value.sourceDatabase
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
      window.sessionStorage.setItem('explorerFocusConnectionId', target.value.id)
    } else if (stream.value?.targetDatabase) {
      explorerNavigationStore.selectDatabase(target.value.id, stream.value.targetDatabase)
    }

    router.push({
      name: 'DatabaseMetadata',
      params: { id: target.value.id },
      query: {
        details: 'true',
        db: isFileTarget.value ? undefined : stream.value.targetDatabase
      }
    })
  }

  return {
    isFileTarget,
    navigateToSourceExplorer,
    navigateToTargetExplorer
  }
}
