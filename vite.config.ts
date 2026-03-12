import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'url'
import { version } from './package.json'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(version),
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL),
    'process.env.VITE_SENTRY_DSN': JSON.stringify(process.env.VITE_SENTRY_DSN)
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate ag-grid into its own chunk (large library ~1MB)
          'ag-grid': ['ag-grid-community', 'ag-grid-vue3'],

          // Separate sql-formatter into its own chunk (~250KB)
          'sql-formatter': ['sql-formatter'],

          // Vue ecosystem
          'vue-vendor': ['vue', 'vue-router', 'pinia'],

          // UI libraries
          'ui-libs': ['@headlessui/vue', 'lucide-vue-next', 'vue-toastification'],

          // Utilities
          utils: ['@vueuse/core', 'axios'],

          // Heavy visualization and export libraries (already dynamically imported)
          'd3-viz': ['d3-drag', 'd3-force', 'd3-selection', 'd3-transition', 'd3-zoom'],
          'export-libs': ['html2canvas', 'jspdf']
        }
      }
    },
    // Keep warnings visible so bundle-size regressions are noticed in CI.
    chunkSizeWarningLimit: 1200
  }
})
