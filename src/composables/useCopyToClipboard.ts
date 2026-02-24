import { ref } from 'vue'
import { useManagedTimeout } from '@/composables/useManagedTimeout'

/**
 * Composable for clipboard copy operations with visual feedback state.
 *
 * @param feedbackDuration - Duration in ms to show copied state (default: 1200ms)
 * @returns Object with isCopied state and copy function
 *
 * @example
 * ```ts
 * const { isCopied, copy } = useCopyToClipboard()
 *
 * // In template:
 * // <button @click="copy(text)">{{ isCopied ? 'Copied!' : 'Copy' }}</button>
 * ```
 */
export function useCopyToClipboard(feedbackDuration = 1200) {
  const isCopied = ref(false)
  const { setManagedTimeout, clearManagedTimeout } = useManagedTimeout()
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  /**
   * Copy text to clipboard and set feedback state
   */
  async function copy(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)

      // Clear any existing timeout
      if (timeoutId) {
        clearManagedTimeout(timeoutId)
      }

      isCopied.value = true
      timeoutId = setManagedTimeout(() => {
        isCopied.value = false
        timeoutId = null
      }, feedbackDuration)

      return true
    } catch {
      return false
    }
  }

  /**
   * Reset the copied state manually
   */
  function reset() {
    clearManagedTimeout(timeoutId)
    timeoutId = null
    isCopied.value = false
  }

  return {
    isCopied,
    copy,
    reset
  }
}

export type CopyToClipboardReturn = ReturnType<typeof useCopyToClipboard>
