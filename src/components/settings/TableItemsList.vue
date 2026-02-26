<template>
  <template v-if="!useVirtual">
    <div class="grid grid-cols-1 lg:grid-cols-2">
      <template v-for="(table, idx) in tables" :key="table.name">
        <div
          class="group flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          :class="[
            idx % 2 === 0 ? 'lg:border-r lg:border-r-gray-100 lg:dark:border-r-gray-800' : ''
          ]"
        >
          <input
            :id="`table-${table.name}`"
            v-model="table.selected"
            type="checkbox"
            class="h-4 w-4 text-teal-600 dark:text-teal-500 focus:ring-teal-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 shrink-0"
            @change="
              emit('checkbox-change', {
                table,
                checked: ($event.target as HTMLInputElement)?.checked || false
              })
            "
          />
          <TableIcon class="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
          <label
            :for="`table-${table.name}`"
            class="flex-1 min-w-0 cursor-pointer text-sm text-gray-900 dark:text-gray-100 truncate"
          >
            <HighlightedText :text="getTableDisplayName(table.name)" :query="searchQuery" />
          </label>

          <span
            v-if="showRowCount && getTableRowCount(table.name) !== undefined"
            class="text-xs px-1.5 py-0.5 rounded shrink-0 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            title="Approximate row count"
          >
            {{ formatRowCount(getTableRowCount(table.name)) }}
          </span>

          <button
            v-if="table.selected && !isCdcMode"
            class="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all"
            :class="
              isTableSettingsOpen(table.name)
                ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                : hasTableFilter(table)
                  ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400'
                  : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700'
            "
            :title="hasTableFilter(table) ? 'Edit filter' : 'Add filter'"
            @click="emit('toggle-filter', table.name)"
          >
            <Filter class="w-3.5 h-3.5" />
            <span v-if="hasTableFilter(table)" class="hidden sm:inline">filtered</span>
            <ChevronUp v-if="isTableSettingsOpen(table.name)" class="w-3 h-3" />
          </button>
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
        class="group flex items-center gap-3 px-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <input
          :id="`table-${table.name}`"
          v-model="table.selected"
          type="checkbox"
          class="h-4 w-4 text-teal-600 dark:text-teal-500 focus:ring-teal-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 shrink-0"
          @change="
            emit('checkbox-change', {
              table,
              checked: ($event.target as HTMLInputElement)?.checked || false
            })
          "
        />
        <TableIcon class="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
        <label
          :for="`table-${table.name}`"
          class="flex-1 min-w-0 cursor-pointer text-sm text-gray-900 dark:text-gray-100 truncate"
        >
          <HighlightedText :text="getTableDisplayName(table.name)" :query="searchQuery" />
        </label>

        <span
          v-if="showRowCount && getTableRowCount(table.name) !== undefined"
          class="text-xs px-1.5 py-0.5 rounded shrink-0 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
          title="Approximate row count"
        >
          {{ formatRowCount(getTableRowCount(table.name)) }}
        </span>

        <button
          v-if="table.selected && !isCdcMode"
          class="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all"
          :class="
            isTableSettingsOpen(table.name)
              ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
              : hasTableFilter(table)
                ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400'
                : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700'
          "
          :title="hasTableFilter(table) ? 'Edit filter' : 'Add filter'"
          @click="emit('toggle-filter', table.name)"
        >
          <Filter class="w-3.5 h-3.5" />
          <span v-if="hasTableFilter(table)" class="hidden sm:inline">filtered</span>
          <ChevronUp v-if="isTableSettingsOpen(table.name)" class="w-3 h-3" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useVirtualList } from '@vueuse/core'
import type { Table } from '@/types/streamConfig'
import HighlightedText from '@/components/common/HighlightedText.vue'
import { ChevronUp, Filter, Sheet as TableIcon } from 'lucide-vue-next'

const VIRTUAL_THRESHOLD = 200
const ITEM_HEIGHT = 42
const MAX_VIRTUAL_HEIGHT = 800

interface Props {
  tables: Table[]
  searchQuery: string
  isCdcMode: boolean
  showRowCount?: boolean
  getTableDisplayName: (tableName: string) => string
  hasTableFilter: (table: Table) => boolean
  isTableSettingsOpen: (tableName: string) => boolean
  getTableRowCount?: (tableName: string) => number | undefined
  formatRowCount?: (count: number | undefined) => string
}

const props = withDefaults(defineProps<Props>(), {
  showRowCount: false,
  getTableRowCount: () => undefined,
  formatRowCount: () => ''
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
  {
    itemHeight: ITEM_HEIGHT,
    overscan: 6
  }
)

const virtualContainerHeight = computed(() =>
  Math.min(props.tables.length * ITEM_HEIGHT, MAX_VIRTUAL_HEIGHT)
)

const getTableDisplayName = (tableName: string) => props.getTableDisplayName(tableName)
const hasTableFilter = (table: Table) => props.hasTableFilter(table)
const isTableSettingsOpen = (tableName: string) => props.isTableSettingsOpen(tableName)
const getTableRowCount = (tableName: string) => props.getTableRowCount(tableName)
const formatRowCount = (count: number | undefined) => props.formatRowCount(count)
const isCdcMode = computed(() => props.isCdcMode)
</script>
