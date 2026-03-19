<template>
  <template v-if="!useVirtual">
    <div class="grid grid-cols-1 lg:grid-cols-2">
      <template v-for="(table, idx) in tables" :key="table.name">
        <div
          class="ui-border-muted group flex items-center gap-2 border-b px-4 py-2.5 transition-colors hover:bg-(--ui-surface-muted)"
          :class="[idx % 2 === 0 ? 'lg:border-r lg:border-r-[var(--ui-border-muted)]' : '']"
        >
          <input
            :id="`table-${table.name}`"
            v-model="table.selected"
            type="checkbox"
            class="ui-accent-icon ui-surface-raised ui-border-default h-4 w-4 rounded shrink-0"
            @change="
              emit('checkbox-change', {
                table,
                checked: ($event.target as HTMLInputElement)?.checked || false
              })
            "
          />

          <!-- Icon slot: filter button when selected, filter indicator when filtered, table icon otherwise -->
          <button
            v-if="table.selected && !isCdcMode"
            v-tooltip="hasTableFilter(table) ? 'Edit filter' : 'Add filter'"
            :aria-label="hasTableFilter(table) ? 'Edit filter' : 'Add filter'"
            :aria-pressed="isTableSettingsOpen(table.name)"
            class="ui-focus-ring h-4 w-4 shrink-0 flex items-center justify-center rounded transition-all"
            :class="getFilterButtonClass(table)"
            @click="emit('toggle-filter', table.name)"
          >
            <Filter :class="['h-3.5 w-3.5 transition-all', getFilterIconClass(table)]" />
          </button>
          <Filter
            v-else-if="hasTableFilter(table)"
            v-tooltip="'Has active filter'"
            class="ui-accent-icon h-4 w-4 shrink-0 fill-current"
          />
          <TableIcon v-else class="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />

          <label
            :for="`table-${table.name}`"
            class="flex-1 min-w-0 cursor-pointer text-sm text-gray-900 dark:text-gray-100 truncate"
          >
            <HighlightedText :text="getTableDisplayName(table.name)" :query="searchQuery" />
          </label>

          <span
            v-if="showTableSize"
            v-tooltip="'Table size'"
            class="w-16 text-right text-xs shrink-0 text-gray-500 dark:text-gray-400"
            :class="{ 'opacity-0': getTableSize(table.name) === undefined }"
          >
            {{ formatTableSize(getTableSize(table.name)) }}
          </span>
          <span
            v-if="showRowCount"
            v-tooltip="'Approximate row count'"
            class="w-20 text-right text-xs shrink-0 text-gray-500 dark:text-gray-400"
            :class="{ 'opacity-0': getTableRowCount(table.name) === undefined }"
          >
            {{ formatRowCount(getTableRowCount(table.name)) }}
          </span>
        </div>
      </template>
    </div>
  </template>

  <div
    v-else
    v-bind="containerProps"
    :style="{ height: `${virtualContainerHeight}px` }"
    class="overflow-y-auto scrollbar-thin"
  >
    <div v-bind="wrapperProps">
      <div
        v-for="{ index, data: table } in virtualList"
        :key="table.name"
        :data-virtual-index="index"
        :style="{ height: `${ITEM_HEIGHT}px` }"
        class="ui-border-muted group flex items-center gap-2 border-b px-4 transition-colors hover:bg-(--ui-surface-muted)"
      >
        <input
          :id="`table-${table.name}`"
          v-model="table.selected"
          type="checkbox"
          class="ui-accent-icon ui-surface-raised ui-border-default h-4 w-4 rounded shrink-0"
          @change="
            emit('checkbox-change', {
              table,
              checked: ($event.target as HTMLInputElement)?.checked || false
            })
          "
        />

        <!-- Icon slot: filter button when selected, filter indicator when filtered, table icon otherwise -->
        <button
          v-if="table.selected && !isCdcMode"
          v-tooltip="hasTableFilter(table) ? 'Edit filter' : 'Add filter'"
          :aria-label="hasTableFilter(table) ? 'Edit filter' : 'Add filter'"
          :aria-pressed="isTableSettingsOpen(table.name)"
          class="ui-focus-ring h-4 w-4 shrink-0 flex items-center justify-center rounded transition-all"
          :class="getFilterButtonClass(table, true)"
          @click="emit('toggle-filter', table.name)"
        >
          <Filter :class="['h-3.5 w-3.5 transition-all', getFilterIconClass(table)]" />
        </button>
        <Filter
          v-else-if="hasTableFilter(table)"
          v-tooltip="'Has active filter'"
          class="ui-accent-icon h-4 w-4 shrink-0 fill-current"
        />
        <TableIcon v-else class="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />

        <label
          :for="`table-${table.name}`"
          class="flex-1 min-w-0 cursor-pointer text-sm text-gray-900 dark:text-gray-100 truncate"
        >
          <HighlightedText :text="getTableDisplayName(table.name)" :query="searchQuery" />
        </label>

        <span
          v-if="showTableSize"
          v-tooltip="'Table size'"
          class="w-16 text-right text-xs shrink-0 text-gray-500 dark:text-gray-400"
          :class="{ 'opacity-0': getTableSize(table.name) === undefined }"
        >
          {{ formatTableSize(getTableSize(table.name)) }}
        </span>
        <span
          v-if="showRowCount"
          v-tooltip="'Approximate row count'"
          class="w-20 text-right text-xs shrink-0 text-gray-500 dark:text-gray-400"
          :class="{ 'opacity-0': getTableRowCount(table.name) === undefined }"
        >
          {{ formatRowCount(getTableRowCount(table.name)) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useVirtualList } from '@vueuse/core'
import type { Table } from '@/types/streamConfig'
import HighlightedText from '@/components/common/HighlightedText.vue'
import { Filter, Sheet as TableIcon } from 'lucide-vue-next'

const VIRTUAL_THRESHOLD = 200
const ITEM_HEIGHT = 42
const MAX_VIRTUAL_HEIGHT = 800

interface Props {
  tables: Table[]
  searchQuery: string
  isCdcMode: boolean
  showRowCount?: boolean
  showTableSize?: boolean
  getTableDisplayName: (tableName: string) => string
  hasTableFilter: (table: Table) => boolean
  isTableSettingsOpen: (tableName: string) => boolean
  getTableRowCount?: (tableName: string) => number | undefined
  formatRowCount?: (count: number | undefined) => string
  getTableSize?: (tableName: string) => number | undefined
  formatTableSize?: (bytes: number | undefined) => string
}

const props = withDefaults(defineProps<Props>(), {
  showRowCount: false,
  showTableSize: false,
  getTableRowCount: () => undefined,
  formatRowCount: () => '',
  getTableSize: () => undefined,
  formatTableSize: () => ''
})

const emit = defineEmits<{
  'checkbox-change': [payload: { table: Table; checked: boolean }]
  'toggle-filter': [tableName: string]
}>()

const useVirtual = computed(() => props.tables.length > VIRTUAL_THRESHOLD)

const {
  list: virtualList,
  containerProps,
  wrapperProps
} = useVirtualList(
  computed(() => props.tables),
  { itemHeight: ITEM_HEIGHT }
)

const virtualContainerHeight = computed(() =>
  Math.min(props.tables.length * ITEM_HEIGHT, MAX_VIRTUAL_HEIGHT)
)

function getFilterButtonClass(table: Table, isVirtual = false): string {
  if (props.hasTableFilter(table) || props.isTableSettingsOpen(table.name)) {
    return 'ui-accent-icon'
  }

  return isVirtual
    ? 'text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 hover:text-gray-500 dark:hover:text-gray-400'
    : 'text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400'
}

function getFilterIconClass(table: Table): string {
  return props.hasTableFilter(table) ? 'fill-current' : ''
}
</script>
