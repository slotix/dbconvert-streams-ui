import { computed, type Ref } from 'vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useMonitoringStore } from '@/stores/monitoring'
import { useCommonStore } from '@/stores/common'
import type { StreamConfig } from '@/types/streamConfig'
import { getStatusLabel, STATUS, type Status } from '@/constants'

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
      STATUS.FINISHED,
      STATUS.STOPPED,
      STATUS.FAILED,
      STATUS.TIME_LIMIT_REACHED,
      STATUS.EVENT_LIMIT_REACHED
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
    const streamStatusIsPaused = monitoringStore.status === STATUS.PAUSED
    return statsHasPaused || streamStatusIsPaused
  })

  const isStreamFinished = computed(() => {
    if (!isStreamRunning.value) return false
    const areAllNodesFinished =
      monitoringStore.stats.length > 0 &&
      monitoringStore.stats.every((stat) => stat.status === 'FINISHED')

    const finishedStates: Status[] = [
      STATUS.FINISHED,
      STATUS.STOPPED,
      STATUS.FAILED,
      STATUS.TIME_LIMIT_REACHED,
      STATUS.EVENT_LIMIT_REACHED
    ]

    const isStreamStatusFinished = finishedStates.includes(monitoringStore.status as Status)

    return areAllNodesFinished || isStreamStatusFinished
  })

  const hasFailed = computed(() => {
    return (
      monitoringStore.status === STATUS.FAILED ||
      monitoringStore.stats.some((stat) => stat.status === 'FAILED')
    )
  })

  const isStopped = computed(() => {
    return (
      monitoringStore.status === STATUS.STOPPED ||
      monitoringStore.stats.some((stat) => stat.status === 'STOPPED')
    )
  })

  const canValidateConstraints = computed(() => {
    const configMatches = monitoringStore.streamConfig?.id === stream.value.id
    const hasStreamId = monitoringStore.streamID !== ''
    if (!configMatches || !hasStreamId) return false

    return (
      monitoringStore.status === STATUS.FINISHED ||
      monitoringStore.status === STATUS.STOPPED ||
      monitoringStore.stats.some((stat) => stat.status === 'FINISHED' || stat.status === 'STOPPED')
    )
  })

  const streamStatus = computed(() => {
    if (!isStreamRunning.value) {
      return getStatusLabel(monitoringStore.status) || 'Ready'
    }
    if (hasFailed.value) return 'Failed'
    if (isStopped.value) return 'Stopped'
    if (isStreamFinished.value) {
      return getStatusLabel(monitoringStore.status) || 'Finished'
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

  async function runConstraints() {
    if (!stream.value.id) return
    try {
      const result = await streamsStore.runTargetConstraintsAction(stream.value.id)

      if (result.engine === 'postgres') {
        const count = result.validatedCount ?? 0
        commonStore.showNotification(`Validated ${count} constraint(s)`, 'success')
        return
      }

      if (result.engine === 'mysql') {
        const total = result.totalOrphanRows ?? 0
        if (total === 0) {
          commonStore.showNotification('No FK violations found', 'success')
          return
        }
        commonStore.showNotification(`FK violations found: ${total} orphan row(s)`, 'error')
        return
      }

      commonStore.showNotification('Constraints action completed', 'success')
    } catch (error) {
      console.error('Constraints action failed:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      commonStore.showNotification(`Constraints action failed: ${errorMsg}`, 'error')
    }
  }

  return {
    isStreamRunning,
    isPaused,
    isStreamFinished,
    isStopped,
    canValidateConstraints,
    streamStatus,
    startStream,
    pauseStream,
    resumeStream,
    stopStream,
    runConstraints
  }
}
