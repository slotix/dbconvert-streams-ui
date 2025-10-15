<script setup lang="ts">
import { computed, watch, inject } from 'vue'
import type { ComputedRef } from 'vue'
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import SchemaTreeItem from './SchemaTreeItem.vue'
import ObjectList from './ObjectList.vue'
import { highlightParts as splitHighlight } from '@/utils/highlight'
import { useDatabaseOverviewStore } from '@/stores/databaseOverview'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'

type ObjectType = 'table' | 'view'

const overviewStore = useDatabaseOverviewStore()
const navigationStore = useExplorerNavigationStore()

interface SchemaInfo {
  name: string
  tables: string[]
  views: string[]
}

interface DatabaseInfo {
  name: string
}

const props = defineProps<{
  database: DatabaseInfo
  connectionId: string
  isExpanded: boolean
  hasSchemas: boolean
  schemas: SchemaInfo[]
  flatTables: string[]
  flatViews: string[]
  metadataLoaded: boolean
}>()

// Inject search query, caret class, and selection from parent
const searchQuery = inject<ComputedRef<string>>('treeSearchQuery')!
const caretClass = inject<string>('treeCaretClass')!
const treeSelection = inject<
  ComputedRef<{
    connectionId?: string
    database?: string
    schema?: string
    type?: 'table' | 'view' | null
    name?: string | null
  }>
>('treeSelection')!

// Check if this database is currently selected (database selected, but no schema/table)
const isSelected = computed(() => {
  return (
    treeSelection.value.connectionId === props.connectionId &&
    treeSelection.value.database === props.database.name &&
    !treeSelection.value.schema &&
    !treeSelection.value.name
  )
})

// Check if this database is an ancestor of the active selection
const isAncestorOfActive = computed(() => {
  // Database is ancestor if a table/view is selected in this database
  return (
    treeSelection.value.connectionId === props.connectionId &&
    treeSelection.value.database === props.database.name &&
    (treeSelection.value.schema || treeSelection.value.name) &&
    !isSelected.value
  )
})

const emit = defineEmits<{
  (e: 'toggle-database'): void
  (e: 'toggle-schema', schemaName: string): void
  (e: 'select-database', payload: { connectionId: string; database: string }): void
  (
    e: 'open-object',
    payload: {
      type: ObjectType
      name: string
      schema?: string
      mode: 'preview' | 'pinned'
    }
  ): void
  (
    e: 'contextmenu-database',
    payload: { event: MouseEvent; connectionId: string; database: string }
  ): void
  (
    e: 'contextmenu-schema',
    payload: { event: MouseEvent; connectionId: string; database: string; schema: string }
  ): void
  (
    e: 'contextmenu-object',
    payload: {
      event: MouseEvent
      kind: ObjectType
      connectionId: string
      database: string
      schema?: string
      name: string
    }
  ): void
}>()

const highlightParts = (text: string) => splitHighlight(text, searchQuery.value)

// Get table sizes from store (reactive)
const tableSizes = computed(() => {
  return overviewStore.getAllTableSizes()
})

// Fetch overview data when database is expanded
watch(
  () => props.isExpanded,
  async (expanded) => {
    if (expanded) {
      await overviewStore.fetchOverview(props.connectionId, props.database.name)
    }
  },
  { immediate: true }
)

function isSchemaExpanded(schemaName: string): boolean {
  const key = `${props.connectionId}:${props.database.name}:${schemaName}`
  return navigationStore.isSchemaExpanded(key)
}

function handleDatabaseContextMenu(event: MouseEvent) {
  emit('contextmenu-database', {
    event,
    connectionId: props.connectionId,
    database: props.database.name
  })
}

function handleSchemaToggle(schemaName: string) {
  emit('toggle-schema', schemaName)
}

function handleSchemaContextMenu(payload: {
  event: MouseEvent
  connectionId: string
  database: string
  schema: string
}) {
  emit('contextmenu-schema', payload)
}

function handleObjectOpen(payload: {
  type: ObjectType
  name: string
  schema?: string
  mode: 'preview' | 'pinned'
}) {
  emit('open-object', payload)
}

function handleObjectContextMenu(payload: {
  event: MouseEvent
  kind: ObjectType
  connectionId: string
  database: string
  schema?: string
  name: string
}) {
  emit('contextmenu-object', payload)
}

function handleFlatObjectContextMenu(payload: {
  event: MouseEvent
  kind: ObjectType
  name: string
  schema?: string
}) {
  emit('contextmenu-object', {
    event: payload.event,
    kind: payload.kind,
    connectionId: props.connectionId,
    database: props.database.name,
    name: payload.name
  })
}
</script>

<template>
  <div>
    <div
      :class="[
        'flex items-center px-2 py-1.5 text-sm text-gray-700 rounded-md hover:bg-gray-100 cursor-pointer select-none',
        isSelected ? 'bg-sky-50 ring-1 ring-sky-200' : isAncestorOfActive ? 'bg-sky-50/40' : ''
      ]"
      :data-explorer-db="`${connectionId}:${database.name}`"
      @click="$emit('select-database', { connectionId, database: database.name })"
      @contextmenu.stop.prevent="handleDatabaseContextMenu"
    >
      <component
        :is="isExpanded ? ChevronDownIcon : ChevronRightIcon"
        :class="caretClass"
        @click.stop="$emit('toggle-database')"
      />
      <span class="font-medium">
        <template v-for="(p, i) in highlightParts(database.name)" :key="i">
          <span v-if="p.match" class="bg-yellow-200/60 rounded px-0.5" v-text="p.text"></span>
          <span v-else v-text="p.text"></span>
        </template>
      </span>
    </div>

    <div v-if="isExpanded" class="ml-4 border-l border-gray-200 pl-2 space-y-1">
      <div v-if="metadataLoaded">
        <!-- Show schemas only for PostgreSQL & Snowflake -->
        <div v-if="hasSchemas">
          <SchemaTreeItem
            v-for="schema in schemas"
            :key="schema.name || 'default'"
            :schema="schema"
            :connection-id="connectionId"
            :database="database.name"
            :is-expanded="isSchemaExpanded(schema.name)"
            :table-sizes="tableSizes"
            @toggle="handleSchemaToggle(schema.name)"
            @open-object="handleObjectOpen"
            @contextmenu-schema="handleSchemaContextMenu"
            @contextmenu-object="handleObjectContextMenu"
          />
        </div>
        <div v-else>
          <!-- Flat lists for DBs without schemas (e.g., MySQL) -->
          <div
            class="text-xs uppercase tracking-wide text-gray-400 px-2 mt-1 flex items-center justify-between"
          >
            <span>Tables</span>
            <span class="text-[11px] font-medium text-gray-500 normal-case">
              {{ flatTables.length }}
            </span>
          </div>
          <ObjectList
            :items="flatTables"
            object-type="table"
            :connection-id="connectionId"
            :database="database.name"
            :explorer-obj-prefix="`${connectionId}:${database.name}:`"
            :table-sizes="tableSizes"
            @click="(p) => handleObjectOpen({ type: 'table', ...p })"
            @dblclick="(p) => handleObjectOpen({ type: 'table', ...p })"
            @middleclick="(p) => handleObjectOpen({ type: 'table', ...p })"
            @contextmenu="handleFlatObjectContextMenu"
          />
          <div
            class="text-xs uppercase tracking-wide text-gray-400 px-2 mt-2 flex items-center justify-between"
          >
            <span>Views</span>
            <span class="text-[11px] font-medium text-gray-500 normal-case">
              {{ flatViews.length }}
            </span>
          </div>
          <ObjectList
            :items="flatViews"
            object-type="view"
            :connection-id="connectionId"
            :database="database.name"
            :explorer-obj-prefix="`${connectionId}:${database.name}:`"
            @click="(p) => handleObjectOpen({ type: 'view', ...p })"
            @dblclick="(p) => handleObjectOpen({ type: 'view', ...p })"
            @middleclick="(p) => handleObjectOpen({ type: 'view', ...p })"
            @contextmenu="handleFlatObjectContextMenu"
          />
        </div>
      </div>
      <div v-else class="text-xs text-gray-500 px-2 py-1">Loading metadata…</div>
    </div>
  </div>
</template>
