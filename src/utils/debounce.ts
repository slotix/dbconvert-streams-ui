/**
 * Lightweight debounce implementation to replace lodash
 * @param func Function to debounce
 * @param wait Delay in milliseconds
 * @param immediate Execute on leading edge instead of trailing
 */
export function debounce<T extends (this: unknown, ...args: unknown[]) => unknown>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function executedFunction(this: ThisParameterType<T>, ...args: Parameters<T>) {
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
