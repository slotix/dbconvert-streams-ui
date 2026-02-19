<template>
  <div class="certificate-input border-b border-gray-100 dark:border-gray-700 pb-6 last:border-b-0">
    <div class="flex items-center mb-2">
      <label :for="inputId" class="text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ label }}
        <span
          v-tooltip="description"
          class="ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 cursor-help inline-block"
        >
          <CircleHelp class="h-4 w-4" />
        </span>
      </label>
    </div>

    <div class="flex items-center justify-between">
      <div class="flex items-center text-sm text-gray-600 dark:text-gray-400">
        <CheckCircle
          v-if="value && !error"
          class="h-5 w-5 text-green-500 dark:text-green-400 mr-2"
        />
        {{ error || (value ? 'Certificate stored securely' : 'No file uploaded') }}
      </div>

      <div class="flex items-center space-x-2">
        <input
          :id="inputId"
          ref="fileInput"
          type="file"
          :accept="accept"
          class="hidden"
          @change="handleFileChange"
        />

        <button
          type="button"
          :disabled="isLoading"
          class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          @click="triggerFileInput"
        >
          <RefreshCw v-if="isLoading" class="animate-spin h-4 w-4 mr-2" />
          {{ value ? 'Replace' : 'Upload' }}
        </button>

        <button
          v-if="value && !isLoading"
          type="button"
          class="text-red-500 dark:text-red-300 hover:text-red-700 dark:hover:text-red-300"
          @click="$emit('clear')"
        >
          <Trash class="h-5 w-5" />
        </button>
      </div>
    </div>

    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
      Accepted formats: {{ accept.replace(/\./g, '').toUpperCase() }} (Max size:
      {{ formatFileSize(maxSize) }})
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CheckCircle, CircleHelp, RefreshCw, Trash } from 'lucide-vue-next'

import { vTooltip } from '@/directives/tooltip'
const props = withDefaults(
  defineProps<{
    type: string
    label: string
    description: string
    accept: string
    maxSize: number
    value: string | undefined
    isLoading?: boolean
    error?: string
  }>(),
  {
    isLoading: false
  }
)

const emit = defineEmits<{
  (e: 'update', file: File | null): void
  (e: 'clear'): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const inputId = `ssl-cert-${props.type}`

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  emit('update', file)
  input.value = '' // Reset input
}

function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}
</script>
