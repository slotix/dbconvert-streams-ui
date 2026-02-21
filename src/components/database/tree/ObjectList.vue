<script setup lang="ts">
import { inject, computed } from 'vue'
import { useVirtualList } from '@vueuse/core'
import type { ComputedRef } from 'vue'
import ObjectIcon from '@/components/common/ObjectIcon.vue'
import HighlightedText from '@/components/common/HighlightedText.vue'
import { formatDataSize } from '@/utils/formats'
import type { ObjectType } from '@/stores/explorerNavigation'

// Number of items below which normal rendering is used (all items in DOM)
const VIRTUAL_THRESHOLD = 100
// Row height in px — must match the rendered height of each item div
const ITEM_HEIGHT = 32
// Maximum height (px) of the virtual scroll container (~15 rows)
const MAX_VIRTUAL_HEIGHT = 480

const props = defineProps<{
  items: string[]
  objectType: ObjectType
  connectionId: string
  database: string
  schema?: string
  explorerObjPrefix: string
  depth?: number
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

// Use virtual scrolling only when the list is large enough to matter
const useVirtual = computed(() => filteredItems.value.length > VIRTUAL_THRESHOLD)

// Virtual list — always set up but only used when useVirtual is true
const {
  list: virtualList,
  containerProps,
  wrapperProps
} = useVirtualList(filteredItems, {
  itemHeight: ITEM_HEIGHT,
  overscan: 5
})

// Height of the virtual scroll container — capped at MAX_VIRTUAL_HEIGHT
const virtualContainerHeight = computed(() =>
  Math.min(filteredItems.value.length * ITEM_HEIGHT, MAX_VIRTUAL_HEIGHT)
)

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
  <!-- Small list: render all items normally (existing behavior) -->
  <template v-if="!useVirtual">
    <div
      v-for="item in filteredItems"
      :key="item"
      :class="[
        'flex items-center justify-between px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer select-none group',
        isItemSelected(item)
          ? 'bg-teal-50/70 dark:bg-teal-900/20 border border-teal-300/80 dark:border-teal-500/50 ring-1 ring-teal-300/60 dark:ring-teal-500/30'
          : ''
      ]"
      :data-explorer-obj="`${explorerObjPrefix}:${objectType}:${item}`"
      data-tree-node="true"
      data-node-kind="object"
      :data-tree-depth="depth ?? 2"
      :data-connection-id="connectionId"
      :data-database="database"
      :data-schema="schema || ''"
      :data-object-type="objectType"
      :data-object-name="item"
      role="treeitem"
      :aria-level="(depth ?? 2) + 1"
      :aria-selected="isItemSelected(item) ? 'true' : 'false'"
      tabindex="-1"
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

  <!-- Large list: virtual scroll — only DOM nodes in the viewport are rendered -->
  <div
    v-else
    v-bind="containerProps"
    :style="{ height: `${virtualContainerHeight}px` }"
    class="overflow-y-auto overscroll-contain scrollbar-thin"
  >
    <div v-bind="wrapperProps">
      <div
        v-for="{ index, data: item } in virtualList"
        :key="item"
        :style="{ height: `${ITEM_HEIGHT}px` }"
        :class="[
          'flex items-center justify-between px-2 text-sm text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer select-none group',
          isItemSelected(item)
            ? 'bg-teal-50/70 dark:bg-teal-900/20 border border-teal-300/80 dark:border-teal-500/50 ring-1 ring-teal-300/60 dark:ring-teal-500/30'
            : ''
        ]"
        :data-explorer-obj="`${explorerObjPrefix}:${objectType}:${item}`"
        data-tree-node="true"
        data-node-kind="object"
        :data-tree-depth="depth ?? 2"
        :data-connection-id="connectionId"
        :data-database="database"
        :data-schema="schema || ''"
        :data-object-type="objectType"
        :data-object-name="item"
        role="treeitem"
        :aria-level="(depth ?? 2) + 1"
        :aria-selected="isItemSelected(item) ? 'true' : 'false'"
        :data-virtual-index="index"
        tabindex="-1"
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
    </div>
  </div>
</template>
