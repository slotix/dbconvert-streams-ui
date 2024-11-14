<template>
  <div class="bg-white bg-opacity-5 text-center md:text-left p-4">
    <div class="items-center w-full space-y-4 text-gray-500">
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700">SSL Mode</label>
        <select
          v-model="localSSLConfig.mode"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500"
        >
          <option value="disable">Disable</option>
          <option value="require">Require</option>
          <option value="verify-ca">Verify CA</option>
          <option value="verify-full">Verify Full</option>
        </select>
      </div>

      <div v-if="localSSLConfig.mode !== 'disable'" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">CA Certificate</label>
          <div class="mt-1 flex items-center space-x-2">
            <input
              type="file"
              accept=".crt,.pem"
              @change="handleCertFileUpload($event, 'ca_cert')"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
            />
            <button
              v-if="localSSLConfig.ca_cert"
              @click="clearCertificate('ca_cert')"
              class="text-red-600 hover:text-red-800"
            >
              <TrashIcon class="h-5 w-5" />
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Client Certificate</label>
          <div class="mt-1 flex items-center space-x-2">
            <input
              type="file"
              accept=".crt,.pem"
              @change="handleCertFileUpload($event, 'client_cert')"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
            />
            <button
              v-if="localSSLConfig.client_cert"
              @click="clearCertificate('client_cert')"
              class="text-red-600 hover:text-red-800"
            >
              <TrashIcon class="h-5 w-5" />
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Client Key</label>
          <div class="mt-1 flex items-center space-x-2">
            <input
              type="file"
              accept=".key,.pem"
              @change="handleCertFileUpload($event, 'client_key')"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
            />
            <button
              v-if="localSSLConfig.client_key"
              @click="clearCertificate('client_key')"
              class="text-red-600 hover:text-red-800"
            >
              <TrashIcon class="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { TrashIcon } from '@heroicons/vue/24/outline'
import type { SSLConfig } from '@/types/connections'

interface Props {
  modelValue: SSLConfig
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({
    mode: 'disable' as const,
    ca_cert: undefined,
    client_cert: undefined,
    client_key: undefined
  })
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: SSLConfig): void
}>()

const localSSLConfig = ref<SSLConfig>({
  mode: props.modelValue.mode,
  ca_cert: props.modelValue.ca_cert,
  client_cert: props.modelValue.client_cert,
  client_key: props.modelValue.client_key
})

watch(localSSLConfig, (newValue) => {
  emit('update:modelValue', { ...newValue })
}, { deep: true })

const handleCertFileUpload = async (
  event: Event, 
  certType: 'ca_cert' | 'client_cert' | 'client_key'
) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1]
      localSSLConfig.value = {
        ...localSSLConfig.value,
        [certType]: base64String
      }
    }
    reader.readAsDataURL(file)
  }
}

const clearCertificate = (certType: keyof Omit<SSLConfig, 'mode'>) => {
  localSSLConfig.value = {
    ...localSSLConfig.value,
    [certType]: undefined
  }
}
</script> 