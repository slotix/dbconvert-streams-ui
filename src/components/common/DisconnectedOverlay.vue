<script setup lang="ts">
import { useCommonStore } from '@/stores/common'
import { storeToRefs } from 'pinia'
import { XCircleIcon, ArrowPathIcon } from '@heroicons/vue/24/solid'
import { getBackendUrl } from '@/utils/environment'

const commonStore = useCommonStore()
const { isBackendConnected } = storeToRefs(commonStore)
const backendUrl = getBackendUrl()

async function handleRetry() {
  // Perform full health check and reinitialize if backend is back online
  await commonStore.performHealthCheck()
}
</script>

<template>
  <div
    v-if="!isBackendConnected"
    class="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-900 bg-opacity-95 dark:bg-opacity-95"
  >
    <div class="text-center max-w-md px-6">
      <!-- Icon -->
      <div class="mx-auto w-24 h-24 mb-6 flex items-center justify-center">
        <XCircleIcon class="w-20 h-20 text-orange-500 dark:text-orange-400" />
      </div>

      <!-- Title -->
      <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
        Unable to Connect to Backend
      </h2>

      <!-- Description -->
      <p class="text-gray-600 dark:text-gray-400 mb-8">
        The application cannot connect to the backend API server. Please check that the server is
        running and try again.
      </p>

      <!-- Retry Button -->
      <button
        type="button"
        class="inline-flex items-center gap-2 px-6 py-3 text-base font-semibold text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-lg transition-all duration-200 shadow-lg dark:shadow-gray-900/30 hover:shadow-xl transform hover:scale-105"
        @click="handleRetry"
      >
        <ArrowPathIcon class="h-5 w-5" />
        <span>Retry Connection</span>
      </button>

      <!-- Additional Info -->
      <p class="mt-6 text-sm text-gray-500 dark:text-gray-400">
        Backend URL:
        <code
          class="text-xs bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 rounded"
          >{{ backendUrl }}</code
        >
      </p>
    </div>
  </div>
</template>
