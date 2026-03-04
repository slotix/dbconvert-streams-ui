import { useStreamsStore } from '@/stores/streamConfig'
import { useMonitoringStore } from '@/stores/monitoring'
import { useCommonStore } from '@/stores/common'
import type { StreamConfig } from '@/types/streamConfig'
import { ApiError } from '@/utils/errorHandler'

function isActiveStreamsError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.details?.field === 'stream_state'
}

function parseActiveStreamIDs(error: unknown): string[] {
  if (error instanceof ApiError && error.details) {
    const details = error.details
    const value = details.value
    if (Array.isArray(value)) {
      return Array.from(new Set(value.map((id) => String(id).trim()).filter((id) => id.length > 0)))
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      return [value.trim()]
    }
  }

  return []
}

function formatActiveStreamsLabel(streamIDs: string[]): string {
  if (streamIDs.length === 0) {
    return 'another active stream'
  }
  return streamIDs.join(', ')
}

export function useStreamActions() {
  const streamsStore = useStreamsStore()
  const monitoringStore = useMonitoringStore()
  const commonStore = useCommonStore()

  function removeBlockedStreamID(streamID: string) {
    const remaining = monitoringStore.blockedActiveStreamIDs.filter((id) => id !== streamID)
    if (remaining.length === 0) {
      monitoringStore.clearActiveStreamGate()
      monitoringStore.setForceStopRecommended(false)
      return
    }
    monitoringStore.setActiveStreamGate(remaining, monitoringStore.activeStreamGateMessage)
  }

  async function stopBlockedStreams(force = false): Promise<void> {
    const blockedStreamIDs = [...monitoringStore.blockedActiveStreamIDs]
    if (blockedStreamIDs.length === 0) {
      commonStore.showNotification('No blocked active streams were detected', 'warning')
      return
    }

    const failed: string[] = []
    for (const blockedStreamID of blockedStreamIDs) {
      try {
        if (force) {
          await streamsStore.forceStopStream(blockedStreamID)
        } else {
          await streamsStore.stopStream(blockedStreamID)
        }
        removeBlockedStreamID(blockedStreamID)
      } catch {
        failed.push(blockedStreamID)
      }
    }

    const stoppedCount = blockedStreamIDs.length - failed.length
    if (stoppedCount > 0) {
      const modeLabel = force ? 'Force-stopped' : 'Stopped'
      commonStore.showNotification(`${modeLabel} ${stoppedCount} active stream(s)`, 'success')
    }

    if (failed.length > 0) {
      monitoringStore.setActiveStreamGate(failed, monitoringStore.activeStreamGateMessage)
      const modeLabel = force ? 'force-stop' : 'stop'
      commonStore.showNotification(`Failed to ${modeLabel}: ${failed.join(', ')}`, 'error')
      return
    }

    monitoringStore.clearActiveStreamGate()
    monitoringStore.setForceStopRecommended(false)
    monitoringStore.requestShowMonitorTab()
  }

  async function startStream(stream: StreamConfig): Promise<string | null> {
    if (!stream.id) return null
    if (commonStore.needsApiKey) {
      commonStore.requireApiKey()
      commonStore.showNotification('Enter your API key to run streams', 'warning')
      return null
    }

    async function runStart(): Promise<string> {
      const streamID = await streamsStore.startStream(stream.id!)
      monitoringStore.setForceStopRecommended(false)
      monitoringStore.clearActiveStreamGate()
      commonStore.showNotification('Stream started', 'success')
      monitoringStore.setStream(streamID, stream)
      monitoringStore.requestShowMonitorTab()
      return streamID
    }

    try {
      return await runStart()
    } catch (err: unknown) {
      if (isActiveStreamsError(err)) {
        const activeStreamIDs = parseActiveStreamIDs(err)
        const blockingStreamsLabel = formatActiveStreamsLabel(activeStreamIDs)
        monitoringStore.setForceStopRecommended(true)
        monitoringStore.setActiveStreamGate(activeStreamIDs, err.message)
        commonStore.showNotification(
          `Start blocked by ${blockingStreamsLabel}. Stop or force-stop the active run first.`,
          'warning'
        )
        return null
      } else if (err instanceof Error) {
        commonStore.showNotification(err.message, 'error')
      } else {
        commonStore.showNotification('An unknown error occurred', 'error')
      }
    }

    return null
  }

  async function pauseStream(streamId?: string): Promise<void> {
    const id = streamId || monitoringStore.streamID
    if (!id) return
    try {
      await streamsStore.pauseStream(id)
      commonStore.showNotification('Stream paused', 'success')
      monitoringStore.requestShowMonitorTab()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      commonStore.showNotification(`Failed to pause: ${errorMsg}`, 'error')
    }
  }

  async function resumeStream(streamId?: string): Promise<void> {
    const id = streamId || monitoringStore.streamID
    if (!id) return
    try {
      await streamsStore.resumeStream(id)
      commonStore.showNotification('Stream resumed', 'success')
      monitoringStore.requestShowMonitorTab()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      commonStore.showNotification(`Failed to resume: ${errorMsg}`, 'error')
    }
  }

  async function stopStream(streamId?: string): Promise<void> {
    const id = streamId || monitoringStore.streamID
    if (!id) return
    try {
      await streamsStore.stopStream(id)
      removeBlockedStreamID(id)
      commonStore.showNotification('Stream stopped', 'success')
      monitoringStore.requestShowMonitorTab()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      commonStore.showNotification(`Failed to stop: ${errorMsg}`, 'error')
    }
  }

  async function forceStopStream(streamId?: string): Promise<void> {
    const id = streamId || monitoringStore.streamID
    if (!id) return
    try {
      await streamsStore.forceStopStream(id)
      removeBlockedStreamID(id)
      commonStore.showNotification('Stream force-stopped', 'success')
      monitoringStore.requestShowMonitorTab()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      commonStore.showNotification(`Failed to force-stop: ${errorMsg}`, 'error')
    }
  }

  async function stopBlockedActiveStreams(): Promise<void> {
    await stopBlockedStreams(false)
  }

  async function forceStopBlockedActiveStreams(): Promise<void> {
    await stopBlockedStreams(true)
  }

  return {
    startStream,
    pauseStream,
    resumeStream,
    stopStream,
    forceStopStream,
    stopBlockedActiveStreams,
    forceStopBlockedActiveStreams
  }
}
