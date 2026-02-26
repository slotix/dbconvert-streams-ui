<template>
  <div
    class="flex flex-wrap items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700"
    :class="
      sticky ? 'sticky top-0 z-30 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm pt-1' : ''
    "
  >
    <div
      class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 text-sm font-medium"
    >
      <span class="text-teal-600 dark:text-teal-400">{{ selectedCount }}</span>
      <span class="text-gray-400">/</span>
      <span class="text-gray-600 dark:text-gray-300">{{ totalCount }}</span>
    </div>

    <div class="flex-1 min-w-[180px]">
      <div class="relative">
        <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          :value="searchValue"
          type="text"
          :placeholder="searchPlaceholder"
          class="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          @input="onSearchInput"
        />
      </div>
    </div>

    <div class="inline-flex items-center">
      <FormCheckbox
        :model-value="selectAllChecked"
        :indeterminate="selectAllIndeterminate"
        :label="selectAllLabel"
        @update:model-value="onSelectAllUpdate"
      />
    </div>

    <button
      type="button"
      class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      :title="refreshTitle"
      :disabled="refreshDisabled"
      @click="$emit('refresh')"
    >
      <RefreshCw class="w-4 h-4" />
      <span class="hidden sm:inline">{{ refreshLabel }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { Search, RefreshCw } from 'lucide-vue-next'
import FormCheckbox from '@/components/base/FormCheckbox.vue'

interface Props {
  selectedCount: number
  totalCount: number
  searchValue: string
  searchPlaceholder?: string
  selectAllChecked: boolean
  selectAllIndeterminate: boolean
  selectAllLabel?: string
  refreshLabel?: string
  refreshTitle?: string
  refreshDisabled?: boolean
  sticky?: boolean
}

withDefaults(defineProps<Props>(), {
  searchPlaceholder: 'Filter...',
  selectAllLabel: 'All',
  refreshLabel: 'Refresh',
  refreshTitle: 'Refresh',
  refreshDisabled: false,
  sticky: false
})

const emit = defineEmits<{
  'update:search-value': [value: string]
  'update:select-all': [value: boolean]
  refresh: []
}>()

function onSearchInput(event: Event) {
  const target = event.target as HTMLInputElement | null
  emit('update:search-value', target?.value || '')
}

function onSelectAllUpdate(value: boolean | unknown[]) {
  emit('update:select-all', Array.isArray(value) ? value.length > 0 : value)
}
</script>
