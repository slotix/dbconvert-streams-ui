import { ref, watch } from 'vue'
import { useCommonStore } from '@/stores/common'

export function useApiKeyBanner() {
  const commonStore = useCommonStore()
  const showExpiredBanner = ref(false)

  const dismissBanner = () => {
    showExpiredBanner.value = false
  }

  watch(
    () => commonStore.apiKeyInvalidated,
    (isInvalidated) => {
      if (isInvalidated) {
        showExpiredBanner.value = true
      }
    }
  )

  watch(
    () => commonStore.hasValidApiKey,
    (hasValid) => {
      if (hasValid) {
        dismissBanner()
      }
    }
  )

  return {
    showExpiredBanner,
    dismissBanner
  }
}
