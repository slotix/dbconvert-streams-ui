import { computed, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useConnectionsStore } from '@/stores/connections'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection } from '@/types/connections'
import { getConnectionKindFromSpec, isFileBasedKind } from '@/types/specs'

interface UseStreamExplorerNavigationOptions {
  stream: Ref<StreamConfig>
  source: Ref<Connection | undefined>
  target: Ref<Connection | undefined>
}

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
      window.sessionStorage.setItem('explorerFocusConnectionId', source.value.id)
    } else if (sourceDatabase.value) {
      explorerNavigationStore.selectDatabase(source.value.id, sourceDatabase.value)
    }

    router.push({
      name: 'DatabaseMetadata',
      params: { id: source.value.id },
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
      window.sessionStorage.setItem('explorerFocusConnectionId', target.value.id)
    } else if (targetDatabase.value) {
      explorerNavigationStore.selectDatabase(target.value.id, targetDatabase.value)
    }

    router.push({
      name: 'DatabaseMetadata',
      params: { id: target.value.id },
      query: {
        details: 'true',
        db: isFileTarget.value ? undefined : targetDatabase.value || undefined
      }
    })
  }

  return {
    isFileTarget,
    navigateToSourceExplorer,
    navigateToTargetExplorer
  }
}
