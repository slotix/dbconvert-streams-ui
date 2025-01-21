<template>
  <div class="px-6">
    <div class="mt-4">
      <h3 class="text-xl font-medium text-gray-900 mb-6">SSL Configuration</h3>
      <div class="space-y-6">
        <!-- SSL Mode -->
        <div class="mb-6">
          <div class="flex items-center mb-2">
            <label for="ssl-mode" class="text-sm font-medium text-gray-700">
              SSL Mode
              <span
                v-tooltip="'Choose the SSL verification mode for your connection'"
                class="ml-2 text-gray-400 hover:text-gray-500 cursor-help inline-block"
              >
                <QuestionMarkCircleIcon class="h-4 w-4" />
              </span>
            </label>
          </div>
          <select
            id="ssl-mode"
            :value="localSSLConfig.mode"
            class="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
            @change="
              handleModeChange(($event.target as HTMLSelectElement).value as SSLConfig['mode'])
            "
          >
            <option v-for="mode in SSL_MODES" :key="mode.value" :value="mode.value">
              {{ mode.label }}
            </option>
          </select>
          <p class="mt-1 text-sm text-gray-500">{{ getSSLModeDescription(localSSLConfig.mode) }}</p>
        </div>

        <div v-if="localSSLConfig.mode !== 'disabled'" class="space-y-6">
          <CertificateInput
            v-for="cert in CERT_TYPES"
            :key="cert.type"
            :type="cert.type"
            :label="cert.label"
            :description="cert.description"
            :accept="cert.accept"
            :maxSize="cert.maxSize"
            :value="localSSLConfig[cert.type]"
            :isLoading="isLoading[cert.type] || false"
            :error="errors[cert.type]"
            @update="handleCertUpdate(cert.type, $event)"
            @clear="clearCertificate(cert.type)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'
import { useConnectionsStore } from '@/stores/connections'
import type { SSLConfig } from '@/types/connections'
import { vTooltip } from '@/directives/tooltip'
import CertificateInput from './CertificateInput.vue'

// Constants
const SSL_MODES = [
  { value: 'disabled', label: 'Disabled' },
  { value: 'require', label: 'Require' },
  { value: 'verify-ca', label: 'Verify CA' },
  { value: 'verify-full', label: 'Verify Full' }
] as const

const CERT_TYPES = [
  {
    type: 'ca',
    label: 'CA Certificate',
    description: 'Certificate Authority (CA) certificate for SSL verification',
    accept: '.crt,.pem',
    maxSize: 1024 * 1024 // 1MB
  },
  {
    type: 'client_cert',
    label: 'Client Certificate',
    description: 'Client certificate for mutual TLS authentication',
    accept: '.crt,.pem',
    maxSize: 1024 * 1024
  },
  {
    type: 'client_key',
    label: 'Client Key',
    description: 'Private key corresponding to the client certificate',
    accept: '.key,.pem',
    maxSize: 1024 * 1024
  }
] as const

// Store
const connectionsStore = useConnectionsStore()
const connection = computed(() => connectionsStore.currentConnection)

// State
const isLoading = ref<Record<string, boolean>>({
  ca: false,
  client_cert: false,
  client_key: false
})
const errors = ref<Record<string, string>>({})

// Initialize SSL config
const localSSLConfig = ref<SSLConfig>(
  connection.value?.ssl
    ? JSON.parse(JSON.stringify(connection.value.ssl))
    : {
        mode: 'disabled',
        ca: undefined,
        client_cert: undefined,
        client_key: undefined
      }
)

// Watchers
watch(
  () => localSSLConfig.value,
  (newValue) => {
    if (connection.value) {
      connection.value.ssl = JSON.parse(JSON.stringify(newValue))
    }
  },
  { deep: true }
)

// Methods
function getSSLModeDescription(mode: SSLConfig['mode']): string {
  const descriptions = {
    disabled: 'No SSL encryption',
    require: 'Encrypt connection only',
    'verify-ca': 'Verify server certificate is signed by trusted CA',
    'verify-full': 'Verify server certificate and hostname match'
  }
  return descriptions[mode]
}

function handleModeChange(mode: SSLConfig['mode']) {
  localSSLConfig.value.mode = mode
  // Clear errors when mode changes
  errors.value = {}
}

async function handleCertUpdate(certType: keyof Omit<SSLConfig, 'mode'>, file: File | null) {
  if (!file) return

  try {
    isLoading.value[certType] = true
    errors.value[certType] = ''

    // Validate file size
    if (file.size > CERT_TYPES.find((c) => c.type === certType)!.maxSize) {
      throw new Error('File size exceeds maximum allowed')
    }

    const base64String = await readFileAsBase64(file)
    localSSLConfig.value = {
      ...localSSLConfig.value,
      [certType]: base64String
    }
  } catch (error) {
    errors.value[certType] = error instanceof Error ? error.message : 'Failed to process file'
  } finally {
    isLoading.value[certType] = false
  }
}

function clearCertificate(certType: keyof Omit<SSLConfig, 'mode'>) {
  localSSLConfig.value = {
    ...localSSLConfig.value,
    [certType]: undefined
  }
  errors.value[certType] = ''
}

// Utilities
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64String = result.split(',')[1]
      resolve(base64String)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
</script>
