<template>
  <div v-if="queries.length > 0">
    <label class="block text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-2">
      Custom SQL Queries
    </label>
    <div
      class="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border border-gray-300 dark:border-gray-700"
    >
      <div class="flex flex-wrap gap-2">
        <span
          v-for="query in queries"
          :key="query.name"
          class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded border border-purple-200 dark:border-purple-700"
        >
          <Code class="w-3.5 h-3.5" />
          {{ query.name }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Code } from 'lucide-vue-next'
import type { QuerySource } from '@/types/streamConfig'

defineProps<{
  queries: QuerySource[]
}>()
</script>
