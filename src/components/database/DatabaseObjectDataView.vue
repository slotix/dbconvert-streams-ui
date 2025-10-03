<script setup lang="ts">
import { type SQLTableMeta, type SQLViewMeta } from '@/types/metadata'
import AGGridDataView from './AGGridDataView.vue'

defineProps<{
  tableMeta: SQLTableMeta | SQLViewMeta
  connectionId: string
  database: string
  isView?: boolean
}>()
</script>

<template>
  <div
    :class="[
      'bg-white',
      $attrs.class ? $attrs.class : 'shadow-sm ring-1 ring-gray-900/5 rounded-lg'
    ]"
  >
    <div class="p-4">
      <AGGridDataView
        :table-meta="tableMeta"
        :connection-id="connectionId"
        :database="database"
        :is-view="isView"
      />
    </div>
  </div>
</template>
