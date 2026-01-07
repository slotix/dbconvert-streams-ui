<script setup lang="ts">
import { computed } from 'vue'
import type { SQLRoutineMeta } from '@/types/metadata'
import ViewDefinitionView from './ViewDefinitionView.vue'

const props = defineProps<{
  routineMeta: SQLRoutineMeta
  connectionType: string
  objectKey?: string
}>()

const routineSignature = computed(() => {
  const signature = props.routineMeta.signature?.trim()
  return signature ? `(${signature})` : ''
})
</script>

<template>
  <div class="p-4">
    <div class="grid grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300">
      <div class="text-gray-500 dark:text-gray-400">Type</div>
      <div class="capitalize">{{ routineMeta.routineType }}</div>
      <div class="text-gray-500 dark:text-gray-400">Name</div>
      <div>{{ routineMeta.name }}{{ routineSignature }}</div>
      <div class="text-gray-500 dark:text-gray-400">Schema</div>
      <div>{{ routineMeta.schema || 'default' }}</div>
      <div class="text-gray-500 dark:text-gray-400">Return type</div>
      <div>{{ routineMeta.returnType || '—' }}</div>
      <div class="text-gray-500 dark:text-gray-400">Language</div>
      <div>{{ routineMeta.language || '—' }}</div>
    </div>
    <ViewDefinitionView
      :definition="routineMeta.definition || ''"
      :connection-type="connectionType"
    />
  </div>
</template>
