import { useStreamsStore } from '@/stores/streamConfig'
import { useMonitoringStore } from '@/stores/monitoring'
import { useCommonStore } from '@/stores/common'
import type { StreamConfig } from '@/types/streamConfig'

function isActiveStreamsError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return error.message.includes('active streams') || error.message.includes('stream_state')
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function useStreamActions() {
  const streamsStore = useStreamsStore()
  const monitoringStore = useMonitoringStore()
  const commonStore = useCommonStore()

  async function startStream(stream: StreamConfig): Promise<string | null> {
    if (!stream.id) return null

    async function runStart(): Promise<string> {
      const streamID = await streamsStore.startStream(stream.id!)
      commonStore.showNotification('Stream started', 'success')
      monitoringStore.setStream(streamID, stream)
      monitoringStore.requestShowMonitorTab()
      return streamID
    }

    try {
      return await runStart()
    } catch (err: unknown) {
      if (isActiveStreamsError(err)) {
        commonStore.showNotification(
          'Please wait for the current stream to finish before starting a new one',
          'warning'
        )
        await delay(2000)
        try {
          return await runStart()
        } catch (retryErr) {
          if (retryErr instanceof Error) {
            commonStore.showNotification(retryErr.message, 'error')
          }
        }
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
      commonStore.showNotification('Stream stopped', 'success')
      monitoringStore.requestShowMonitorTab()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      commonStore.showNotification(`Failed to stop: ${errorMsg}`, 'error')
    }
  }

  return {
    startStream,
    pauseStream,
    resumeStream,
    stopStream
  }
}
