import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Toast, { type PluginOptions, POSITION } from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import hljs from 'highlight.js/lib/core'
import sql from 'highlight.js/lib/languages/sql'
import 'highlight.js/styles/atom-one-dark.css'
import { vHighlightjs } from '@/directives/highlightjs'

// Register SQL language
hljs.registerLanguage('sql', sql)

// Configure hljs to use the modern API
hljs.configure({
  ignoreUnescapedHTML: true
})

import './assets/style.css'
import App from './App.vue'
import router from './router'
import { logEnvironment } from '@/utils/environment'
import { vTooltip } from '@/directives/tooltip'

// Initialize window.ENV with development defaults
window.ENV = window.ENV || {
  VITE_API_KEY: import.meta.env.VITE_API_KEY || '',
  VITE_PORT: import.meta.env.VITE_PORT || '80',
  VITE_API_URL: import.meta.env.VITE_API_URL || '/api',
  VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL || '/api',
  VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN || ''
}

// Log environment configuration at startup
logEnvironment()

const toastOptions: PluginOptions = {
  position: POSITION.TOP_RIGHT,
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
app.use(createPinia())
app.use(router)
app.use(Toast, toastOptions)
app.directive('tooltip', vTooltip)
app.directive('highlightjs', vHighlightjs)
app.mount('#app')
