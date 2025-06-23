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
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router'],
          pinia: ['pinia'],
          headlessui: ['@headlessui/vue'],
          heroicons: ['@heroicons/vue/24/solid', '@heroicons/vue/24/outline'],
          axios: ['axios'],
          notifications: ['vue-toastification'],
          'syntax-highlighting': ['highlight.js'],
          'sql-formatter': ['sql-formatter'],
          'visualization-d3': ['d3'],
          'pdf-export': ['jspdf'],
          'canvas-export': ['html2canvas']
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
    ]
  }
})
