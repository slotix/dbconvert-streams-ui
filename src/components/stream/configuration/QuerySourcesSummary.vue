<template>
  <div v-if="queries.length > 0">
    <label class="block text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-2">
      Custom SQL Queries
    </label>
    <div class="ui-surface-muted ui-border-default rounded-md border p-3">
      <div class="flex flex-wrap gap-2">
        <span
          v-for="query in queries"
          :key="query.name"
          class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium ui-badge-accent rounded border"
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
