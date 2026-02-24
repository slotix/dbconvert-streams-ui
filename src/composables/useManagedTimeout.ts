import { onUnmounted } from 'vue'

type TimeoutId = ReturnType<typeof setTimeout>

/**
 * Tracks timeout handles and clears pending callbacks on unmount.
 * Useful for delayed listener attachment and UI feedback timers.
 */
export function useManagedTimeout() {
  const timeouts = new Set<TimeoutId>()

  function setManagedTimeout(callback: () => void, delayMs: number): TimeoutId {
    const timeoutId = setTimeout(() => {
      timeouts.delete(timeoutId)
      callback()
    }, delayMs)

    timeouts.add(timeoutId)
    return timeoutId
  }

  function clearManagedTimeout(timeoutId: TimeoutId | null) {
    if (!timeoutId) {
      return
    }

    clearTimeout(timeoutId)
    timeouts.delete(timeoutId)
  }

  function clearAllManagedTimeouts() {
    timeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId)
    })
    timeouts.clear()
  }

  onUnmounted(() => {
    clearAllManagedTimeouts()
  })

  return {
    setManagedTimeout,
    clearManagedTimeout,
    clearAllManagedTimeouts
  }
}
