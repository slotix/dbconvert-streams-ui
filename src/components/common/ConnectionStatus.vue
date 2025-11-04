<template>
  <div v-if="!isBackendConnected" class="flex items-center gap-2">
    <span
      class="text-sm text-yellow-600 font-medium"
      title="Connection to backend lost. Please check your backend services."
    >
      Disconnected
    </span>
    <button
      :disabled="isRetrying"
      class="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs font-medium px-3 py-1.5 rounded-lg border border-yellow-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm"
      title="Attempt to reconnect to the backend"
      @click="retryConnection"
    >
      <span v-if="isRetrying" class="flex items-center">
        <svg
          class="animate-spin -ml-1 mr-1 h-3 w-3 text-yellow-800"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        Retrying...
      </span>
      <span v-else>Retry Connection</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCommonStore } from '@/stores/common'

const commonStore = useCommonStore()
const isRetrying = ref(false)

const isBackendConnected = computed(() => commonStore.isBackendConnected)

const retryConnection = async () => {
  if (isRetrying.value) return

  isRetrying.value = true
  try {
    await commonStore.initApp()
    if (commonStore.isBackendConnected) {
      commonStore.showNotification('Connection restored successfully!', 'success')
    }
  } catch (error) {
    console.error('Failed to retry connection:', error)
    commonStore.showNotification('Still unable to connect. Please try again later.', 'warning')
  } finally {
    isRetrying.value = false
  }
}
</script>
