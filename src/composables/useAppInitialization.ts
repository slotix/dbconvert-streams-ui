import { ref } from 'vue'
import { initializeApiClient } from '@/api/apiClient'
import { useCommonStore } from '@/stores/common'

export function useAppInitialization() {
  const commonStore = useCommonStore()
  const isInitializing = ref(true)

  const initializeApp = async () => {
    try {
      // Always try to initialize the app - the initApp method now handles
      // API key validation and development fallbacks internally
      const initResult = await commonStore.initApp()
      if (initResult === 'failed') {
        // Don't throw error - just return failed status
        // The initApp method already shows appropriate toasts
        return 'failed' as const
      }
      return 'success' as const
    } catch (error) {
      // Catch and log errors, but don't show additional toasts
      // The error handlers in initApp already handle user notifications
      console.error('Failed to initialize app:', error)
      return 'failed' as const
    }
  }

  const initialize = async () => {
    try {
      isInitializing.value = true
      await initializeApiClient()
      return await initializeApp()
    } finally {
      isInitializing.value = false
    }
  }

  return {
    isInitializing,
    initialize
  }
}
