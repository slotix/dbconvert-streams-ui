import { ref, watch, type Ref } from 'vue'

/**
 * Options for usePersistedState
 */
interface PersistedStateOptions<T> {
  /**
   * Custom serializer function (default: JSON.stringify)
   */
  serializer?: (value: T) => string
  /**
   * Custom deserializer function (default: JSON.parse)
   */
  deserializer?: (value: string) => T
  /**
   * Whether to watch deeply for changes (default: true for objects/arrays)
   */
  deep?: boolean
  /**
   * Error handler for persistence failures
   */
  onError?: (error: Error, operation: 'load' | 'save') => void
}

/**
 * Create a reactive ref that persists to localStorage
 *
 * @param key - localStorage key
 * @param defaultValue - default value if no stored value exists
 * @param options - serialization and watch options
 * @returns Reactive ref that syncs with localStorage
 *
 * @example
 * // Boolean value
 * const darkMode = usePersistedState('darkMode', false)
 *
 * // Object value
 * const user = usePersistedState('user', { name: '', email: '' })
 *
 * // Array value
 * const recent = usePersistedState('recentItems', [])
 *
 * // Custom serialization
 * const timestamp = usePersistedState('lastVisit', new Date(), {
 *   serializer: (date) => date.toISOString(),
 *   deserializer: (str) => new Date(str)
 * })
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  options?: PersistedStateOptions<T>
): Ref<T> {
  const {
    serializer = JSON.stringify,
    deserializer = JSON.parse,
    deep = typeof defaultValue === 'object' && defaultValue !== null,
    onError = (error, operation) => {
      console.error(`[usePersistedState] ${operation} error for key "${key}":`, error)
    }
  } = options || {}

  // Initialize ref with default value
  const state = ref<T>(defaultValue) as Ref<T>

  // Try to load from localStorage
  try {
    const stored = localStorage.getItem(key)
    if (stored !== null) {
      state.value = deserializer(stored)
    }
  } catch (error) {
    onError(error as Error, 'load')
    // Keep default value on load error
  }

  // Watch for changes and persist to localStorage
  watch(
    state,
    (newValue) => {
      try {
        const serialized = serializer(newValue)
        localStorage.setItem(key, serialized)
      } catch (error) {
        onError(error as Error, 'save')
      }
    },
    { deep }
  )

  return state
}

/**
 * Helper for persisting boolean values (more explicit than string conversion)
 */
export function usePersistedBoolean(key: string, defaultValue: boolean): Ref<boolean> {
  return usePersistedState(key, defaultValue, {
    serializer: (value) => String(value),
    deserializer: (value) => value === 'true'
  })
}

/**
 * Helper for persisting number values
 */
export function usePersistedNumber(key: string, defaultValue: number): Ref<number> {
  return usePersistedState(key, defaultValue, {
    serializer: (value) => String(value),
    deserializer: (value) => Number(value)
  })
}

/**
 * Remove a persisted state from localStorage
 */
export function removePersistedState(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`[usePersistedState] Failed to remove key "${key}":`, error)
  }
}

/**
 * Clear all persisted state with a given prefix
 */
export function clearPersistedStates(prefix: string): void {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  } catch (error) {
    console.error(`[usePersistedState] Failed to clear keys with prefix "${prefix}":`, error)
  }
}
