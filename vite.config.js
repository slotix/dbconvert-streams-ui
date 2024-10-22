import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.includes('stripe-')
        }
      }
    })
  ],
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
          clerk: ['vue-clerk'],
          idb: ['idb'],
          pinia: ['pinia'],
          headlessui: ['@headlessui/vue'],
          heroicons: ['@heroicons/vue/24/solid', '@heroicons/vue/24/outline'],
          axios: ['axios'],
          lodash: ['lodash'],
          nats: ['nats.ws']
        }
      }
    }
  }
})
