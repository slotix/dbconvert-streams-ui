import { ref, onUnmounted } from 'vue'

export function useSourcePillsOverflow() {
  const pillsContainerRef = ref<HTMLElement | null>(null)
  const overflowCount = ref(0)
  let pillsResizeObserver: ResizeObserver | null = null

  function recomputePillOverflow() {
    const container = pillsContainerRef.value
    if (!container) {
      overflowCount.value = 0
      return
    }

    const containerRight = container.getBoundingClientRect().right
    const pillEls = container.querySelectorAll('[data-source-pill]')
    let hiddenPillCount = 0

    for (const pill of pillEls) {
      if (pill.getBoundingClientRect().right > containerRight + 2) {
        hiddenPillCount += 1
      }
    }

    overflowCount.value = hiddenPillCount
  }

  function setupPillsObserver() {
    const container = pillsContainerRef.value
    if (!container || typeof ResizeObserver === 'undefined') {
      return
    }

    pillsResizeObserver = new ResizeObserver(() => {
      recomputePillOverflow()
    })
    pillsResizeObserver.observe(container)
  }

  function cleanupPillsObserver() {
    pillsResizeObserver?.disconnect()
    pillsResizeObserver = null
  }

  onUnmounted(() => {
    cleanupPillsObserver()
  })

  return {
    pillsContainerRef,
    overflowCount,
    recomputePillOverflow,
    setupPillsObserver,
    cleanupPillsObserver
  }
}
