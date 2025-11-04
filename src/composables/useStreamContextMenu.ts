import { ref, type Ref } from 'vue'

type ContextTarget = {
  kind: 'stream'
  streamId: string
  streamName: string
  isRunning: boolean
  isPaused: boolean
  isFinished: boolean
}

export function useStreamContextMenu() {
  const contextMenuVisible = ref(false)
  const contextMenuX = ref(0)
  const contextMenuY = ref(0)
  const contextTarget: Ref<ContextTarget | null> = ref(null)

  function showContextMenu(
    event: MouseEvent,
    streamId: string,
    streamName: string,
    isRunning: boolean,
    isPaused: boolean,
    isFinished: boolean
  ) {
    event.preventDefault()
    event.stopPropagation()

    contextTarget.value = {
      kind: 'stream',
      streamId,
      streamName,
      isRunning,
      isPaused,
      isFinished
    }

    contextMenuX.value = event.clientX
    contextMenuY.value = event.clientY
    contextMenuVisible.value = true
  }

  function closeContextMenu() {
    contextMenuVisible.value = false
    contextTarget.value = null
  }

  return {
    contextMenuVisible,
    contextMenuX,
    contextMenuY,
    contextTarget,
    showContextMenu,
    closeContextMenu
  }
}
