<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { Relationship, Table } from '@/types/schema'
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
const route = useRoute()

// Object key for persisting diagram state (shared across panes for same connection/database)
const diagramObjectKey = computed(() => `diagram:${props.connectionId}:${props.database}`)

// Local focus table that we control (for restoring persisted selection)
const localFocusTable = ref<string | null>(null)

// Local schema snapshot (per diagram tab)
const tables = ref<Table[]>([])
const views = ref<Table[]>([])
const relationships = ref<Relationship[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

const lastAppliedUrlFocusToken = ref<string | null>(null)

function applyUrlFocusIfMatches() {
  // Only apply focus when this diagram matches the current URL context.
  const routeConnId = route.params.id
  if (typeof routeConnId !== 'string' || routeConnId !== props.connectionId) return

  const queryDb = route.query.db
  if (typeof queryDb !== 'string' || queryDb !== props.database) return

  if (route.query.diagram !== 'true') return

  const focusType = route.query.focusType
  const focusName = route.query.focusName
  const focusSchema = route.query.focusSchema
  if (
    (focusType !== 'table' && focusType !== 'view') ||
    typeof focusName !== 'string' ||
    !focusName
  )
    return

  const fullName =
    typeof focusSchema === 'string' && focusSchema ? `${focusSchema}.${focusName}` : focusName
  const token = `${focusType}:${fullName}`
  if (lastAppliedUrlFocusToken.value === token) return

  localFocusTable.value = fullName
  lastAppliedUrlFocusToken.value = token
}

async function loadSchema(forceRefresh: boolean = false) {
  isLoading.value = true
  error.value = null
  try {
    const snapshot = await schemaStore.fetchSchemaSnapshot(
      props.connectionId,
      props.database,
      forceRefresh
    )
    tables.value = snapshot.tables
    views.value = snapshot.views
    relationships.value = snapshot.relationships
  } catch (err) {
    console.error('Failed to load diagram schema snapshot:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load schema'
    tables.value = []
    views.value = []
    relationships.value = []
  } finally {
    isLoading.value = false
  }
}

// Ensure schema is loaded for this database and restore persisted selection
onMounted(() => {
  // Restore persisted selection
  const persistedSelection = objectTabStateStore.getDiagramSelectedTable(diagramObjectKey.value)
  if (persistedSelection) {
    localFocusTable.value = persistedSelection
  }

  // Apply optional URL focus (shared URLs / back-forward navigation)
  applyUrlFocusIfMatches()

  void loadSchema(false)
})

// Watch for prop changes and reload schema if needed
watch(
  () => [props.connectionId, props.database],
  () => {
    void loadSchema(false)
    applyUrlFocusIfMatches()
  }
)

// Recompute diagram schema when system-object visibility changes for this database.
watch(
  () => navigationStore.showSystemObjectsFor(props.connectionId, props.database),
  () => {
    void loadSchema(false)
  }
)

// If the route changes (back/forward or shared URL), re-apply focus if this tab matches.
watch(
  () => [route.params.id, route.query] as const,
  () => {
    applyUrlFocusIfMatches()
  }
)

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
}
</script>

<template>
  <div class="h-full relative bg-white dark:bg-gray-900">
    <!-- Loading state -->
    <div v-if="isLoading" class="h-full flex items-center justify-center">
      <div class="text-gray-500 dark:text-gray-400">Loading schema...</div>
    </div>

    <div
      v-else-if="error"
      class="h-full flex items-center justify-center text-sm text-red-600 dark:text-red-400"
    >
      {{ error }}
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
      :focus-table="localFocusTable"
      @focus-consumed="handleFocusConsumed"
      @selection-change="handleSelectionChange"
    />
  </div>
</template>
