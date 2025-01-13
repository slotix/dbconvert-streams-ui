/**
 * Creates a function that retries the given operation with exponential backoff.
 *
 * @param operation The async operation to retry
 * @param maxRetries The maximum number of retry attempts
 * @param initialDelay The initial delay in milliseconds
 * @returns A function that will retry the operation
 */
export function useExponentialBackoff(
  operation: () => Promise<void>,
  maxRetries: number,
  initialDelay: number
): () => Promise<void> {
  return async () => {
    let retries = 0
    let delay = initialDelay

    while (retries < maxRetries) {
      try {
        await operation()
        return // Operation succeeded, exit the retry loop
      } catch (error) {
        retries++
        if (retries >= maxRetries) {
          throw error // Max retries reached, throw the last error
        }

        console.warn(`Retry attempt ${retries}/${maxRetries} failed. Retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        delay *= 2 // Double the delay for the next attempt
      }
    }
  }
}
