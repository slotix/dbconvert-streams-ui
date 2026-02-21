<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import type { ComputedRef } from 'vue'
import { ChevronDown, ChevronRight, Grid2X2 } from 'lucide-vue-next'
import ObjectList from './ObjectList.vue'
import HighlightedText from '@/components/common/HighlightedText.vue'
import type { ObjectType } from '@/stores/explorerNavigation'

interface SchemaInfo {
  name: string
  tables: string[]
  views: string[]
  functions: string[]
  procedures: string[]
  sequences: string[]
}

const props = defineProps<{
  schema: SchemaInfo
  connectionId: string
  database: string
  isExpanded: boolean
  tableSizes?: Record<string, number>
  databaseNameMatchesSearch?: boolean // When database name matches search
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

// Check if this schema is currently selected (schema selected, but no table/view)
const isSelected = computed(() => {
  return (
    treeSelection.value.connectionId === props.connectionId &&
    treeSelection.value.database === props.database &&
    treeSelection.value.schema === props.schema.name &&
    !treeSelection.value.name
  )
})

// Check if the schema name matches the search query
const schemaNameMatchesSearch = computed(() => {
  const query = searchQuery.value?.trim().toLowerCase()
  if (!query) return false
  return (props.schema.name || '').toLowerCase().includes(query)
})

// Parent matches search if database name or schema name matches
const parentMatchesSearch = computed(() => {
  return props.databaseNameMatchesSearch || schemaNameMatchesSearch.value
})

const hasSearch = computed(() => !!searchQuery.value?.trim())
const tablesOpen = ref(true)
const viewsOpen = ref(true)
const functionsOpen = ref(true)
const proceduresOpen = ref(true)
const sequencesOpen = ref(true)

const tablesExpanded = computed(() => (hasSearch.value ? true : tablesOpen.value))
const viewsExpanded = computed(() => (hasSearch.value ? true : viewsOpen.value))
const functionsExpanded = computed(() => (hasSearch.value ? true : functionsOpen.value))
const proceduresExpanded = computed(() => (hasSearch.value ? true : proceduresOpen.value))
const sequencesExpanded = computed(() => (hasSearch.value ? true : sequencesOpen.value))

const emit = defineEmits<{
  (e: 'toggle'): void
  (
    e: 'open-object',
    payload: {
      type: ObjectType
      name: string
      schema: string
      mode: 'preview' | 'pinned'
    }
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
      schema: string
      name: string
    }
  ): void
}>()

function handleSchemaContextMenu(event: MouseEvent) {
  emit('contextmenu-schema', {
    event,
    connectionId: props.connectionId,
    database: props.database,
    schema: props.schema.name || ''
  })
}

function handleObjectOpen(type: ObjectType, payload: { name: string; mode: 'preview' | 'pinned' }) {
  emit('open-object', {
    type,
    name: payload.name,
    schema: props.schema.name,
    mode: payload.mode
  })
}

function handleObjectContextMenu(payload: {
  event: MouseEvent
  kind: ObjectType
  name: string
  schema?: string
}) {
  emit('contextmenu-object', {
    event: payload.event,
    kind: payload.kind,
    connectionId: props.connectionId,
    database: props.database,
    schema: props.schema.name || '',
    name: payload.name
  })
}
</script>

<template>
  <div>
    <div
      :class="[
        'flex items-center px-2 py-1 text-sm text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer select-none',
        isSelected ? 'bg-teal-100/80 dark:bg-teal-900/40' : ''
      ]"
      :data-explorer-schema="`${connectionId}:${database}:${schema.name}`"
      data-tree-node="true"
      data-node-kind="schema"
      data-tree-depth="2"
      :data-connection-id="connectionId"
      :data-database="database"
      :data-schema="schema.name || ''"
      role="treeitem"
      aria-level="3"
      :aria-expanded="isExpanded ? 'true' : 'false'"
      :aria-selected="isSelected ? 'true' : 'false'"
      tabindex="-1"
      @click="$emit('toggle')"
      @contextmenu.stop.prevent="handleSchemaContextMenu"
    >
      <component :is="isExpanded ? ChevronDown : ChevronRight" :class="caretClass" />
      <Grid2X2 class="w-4 h-4 mr-1.5 text-purple-500 dark:text-purple-400 shrink-0" />
      <HighlightedText class="font-medium" :text="schema.name || 'default'" :query="searchQuery" />
    </div>
    <div
      v-if="isExpanded"
      role="group"
      class="ml-4 border-l border-gray-200 dark:border-gray-700 pl-2"
    >
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
          {{ schema.tables.length }}
        </span>
      </button>
      <ObjectList
        v-if="tablesExpanded"
        :items="schema.tables"
        object-type="table"
        :connection-id="connectionId"
        :database="database"
        :schema="schema.name"
        :depth="3"
        :explorer-obj-prefix="`${connectionId}:${database}:${schema.name || ''}`"
        :table-sizes="tableSizes"
        :parent-matches-search="parentMatchesSearch"
        @click="(p) => handleObjectOpen('table', p)"
        @dblclick="(p) => handleObjectOpen('table', p)"
        @middleclick="(p) => handleObjectOpen('table', p)"
        @contextmenu="handleObjectContextMenu"
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
          {{ schema.views.length }}
        </span>
      </button>
      <ObjectList
        v-if="viewsExpanded"
        :items="schema.views"
        object-type="view"
        :connection-id="connectionId"
        :database="database"
        :schema="schema.name"
        :depth="3"
        :explorer-obj-prefix="`${connectionId}:${database}:${schema.name || ''}`"
        :parent-matches-search="parentMatchesSearch"
        @click="(p) => handleObjectOpen('view', p)"
        @dblclick="(p) => handleObjectOpen('view', p)"
        @middleclick="(p) => handleObjectOpen('view', p)"
        @contextmenu="handleObjectContextMenu"
      />
      <button
        v-if="schema.functions.length"
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
          {{ schema.functions.length }}
        </span>
      </button>
      <ObjectList
        v-if="schema.functions.length && functionsExpanded"
        :items="schema.functions"
        object-type="function"
        :connection-id="connectionId"
        :database="database"
        :schema="schema.name"
        :depth="3"
        :explorer-obj-prefix="`${connectionId}:${database}:${schema.name || ''}`"
        :parent-matches-search="parentMatchesSearch"
        @click="(p) => handleObjectOpen('function', p)"
        @dblclick="(p) => handleObjectOpen('function', p)"
        @middleclick="(p) => handleObjectOpen('function', p)"
        @contextmenu="handleObjectContextMenu"
      />
      <button
        v-if="schema.procedures.length"
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
          {{ schema.procedures.length }}
        </span>
      </button>
      <ObjectList
        v-if="schema.procedures.length && proceduresExpanded"
        :items="schema.procedures"
        object-type="procedure"
        :connection-id="connectionId"
        :database="database"
        :schema="schema.name"
        :depth="3"
        :explorer-obj-prefix="`${connectionId}:${database}:${schema.name || ''}`"
        :parent-matches-search="parentMatchesSearch"
        @click="(p) => handleObjectOpen('procedure', p)"
        @dblclick="(p) => handleObjectOpen('procedure', p)"
        @middleclick="(p) => handleObjectOpen('procedure', p)"
        @contextmenu="handleObjectContextMenu"
      />
      <button
        v-if="schema.sequences.length"
        type="button"
        class="w-full text-left text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 px-2 mt-2 flex items-center justify-between hover:text-gray-500 dark:hover:text-gray-400"
        :aria-expanded="sequencesExpanded"
        @click.stop="sequencesOpen = !sequencesOpen"
      >
        <span class="flex items-center gap-1">
          <component
            :is="sequencesExpanded ? ChevronDown : ChevronRight"
            class="h-3 w-3 text-gray-400 dark:text-gray-500"
          />
          <span>Sequences</span>
        </span>
        <span class="text-[11px] font-medium text-gray-500 dark:text-gray-400 normal-case">
          {{ schema.sequences.length }}
        </span>
      </button>
      <ObjectList
        v-if="schema.sequences.length && sequencesExpanded"
        :items="schema.sequences"
        object-type="sequence"
        :connection-id="connectionId"
        :database="database"
        :schema="schema.name"
        :depth="3"
        :explorer-obj-prefix="`${connectionId}:${database}:${schema.name || ''}`"
        :parent-matches-search="parentMatchesSearch"
        @click="(p) => handleObjectOpen('sequence', p)"
        @dblclick="(p) => handleObjectOpen('sequence', p)"
        @middleclick="(p) => handleObjectOpen('sequence', p)"
        @contextmenu="handleObjectContextMenu"
      />
    </div>
  </div>
</template>
