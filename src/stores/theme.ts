import { defineStore } from 'pinia'
import { ref } from 'vue'
import { STORAGE_KEYS, getStorageValue, setStorageValue } from '@/constants/storageKeys'

export type ThemeMode = 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
  // State
  const mode = ref<ThemeMode>('dark')
  const isDark = ref(false)

  // Initialize theme from localStorage or system preference
  function initializeTheme() {
    const stored = getStorageValue(STORAGE_KEYS.THEME_MODE, '' as string)

    if (stored === 'light' || stored === 'dark') {
      mode.value = stored
    } else if (stored === 'system') {
      mode.value = 'dark'
      setStorageValue(STORAGE_KEYS.THEME_MODE, mode.value)
    }

    updateTheme()
  }

  // Update the actual theme applied to DOM
  function updateTheme() {
    const applyTheme = () => {
      const root = document.documentElement

      isDark.value = mode.value === 'dark'

      if (isDark.value) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }

      emitNativeTheme(mode.value, isDark.value)
    }

    // Use View Transitions API for slide effect (Chrome 111+, Safari 18+)
    if (document.startViewTransition) {
      // Disable element transitions during view transition to prevent tearing
      document.documentElement.classList.add('view-transition-active')

      // Wait for the class to be applied and styles to settle before starting transition
      requestAnimationFrame(() => {
        const transition = document.startViewTransition(() => {
          applyTheme()
          // Force synchronous style recalculation
          document.documentElement.offsetHeight
        })
        transition.finished.then(() => {
          document.documentElement.classList.remove('view-transition-active')
        })
      })
    } else {
      applyTheme()
    }
  }

  // Set theme mode
  function setTheme(newMode: ThemeMode) {
    mode.value = newMode
    setStorageValue(STORAGE_KEYS.THEME_MODE, newMode)
    updateTheme()
  }

  // Toggle between light and dark
  function toggleTheme(): void {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  return {
    mode,
    isDark,
    initializeTheme,
    setTheme,
    toggleTheme
  }
})

function emitNativeTheme(mode: ThemeMode, isDark: boolean) {
  if (typeof window === 'undefined') {
    return
  }

  const runtime = (
    window as typeof window & { runtime?: { EventsEmit?: (...args: unknown[]) => void } }
  ).runtime
  if (!runtime?.EventsEmit) {
    return
  }

  runtime.EventsEmit('theme:mode', mode, isDark)
}
