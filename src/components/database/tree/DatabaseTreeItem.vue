<script setup lang="ts">
import { computed, watch, inject, ref, onBeforeUnmount } from 'vue'
import type { ComputedRef } from 'vue'
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import SchemaTreeItem from './SchemaTreeItem.vue'
import ObjectList from './ObjectList.vue'
import HighlightedText from '@/components/common/HighlightedText.vue'
import { useDatabaseOverviewStore } from '@/stores/databaseOverview'
import {
  getExplorerObjectSectionKey,
  useExplorerNavigationStore,
  type ExplorerObjectSection,
  type ObjectType
} from '@/stores/explorerNavigation'
import type { ConnectionDatabaseSearchMatches, ConnectionSearchObjectRef } from '@/api/connections'

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
  searchMatches?: ConnectionDatabaseSearchMatches | null
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

const functionsOpen = ref(true)
const proceduresOpen = ref(true)
const highlightedSection = ref<'tables' | 'views' | 'functions' | 'procedures' | null>(null)
let sectionHighlightTimeout: ReturnType<typeof setTimeout> | null = null

const functionsExpanded = computed(() => functionsOpen.value)
const proceduresExpanded = computed(() => proceduresOpen.value)
const hasActiveSearch = computed(() => (searchQuery.value || '').trim().length > 0)

function getSectionKey(section: ExplorerObjectSection): string {
  return getExplorerObjectSectionKey({
    connectionId: props.connectionId,
    database: props.database.name,
    section
  })
}

function normalized(value: string | undefined | null): string {
  return (value || '').trim().toLowerCase()
}

function dedupeNames(values: string[]): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const trimmed = (value || '').trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  return result
}

function dedupeObjectRefs(
  refs: ConnectionSearchObjectRef[] | undefined
): ConnectionSearchObjectRef[] {
  if (!refs || !refs.length) return []
  const result: ConnectionSearchObjectRef[] = []
  const seen = new Set<string>()
  for (const ref of refs) {
    const name = (ref.name || '').trim()
    if (!name) continue
    const schema = (ref.schema || '').trim()
    const key = `${schema.toLowerCase()}::${name.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ name, schema: schema || undefined })
  }
  return result
}

function matchedFlatNames(
  refs: ConnectionSearchObjectRef[] | undefined,
  fallback: string[]
): string[] {
  if (!hasActiveSearch.value) return fallback
  if (!props.searchMatches) return []
  return dedupeNames((refs || []).map((ref) => ref.name))
}

function refsForSchema(
  refs: ConnectionSearchObjectRef[] | undefined,
  schemaName: string
): ConnectionSearchObjectRef[] {
  const target = normalized(schemaName)
  return dedupeObjectRefs(refs).filter((ref) => normalized(ref.schema) === target)
}

const filteredFlatTables = computed(() =>
  matchedFlatNames(props.searchMatches?.tables, props.flatTables)
)
const filteredFlatViews = computed(() =>
  matchedFlatNames(props.searchMatches?.views, props.flatViews)
)
const filteredFlatFunctions = computed(() =>
  matchedFlatNames(props.searchMatches?.functions, props.flatFunctions)
)
const filteredFlatProcedures = computed(() =>
  matchedFlatNames(props.searchMatches?.procedures, props.flatProcedures)
)

const filteredSchemas = computed<SchemaInfo[]>(() => {
  if (!hasActiveSearch.value) return props.schemas
  if (!props.searchMatches) return []

  const explicitSchemas = dedupeNames(props.searchMatches.schemas || [])
  const tableRefs = dedupeObjectRefs(props.searchMatches.tables)
  const viewRefs = dedupeObjectRefs(props.searchMatches.views)
  const functionRefs = dedupeObjectRefs(props.searchMatches.functions)
  const procedureRefs = dedupeObjectRefs(props.searchMatches.procedures)
  const sequenceRefs = dedupeObjectRefs(props.searchMatches.sequences)

  const schemaSet = new Set<string>()
  explicitSchemas.forEach((schemaName) => schemaSet.add(normalized(schemaName)))
  for (const ref of [
    ...tableRefs,
    ...viewRefs,
    ...functionRefs,
    ...procedureRefs,
    ...sequenceRefs
  ]) {
    if (ref.schema) {
      schemaSet.add(normalized(ref.schema))
    }
  }

  const schemaByName = new Map<string, SchemaInfo>()
  for (const schema of props.schemas) {
    schemaByName.set(normalized(schema.name), schema)
  }

  const orderedSchemaNames: string[] = []
  for (const schema of props.schemas) {
    const key = normalized(schema.name)
    if (schemaSet.has(key)) {
      orderedSchemaNames.push(schema.name)
      schemaSet.delete(key)
    }
  }
  for (const schemaName of explicitSchemas) {
    const key = normalized(schemaName)
    if (schemaSet.has(key)) {
      orderedSchemaNames.push(schemaName)
      schemaSet.delete(key)
    }
  }

  return orderedSchemaNames.map((schemaName) => {
    const base = schemaByName.get(normalized(schemaName)) || {
      name: schemaName,
      tables: [],
      views: [],
      functions: [],
      procedures: [],
      sequences: []
    }

    return {
      ...base,
      name: base.name || schemaName,
      tables: dedupeNames(refsForSchema(tableRefs, schemaName).map((ref) => ref.name)),
      views: dedupeNames(refsForSchema(viewRefs, schemaName).map((ref) => ref.name)),
      functions: dedupeNames(refsForSchema(functionRefs, schemaName).map((ref) => ref.name)),
      procedures: dedupeNames(refsForSchema(procedureRefs, schemaName).map((ref) => ref.name)),
      sequences: dedupeNames(refsForSchema(sequenceRefs, schemaName).map((ref) => ref.name))
    }
  })
})

const showTablesSection = computed(() =>
  hasActiveSearch.value ? filteredFlatTables.value.length > 0 : true
)
const showViewsSection = computed(() =>
  hasActiveSearch.value ? filteredFlatViews.value.length > 0 : true
)
const showFunctionsSection = computed(() =>
  hasActiveSearch.value ? filteredFlatFunctions.value.length > 0 : props.flatFunctions.length > 0
)
const showProceduresSection = computed(() =>
  hasActiveSearch.value ? filteredFlatProcedures.value.length > 0 : props.flatProcedures.length > 0
)

const tablesCount = computed(() =>
  hasActiveSearch.value ? filteredFlatTables.value.length : props.flatTables.length
)
const viewsCount = computed(() =>
  hasActiveSearch.value ? filteredFlatViews.value.length : props.flatViews.length
)
const functionsCount = computed(() =>
  hasActiveSearch.value ? filteredFlatFunctions.value.length : props.flatFunctions.length
)
const proceduresCount = computed(() =>
  hasActiveSearch.value ? filteredFlatProcedures.value.length : props.flatProcedures.length
)

const sectionsAutoExpanded = computed(() => hasActiveSearch.value)
const tablesSectionExpanded = computed(
  () =>
    sectionsAutoExpanded.value || navigationStore.isObjectSectionExpanded(getSectionKey('tables'))
)
const viewsSectionExpanded = computed(
  () =>
    sectionsAutoExpanded.value || navigationStore.isObjectSectionExpanded(getSectionKey('views'))
)
const functionsSectionExpanded = computed(
  () => sectionsAutoExpanded.value || functionsExpanded.value
)
const proceduresSectionExpanded = computed(
  () => sectionsAutoExpanded.value || proceduresExpanded.value
)

function highlightSection(section: 'tables' | 'views' | 'functions' | 'procedures') {
  highlightedSection.value = section
  if (sectionHighlightTimeout) {
    clearTimeout(sectionHighlightTimeout)
  }
  sectionHighlightTimeout = setTimeout(() => {
    highlightedSection.value = null
    sectionHighlightTimeout = null
  }, 900)
}

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

watch(
  () => treeSelection.value,
  (sel) => {
    if (props.hasSchemas) return
    if (!sel?.name || !sel?.type) return
    if (sel.connectionId !== props.connectionId || sel.database !== props.database.name) return

    if (sel.type === 'table') {
      if (!navigationStore.isObjectSectionExpanded(getSectionKey('tables'))) {
        navigationStore.expandObjectSection(getSectionKey('tables'))
        highlightSection('tables')
      }
    } else if (sel.type === 'view') {
      if (!navigationStore.isObjectSectionExpanded(getSectionKey('views'))) {
        navigationStore.expandObjectSection(getSectionKey('views'))
        highlightSection('views')
      }
    } else if (sel.type === 'function') {
      if (!functionsOpen.value) {
        functionsOpen.value = true
        highlightSection('functions')
      }
    } else if (sel.type === 'procedure') {
      if (!proceduresOpen.value) {
        proceduresOpen.value = true
        highlightSection('procedures')
      }
    }
  },
  { immediate: true, deep: true }
)

onBeforeUnmount(() => {
  if (sectionHighlightTimeout) {
    clearTimeout(sectionHighlightTimeout)
    sectionHighlightTimeout = null
  }
})

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

function toggleSection(section: ExplorerObjectSection) {
  navigationStore.toggleObjectSection(getSectionKey(section))
}
</script>

<template>
  <div>
    <div
      :class="[
        'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ui-text-default hover:[background-color:var(--ui-surface-muted)] cursor-pointer select-none',
        isSelected ? 'ui-tree-active' : ''
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

    <div v-if="isExpanded" role="group" class="ui-border-default ml-4 border-l pl-2 space-y-1">
      <div v-if="metadataLoaded">
        <!-- Show schemas only for PostgreSQL & Snowflake -->
        <div v-if="hasSchemas">
          <SchemaTreeItem
            v-for="schema in filteredSchemas"
            :key="schema.name || 'default'"
            :schema="schema"
            :connection-id="connectionId"
            :database="database.name"
            :is-expanded="hasActiveSearch ? true : isSchemaExpanded(schema.name)"
            :table-sizes="tableSizes"
            @toggle="handleSchemaToggle(schema.name)"
            @open-object="handleObjectOpen"
            @contextmenu-schema="handleSchemaContextMenu"
            @contextmenu-object="handleObjectContextMenu"
          />
        </div>
        <div v-else>
          <!-- Flat lists for DBs without schemas (e.g., MySQL) -->
          <button
            v-if="showTablesSection"
            type="button"
            class="ui-tree-section-button mt-1 flex w-full items-center justify-between px-2 text-left text-xs uppercase tracking-wide"
            :class="{
              'animate-pulse ui-tree-section-button-active': highlightedSection === 'tables'
            }"
            :aria-expanded="tablesSectionExpanded"
            @click.stop="toggleSection('tables')"
          >
            <span class="flex items-center gap-1">
              <component
                :is="tablesSectionExpanded ? ChevronDown : ChevronRight"
                class="ui-icon-muted h-3 w-3"
              />
              <span>Tables</span>
            </span>
            <span class="ui-text-subtle text-[11px] font-medium normal-case">
              {{ tablesCount }}
            </span>
          </button>
          <ObjectList
            v-if="showTablesSection && tablesSectionExpanded"
            :items="filteredFlatTables"
            object-type="table"
            :connection-id="connectionId"
            :database="database.name"
            :depth="2"
            :explorer-obj-prefix="`${connectionId}:${database.name}:`"
            :table-sizes="tableSizes"
            @click="(p) => handleObjectOpen({ type: 'table', ...p })"
            @dblclick="(p) => handleObjectOpen({ type: 'table', ...p })"
            @middleclick="(p) => handleObjectOpen({ type: 'table', ...p })"
            @contextmenu="handleFlatObjectContextMenu"
          />
          <button
            v-if="showViewsSection"
            type="button"
            class="ui-tree-section-button mt-2 flex w-full items-center justify-between px-2 text-left text-xs uppercase tracking-wide"
            :class="{
              'animate-pulse ui-tree-section-button-active': highlightedSection === 'views'
            }"
            :aria-expanded="viewsSectionExpanded"
            @click.stop="toggleSection('views')"
          >
            <span class="flex items-center gap-1">
              <component
                :is="viewsSectionExpanded ? ChevronDown : ChevronRight"
                class="ui-icon-muted h-3 w-3"
              />
              <span>Views</span>
            </span>
            <span class="ui-text-subtle text-[11px] font-medium normal-case">
              {{ viewsCount }}
            </span>
          </button>
          <ObjectList
            v-if="showViewsSection && viewsSectionExpanded"
            :items="filteredFlatViews"
            object-type="view"
            :connection-id="connectionId"
            :database="database.name"
            :depth="2"
            :explorer-obj-prefix="`${connectionId}:${database.name}:`"
            @click="(p) => handleObjectOpen({ type: 'view', ...p })"
            @dblclick="(p) => handleObjectOpen({ type: 'view', ...p })"
            @middleclick="(p) => handleObjectOpen({ type: 'view', ...p })"
            @contextmenu="handleFlatObjectContextMenu"
          />
          <button
            v-if="showFunctionsSection"
            type="button"
            class="ui-tree-section-button mt-2 flex w-full items-center justify-between px-2 text-left text-xs uppercase tracking-wide"
            :class="{
              'animate-pulse ui-tree-section-button-active': highlightedSection === 'functions'
            }"
            :aria-expanded="functionsSectionExpanded"
            @click.stop="functionsOpen = !functionsOpen"
          >
            <span class="flex items-center gap-1">
              <component
                :is="functionsSectionExpanded ? ChevronDown : ChevronRight"
                class="ui-icon-muted h-3 w-3"
              />
              <span>Functions</span>
            </span>
            <span class="ui-text-subtle text-[11px] font-medium normal-case">
              {{ functionsCount }}
            </span>
          </button>
          <ObjectList
            v-if="showFunctionsSection && functionsSectionExpanded"
            :items="filteredFlatFunctions"
            object-type="function"
            :connection-id="connectionId"
            :database="database.name"
            :depth="2"
            :explorer-obj-prefix="`${connectionId}:${database.name}:`"
            @click="(p) => handleObjectOpen({ type: 'function', ...p })"
            @dblclick="(p) => handleObjectOpen({ type: 'function', ...p })"
            @middleclick="(p) => handleObjectOpen({ type: 'function', ...p })"
            @contextmenu="handleFlatObjectContextMenu"
          />
          <button
            v-if="showProceduresSection"
            type="button"
            class="ui-tree-section-button mt-2 flex w-full items-center justify-between px-2 text-left text-xs uppercase tracking-wide"
            :class="{
              'animate-pulse ui-tree-section-button-active': highlightedSection === 'procedures'
            }"
            :aria-expanded="proceduresSectionExpanded"
            @click.stop="proceduresOpen = !proceduresOpen"
          >
            <span class="flex items-center gap-1">
              <component
                :is="proceduresSectionExpanded ? ChevronDown : ChevronRight"
                class="ui-icon-muted h-3 w-3"
              />
              <span>Procedures</span>
            </span>
            <span class="ui-text-subtle text-[11px] font-medium normal-case">
              {{ proceduresCount }}
            </span>
          </button>
          <ObjectList
            v-if="showProceduresSection && proceduresSectionExpanded"
            :items="filteredFlatProcedures"
            object-type="procedure"
            :connection-id="connectionId"
            :database="database.name"
            :depth="2"
            :explorer-obj-prefix="`${connectionId}:${database.name}:`"
            @click="(p) => handleObjectOpen({ type: 'procedure', ...p })"
            @dblclick="(p) => handleObjectOpen({ type: 'procedure', ...p })"
            @middleclick="(p) => handleObjectOpen({ type: 'procedure', ...p })"
            @contextmenu="handleFlatObjectContextMenu"
          />
        </div>
      </div>
      <div v-else class="flex items-center gap-2 px-2 py-2 text-xs ui-text-muted">
        <svg
          class="ui-accent-icon animate-spin h-3.5 w-3.5"
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
