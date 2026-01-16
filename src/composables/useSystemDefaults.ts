import { ref } from 'vue'
import apiClient from '@/api/apiClient'
import type { SystemDefaults } from '@/types/common'

const cachedDefaults = ref<SystemDefaults | null>(null)
let inflight: Promise<SystemDefaults> | null = null

async function loadSystemDefaults(): Promise<SystemDefaults> {
  if (cachedDefaults.value) {
    return cachedDefaults.value
  }
  if (!inflight) {
    inflight = apiClient
      .getSystemDefaults()
      .then((defaults) => {
        cachedDefaults.value = defaults
        return defaults
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

export function useSystemDefaults() {
  return {
    systemDefaults: cachedDefaults,
    loadSystemDefaults
  }
}
