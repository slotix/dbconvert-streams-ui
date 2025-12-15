<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useSchemaStore } from '@/stores/schema'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import DatabaseDiagramD3 from './DatabaseDiagramD3.vue'

const props = defineProps<{
  connectionId: string
  database: string
}>()

const schemaStore = useSchemaStore()
const navigationStore = useExplorerNavigationStore()

// Ensure schema is loaded for this database
onMounted(() => {
  if (
    schemaStore.connectionId !== props.connectionId ||
    schemaStore.databaseName !== props.database
  ) {
    schemaStore.setConnectionId(props.connectionId)
    schemaStore.setDatabaseName(props.database)
    schemaStore.fetchSchema(false)
  }
})

// Watch for prop changes and reload schema if needed
watch(
  () => [props.connectionId, props.database],
  ([newConnId, newDb]) => {
    if (schemaStore.connectionId !== newConnId || schemaStore.databaseName !== newDb) {
      schemaStore.setConnectionId(newConnId)
      schemaStore.setDatabaseName(newDb)
      schemaStore.fetchSchema(false)
    }
  }
)

// Recompute diagram schema when system-object visibility changes for this database.
watch(
  () => navigationStore.showSystemObjectsFor(props.connectionId, props.database),
  () => {
    if (
      schemaStore.connectionId === props.connectionId &&
      schemaStore.databaseName === props.database
    ) {
      schemaStore.fetchSchema(false)
    }
  }
)

const tables = computed(() => schemaStore.tables)
const views = computed(() => schemaStore.views)
const relationships = computed(() => schemaStore.relationships)
const isLoading = computed(() => schemaStore.loading)

const hasData = computed(() => {
  return tables.value?.length > 0 || views.value?.length > 0
})
</script>

<template>
  <div class="h-full relative bg-white dark:bg-gray-900">
    <!-- Loading state -->
    <div v-if="isLoading" class="h-full flex items-center justify-center">
      <div class="text-gray-500 dark:text-gray-400">Loading schema...</div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!hasData"
      class="h-full flex items-center justify-center text-gray-500 dark:text-gray-400"
    >
      <p>No tables or views to display</p>
    </div>

    <!-- Diagram -->
    <DatabaseDiagramD3 v-else :tables="tables" :relations="relationships" :views="views" />
  </div>
</template>
