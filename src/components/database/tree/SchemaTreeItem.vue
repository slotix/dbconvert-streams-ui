<script setup lang="ts">
import { inject, computed } from 'vue'
import type { ComputedRef } from 'vue'
import { ChevronDown, ChevronRight, Grid2X2 } from 'lucide-vue-next'
import ObjectList from './ObjectList.vue'
import HighlightedText from '@/components/common/HighlightedText.vue'

type ObjectType = 'table' | 'view'

interface SchemaInfo {
  name: string
  tables: string[]
  views: string[]
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
    type?: 'table' | 'view' | null
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
        isSelected ? 'bg-gray-100 dark:bg-gray-800 ring-1 ring-gray-300 dark:ring-gray-600' : ''
      ]"
      :data-explorer-schema="`${connectionId}:${database}:${schema.name}`"
      @click="$emit('toggle')"
      @contextmenu.stop.prevent="handleSchemaContextMenu"
    >
      <component :is="isExpanded ? ChevronDown : ChevronRight" :class="caretClass" />
      <Grid2X2 class="w-4 h-4 mr-1.5 text-purple-500 dark:text-purple-400 shrink-0" />
      <HighlightedText class="font-medium" :text="schema.name || 'default'" :query="searchQuery" />
    </div>
    <div v-if="isExpanded" class="ml-4 border-l border-gray-200 dark:border-gray-700 pl-2">
      <div
        class="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 px-2 mt-1 flex items-center justify-between"
      >
        <span>Tables</span>
        <span class="text-[11px] font-medium text-gray-500 dark:text-gray-400 normal-case">
          {{ schema.tables.length }}
        </span>
      </div>
      <ObjectList
        :items="schema.tables"
        object-type="table"
        :connection-id="connectionId"
        :database="database"
        :schema="schema.name"
        :explorer-obj-prefix="`${connectionId}:${database}:${schema.name || ''}`"
        :table-sizes="tableSizes"
        :parent-matches-search="parentMatchesSearch"
        @click="(p) => handleObjectOpen('table', p)"
        @dblclick="(p) => handleObjectOpen('table', p)"
        @middleclick="(p) => handleObjectOpen('table', p)"
        @contextmenu="handleObjectContextMenu"
      />
      <div
        class="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 px-2 mt-2 flex items-center justify-between"
      >
        <span>Views</span>
        <span class="text-[11px] font-medium text-gray-500 dark:text-gray-400 normal-case">
          {{ schema.views.length }}
        </span>
      </div>
      <ObjectList
        :items="schema.views"
        object-type="view"
        :connection-id="connectionId"
        :database="database"
        :schema="schema.name"
        :explorer-obj-prefix="`${connectionId}:${database}:${schema.name || ''}`"
        :parent-matches-search="parentMatchesSearch"
        @click="(p) => handleObjectOpen('view', p)"
        @dblclick="(p) => handleObjectOpen('view', p)"
        @middleclick="(p) => handleObjectOpen('view', p)"
        @contextmenu="handleObjectContextMenu"
      />
    </div>
  </div>
</template>
