import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

export const useThemeStore = defineStore('theme', () => {
  // State
  const mode = ref<ThemeMode>('system')
  const isDark = ref(false)

  // Initialize theme from localStorage or system preference
  function initializeTheme() {
    const stored = localStorage.getItem('theme-mode') as ThemeMode | null

    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      mode.value = stored
    }

    updateTheme()
  }

  // Update the actual theme applied to DOM
  function updateTheme() {
    const root = document.documentElement

    if (mode.value === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      isDark.value = prefersDark
    } else {
      isDark.value = mode.value === 'dark'
    }

    if (isDark.value) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
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

  // Listen to system theme changes when in system mode
  function setupSystemThemeListener() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const listener = () => {
      if (mode.value === 'system') {
        updateTheme()
      }
    }

    mediaQuery.addEventListener('change', listener)

    // Cleanup (call this on app unmount if needed)
    return () => mediaQuery.removeEventListener('change', listener)
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
    setupSystemThemeListener
  }
})
