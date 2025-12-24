<template>
  <div>
    <label class="block text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-2">
      Tables
    </label>
    <div
      class="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border border-gray-300 dark:border-gray-700"
    >
      <p class="text-sm text-gray-900 dark:text-gray-100">
        {{ displayedTables.join(', ') }}{{ remainingCount > 0 ? ', ...' : '' }}
        <span
          v-if="remainingCount > 0"
          class="text-xs text-gray-500 dark:text-gray-400 italic ml-1"
        >
          ({{ remainingCount }} more)
        </span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  displayedTables: string[]
  remainingCount: number
}>()
</script>
