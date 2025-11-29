<template>
  <div
    class="bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between"
  >
    <div class="flex items-center gap-3">
      <CommandLineIcon class="h-5 w-5 text-teal-500" />
      <div>
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ title }}</span>
        <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">
          {{ scopeLabel }}
        </span>
      </div>
    </div>

    <div class="flex items-center space-x-2">
      <!-- Templates Dropdown -->
      <div class="relative">
        <button
          class="inline-flex items-center px-2 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          @click="$emit('toggle-templates')"
        >
          <DocumentTextIcon class="h-3.5 w-3.5 mr-1" />
          Templates
          <ChevronDownIcon class="h-3 w-3 ml-1" />
        </button>
      </div>

      <!-- Query History Dropdown -->
      <div class="relative">
        <button
          class="inline-flex items-center px-2 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          :disabled="historyCount === 0"
          :class="{ 'opacity-50 cursor-not-allowed': historyCount === 0 }"
          @click="$emit('toggle-history')"
        >
          <ClockIcon class="h-3.5 w-3.5 mr-1" />
          History
          <span v-if="historyCount > 0" class="ml-1 text-gray-400">({{ historyCount }})</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CommandLineIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ClockIcon
} from '@heroicons/vue/24/outline'

defineProps<{
  title: string
  scopeLabel: string
  historyCount: number
}>()

defineEmits<{
  'toggle-templates': []
  'toggle-history': []
}>()
</script>
