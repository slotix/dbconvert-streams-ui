import { ref, onUnmounted } from 'vue'

/**
 * Pure UI mechanics for split pane resizing
 * Handles drag interactions, mouse events, and pane sizing
 */
export function useSplitPaneResize() {
  // Split sizing/resizer state
  const splitGrow = ref(50) // percentage width for left pane (0..100)
  const isResizing = ref(false)
  const splitContainerRef = ref<HTMLElement | null>(null)
  const leftPaneRef = ref<HTMLElement | null>(null)

  // Private state for resize tracking
  let startX = 0
  let startLeftWidth = 0
  let containerWidth = 0
  let prevUserSelect: string | null = null

  /**
   * Handle mouse down on the divider to start resize
   */
  function onDividerMouseDown(e: MouseEvent) {
    if (!splitContainerRef.value || !leftPaneRef.value) return

    isResizing.value = true
    startX = e.clientX

    const leftRect = leftPaneRef.value.getBoundingClientRect()
    const contRect = splitContainerRef.value.getBoundingClientRect()
    startLeftWidth = leftRect.width
    containerWidth = contRect.width

    window.addEventListener('mousemove', onDividerMouseMove)
    window.addEventListener('mouseup', onDividerMouseUp, { once: true })

    // Prevent text selection during resize; remember previous value
    prevUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'
  }

  /**
   * Handle mouse move during resize
   */
  function onDividerMouseMove(e: MouseEvent) {
    if (!isResizing.value || !containerWidth) return

    const dx = e.clientX - startX
    const newLeft = startLeftWidth + dx
    const pct = Math.max(20, Math.min(80, (newLeft / containerWidth) * 100))
    splitGrow.value = pct
  }

  /**
   * Handle mouse up to end resize
   */
  function onDividerMouseUp() {
    isResizing.value = false
    document.body.style.userSelect = prevUserSelect || ''
    window.removeEventListener('mousemove', onDividerMouseMove)
  }

  /**
   * Handle double click on divider to reset to 50/50
   */
  function onDividerDoubleClick() {
    splitGrow.value = 50
  }

  /**
   * Reset split to 50/50 (used when content is set)
   */
  function resetSplitSize() {
    splitGrow.value = 50
  }

  // Cleanup on unmount
  onUnmounted(() => {
    window.removeEventListener('mousemove', onDividerMouseMove)
  })

  return {
    // Reactive state
    splitGrow,
    isResizing,
    splitContainerRef,
    leftPaneRef,

    // Methods
    onDividerMouseDown,
    onDividerDoubleClick,
    resetSplitSize
  }
}

export type SplitPaneResizeController = ReturnType<typeof useSplitPaneResize>
