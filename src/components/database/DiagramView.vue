<script setup lang="ts">
import { computed } from 'vue'
import type { Table, Relationship } from '@/types/schema'
import DatabaseDiagramD3 from './DatabaseDiagramD3.vue'

const props = withDefaults(
  defineProps<{
    tables: Table[]
    relationships: Relationship[]
    views: Table[]
  }>(),
  {
    tables: () => [],
    relationships: () => [],
    views: () => []
  }
)

const hasData = computed(() => {
  return props.tables?.length > 0 || props.views?.length > 0
})
</script>

<template>
  <div class="h-full relative">
    <!-- Diagram content -->
    <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg relative h-full">
      <div v-if="!hasData" class="h-full flex items-center justify-center text-gray-500">
        <p>No tables or views to display</p>
      </div>
      <DatabaseDiagramD3 v-else :tables="tables" :relations="relationships" :views="views" />
    </div>
  </div>
</template>

<style scoped>
.h-full {
  height: 100%;
  min-height: 600px;
}
</style>
