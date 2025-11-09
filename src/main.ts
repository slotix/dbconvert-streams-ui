import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Toast, { type PluginOptions, POSITION } from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import hljs from 'highlight.js/lib/core'
import sql from 'highlight.js/lib/languages/sql'
import json from 'highlight.js/lib/languages/json'
// Note: We don't import a highlight.js theme CSS file here.
// Custom syntax highlighting styles are defined in SqlCodeBlock.vue and FlatQueryRow.vue
// with proper dark mode support using Tailwind's dark: variants.
import { vHighlightjs } from '@/directives/highlightjs'

// Register languages
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('json', json)

// Configure hljs to use the modern API
hljs.configure({
  ignoreUnescapedHTML: true
})

import './assets/style.css'
import App from './App.vue'
import router from './router'
import { logEnvironment } from '@/utils/environment'
import { vTooltip } from '@/directives/tooltip'
import { useThemeStore } from '@/stores/theme'

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
app.directive('highlightjs', vHighlightjs)

// Initialize theme before mounting
const themeStore = useThemeStore()
themeStore.initializeTheme()
themeStore.setupSystemThemeListener()

app.mount('#app')
