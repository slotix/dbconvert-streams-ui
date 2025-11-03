<template>
  <div class="space-y-2">
    <div class="flex items-center space-x-3">
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
        class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        @click="openModal"
      >
        <FolderOpenIcon class="h-4 w-4 mr-2" />
        Browse
      </button>
    </div>

    <!-- Help text -->
    <p v-if="helpText" class="text-xs text-gray-500 flex items-center">
      <InformationCircleIcon class="h-4 w-4 mr-1 text-gray-400" />
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
import { FolderOpenIcon, InformationCircleIcon } from '@heroicons/vue/24/outline'
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
    'block w-full rounded-md border shadow-sm text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none'

  if (props.error) {
    return `${baseClass} border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500`
  }

  if (props.disabled) {
    return `${baseClass} border-gray-300 bg-gray-50 text-gray-500 cursor-not-allowed`
  }

  return `${baseClass} border-gray-300 text-gray-700 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500`
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
