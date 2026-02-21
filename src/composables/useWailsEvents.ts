/**
 * Wails Event Bridge Composable
 *
 * Provides integration with Wails runtime events for the desktop app.
 * Gracefully does nothing when running as a web app (no window.runtime).
 */

import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLogsStore } from '@/stores/logs'
import { useObjectTabStateStore } from '@/stores/objectTabState'
import { useConfirmDialogStore } from '@/stores/confirmDialog'
import { useDesktopZoom } from '@/utils/desktopZoom'

/**
 * Check if running in Wails desktop context
 */
export function isWailsContext(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  if (window.runtime !== undefined) {
    return true
  }
  const desktopFlag = window.ENV?.VITE_DESKTOP_MODE
  if (typeof desktopFlag === 'string') {
    return desktopFlag.toLowerCase() === 'true'
  }
  if (desktopFlag === true) {
    return true
  }
  return typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('wails')
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
 * - menu:refresh - Refresh the current view
 * - menu:zoom-in / menu:zoom-out / menu:zoom-reset - Adjust UI zoom (desktop only)
 * - menu:show-about - Show about dialog
 */
export function useWailsMenuEvents() {
  const router = useRouter()
  const logsStore = useLogsStore()
  const { zoomIn, zoomOut, resetZoom } = useDesktopZoom()
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

    // Refresh current view
    cleanupFns.push(
      eventsOn('menu:refresh', () => {
        if (window.runtime?.WindowReloadApp) {
          window.runtime.WindowReloadApp()
          return
        }
        if (window.runtime?.WindowReload) {
          window.runtime.WindowReload()
          return
        }
        router.go(0)
      })
    )

    // Zoom controls
    cleanupFns.push(
      eventsOn('menu:zoom-in', () => {
        zoomIn()
      })
    )
    cleanupFns.push(
      eventsOn('menu:zoom-out', () => {
        zoomOut()
      })
    )
    cleanupFns.push(
      eventsOn('menu:zoom-reset', () => {
        resetZoom()
      })
    )

    // Toggle explorer sidebar - dispatch custom event for DatabaseExplorerView to handle
    cleanupFns.push(
      eventsOn('menu:toggle-explorer-sidebar', () => {
        window.dispatchEvent(new CustomEvent('wails:toggle-explorer-sidebar'))
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

/**
 * Composable to handle Wails app lifecycle events.
 *
 * Currently listens for a backend close request and responds with a decision
 * after running the UI's styled unsaved-changes confirm flow.
 */
export function useWailsAppCloseEvents() {
  const objectTabStateStore = useObjectTabStateStore()
  const confirmDialog = useConfirmDialogStore()
  const cleanupFns: (() => void)[] = []

  onMounted(() => {
    if (!isWailsContext()) {
      return
    }

    cleanupFns.push(
      eventsOn('app:close-requested', async (payload: unknown) => {
        const requestId =
          payload && typeof payload === 'object' && 'id' in payload
            ? Number((payload as { id?: unknown }).id)
            : 0

        let allow = true

        if (objectTabStateStore.hasAnyUnsavedChanges) {
          allow = await confirmDialog.confirm({
            title: 'Unsaved changes',
            description: 'You have unsaved changes. Quit anyway?',
            confirmLabel: 'Quit',
            cancelLabel: 'Cancel',
            danger: true
          })
        }

        window.runtime?.EventsEmit?.('app:close-decision', {
          id: requestId,
          allow
        })
      })
    )

    console.log('[Wails] App close event listeners initialized')
  })

  onUnmounted(() => {
    cleanupFns.forEach((fn) => fn())
    cleanupFns.length = 0
  })
}
