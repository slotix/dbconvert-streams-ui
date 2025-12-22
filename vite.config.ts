import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'url'
import { version } from './package.json'

/**
 * Vite plugin to exclude unused Monaco language workers from the bundle.
 * Monaco includes workers for CSS, HTML, and TypeScript languages by default.
 * Since we only use JSON and SQL, we replace the Worker creation with stubs.
 * This saves approximately 8.7MB in bundle size.
 */
function monacoWorkerExclude(): Plugin {
  return {
    name: 'monaco-worker-exclude',
    enforce: 'pre',
    apply: 'build',
    transform(code, id) {
      // Only process Monaco workerManager files for languages we don't use
      if (
        id.includes('monaco-editor') &&
        (id.includes('/css/') || id.includes('/html/') || id.includes('/typescript/')) &&
        id.includes('workerManager')
      ) {
        // Replace the Worker creation with a stub
        const transformed = code.replace(
          /createWorker:\s*\(\)\s*=>\s*new\s+Worker\(new\s+URL\([^)]+\)[^)]*\)/g,
          'createWorker: () => ({ postMessage: () => {}, terminate: () => {}, onmessage: null })'
        )
        return { code: transformed, map: null }
      }
      return null
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [monacoWorkerExclude(), vue()],
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
