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
  optimizeDeps: {
    exclude: [
      // Exclude Monaco workers we don't use (reduces bundle size)
      'monaco-editor/esm/vs/language/typescript/ts.worker',
      'monaco-editor/esm/vs/language/css/css.worker',
      'monaco-editor/esm/vs/language/html/html.worker'
    ]
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
          // Monaco Editor - lazy-loaded chunk
          'monaco-editor': ['monaco-editor', '@monaco-editor/loader'],

          // Separate ag-grid into its own chunk (large library ~1MB)
          'ag-grid': ['ag-grid-community', 'ag-grid-vue3'],

          // Separate sql-formatter into its own chunk (~250KB)
          'sql-formatter': ['sql-formatter'],

          // Vue ecosystem
          'vue-vendor': ['vue', 'vue-router', 'pinia'],

          // UI libraries
          'ui-libs': ['@headlessui/vue', '@heroicons/vue', 'vue-toastification'],

          // Utilities
          utils: ['@vueuse/core', 'axios'],

          // Heavy visualization and export libraries (already dynamically imported)
          'd3-viz': ['d3'],
          'export-libs': ['html2canvas', 'jspdf']
        }
      },
      // Suppress warnings for large libraries that are lazy-loaded
      onwarn(warning, warn) {
        // Ignore chunk size warnings since we've properly code-split
        if (warning.code === 'CHUNK_SIZE_WARNING') return
        warn(warning)
      }
    },
    // Large libraries (monaco-editor, ag-grid) are lazy-loaded
    // Set warning limit to 4000KB to accommodate Monaco when it loads
    chunkSizeWarningLimit: 4000
  }
})
