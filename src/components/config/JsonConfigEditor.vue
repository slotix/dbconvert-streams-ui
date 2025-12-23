<!-- JSON Configuration Editor with schema validation, formatting, and save/cancel actions -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { JsonEditor } from '@/components/monaco'
import { Check, RefreshCw, X } from 'lucide-vue-next'

interface Props {
  modelValue: string | object
  schema?: object
  title?: string
  height?: string
  showActions?: boolean
  saveButtonText?: string
  cancelButtonText?: string
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  schema: undefined,
  title: 'JSON Configuration',
  height: '500px',
  showActions: true,
  saveButtonText: 'Save',
  cancelButtonText: 'Cancel',
  isLoading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  save: [value: object]
  cancel: []
  valid: [isValid: boolean]
}>()

const editorRef = ref<InstanceType<typeof JsonEditor>>()
const localValue = ref('')
const isValid = ref(true)
const isDirty = ref(false)
const originalValue = ref('')

// Initialize local value
const initializeValue = () => {
  const value =
    typeof props.modelValue === 'string'
      ? props.modelValue
      : JSON.stringify(props.modelValue, null, 2)

  localValue.value = value
  originalValue.value = value
  isDirty.value = false
}

initializeValue()

// Watch for external changes
watch(
  () => props.modelValue,
  () => {
    initializeValue()
  }
)

// Track changes
watch(localValue, (newValue) => {
  isDirty.value = newValue !== originalValue.value
  emit('update:modelValue', newValue)
})

const handleValidation = (valid: boolean) => {
  isValid.value = valid
  emit('valid', valid)
}

const handleSave = () => {
  if (!isValid.value) {
    return
  }

  try {
    const parsed = JSON.parse(localValue.value)
    originalValue.value = localValue.value
    isDirty.value = false
    emit('save', parsed)
  } catch (error) {
    console.error('Failed to parse JSON:', error)
  }
}

const handleCancel = () => {
  localValue.value = originalValue.value
  isDirty.value = false
  emit('cancel')
}

const handleFormat = () => {
  editorRef.value?.formatJson()
}

// Expose methods for parent components
defineExpose({
  formatJson: () => editorRef.value?.formatJson(),
  resetToOriginal: handleCancel
})
</script>

<template>
  <div class="json-config-editor flex flex-col">
    <!-- Header -->
    <div
      class="flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center gap-3">
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ title }}</h3>

        <!-- Validation Status -->
        <span
          v-if="!isValid"
          class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
        >
          <X class="h-3 w-3 mr-1" />
          Invalid JSON
        </span>
        <span
          v-else-if="isDirty"
          class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200"
        >
          <RefreshCw class="h-3 w-3 mr-1" />
          Modified
        </span>
        <span
          v-else
          class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
        >
          <Check class="h-3 w-3 mr-1" />
          Valid
        </span>
      </div>

      <!-- Format Button -->
      <button
        class="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        @click="handleFormat"
      >
        Format
      </button>
    </div>

    <!-- Editor -->
    <div class="flex-1 bg-white dark:bg-gray-900">
      <JsonEditor
        ref="editorRef"
        v-model="localValue"
        :schema="schema"
        :height="height"
        @valid="handleValidation"
      />
    </div>

    <!-- Actions Footer -->
    <div
      v-if="showActions"
      class="flex items-center justify-end gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
    >
      <button
        type="button"
        class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        @click="handleCancel"
      >
        {{ cancelButtonText }}
      </button>

      <button
        type="button"
        :disabled="!isValid || !isDirty || isLoading"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="handleSave"
      >
        <svg
          v-if="isLoading"
          class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
        {{ isLoading ? 'Saving...' : saveButtonText }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.json-config-editor {
  @apply rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden;
}
</style>
