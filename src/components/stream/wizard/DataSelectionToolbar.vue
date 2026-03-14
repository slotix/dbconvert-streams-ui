<template>
  <div
    class="flex flex-wrap items-center gap-3 pb-3"
    :class="sticky ? 'ui-surface-toolbar sticky top-0 z-30 pt-1 backdrop-blur-sm' : ''"
  >
    <div
      class="ui-chip-muted inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-sm font-medium"
      :title="counterTitle"
    >
      <span class="ui-accent-text">{{ selectedCount }}</span>
      <span v-if="selectedCountLabel" class="text-gray-500 dark:text-gray-400">
        {{ selectedCountLabel }}
      </span>
      <span class="text-gray-400">/</span>
      <span class="text-gray-600 dark:text-gray-300">{{ totalCount }}</span>
      <span v-if="totalCountLabel" class="text-gray-500 dark:text-gray-400">
        {{ totalCountLabel }}
      </span>
    </div>

    <div class="flex-1 min-w-[180px]">
      <div class="relative">
        <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          :value="searchValue"
          type="text"
          :placeholder="searchPlaceholder"
          class="ui-surface-raised ui-border-default ui-accent-focus w-full rounded-md border py-2 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 dark:text-gray-100"
          @input="onSearchInput"
        />
      </div>
    </div>

    <div v-if="selectionMode === 'multi'" class="inline-flex items-center">
      <FormCheckbox
        :model-value="selectAllChecked"
        :indeterminate="selectAllIndeterminate"
        :label="selectAllLabel"
        @update:model-value="onSelectAllUpdate"
      />
    </div>
    <div
      v-else-if="reserveSelectionSpace"
      aria-hidden="true"
      class="hidden shrink-0 md:block md:w-[170px]"
    />

    <button
      v-if="selectionMode !== 'none'"
      type="button"
      class="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      :disabled="clearDisabled"
      @click="$emit('clear')"
    >
      {{ clearLabel }}
    </button>

    <button
      type="button"
      class="ui-surface-raised ui-border-default ui-accent-action inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium text-gray-600 transition-colors disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-300"
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
  selectedCountLabel?: string
  totalCountLabel?: string
  counterTitle?: string
  searchValue: string
  searchPlaceholder?: string
  selectAllChecked: boolean
  selectAllIndeterminate: boolean
  selectAllLabel?: string
  clearLabel?: string
  clearDisabled?: boolean
  refreshLabel?: string
  refreshTitle?: string
  refreshDisabled?: boolean
  sticky?: boolean
  selectionMode?: 'multi' | 'single' | 'none'
  reserveSelectionSpace?: boolean
}

withDefaults(defineProps<Props>(), {
  searchPlaceholder: 'Filter...',
  selectedCountLabel: '',
  totalCountLabel: '',
  counterTitle: '',
  selectAllLabel: 'Select all',
  clearLabel: 'Clear',
  clearDisabled: false,
  refreshLabel: 'Refresh',
  refreshTitle: 'Refresh',
  refreshDisabled: false,
  sticky: false,
  selectionMode: 'multi',
  reserveSelectionSpace: false
})

const emit = defineEmits<{
  'update:search-value': [value: string]
  'update:select-all': [value: boolean]
  clear: []
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
