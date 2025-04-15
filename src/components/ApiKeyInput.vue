<template>
  <div v-if="!hasValidApiKey" class="fixed inset-0 bg-gray-500 bg-opacity-85 transition-opacity z-40">
    <div class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div
          class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 backdrop-blur-sm">
          <div>
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <key-icon class="h-6 w-6 text-gray-600" aria-hidden="true" />
            </div>
            <div class="mt-3 text-center sm:mt-5">
              <h3 class="text-base font-semibold leading-6 text-gray-900">Enter your API Key</h3>
              <div class="mt-2">
                <p class="text-sm text-gray-500">
                  Please enter your API key to continue. Don't have an account yet?
                  <a href="https://streams.dbconvert.com/account" target="_blank" rel="noopener noreferrer"
                    class="text-blue-600 hover:text-blue-800 font-medium">
                    Create an account
                  </a>
                </p>
              </div>
              <div class="mt-4">
                <input v-model="apiKeyInput" type="text"
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
                  placeholder="Enter your API key" @keyup.enter="submitApiKey" />
              </div>
            </div>
          </div>
          <div class="mt-5 sm:mt-6">
            <button type="button"
              class="inline-flex w-full justify-center rounded-md bg-gray-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
              :disabled="!apiKeyInput" @click="submitApiKey">
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCommonStore } from '@/stores/common'
import { KeyIcon } from '@heroicons/vue/24/outline'

const store = useCommonStore()
const apiKeyInput = ref('')
const hasValidApiKey = computed(() => store.hasValidApiKey)

async function submitApiKey() {
  if (!apiKeyInput.value) return

  try {
    await store.setApiKey(apiKeyInput.value)
    await store.initApp()
  } catch (error) {
    store.showNotification('Invalid API key', 'error')
    apiKeyInput.value = ''
  }
}
</script>
