import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Toast, { type PluginOptions, POSITION } from 'vue-toastification'
import 'vue-toastification/dist/index.css'

import './assets/style.css'
import App from './App.vue'
import router from './router'
// import { logEnvironment } from '@/utils/environment'
import { vTooltip } from '@/directives/tooltip'
import { useThemeStore } from '@/stores/theme'
import { getStorageValue, STORAGE_KEYS } from '@/constants/storageKeys'
import { DESKTOP_NAVIGATION } from '@/constants/desktopNavigation'
import { isWailsContext } from '@/composables/useWailsEvents'
import { setupDesktopZoom } from '@/utils/desktopZoom'

type ExplorerViewState = {
  viewType: 'connection-details' | 'database-overview' | 'table-data' | 'file-browser' | null
  connectionId: string | null
  databaseName: string | null
  schemaName: string | null
  objectType: 'table' | 'view' | null
  objectName: string | null
  filePath: string | null
}

const EXPLORER_VIEW_STATE_KEY = 'explorer.viewState'

// Display startup banner
console.log(`
┌────────────────────────────────┐
│    DBConvert Streams UI        │
└────────────────────────────────┘
`)
console.log(
  `Version: v${import.meta.env.PACKAGE_VERSION || 'unknown'}${import.meta.env.DEV ? ' (DEV)' : ''}`
)
console.log(`API URL: ${window.ENV?.VITE_API_URL || import.meta.env.VITE_API_URL || '/api'}`)
console.log('─'.repeat(34))

// Monaco Editor is now lazy-loaded via src/utils/monaco-loader.ts
// This reduces the initial bundle size by ~3.8MB (986KB gzipped)

// Ensure window.ENV exists
if (!window.ENV) {
  // console.warn('window.ENV is not defined. Using default environment variables.')
  window.ENV = {
    VITE_API_KEY: import.meta.env.VITE_API_KEY || '',
    VITE_PORT: import.meta.env.VITE_PORT || '80',
    VITE_API_URL: import.meta.env.VITE_API_URL || '/api',
    VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL || '/api',
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN || ''
  }
}

// Log environment configuration at startup
// logEnvironment()

const toastOptions: PluginOptions = {
  position: POSITION.BOTTOM_RIGHT,
  timeout: 5000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: 'button',
  icon: true,
  rtl: false
}

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(Toast, toastOptions)
app.directive('tooltip', vTooltip)

// Initialize theme before mounting
const themeStore = useThemeStore()
themeStore.initializeTheme()
setupDesktopZoom()

// Global error handler for uncaught errors
app.config.errorHandler = (err, _instance, info) => {
  console.error('Global error handler:', err, info)

  // Don't show toast for specific errors that are already handled
  const errorMessage = err instanceof Error ? err.message : String(err)
  const isHandledError =
    errorMessage.includes('Network Error') ||
    errorMessage.includes('Invalid API key') ||
    errorMessage.includes('API key') ||
    errorMessage.includes('Failed to initialize')

  // Only log to console, don't show additional toasts
  // The specific error handlers will show appropriate toasts
  if (!isHandledError) {
    console.error('Unhandled error:', err)
  }
}

// Global handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)

  // Prevent the default browser behavior (logging to console)
  event.preventDefault()

  // Don't show toast for network errors - they're handled by the connection monitor
  const errorMessage = event.reason instanceof Error ? event.reason.message : String(event.reason)
  const isNetworkError =
    errorMessage.includes('Network Error') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('API key')

  if (!isNetworkError) {
    console.error('Unhandled rejection:', event.reason)
  }
})

// Suppress browser's default context menu globally
document.addEventListener('contextmenu', (event) => {
  event.preventDefault()
})

const loadExplorerViewState = (): ExplorerViewState | null => {
  try {
    const raw = window.localStorage.getItem(EXPLORER_VIEW_STATE_KEY)
    if (!raw) {
      return null
    }
    return JSON.parse(raw) as ExplorerViewState
  } catch (error) {
    console.warn('Failed to load explorer view state:', error)
    return null
  }
}

const buildExplorerRestoreRoute = (): string => {
  const state = loadExplorerViewState()
  if (!state?.connectionId) {
    return ''
  }

  const params = new URLSearchParams()

  switch (state.viewType) {
    case 'connection-details':
      params.set('details', 'true')
      break
    case 'database-overview':
      if (state.databaseName) {
        params.set('db', state.databaseName)
      }
      break
    case 'table-data':
      if (state.databaseName && state.objectType && state.objectName) {
        params.set('db', state.databaseName)
        params.set('type', state.objectType)
        params.set('name', state.objectName)
        if (state.schemaName) {
          params.set('schema', state.schemaName)
        }
      } else if (state.databaseName) {
        params.set('db', state.databaseName)
      }
      break
    case 'file-browser':
      if (state.filePath) {
        params.set('file', state.filePath)
      }
      break
    default:
      break
  }

  const query = params.toString()
  return `/explorer/${state.connectionId}${query ? `?${query}` : ''}`
}

const restoreDesktopRoute = async () => {
  const currentRoute = router.currentRoute.value
  // Skip if already on a non-overview route (e.g., navigated via URL)
  if (currentRoute.name && currentRoute.name !== 'Overview' && currentRoute.path !== '/') {
    return
  }

  const isDesktop = isWailsContext()
  const storedRoute = getStorageValue<string>(STORAGE_KEYS.DESKTOP_LAST_ROUTE, '')
  let targetRoute = storedRoute

  // Try to restore explorer view state for more specific navigation
  const explorerRestoreRoute = buildExplorerRestoreRoute()
  if (
    explorerRestoreRoute &&
    (!storedRoute ||
      storedRoute === '/explorer' ||
      storedRoute.startsWith('/explorer?') ||
      storedRoute.startsWith('/explorer/'))
  ) {
    targetRoute = explorerRestoreRoute
  }

  // In desktop mode, default to workspace view if no stored route
  if (!targetRoute && isDesktop) {
    targetRoute = DESKTOP_NAVIGATION.defaultRoute
  }

  if (!targetRoute) {
    return
  }

  const resolved = router.resolve(targetRoute)
  // Only navigate if resolved to a valid non-overview route
  if (!resolved.name || resolved.name === 'Overview') {
    // In desktop mode, still navigate to default workspace even if resolved to overview
    if (isDesktop) {
      await router.replace(DESKTOP_NAVIGATION.defaultRoute)
    }
    return
  }
  await router.replace(resolved.fullPath)
}

router.isReady().then(async () => {
  await restoreDesktopRoute()
  app.mount('#app')
})
