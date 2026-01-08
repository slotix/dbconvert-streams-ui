import { computed, type Ref } from 'vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useMonitoringStore } from '@/stores/monitoring'
import { useCommonStore } from '@/stores/common'
import type { StreamConfig } from '@/types/streamConfig'
import { getStatusLabel, STATUS, type Status } from '@/constants'
import { useStreamActions } from '@/composables/useStreamActions'

export function useStreamControls(stream: Ref<StreamConfig>) {
  const streamsStore = useStreamsStore()
  const monitoringStore = useMonitoringStore()
  const commonStore = useCommonStore()
  const streamActions = useStreamActions()

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
    await streamActions.startStream(stream.value)
  }

  async function pauseStream() {
    await streamActions.pauseStream(monitoringStore.streamID)
  }

  async function resumeStream() {
    await streamActions.resumeStream(monitoringStore.streamID)
  }

  async function stopStream() {
    await streamActions.stopStream(monitoringStore.streamID)
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
