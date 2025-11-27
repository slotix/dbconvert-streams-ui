<template>
  <div
    class="bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between"
  >
    <div class="flex items-center gap-3">
      <CommandLineIcon class="h-5 w-5 text-teal-500" />
      <div>
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">SQL Console</span>
        <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">
          {{ scopeLabel }}
        </span>
      </div>
    </div>

    <!-- Database selector for connection-scoped consoles -->
    <div v-if="showDatabaseSelector" class="flex items-center gap-2">
      <label class="text-xs text-gray-500 dark:text-gray-400">Database:</label>
      <select
        :value="selectedDatabase"
        class="block w-48 text-xs rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-teal-500 focus:ring-teal-500"
        @change="$emit('update:selectedDatabase', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">No database selected</option>
        <option v-for="db in availableDatabases" :key="db" :value="db">
          {{ db }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CommandLineIcon } from '@heroicons/vue/24/outline'

defineProps<{
  scopeLabel: string
  showDatabaseSelector: boolean
  selectedDatabase: string
  availableDatabases: string[]
}>()

defineEmits<{
  'update:selectedDatabase': [value: string]
}>()
</script>
