<template>
  <div class="flex items-center gap-4 mb-4">
    <!-- Label with Icon -->
    <div class="flex items-center gap-2 shrink-0">
      <CircleStackIcon class="h-5 w-5 text-teal-600 dark:text-teal-400" />
      <label class="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Data Source Type
      </label>
    </div>

    <!-- Mode Buttons -->
    <div class="flex-1">
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="option in availableOptions"
          :key="option.id"
          type="button"
          :class="[
            modelValue === option.id
              ? 'bg-teal-600 dark:bg-teal-900 text-white border border-transparent dark:border-teal-600 hover:bg-teal-700 dark:hover:bg-teal-800'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500',
            'flex items-center justify-center gap-2 rounded-md py-3 px-3 text-sm font-medium transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500'
          ]"
          @click="$emit('update:modelValue', option.id)"
        >
          <component :is="option.icon" class="w-4 h-4" />
          <span>{{ option.title }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TableCellsIcon, CodeBracketIcon, CircleStackIcon } from '@heroicons/vue/24/outline'

export type DataSourceMode = 'tables' | 'queries'

interface ModeOption {
  id: DataSourceMode
  title: string
  icon: typeof TableCellsIcon
}

interface Props {
  modelValue: DataSourceMode
  showQueryMode?: boolean // Hide query mode for CDC
}

const props = withDefaults(defineProps<Props>(), {
  showQueryMode: true
})

defineEmits<{
  'update:modelValue': [value: DataSourceMode]
}>()

const allOptions: ModeOption[] = [
  { id: 'tables', title: 'Select Tables', icon: TableCellsIcon },
  { id: 'queries', title: 'Custom SQL Queries', icon: CodeBracketIcon }
]

const availableOptions = computed(() => {
  if (props.showQueryMode) {
    return allOptions
  }
  return allOptions.filter((opt) => opt.id === 'tables')
})
</script>
