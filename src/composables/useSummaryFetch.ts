import { ref, onBeforeUnmount, type Ref } from 'vue'

const SLOW_HINT_DELAY_MS = 2500

export interface UseSummaryFetchOptions<T> {
  /**
   * Called to execute the actual fetch operation.
   * Receives the AbortSignal for cancellation and forceRefresh flag.
   */
  fetcher: (signal: AbortSignal, forceRefresh: boolean) => Promise<T>

  /**
   * Optional callback when fetch completes successfully.
   */
  onSuccess?: (result: T) => void

  /**
   * Optional callback when fetch fails.
   */
  onError?: (error: Error) => void
}

export interface UseSummaryFetchReturn<T> {
  loading: Ref<boolean>
  error: Ref<string | null>
  summary: Ref<T | null>
  showSlowHint: Ref<boolean>
  fetch: (forceRefresh?: boolean) => Promise<void>
  cancel: () => void
  cleanup: () => void
}

/**
 * Composable for managing summary fetch operations with:
 * - Request cancellation via AbortController
 * - Race condition handling with request sequence tracking
 * - Slow hint timer for long-running requests
 * - Automatic cleanup on unmount
 */
export function useSummaryFetch<T>(options: UseSummaryFetchOptions<T>): UseSummaryFetchReturn<T> {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const summary = ref<T | null>(null) as Ref<T | null>
  const showSlowHint = ref(false)

  let slowHintTimer: ReturnType<typeof setTimeout> | null = null
  let abortController: AbortController | null = null
  let activeRequestSeq = 0

  function clearSlowHintTimer() {
    if (!slowHintTimer) return
    clearTimeout(slowHintTimer)
    slowHintTimer = null
  }

  function isCanceledRequest(e: unknown): boolean {
    if (!e || typeof e !== 'object') return false
    const err = e as { name?: string; code?: string }
    return err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED'
  }

  function cancel() {
    if (!abortController) return
    abortController.abort()
    abortController = null
    activeRequestSeq++
    loading.value = false
    showSlowHint.value = false
    clearSlowHintTimer()
  }

  function cleanup() {
    if (abortController) {
      abortController.abort()
      abortController = null
      activeRequestSeq++
    }
    showSlowHint.value = false
    clearSlowHintTimer()
  }

  async function fetch(forceRefresh = false): Promise<void> {
    // Cancel any existing request
    if (abortController) {
      abortController.abort()
    }

    // Create new controller for this request
    abortController = new AbortController()
    const currentController = abortController
    const signal = currentController.signal
    const requestSeq = ++activeRequestSeq

    loading.value = true
    error.value = null
    showSlowHint.value = false
    clearSlowHintTimer()

    slowHintTimer = setTimeout(() => {
      if (requestSeq !== activeRequestSeq || abortController !== currentController) return
      if (!loading.value) return
      showSlowHint.value = true
    }, SLOW_HINT_DELAY_MS)

    try {
      const result = await options.fetcher(signal, forceRefresh)

      // Ignore results from stale/overlapped requests
      if (requestSeq !== activeRequestSeq || abortController !== currentController) {
        return
      }

      summary.value = result
      options.onSuccess?.(result)
    } catch (e) {
      // Ignore cancellation errors - expected when user switches tabs
      if (isCanceledRequest(e)) {
        return
      }

      // Ignore errors from stale/overlapped requests
      if (requestSeq !== activeRequestSeq || abortController !== currentController) {
        return
      }

      const errorMessage = e instanceof Error ? e.message : 'Failed to load summary'
      error.value = errorMessage
      options.onError?.(e instanceof Error ? e : new Error(errorMessage))
    } finally {
      // Only clear loading for the active request
      if (requestSeq === activeRequestSeq && abortController === currentController) {
        loading.value = false
        showSlowHint.value = false
        clearSlowHintTimer()
      }
    }
  }

  // Auto-cleanup on unmount
  onBeforeUnmount(() => {
    cleanup()
  })

  return {
    loading,
    error,
    summary,
    showSlowHint,
    fetch,
    cancel,
    cleanup
  }
}
