<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useSchemaStore } from '@/stores/schema'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useObjectTabStateStore } from '@/stores/objectTabState'
import DatabaseDiagramD3 from './DatabaseDiagramD3.vue'

const props = defineProps<{
  connectionId: string
  database: string
}>()

const schemaStore = useSchemaStore()
const navigationStore = useExplorerNavigationStore()
const objectTabStateStore = useObjectTabStateStore()

// Object key for persisting diagram state (shared across panes for same connection/database)
const diagramObjectKey = computed(() => `diagram:${props.connectionId}:${props.database}`)

// Local focus table that we control (for restoring persisted selection)
const localFocusTable = ref<string | null>(null)

// Ensure schema is loaded for this database and restore persisted selection
onMounted(() => {
  if (
    schemaStore.connectionId !== props.connectionId ||
    schemaStore.databaseName !== props.database
  ) {
    schemaStore.setConnectionId(props.connectionId)
    schemaStore.setDatabaseName(props.database)
    schemaStore.fetchSchema(false)
  }

  // Restore persisted selection
  const persistedSelection = objectTabStateStore.getDiagramSelectedTable(diagramObjectKey.value)
  if (persistedSelection) {
    localFocusTable.value = persistedSelection
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

// Handle selection change from diagram and persist it
function handleSelectionChange(tableName: string | null) {
  objectTabStateStore.setDiagramSelectedTable(diagramObjectKey.value, tableName)
}

// Handle focus consumed - clear local focus but preserve the persisted selection
function handleFocusConsumed() {
  localFocusTable.value = null
  schemaStore.setSelectedTable(null)
}
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
    <DatabaseDiagramD3
      v-else
      :tables="tables"
      :relations="relationships"
      :views="views"
      :focus-table="localFocusTable || schemaStore.selectedTable"
      @focus-consumed="handleFocusConsumed"
      @selection-change="handleSelectionChange"
    />
  </div>
</template>
