/**
 * Wails event bridge.
 *
 * Registers global desktop event handlers once at app bootstrap time.
 * This avoids tying native menu integration to component lifecycle or HMR remount timing.
 */

import type { Pinia } from 'pinia'
import { type Router, NavigationFailureType, isNavigationFailure } from 'vue-router'
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

function getWailsRuntime() {
  if (typeof window === 'undefined') {
    return undefined
  }
  if (typeof window.runtime?.EventsOnMultiple === 'function') {
    return window.runtime
  }
  return undefined
}

function watchWailsRuntime(
  label: string,
  register: () => Array<() => void>,
  enabled = isWailsContext()
): () => void {
  if (!enabled) {
    return () => {}
  }

  let boundRuntime = getWailsRuntime()
  let cleanupFns: Array<() => void> = []
  let lastRegisteredAt = 0
  const rebindIntervalMs = 4000

  const cleanupRegistered = () => {
    cleanupFns.forEach((fn) => fn())
    cleanupFns = []
  }

  const reconcile = () => {
    const runtime = getWailsRuntime()
    if (!runtime) {
      return
    }

    const shouldRebind =
      runtime !== boundRuntime ||
      cleanupFns.length === 0 ||
      Date.now() - lastRegisteredAt >= rebindIntervalMs

    if (!shouldRebind) {
      return
    }

    cleanupRegistered()
    boundRuntime = runtime
    cleanupFns = register()
    lastRegisteredAt = Date.now()
    console.log(`[Wails] ${label} initialized`)
  }

  reconcile()

  const reconcileInterval = window.setInterval(reconcile, 1000)
  window.addEventListener('focus', reconcile)
  document.addEventListener('visibilitychange', reconcile)

  return () => {
    window.clearInterval(reconcileInterval)
    window.removeEventListener('focus', reconcile)
    document.removeEventListener('visibilitychange', reconcile)
    cleanupRegistered()
  }
}

/**
 * Subscribe to a Wails event (works only in Wails context)
 * Returns an unsubscribe function
 */
function eventsOn(eventName: string, callback: (...data: unknown[]) => void): () => void {
  const runtime = getWailsRuntime()
  if (!runtime) {
    return () => {} // No-op unsubscribe
  }
  // -1 means unlimited callbacks (same as EventsOn)
  return runtime.EventsOnMultiple(eventName, callback, -1)
}

let stopMenuEvents: (() => void) | null = null
let stopCloseEvents: (() => void) | null = null
let hotDisposeRegistered = false

function navigateToPath(router: Router, path: string) {
  void router.push(path).catch((error: unknown) => {
    if (isNavigationFailure(error, NavigationFailureType.duplicated)) {
      return
    }
    console.error('[Wails] Failed to navigate from desktop menu:', error)
  })
}

export function stopWailsEventBridge() {
  stopMenuEvents?.()
  stopMenuEvents = null
  stopCloseEvents?.()
  stopCloseEvents = null
}

export function initializeWailsEventBridge(router: Router, pinia: Pinia) {
  if (!isWailsContext()) {
    return
  }

  const logsStore = useLogsStore(pinia)
  const objectTabStateStore = useObjectTabStateStore(pinia)
  const confirmDialog = useConfirmDialogStore(pinia)
  const { zoomIn, zoomOut, resetZoom } = useDesktopZoom()

  if (!stopMenuEvents) {
    stopMenuEvents = watchWailsRuntime('Menu event listeners', () => [
      eventsOn('menu:navigate', (path: unknown) => {
        if (typeof path === 'string') {
          navigateToPath(router, path)
        }
      }),
      eventsOn('menu:toggle-logs', () => {
        logsStore.toggleLogsPanel()
      }),
      eventsOn('menu:zoom-in', () => {
        zoomIn()
      }),
      eventsOn('menu:zoom-out', () => {
        zoomOut()
      }),
      eventsOn('menu:zoom-reset', () => {
        resetZoom()
      }),
      eventsOn('menu:toggle-explorer-sidebar', () => {
        window.dispatchEvent(new CustomEvent('wails:toggle-explorer-sidebar'))
      }),
      eventsOn('menu:open-settings', (section: unknown) => {
        const detail = typeof section === 'string' ? { section } : {}
        window.dispatchEvent(new CustomEvent('wails:open-settings', { detail }))
      }),
      eventsOn('menu:show-about', () => {
        window.dispatchEvent(new CustomEvent('wails:show-about'))
      })
    ])
  }

  if (!stopCloseEvents) {
    stopCloseEvents = watchWailsRuntime('App close event listeners', () => [
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
    ])
  }

  if (import.meta.hot && !hotDisposeRegistered) {
    hotDisposeRegistered = true
    import.meta.hot.dispose(() => {
      stopWailsEventBridge()
      hotDisposeRegistered = false
    })
  }
}
