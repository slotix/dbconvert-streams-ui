import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Toast, { type PluginOptions, POSITION } from 'vue-toastification'
import 'vue-toastification/dist/index.css'

import './assets/style.css'
import App from './App.vue'
import router from './router'
import { logEnvironment } from '@/utils/environment'
import { vTooltip } from '@/directives/tooltip'
import { useThemeStore } from '@/stores/theme'

// Monaco Editor is now lazy-loaded via src/utils/monaco-loader.ts
// This reduces the initial bundle size by ~3.8MB (986KB gzipped)

// Ensure window.ENV exists
if (!window.ENV) {
  console.warn('window.ENV is not defined. Using default environment variables.')
  window.ENV = {
    VITE_API_KEY: import.meta.env.VITE_API_KEY || '',
    VITE_PORT: import.meta.env.VITE_PORT || '80',
    VITE_API_URL: import.meta.env.VITE_API_URL || '/api',
    VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL || '/api',
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN || ''
  }
}

// Log environment configuration at startup
logEnvironment()

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
themeStore.setupSystemThemeListener()

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

app.mount('#app')
