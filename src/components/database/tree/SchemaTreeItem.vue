<script setup lang="ts">
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import ObjectList from './ObjectList.vue'
import { highlightParts as splitHighlight } from '@/utils/highlight'

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
  searchQuery: string
  caretClass: string
  tableSizes?: Record<string, number>
}>()

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

const highlightParts = (text: string) => splitHighlight(text, props.searchQuery)

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
      class="flex items-center px-2 py-1 text-sm text-gray-700 rounded-md hover:bg-gray-100 cursor-pointer select-none"
      :data-explorer-schema="`${connectionId}:${database}:${schema.name}`"
      @click="$emit('toggle')"
      @contextmenu.stop.prevent="handleSchemaContextMenu"
    >
      <component :is="isExpanded ? ChevronDownIcon : ChevronRightIcon" :class="caretClass" />
      <span class="font-medium">
        <template v-for="(p, i) in highlightParts(schema.name || 'default')" :key="i">
          <span v-if="p.match" class="bg-yellow-200/60 rounded px-0.5" v-text="p.text"></span>
          <span v-else v-text="p.text"></span>
        </template>
      </span>
    </div>
    <div v-if="isExpanded" class="ml-4 border-l border-gray-200 pl-2">
      <div
        class="text-xs uppercase tracking-wide text-gray-400 px-2 mt-1 flex items-center justify-between"
      >
        <span>Tables</span>
        <span class="text-[11px] font-medium text-gray-500 normal-case">
          {{ schema.tables.length }}
        </span>
      </div>
      <ObjectList
        :items="schema.tables"
        object-type="table"
        :connection-id="connectionId"
        :database="database"
        :schema="schema.name"
        :search-query="searchQuery"
        :explorer-obj-prefix="`${connectionId}:${database}:${schema.name || ''}`"
        :table-sizes="tableSizes"
        @click="(p) => handleObjectOpen('table', p)"
        @dblclick="(p) => handleObjectOpen('table', p)"
        @middleclick="(p) => handleObjectOpen('table', p)"
        @contextmenu="handleObjectContextMenu"
      />
      <div
        class="text-xs uppercase tracking-wide text-gray-400 px-2 mt-2 flex items-center justify-between"
      >
        <span>Views</span>
        <span class="text-[11px] font-medium text-gray-500 normal-case">
          {{ schema.views.length }}
        </span>
      </div>
      <ObjectList
        :items="schema.views"
        object-type="view"
        :connection-id="connectionId"
        :database="database"
        :schema="schema.name"
        :search-query="searchQuery"
        :explorer-obj-prefix="`${connectionId}:${database}:${schema.name || ''}`"
        @click="(p) => handleObjectOpen('view', p)"
        @dblclick="(p) => handleObjectOpen('view', p)"
        @middleclick="(p) => handleObjectOpen('view', p)"
        @contextmenu="handleObjectContextMenu"
      />
    </div>
  </div>
</template>
