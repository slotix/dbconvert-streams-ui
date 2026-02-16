<script setup lang="ts">
import { computed, watch, inject, ref } from 'vue'
import type { ComputedRef } from 'vue'
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import SchemaTreeItem from './SchemaTreeItem.vue'
import ObjectList from './ObjectList.vue'
import HighlightedText from '@/components/common/HighlightedText.vue'
import { useDatabaseOverviewStore } from '@/stores/databaseOverview'
import { useExplorerNavigationStore, type ObjectType } from '@/stores/explorerNavigation'

const overviewStore = useDatabaseOverviewStore()
const navigationStore = useExplorerNavigationStore()

interface SchemaInfo {
  name: string
  tables: string[]
  views: string[]
  functions: string[]
  procedures: string[]
  sequences: string[]
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
  flatFunctions: string[]
  flatProcedures: string[]
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
    type?: ObjectType | null
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

// Check if the database name matches the search query
// When true, we show all tables/views without filtering them by search
const databaseNameMatchesSearch = computed(() => {
  const query = searchQuery.value?.trim().toLowerCase()
  if (!query) return false
  return props.database.name.toLowerCase().includes(query)
})

const hasSearch = computed(() => !!searchQuery.value?.trim())
const tablesOpen = ref(true)
const viewsOpen = ref(true)
const functionsOpen = ref(true)
const proceduresOpen = ref(true)

const tablesExpanded = computed(() => (hasSearch.value ? true : tablesOpen.value))
const viewsExpanded = computed(() => (hasSearch.value ? true : viewsOpen.value))
const functionsExpanded = computed(() => (hasSearch.value ? true : functionsOpen.value))
const proceduresExpanded = computed(() => (hasSearch.value ? true : proceduresOpen.value))

const emit = defineEmits<{
  (e: 'toggle-database'): void
  (e: 'toggle-schema', schemaName: string): void
  (
    e: 'select-database',
    payload: {
      connectionId: string
      database: string
      mode?: 'preview' | 'pinned'
    }
  ): void
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

// Get table sizes from store (reactive)
const tableSizes = computed(() => {
  return overviewStore.getAllTableSizes(props.connectionId, props.database.name)
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

function handleDatabaseClick() {
  // Emit both toggle (expand/collapse) and select (show overview) events
  emit('toggle-database')
  emit('select-database', {
    connectionId: props.connectionId,
    database: props.database.name
  })
}

function handleDatabaseDoubleClick() {
  emit('select-database', {
    connectionId: props.connectionId,
    database: props.database.name,
    mode: 'pinned'
  })
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
        'group flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer select-none',
        isSelected
          ? 'bg-teal-50/70 dark:bg-teal-900/20 border border-teal-300/80 dark:border-teal-500/50 ring-1 ring-teal-300/60 dark:ring-teal-500/30'
          : ''
      ]"
      :data-explorer-db="`${connectionId}:${database.name}`"
      data-tree-node="true"
      data-node-kind="database"
      data-tree-depth="1"
      :data-connection-id="connectionId"
      :data-database="database.name"
      role="treeitem"
      aria-level="2"
      :aria-expanded="isExpanded ? 'true' : 'false'"
      :aria-selected="isSelected ? 'true' : 'false'"
      tabindex="-1"
      @click="handleDatabaseClick"
      @dblclick.stop="handleDatabaseDoubleClick"
      @contextmenu.stop.prevent="handleDatabaseContextMenu"
    >
      <component :is="isExpanded ? ChevronDown : ChevronRight" :class="caretClass" />
      <HighlightedText
        class="font-medium flex-1 min-w-0 truncate"
        :text="database.name"
        :query="searchQuery"
      />
    </div>

    <div
      v-if="isExpanded"
      role="group"
      class="ml-4 border-l border-gray-200 dark:border-gray-700 pl-2 space-y-1"
    >
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
            :database-name-matches-search="databaseNameMatchesSearch"
            @toggle="handleSchemaToggle(schema.name)"
            @open-object="handleObjectOpen"
            @contextmenu-schema="handleSchemaContextMenu"
            @contextmenu-object="handleObjectContextMenu"
          />
        </div>
        <div v-else>
          <!-- Flat lists for DBs without schemas (e.g., MySQL) -->
          <button
            type="button"
            class="w-full text-left text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 px-2 mt-1 flex items-center justify-between hover:text-gray-500 dark:hover:text-gray-400"
            :aria-expanded="tablesExpanded"
            @click.stop="tablesOpen = !tablesOpen"
          >
            <span class="flex items-center gap-1">
              <component
                :is="tablesExpanded ? ChevronDown : ChevronRight"
                class="h-3 w-3 text-gray-400 dark:text-gray-500"
              />
              <span>Tables</span>
            </span>
            <span class="text-[11px] font-medium text-gray-500 dark:text-gray-400 normal-case">
              {{ flatTables.length }}
            </span>
          </button>
          <ObjectList
            v-if="tablesExpanded"
            :items="flatTables"
            object-type="table"
            :connection-id="connectionId"
            :database="database.name"
            :depth="2"
            :explorer-obj-prefix="`${connectionId}:${database.name}:`"
            :table-sizes="tableSizes"
            :parent-matches-search="databaseNameMatchesSearch"
            @click="(p) => handleObjectOpen({ type: 'table', ...p })"
            @dblclick="(p) => handleObjectOpen({ type: 'table', ...p })"
            @middleclick="(p) => handleObjectOpen({ type: 'table', ...p })"
            @contextmenu="handleFlatObjectContextMenu"
          />
          <button
            type="button"
            class="w-full text-left text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 px-2 mt-2 flex items-center justify-between hover:text-gray-500 dark:hover:text-gray-400"
            :aria-expanded="viewsExpanded"
            @click.stop="viewsOpen = !viewsOpen"
          >
            <span class="flex items-center gap-1">
              <component
                :is="viewsExpanded ? ChevronDown : ChevronRight"
                class="h-3 w-3 text-gray-400 dark:text-gray-500"
              />
              <span>Views</span>
            </span>
            <span class="text-[11px] font-medium text-gray-500 dark:text-gray-400 normal-case">
              {{ flatViews.length }}
            </span>
          </button>
          <ObjectList
            v-if="viewsExpanded"
            :items="flatViews"
            object-type="view"
            :connection-id="connectionId"
            :database="database.name"
            :depth="2"
            :explorer-obj-prefix="`${connectionId}:${database.name}:`"
            :parent-matches-search="databaseNameMatchesSearch"
            @click="(p) => handleObjectOpen({ type: 'view', ...p })"
            @dblclick="(p) => handleObjectOpen({ type: 'view', ...p })"
            @middleclick="(p) => handleObjectOpen({ type: 'view', ...p })"
            @contextmenu="handleFlatObjectContextMenu"
          />
          <button
            v-if="flatFunctions.length"
            type="button"
            class="w-full text-left text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 px-2 mt-2 flex items-center justify-between hover:text-gray-500 dark:hover:text-gray-400"
            :aria-expanded="functionsExpanded"
            @click.stop="functionsOpen = !functionsOpen"
          >
            <span class="flex items-center gap-1">
              <component
                :is="functionsExpanded ? ChevronDown : ChevronRight"
                class="h-3 w-3 text-gray-400 dark:text-gray-500"
              />
              <span>Functions</span>
            </span>
            <span class="text-[11px] font-medium text-gray-500 dark:text-gray-400 normal-case">
              {{ flatFunctions.length }}
            </span>
          </button>
          <ObjectList
            v-if="flatFunctions.length && functionsExpanded"
            :items="flatFunctions"
            object-type="function"
            :connection-id="connectionId"
            :database="database.name"
            :depth="2"
            :explorer-obj-prefix="`${connectionId}:${database.name}:`"
            :parent-matches-search="databaseNameMatchesSearch"
            @click="(p) => handleObjectOpen({ type: 'function', ...p })"
            @dblclick="(p) => handleObjectOpen({ type: 'function', ...p })"
            @middleclick="(p) => handleObjectOpen({ type: 'function', ...p })"
            @contextmenu="handleFlatObjectContextMenu"
          />
          <button
            v-if="flatProcedures.length"
            type="button"
            class="w-full text-left text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 px-2 mt-2 flex items-center justify-between hover:text-gray-500 dark:hover:text-gray-400"
            :aria-expanded="proceduresExpanded"
            @click.stop="proceduresOpen = !proceduresOpen"
          >
            <span class="flex items-center gap-1">
              <component
                :is="proceduresExpanded ? ChevronDown : ChevronRight"
                class="h-3 w-3 text-gray-400 dark:text-gray-500"
              />
              <span>Procedures</span>
            </span>
            <span class="text-[11px] font-medium text-gray-500 dark:text-gray-400 normal-case">
              {{ flatProcedures.length }}
            </span>
          </button>
          <ObjectList
            v-if="flatProcedures.length && proceduresExpanded"
            :items="flatProcedures"
            object-type="procedure"
            :connection-id="connectionId"
            :database="database.name"
            :depth="2"
            :explorer-obj-prefix="`${connectionId}:${database.name}:`"
            :parent-matches-search="databaseNameMatchesSearch"
            @click="(p) => handleObjectOpen({ type: 'procedure', ...p })"
            @dblclick="(p) => handleObjectOpen({ type: 'procedure', ...p })"
            @middleclick="(p) => handleObjectOpen({ type: 'procedure', ...p })"
            @contextmenu="handleFlatObjectContextMenu"
          />
        </div>
      </div>
      <div
        v-else
        class="flex items-center gap-2 px-2 py-2 text-xs text-gray-500 dark:text-gray-400"
      >
        <svg
          class="animate-spin h-3.5 w-3.5 text-teal-600 dark:text-teal-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span>Loading metadata…</span>
      </div>
    </div>
  </div>
</template>
