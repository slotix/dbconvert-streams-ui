import { ref, watch, onScopeDispose, type Ref } from 'vue'
import { apiClient } from '@/api/apiClient'
import { useCommonStore } from '@/stores/common'
import type { StreamRun } from '@/types/streamHistory'

export type StreamDetailsTab = 'configuration' | 'monitor' | 'history' | 'compare'

interface UseStreamHistoryOptions {
  streamId: Ref<string>
  activeTab: Ref<StreamDetailsTab>
  isStreamFinished: Ref<boolean>
}

export function useStreamHistory({
  streamId,
  activeTab,
  isStreamFinished
}: UseStreamHistoryOptions) {
  const commonStore = useCommonStore()
  const historyRuns = ref<StreamRun[]>([])
  const isLoadingHistory = ref(false)
  const historyAbortController = ref<AbortController | null>(null)
  let delayedRefreshTimer: ReturnType<typeof setTimeout> | null = null

  async function loadStreamHistory() {
    if (!streamId.value) return

    try {
      if (historyAbortController.value) {
        historyAbortController.value.abort()
      }
      historyAbortController.value = new AbortController()
      isLoadingHistory.value = true

      const response = await apiClient.get(`/stream-configs/${streamId.value}/history`, {
        signal: historyAbortController.value.signal
      })
      historyRuns.value = response.data
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.debug('History request cancelled due to stream switch')
        return
      }
      const errorMsg = error instanceof Error ? error.message : 'Failed to load history'
      commonStore.showNotification(errorMsg, 'error')
      console.error('Failed to load stream history:', error)
    } finally {
      isLoadingHistory.value = false
    }
  }

  async function handleDeleteRun(runId: string) {
    try {
      await apiClient.delete(`/stream-configs/${streamId.value}/runs/${runId}`)
      commonStore.showNotification('Run deleted successfully', 'success')
      await loadStreamHistory()
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete stream run'
      commonStore.showNotification(errorMsg, 'error')
      console.error('Failed to delete run:', error)
    }
  }

  async function handleClearAll() {
    try {
      await apiClient.delete(`/stream-configs/${streamId.value}/runs`)
      commonStore.showNotification('All runs deleted successfully', 'success')
      await loadStreamHistory()
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete all runs'
      commonStore.showNotification(errorMsg, 'error')
      console.error('Failed to delete all runs:', error)
    }
  }

  watch(streamId, async () => {
    if (historyAbortController.value) {
      historyAbortController.value.abort()
    }
    historyRuns.value = []

    if (activeTab.value === 'history') {
      await loadStreamHistory()
    }
  })

  watch(activeTab, async (newTab) => {
    if (newTab === 'history') {
      await loadStreamHistory()
    }
  })

  watch(
    isStreamFinished,
    (finished, wasFinished) => {
      if (finished && !wasFinished) {
        if (delayedRefreshTimer) clearTimeout(delayedRefreshTimer)
        delayedRefreshTimer = setTimeout(async () => {
          delayedRefreshTimer = null
          if (activeTab.value === 'history') {
            await loadStreamHistory()
          }
        }, 2000)
      }
    },
    { immediate: false }
  )

  onScopeDispose(() => {
    if (delayedRefreshTimer) {
      clearTimeout(delayedRefreshTimer)
      delayedRefreshTimer = null
    }
    if (historyAbortController.value) {
      historyAbortController.value.abort()
    }
  })

  return {
    historyRuns,
    isLoadingHistory,
    loadStreamHistory,
    handleDeleteRun,
    handleClearAll
  }
}
