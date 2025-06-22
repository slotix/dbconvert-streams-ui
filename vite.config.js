import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(packageJson.version)
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    // Increase chunk size warning limit to 1MB since we're optimizing
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core Vue ecosystem
          if (id.includes('vue') && !id.includes('vue-toastification') && !id.includes('vue3-highlightjs')) {
            return 'vue-core'
          }
          
          // Router
          if (id.includes('vue-router')) {
            return 'vue-router'
          }
          
          // State management
          if (id.includes('pinia')) {
            return 'pinia'
          }
          
          // UI libraries
          if (id.includes('@headlessui/vue')) {
            return 'headlessui'
          }
          if (id.includes('@heroicons/vue')) {
            return 'heroicons'
          }
          
          // HTTP client
          if (id.includes('axios')) {
            return 'axios'
          }
          

          
          // Heavy visualization libraries (code-split these)
          if (id.includes('d3')) {
            return 'visualization-d3'
          }
          if (id.includes('jspdf')) {
            return 'pdf-export'
          }
          if (id.includes('html2canvas')) {
            return 'canvas-export'
          }
          
          // Syntax highlighting
          if (id.includes('highlight.js') || id.includes('vue3-highlightjs')) {
            return 'syntax-highlighting'
          }
          
          // Notifications
          if (id.includes('vue-toastification')) {
            return 'notifications'
          }
          
          // SQL formatter
          if (id.includes('sql-formatter')) {
            return 'sql-formatter'
          }
          
          // Node modules vendor chunk for smaller libraries
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      '@headlessui/vue',
      '@heroicons/vue/24/solid',
      '@heroicons/vue/24/outline',
      'axios'
    ],
          exclude: [
        // Exclude heavy libraries from pre-bundling to enable proper code-splitting
        'd3',
        'jspdf',
        'html2canvas'
      ]
  }
})
