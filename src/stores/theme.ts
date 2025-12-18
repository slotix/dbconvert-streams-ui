import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
  // State
  const mode = ref<ThemeMode>('dark')
  const isDark = ref(false)

  // Initialize theme from localStorage or system preference
  function initializeTheme() {
    const stored = localStorage.getItem('theme-mode')

    if (stored === 'light' || stored === 'dark') {
      mode.value = stored
    } else if (stored === 'system') {
      mode.value = 'dark'
      localStorage.setItem('theme-mode', mode.value)
    }

    updateTheme()
  }

  // Update the actual theme applied to DOM
  function updateTheme() {
    const root = document.documentElement

    isDark.value = mode.value === 'dark'

    if (isDark.value) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    emitNativeTheme(mode.value, isDark.value)
  }

  // Set theme mode
  function setTheme(newMode: ThemeMode) {
    mode.value = newMode
    localStorage.setItem('theme-mode', newMode)
    updateTheme()
  }

  // Toggle between light and dark (skips system)
  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  // Watch mode changes
  watch(mode, () => {
    updateTheme()
  })

  return {
    mode,
    isDark,
    initializeTheme,
    setTheme,
    toggleTheme,
  }
})

function emitNativeTheme(mode: ThemeMode, isDark: boolean) {
  if (typeof window === 'undefined') {
    return
  }

  const runtime = (window as typeof window & { runtime?: { EventsEmit?: (...args: unknown[]) => void } })
    .runtime
  if (!runtime?.EventsEmit) {
    return
  }

  runtime.EventsEmit('theme:mode', mode, isDark)
}
