<script setup lang="ts">
import type { SQLTriggerMeta } from '@/types/metadata'
import ViewDefinitionView from './ViewDefinitionView.vue'

const props = withDefaults(
  defineProps<{
    triggerMeta: SQLTriggerMeta
    connectionType: string
    objectKey?: string
    showContext?: boolean
  }>(),
  {
    showContext: true
  }
)
</script>

<template>
  <div class="p-4">
    <div class="grid grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300">
      <div class="text-gray-500 dark:text-gray-400">Name</div>
      <div>{{ triggerMeta.name }}</div>
      <template v-if="showContext">
        <div class="text-gray-500 dark:text-gray-400">Schema</div>
        <div>{{ triggerMeta.schema || 'default' }}</div>
        <div class="text-gray-500 dark:text-gray-400">Table</div>
        <div>{{ triggerMeta.tableName || '—' }}</div>
      </template>
      <div class="text-gray-500 dark:text-gray-400">Timing</div>
      <div>{{ triggerMeta.timing || '—' }}</div>
      <div class="text-gray-500 dark:text-gray-400">Event</div>
      <div>{{ triggerMeta.event || '—' }}</div>
    </div>
    <ViewDefinitionView
      :definition="triggerMeta.definition || ''"
      :connection-type="connectionType"
    />
  </div>
</template>
