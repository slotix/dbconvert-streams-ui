<script setup lang="ts">
import { inject, computed } from 'vue'
import type { ComputedRef } from 'vue'
import ObjectIcon from '@/components/common/ObjectIcon.vue'
import { highlightParts as splitHighlight } from '@/utils/highlight'
import { formatDataSize } from '@/utils/formats'

type ObjectType = 'table' | 'view'

const props = defineProps<{
  items: string[]
  objectType: ObjectType
  connectionId: string
  database: string
  schema?: string
  explorerObjPrefix: string
  tableSizes?: Record<string, number> // Map of table name -> size in bytes
}>()

// Inject search query and selection from parent
const searchQuery = inject<ComputedRef<string>>('treeSearchQuery')!
const treeSelection = inject<
  ComputedRef<{
    connectionId?: string
    database?: string
    schema?: string
    type?: 'table' | 'view' | null
    name?: string | null
  }>
>('treeSelection')!

// Check if an item is currently selected (active pane)
const isItemSelected = (itemName: string) => {
  return (
    treeSelection.value.connectionId === props.connectionId &&
    treeSelection.value.database === props.database &&
    treeSelection.value.schema === (props.schema || undefined) &&
    treeSelection.value.type === props.objectType &&
    treeSelection.value.name === itemName
  )
}

const emit = defineEmits<{
  (e: 'click', payload: { name: string; mode: 'preview' }): void
  (e: 'dblclick', payload: { name: string; mode: 'pinned' }): void
  (e: 'middleclick', payload: { name: string; mode: 'pinned' }): void
  (
    e: 'contextmenu',
    payload: { event: MouseEvent; kind: ObjectType; name: string; schema?: string }
  ): void
}>()

const highlightParts = (text: string) => splitHighlight(text, searchQuery.value)

function handleClick(name: string) {
  emit('click', { name, mode: 'preview' })
}

function handleDblClick(name: string) {
  emit('dblclick', { name, mode: 'pinned' })
}

function handleMiddleClick(name: string) {
  emit('middleclick', { name, mode: 'pinned' })
}

function handleContextMenu(event: MouseEvent, name: string) {
  emit('contextmenu', {
    event,
    kind: props.objectType,
    name,
    schema: props.schema
  })
}

const filteredItems = () => {
  if (!searchQuery.value) return props.items
  return props.items.filter((n) => n.toLowerCase().includes(searchQuery.value.toLowerCase()))
}

function getTableSize(tableName: string): string | null {
  if (props.objectType !== 'table' || !props.tableSizes) return null
  const sizeBytes = props.tableSizes[tableName]
  return sizeBytes !== undefined ? formatDataSize(sizeBytes) : null
}
</script>

<template>
  <div
    v-for="item in filteredItems()"
    :key="item"
    :class="[
      'flex items-center justify-between px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer select-none group',
      isItemSelected(item)
        ? 'bg-gray-100 dark:bg-gray-800 ring-1 ring-gray-300 dark:ring-gray-600'
        : ''
    ]"
    :data-explorer-obj="`${explorerObjPrefix}:${objectType}:${item}`"
    @click.stop="handleClick(item)"
    @dblclick.stop="handleDblClick(item)"
    @click.middle.stop="handleMiddleClick(item)"
    @contextmenu.stop.prevent="handleContextMenu($event, item)"
  >
    <div class="flex items-center min-w-0 flex-1">
      <ObjectIcon :object-type="objectType" class="mr-2 flex-shrink-0" />
      <span class="truncate">
        <template v-for="(p, i) in highlightParts(item)" :key="i">
          <span
            v-if="p.match"
            class="bg-yellow-200/60 dark:bg-yellow-500/40 rounded px-0.5"
            v-text="p.text"
          ></span>
          <span v-else v-text="p.text"></span>
        </template>
      </span>
    </div>
    <span
      v-if="getTableSize(item)"
      class="ml-2 text-xs text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400 flex-shrink-0"
      >{{ getTableSize(item) }}</span
    >
  </div>
</template>
