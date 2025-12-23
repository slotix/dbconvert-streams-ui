<template>
  <div class="space-y-2">
    <div class="flex items-stretch space-x-3">
      <!-- Path display -->
      <div class="flex-1">
        <input
          :value="modelValue"
          type="text"
          :class="inputClass"
          :placeholder="placeholder"
          readonly
        />
      </div>

      <!-- Browse button -->
      <button
        type="button"
        class="inline-flex items-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-teal-500 dark:focus:ring-teal-400 transition-colors"
        @click="openModal"
      >
        <FolderOpen class="h-4 w-4 mr-2" />
        Browse
      </button>
    </div>

    <!-- Help text -->
    <p v-if="helpText" class="text-xs text-gray-500 dark:text-gray-400 flex items-center">
      <Info class="h-4 w-4 mr-1 text-gray-400 dark:text-gray-500" />
      {{ helpText }}
    </p>

    <!-- Folder Selection Modal -->
    <FolderSelectionModal
      v-model:is-open="showModal"
      :initial-path="modelValue"
      @select="handleFolderSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { FolderOpen, Info } from 'lucide-vue-next'
import FolderSelectionModal from './FolderSelectionModal.vue'

interface Props {
  modelValue?: string
  placeholder?: string
  helpText?: string
  disabled?: boolean
  error?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Select a folder...',
  helpText: 'Click Browse to select a folder for your data files',
  disabled: false,
  error: false
})

const emit = defineEmits<Emits>()

const showModal = ref(false)

const inputClass = computed(() => {
  const baseClass =
    'block w-full rounded-lg border shadow-sm text-sm py-2.5 px-4 focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:outline-none transition-colors'

  if (props.error) {
    return `${baseClass} border-red-300 dark:border-red-700 bg-white dark:bg-gray-800 text-red-900 dark:text-red-300 placeholder-red-300 dark:placeholder-red-600 focus:ring-red-500 dark:focus:ring-red-400 focus:border-red-500 dark:focus:border-red-400`
  }

  if (props.disabled) {
    return `${baseClass} border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed`
  }

  return `${baseClass} border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500 dark:focus:border-teal-400`
})

const openModal = () => {
  if (!props.disabled) {
    showModal.value = true
  }
}

const handleFolderSelect = (path: string) => {
  emit('update:modelValue', path)
  showModal.value = false
}
</script>
