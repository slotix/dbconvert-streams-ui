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
        class="ui-accent-action ui-accent-focus inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
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
      :initial-path="modalInitialPath"
      @select="handleFolderSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { FolderOpen, Info } from 'lucide-vue-next'
import FolderSelectionModal from './FolderSelectionModal.vue'
import { isWailsContext } from '@/composables/useWailsEvents'

interface Props {
  modelValue?: string
  placeholder?: string
  helpText?: string
  initialPath?: string
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
  initialPath: '',
  disabled: false,
  error: false
})

const emit = defineEmits<Emits>()

const showModal = ref(false)
const modalInitialPath = computed(() =>
  props.modelValue ? props.modelValue : props.initialPath || ''
)
const isDesktop = isWailsContext()

const inputClass = computed(() => {
  const baseClass =
    'block w-full rounded-lg border shadow-sm px-4 py-2.5 text-sm focus:outline-none transition-colors'

  if (props.error) {
    return `${baseClass} border-red-300 dark:border-red-700 bg-white dark:bg-gray-800 text-red-900 dark:text-red-300 placeholder-red-300 dark:placeholder-red-600 focus:border-red-500 dark:focus:border-red-400 focus:bg-red-50/40 dark:focus:bg-red-950/20`
  }

  if (props.disabled) {
    return `${baseClass} border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed`
  }

  return `${baseClass} ui-accent-focus border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500`
})

const openModal = async () => {
  if (props.disabled) return

  if (isDesktop) {
    const wailsGo = (
      window as unknown as {
        go?: { main?: { App?: { PickDirectory?: (path: string) => Promise<string> } } }
      }
    ).go

    if (wailsGo?.main?.App?.PickDirectory) {
      try {
        const selectedPath = await wailsGo.main.App.PickDirectory(modalInitialPath.value)
        if (selectedPath) {
          emit('update:modelValue', selectedPath)
        }
        return
      } catch {
        // Fall back to web modal if native dialog fails.
      }
    }
  }

  showModal.value = true
}

const handleFolderSelect = (path: string) => {
  emit('update:modelValue', path)
  showModal.value = false
}
</script>
