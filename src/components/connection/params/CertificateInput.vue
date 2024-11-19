 <template>
  <div class="certificate-input">
    <label :for="inputId" class="block text-sm font-medium text-gray-700">
      {{ label }}
      <span 
        v-tooltip="description"
        class="ml-1 text-gray-400 hover:text-gray-500 cursor-help"
      >
        <QuestionMarkCircleIcon class="h-4 w-4 inline" />
      </span>
    </label>
    
    <div class="mt-2 flex items-center justify-between">
      <div class="flex-1 text-sm">
        <span 
          :class="error ? 'text-red-600' : 'text-gray-500'"
        >
          {{ error || (value ? 'Certificate stored securely' : 'No file uploaded') }}
        </span>
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
          class="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          @click="triggerFileInput"
        >
          <ArrowPathIcon
            v-if="isLoading"
            class="animate-spin h-4 w-4 mr-2"
          />
          {{ value ? 'Replace' : 'Upload' }}
        </button>
        
        <button
          v-if="value && !isLoading"
          type="button"
          class="text-red-600 hover:text-red-800"
          @click="$emit('clear')"
        >
          <TrashIcon class="h-5 w-5" />
        </button>
      </div>
    </div>
    
    <p v-if="!error" class="mt-1 text-xs text-gray-500">
      Accepted formats: {{ accept.replace(/\./g, '').toUpperCase() }} (Max size: {{ formatFileSize(maxSize) }})
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  TrashIcon,
  QuestionMarkCircleIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'

import { vTooltip } from '@/directives/tooltip'
const props = withDefaults(defineProps<{
  type: string
  label: string
  description: string
  accept: string
  maxSize: number
  value: string | undefined
  isLoading?: boolean
  error?: string
}>(), {
  isLoading: false
})

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