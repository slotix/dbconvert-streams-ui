<script setup lang="ts">
import { inject, computed } from 'vue'
import type { ComputedRef } from 'vue'
import ObjectIcon from '@/components/common/ObjectIcon.vue'
import HighlightedText from '@/components/common/HighlightedText.vue'
import { formatDataSize } from '@/utils/formats'
import type { ObjectType } from '@/stores/explorerNavigation'

const props = defineProps<{
  items: string[]
  objectType: ObjectType
  connectionId: string
  database: string
  schema?: string
  explorerObjPrefix: string
  tableSizes?: Record<string, number> // Map of table name -> size in bytes
  parentMatchesSearch?: boolean // When true, skip item filtering (show all items)
}>()

// Inject search query and selection from parent
const searchQuery = inject<ComputedRef<string>>('treeSearchQuery')!
const treeSelection = inject<
  ComputedRef<{
    connectionId?: string
    database?: string
    schema?: string
    type?: ObjectType | null
    name?: string | null
  }>
>('treeSelection')!

// Provided by ExplorerSidebarConnections; when false, hide sizes to preserve name space.
const showTableSizesInTree = inject<ComputedRef<boolean>>(
  'treeShowTableSizes',
  computed(() => true)
)

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

// Memoized filter using computed - avoids recalculating on every render
// When parentMatchesSearch is true, show all items without filtering
// (user is browsing a database that matched their search)
const filteredItems = computed(() => {
  if (!searchQuery.value || props.parentMatchesSearch) return props.items
  const query = searchQuery.value.toLowerCase()
  return props.items.filter((n) => n.toLowerCase().includes(query))
})

function getTableSize(tableName: string): string | null {
  if (props.objectType !== 'table' || !props.tableSizes) return null
  const schema = props.schema?.trim()
  let sizeBytes: number | undefined
  if (schema) {
    const qualifiedName = `${schema}.${tableName}`
    sizeBytes = props.tableSizes[qualifiedName]
  }
  if (sizeBytes === undefined) {
    sizeBytes = props.tableSizes[tableName]
  }
  // Use zeroAsNA=true because system tables (performance_schema, information_schema) report 0
  return sizeBytes !== undefined ? formatDataSize(sizeBytes, true) : null
}
</script>

<template>
  <div
    v-for="item in filteredItems"
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
      <HighlightedText class="truncate" :text="item" :query="searchQuery" />
    </div>
    <span
      v-if="showTableSizesInTree && getTableSize(item)"
      class="ml-2 text-xs text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400 flex-shrink-0"
      >{{ getTableSize(item) }}</span
    >
  </div>
</template>
