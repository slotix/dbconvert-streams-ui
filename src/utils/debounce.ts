/**
 * Lightweight debounce implementation to replace lodash
 * @param func Function to debounce
 * @param wait Delay in milliseconds
 * @param immediate Execute on leading edge instead of trailing
 */
export function debounce<This, Args extends unknown[], R>(
  func: (this: This, ...args: Args) => R,
  wait: number,
  immediate = false
): (this: This, ...args: Args) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function executedFunction(this: This, ...args: Args) {
    const context = this
    const later = () => {
      timeout = null
      if (!immediate) func.apply(context, args)
    }

    const callNow = immediate && !timeout

    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(later, wait)

    if (callNow) {
      func.apply(context, args)
    }
  }
}
