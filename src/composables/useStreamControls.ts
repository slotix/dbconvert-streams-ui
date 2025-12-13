import { computed, type Ref } from 'vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useMonitoringStore, statusEnum } from '@/stores/monitoring'
import { useCommonStore } from '@/stores/common'
import type { StreamConfig } from '@/types/streamConfig'
import { getStreamStatusLabel, type Status } from '@/constants'

export function useStreamControls(stream: Ref<StreamConfig>) {
  const streamsStore = useStreamsStore()
  const monitoringStore = useMonitoringStore()
  const commonStore = useCommonStore()

  const isStreamRunning = computed(() => {
    const configMatches = monitoringStore.streamConfig?.id === stream.value.id
    const hasStreamId = monitoringStore.streamID !== ''

    // No stream if config doesn't match or no stream ID
    if (!configMatches || !hasStreamId) return false

    // Check if stream has finished/failed/stopped - these are terminal states
    // A failed stream is NOT running, even if it has a streamID
    const terminalStates: Status[] = [
      statusEnum.FINISHED,
      statusEnum.STOPPED,
      statusEnum.FAILED,
      statusEnum.TIME_LIMIT_REACHED,
      statusEnum.EVENT_LIMIT_REACHED
    ]

    const isTerminal = terminalStates.includes(monitoringStore.status as Status)

    // If stream status is terminal, it's not running
    if (isTerminal) return false

    // Stream is running if it has ID, matches config, and is not in terminal state
    return true
  })

  const isPaused = computed(() => {
    if (!isStreamRunning.value) return false
    const statsHasPaused = monitoringStore.stats.some((stat) => stat.status === 'PAUSED')
    const streamStatusIsPaused = monitoringStore.status === statusEnum.PAUSED
    return statsHasPaused || streamStatusIsPaused
  })

  const isStreamFinished = computed(() => {
    if (!isStreamRunning.value) return false
    const areAllNodesFinished =
      monitoringStore.stats.length > 0 &&
      monitoringStore.stats.every((stat) => stat.status === 'FINISHED')

    const finishedStates: Status[] = [
      statusEnum.FINISHED,
      statusEnum.STOPPED,
      statusEnum.FAILED,
      statusEnum.TIME_LIMIT_REACHED,
      statusEnum.EVENT_LIMIT_REACHED
    ]

    const isStreamStatusFinished = finishedStates.includes(monitoringStore.status as Status)

    return areAllNodesFinished || isStreamStatusFinished
  })

  const hasFailed = computed(() => {
    return (
      monitoringStore.status === statusEnum.FAILED ||
      monitoringStore.stats.some((stat) => stat.status === 'FAILED')
    )
  })

  const isStopped = computed(() => {
    return (
      monitoringStore.status === statusEnum.STOPPED ||
      monitoringStore.stats.some((stat) => stat.status === 'STOPPED')
    )
  })

  const streamStatus = computed(() => {
    if (!isStreamRunning.value) {
      return getStreamStatusLabel(monitoringStore.status) || 'Ready'
    }
    if (hasFailed.value) return 'Failed'
    if (isStopped.value) return 'Stopped'
    if (isStreamFinished.value) {
      return getStreamStatusLabel(monitoringStore.status) || 'Finished'
    }
    if (isPaused.value) return 'Paused'
    return monitoringStore.currentStage?.description || 'Running'
  })

  async function startStream() {
    try {
      const streamID = await streamsStore.startStream(stream.value.id!)
      commonStore.showNotification('Stream started', 'success')
      monitoringStore.setStream(streamID, stream.value)
      monitoringStore.requestShowMonitorTab()
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes('active streams') || err.message.includes('stream_state')) {
          commonStore.showNotification(
            'Please wait for the current stream to finish before starting a new one',
            'warning'
          )
          setTimeout(async () => {
            try {
              const streamID = await streamsStore.startStream(stream.value.id!)
              commonStore.showNotification('Stream started', 'success')
              monitoringStore.setStream(streamID, stream.value)
              monitoringStore.requestShowMonitorTab()
            } catch (retryErr) {
              if (retryErr instanceof Error) {
                commonStore.showNotification(retryErr.message, 'error')
              }
            }
          }, 2000)
        } else {
          commonStore.showNotification(err.message, 'error')
        }
      } else {
        commonStore.showNotification('An unknown error occurred', 'error')
      }
    }
  }

  async function pauseStream() {
    try {
      await streamsStore.pauseStream(monitoringStore.streamID)
      commonStore.showNotification('Stream paused', 'success')
      monitoringStore.requestShowMonitorTab()
    } catch (error) {
      console.error('Pause stream failed:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      commonStore.showNotification(`Failed to pause: ${errorMsg}`, 'error')
    }
  }

  async function resumeStream() {
    try {
      await streamsStore.resumeStream(monitoringStore.streamID)
      commonStore.showNotification('Stream resumed', 'success')
      monitoringStore.requestShowMonitorTab()
    } catch (error) {
      console.error('Resume stream failed:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      commonStore.showNotification(`Failed to resume: ${errorMsg}`, 'error')
    }
  }

  async function stopStream() {
    try {
      await streamsStore.stopStream(monitoringStore.streamID)
      commonStore.showNotification('Stream stopped', 'success')
      monitoringStore.requestShowMonitorTab()
    } catch (error) {
      console.error('Stop stream failed:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      commonStore.showNotification(`Failed to stop: ${errorMsg}`, 'error')
    }
  }

  return {
    isStreamRunning,
    isPaused,
    isStreamFinished,
    isStopped,
    streamStatus,
    startStream,
    pauseStream,
    resumeStream,
    stopStream
  }
}
