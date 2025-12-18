/**
 * Wails Event Bridge Composable
 *
 * Provides integration with Wails runtime events for the desktop app.
 * Gracefully does nothing when running as a web app (no window.runtime).
 */

import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLogsStore } from '@/stores/logs'
import { useThemeStore } from '@/stores/theme'

// Type declaration for Wails runtime (injected by Wails at runtime)
declare global {
  interface Window {
    runtime?: {
      EventsOnMultiple: (
        eventName: string,
        callback: (...data: unknown[]) => void,
        maxCallbacks: number
      ) => () => void
      EventsOff: (eventName: string, ...additionalEventNames: string[]) => void
      EventsOffAll: () => void
    }
  }
}

/**
 * Check if running in Wails desktop context
 */
export function isWailsContext(): boolean {
  return typeof window !== 'undefined' && window.runtime !== undefined
}

/**
 * Subscribe to a Wails event (works only in Wails context)
 * Returns an unsubscribe function
 */
function eventsOn(eventName: string, callback: (...data: unknown[]) => void): () => void {
  if (!isWailsContext()) {
    return () => {} // No-op unsubscribe
  }
  // -1 means unlimited callbacks (same as EventsOn)
  return window.runtime!.EventsOnMultiple(eventName, callback, -1)
}

/**
 * Composable to handle Wails menu events
 *
 * Sets up listeners for menu actions emitted from the Go backend:
 * - menu:navigate - Navigate to a route
 * - menu:toggle-logs - Toggle the logs panel
 * - menu:toggle-theme - Toggle dark/light theme
 * - menu:refresh - Refresh the current view
 * - menu:show-about - Show about dialog
 */
export function useWailsMenuEvents() {
  const router = useRouter()
  const logsStore = useLogsStore()
  const themeStore = useThemeStore()

  const cleanupFns: (() => void)[] = []

  onMounted(() => {
    if (!isWailsContext()) {
      return
    }

    // Navigation events from menu
    cleanupFns.push(
      eventsOn('menu:navigate', (path: unknown) => {
        if (typeof path === 'string') {
          router.push(path)
        }
      })
    )

    // Toggle logs panel
    cleanupFns.push(
      eventsOn('menu:toggle-logs', () => {
        logsStore.toggleLogsPanel()
      })
    )

    // Toggle theme
    cleanupFns.push(
      eventsOn('menu:toggle-theme', () => {
        themeStore.toggleTheme()
      })
    )

    // Refresh current view
    cleanupFns.push(
      eventsOn('menu:refresh', () => {
        router.go(0)
      })
    )

    // About dialog - dispatch custom event for App.vue to handle
    cleanupFns.push(
      eventsOn('menu:show-about', () => {
        window.dispatchEvent(new CustomEvent('wails:show-about'))
      })
    )

    console.log('[Wails] Menu event listeners initialized')
  })

  onUnmounted(() => {
    cleanupFns.forEach((fn) => fn())
    cleanupFns.length = 0
  })
}
