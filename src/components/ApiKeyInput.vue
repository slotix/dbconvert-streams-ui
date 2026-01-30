<template>
  <div
    v-if="shouldShowApiKeyPrompt"
    class="fixed inset-0 bg-gray-500/40 dark:bg-black/60 transition-opacity z-40"
  >
    <div class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div
          class="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-850 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 backdrop-blur-sm"
        >
          <button
            v-if="canDismissPrompt"
            type="button"
            class="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            aria-label="Close"
            @click="dismissPrompt"
          >
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
          <div>
            <div
              class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700"
            >
              <Key class="h-6 w-6 text-gray-600 dark:text-gray-300" aria-hidden="true" />
            </div>
            <div class="mt-3 text-center sm:mt-5">
              <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100">
                {{ isKeyExpired ? 'API Key Expired' : 'Enter your API Key' }}
              </h3>
              <div class="mt-2">
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{
                    isKeyExpired
                      ? 'Your API key has expired or is no longer valid. Please enter a new API key to continue.'
                      : 'Please enter your API key to continue.'
                  }}
                  Don't have an account yet?
                  <button
                    type="button"
                    class="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
                    @click="openAccountPage"
                  >
                    Create account
                  </button>
                </p>
              </div>
              <div class="mt-4">
                <FormInput
                  v-model="apiKeyInput"
                  type="text"
                  placeholder="Enter your API key"
                  @keyup.enter="submitApiKey"
                />
              </div>
            </div>
          </div>
          <div class="mt-5 sm:mt-6">
            <BaseButton
              variant="primary"
              class="w-full justify-center"
              :disabled="!apiKeyInput"
              @click="submitApiKey"
            >
              Continue
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCommonStore } from '@/stores/common'
import { Key, X } from 'lucide-vue-next'
import FormInput from '@/components/base/FormInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import { isWailsContext } from '@/composables/useWailsEvents'

const store = useCommonStore()
const apiKeyInput = ref('')

// Show API key prompt when we need an API key (either missing or invalidated)
const shouldShowApiKeyPrompt = computed(() => store.shouldShowApiKeyPrompt)
const canDismissPrompt = computed(() => isWailsContext() && store.requiresApiKey)

// Check if the key was invalidated (expired) vs never set
const isKeyExpired = computed(() => store.apiKeyInvalidated)

async function submitApiKey() {
  const key = apiKeyInput.value.trim()
  if (!key) return

  try {
    await store.setApiKey(key)
    await store.initApp()
  } catch {
    apiKeyInput.value = ''
  }
}

function dismissPrompt() {
  store.clearApiKeyRequirement()
}

function openAccountPage() {
  const url = 'https://streams.dbconvert.com/account'
  if (window.runtime?.BrowserOpenURL) {
    window.runtime.BrowserOpenURL(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

// Auto-fill the input with the existing API key if it's just expired (not cleared)
if (isKeyExpired.value && store.apiKey) {
  apiKeyInput.value = store.apiKey
}
</script>
