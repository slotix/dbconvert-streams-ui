<template>
  <div
    class="bg-linear-to-br from-gray-50 to-gray-100/50 dark:from-gray-900/60 dark:to-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
  >
    <!-- Compact Header -->
    <div
      class="flex items-center justify-between px-3 py-2 bg-white/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center gap-2">
        <FunnelIcon class="w-4 h-4 text-teal-600 dark:text-teal-400" />
        <span class="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide"
          >Data Filter</span
        >
      </div>
      <!-- Quick action buttons -->
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-white dark:hover:bg-gray-800 rounded transition-colors"
          :class="showColumnSelector ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400' : ''"
          title="Select columns to transfer"
          @click="toggleColumnSelector"
        >
          <ViewColumnsIcon class="w-3 h-3" />
          <span>Columns</span>
          <span
            v-if="selectedColumns.length > 0"
            class="px-1 py-0.5 text-[10px] bg-teal-500/30 rounded"
          >
            {{ selectedColumns.length }}
          </span>
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-white dark:hover:bg-gray-800 rounded transition-colors"
          title="Add WHERE condition"
          @click="addFilter"
        >
          <PlusIcon class="w-3 h-3" />
          <span>Filter</span>
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-white dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-600 dark:disabled:hover:text-gray-400"
          :title="canAddSort ? 'Add ORDER BY' : 'All columns are already used in sorting'"
          :disabled="!canAddSort"
          @click="addSort"
        >
          <ArrowsUpDownIcon class="w-3 h-3" />
          <span>Sort</span>
        </button>
      </div>
    </div>

    <!-- Builder Content - using shared FilterBuilder -->
    <div class="p-3">
      <FilterBuilder
        ref="filterBuilderRef"
        :columns="normalizedColumns"
        :dialect="dialect"
        :table-name="tableName"
        mode="stream"
        :show-column-selector="showColumnSelector"
        :initial-selected-columns="selectedColumns"
        :initial-filters="filters"
        :initial-sorts="orderBy"
        :initial-limit="limit"
        @update="onBuilderUpdate"
        @columns-change="onColumnsChange"
      >
        <template #preview-actions>
          <button
            v-if="canPreview"
            type="button"
            class="p-1 text-gray-500 hover:text-teal-400 bg-gray-800/80 rounded transition-colors"
            :class="isLoadingPreview ? 'animate-pulse' : ''"
            :disabled="isLoadingPreview"
            title="Preview sample data"
            @click="runPreview"
          >
            <PlayIcon v-if="!isLoadingPreview" class="w-3.5 h-3.5" />
            <ArrowPathIcon v-else class="w-3.5 h-3.5 animate-spin" />
          </button>
        </template>
      </FilterBuilder>

      <!-- Preview Results Panel -->
      <div
        v-if="showPreview"
        class="mt-3 bg-white dark:bg-gray-800/70 rounded border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <!-- Preview Header -->
        <div
          class="flex items-center justify-between px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
        >
          <div class="flex items-center gap-2">
            <TableCellsIcon class="w-3.5 h-3.5 text-teal-500" />
            <span class="text-xs font-medium text-gray-600 dark:text-gray-300">
              Preview
              <span v-if="previewData" class="text-gray-400">
                ({{ previewData.rows.length }}
                {{ previewData.rows.length === previewLimit ? '+' : '' }} rows)
              </span>
            </span>
          </div>
          <button
            type="button"
            class="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            @click="showPreview = false"
          >
            <XMarkIcon class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Error State -->
        <div
          v-if="previewError"
          class="p-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
        >
          <div class="flex items-start gap-2">
            <ExclamationTriangleIcon class="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p class="font-medium">Query error</p>
              <p class="mt-1 text-red-500 dark:text-red-300">{{ previewError }}</p>
            </div>
          </div>
        </div>

        <!-- Data Table -->
        <div v-else-if="previewData && previewData.rows.length > 0" class="overflow-auto max-h-48">
          <table class="w-full text-xs">
            <thead class="bg-gray-50 dark:bg-gray-900 sticky top-0">
              <tr>
                <th
                  v-for="col in previewData.columns"
                  :key="col"
                  class="px-2 py-1.5 text-left font-medium text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap"
                >
                  {{ col }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr
                v-for="(row, idx) in previewData.rows"
                :key="idx"
                class="hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td
                  v-for="col in previewData.columns"
                  :key="col"
                  class="px-2 py-1 text-gray-900 dark:text-gray-100 whitespace-nowrap max-w-[200px] truncate"
                  :title="formatCellValue(row[col])"
                >
                  {{ formatCellValue(row[col]) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="previewData && previewData.rows.length === 0"
          class="p-4 text-center text-xs text-gray-500 dark:text-gray-400"
        >
          No rows match the filter criteria
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  PlusIcon,
  XMarkIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  ViewColumnsIcon,
  PlayIcon,
  ArrowPathIcon,
  TableCellsIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'
import FilterBuilder from './FilterBuilder.vue'
import type { ColumnInfo, FilterCondition, SortCondition, ColumnDef } from './types'
import { UNARY_OPERATORS } from './types'
import { operatorToSql } from './sql-utils'
import connections from '@/api/connections'

interface Props {
  tableName: string
  modelValue: string
  dialect?: 'mysql' | 'pgsql' | 'sql'
  columns?: ColumnInfo[]
  // Preview support
  connectionId?: string
  database?: string
  schema?: string
}

const props = withDefaults(defineProps<Props>(), {
  dialect: 'sql',
  columns: () => [],
  connectionId: '',
  database: '',
  schema: ''
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

// Reference to FilterBuilder
const filterBuilderRef = ref<InstanceType<typeof FilterBuilder> | null>(null)

// Local state synced with FilterBuilder
const selectedColumns = ref<string[]>([])
const filters = ref<FilterCondition[]>([])
const orderBy = ref<SortCondition[]>([])
const limit = ref<number | null>(null)
const showColumnSelector = ref(false)

// Preview state
const showPreview = ref(false)
const isLoadingPreview = ref(false)
const previewError = ref<string | null>(null)
const previewData = ref<{ columns: string[]; rows: Record<string, unknown>[] } | null>(null)
const previewLimit = 10

// Convert ColumnInfo[] to ColumnDef[]
const normalizedColumns = computed<ColumnDef[]>(() =>
  props.columns.map((col) => ({
    name: col.name,
    label: col.name,
    type: col.type
  }))
)

// Check if preview is available
const canPreview = computed(() => {
  return Boolean(props.connectionId && props.database && props.tableName)
})

// Check if more sorts can be added
const canAddSort = computed(() => {
  const usedColumns = new Set(orderBy.value.map((s) => s.column).filter(Boolean))
  return props.columns.some((col) => !usedColumns.has(col.name))
})

// Handle updates from FilterBuilder
function onBuilderUpdate(payload: {
  selectedColumns: string[]
  filters: FilterCondition[]
  sorts: SortCondition[]
  limit: number | null
  sql: string
}) {
  selectedColumns.value = payload.selectedColumns
  filters.value = payload.filters
  orderBy.value = payload.sorts
  limit.value = payload.limit
  emitUpdate()
}

function onColumnsChange(columns: string[]) {
  selectedColumns.value = columns
  emitUpdate()
}

// Actions - delegate to FilterBuilder
function addFilter() {
  filterBuilderRef.value?.addFilter()
}

function addSort() {
  filterBuilderRef.value?.addSort()
}

function toggleColumnSelector() {
  showColumnSelector.value = !showColumnSelector.value
}

// Emit update to parent - build the query string
function emitUpdate() {
  const query = buildQuery()
  emit('update:modelValue', query)
}

// Build query from current state
function buildQuery(): string {
  const parts: string[] = []

  // SELECT columns
  if (selectedColumns.value.length > 0 && selectedColumns.value.length < props.columns.length) {
    parts.push(`SELECT ${selectedColumns.value.join(', ')}`)
  }

  // WHERE clause
  const whereConditions = filters.value
    .filter((f) => f.column && (UNARY_OPERATORS.includes(f.operator) || f.value))
    .map((f) => buildCondition(f))

  if (whereConditions.length > 0) {
    parts.push(`WHERE ${whereConditions.join(' AND ')}`)
  }

  // ORDER BY
  const validSorts = orderBy.value.filter((s) => s.column)
  if (validSorts.length > 0) {
    parts.push(`ORDER BY ${validSorts.map((s) => `${s.column} ${s.direction}`).join(', ')}`)
  }

  // LIMIT
  if (limit.value !== null && limit.value > 0) {
    parts.push(`LIMIT ${limit.value}`)
  }

  return parts.join('\n')
}

// Build SQL condition from filter - using shared utility
const buildCondition = (f: FilterCondition): string =>
  operatorToSql(f.column, f.operator, f.value, props.dialect, false)

/**
 * Run a preview query to validate the filter
 */
const runPreview = async () => {
  if (!canPreview.value) return

  isLoadingPreview.value = true
  previewError.value = null
  previewData.value = null
  showPreview.value = true

  try {
    // Build WHERE clause from filters
    let whereClause = ''
    if (filters.value.length > 0) {
      const conditions = filters.value
        .filter((f) => f.column && (UNARY_OPERATORS.includes(f.operator) || f.value))
        .map((f) => buildCondition(f))
      whereClause = conditions.join(' AND ')
    }

    // Build ORDER BY
    let orderByCol = ''
    let orderDir = ''
    const validSorts = orderBy.value.filter((s) => s.column)
    if (validSorts.length > 0) {
      orderByCol = validSorts.map((s) => s.column).join(',')
      orderDir = validSorts.map((s) => s.direction).join(',')
    }

    // Call API to get preview data
    const result = await connections.getTableData(
      props.connectionId,
      props.database,
      props.tableName,
      {
        limit: previewLimit,
        offset: 0,
        skip_count: true,
        schema: props.schema || undefined,
        order_by: orderByCol || undefined,
        order_dir: orderDir || undefined,
        where: whereClause || undefined
      }
    )

    // Transform result for display
    if (result && result.rows && result.columns) {
      const displayColumns =
        selectedColumns.value.length > 0
          ? result.columns.filter((col) => selectedColumns.value.includes(col))
          : result.columns

      const rowObjects = result.rows.map((row) => {
        const obj: Record<string, unknown> = {}
        displayColumns.forEach((col) => {
          const idx = result.columns.indexOf(col)
          if (idx !== -1) {
            obj[col] = (row as unknown[])[idx]
          }
        })
        return obj
      })
      previewData.value = {
        columns: displayColumns,
        rows: rowObjects
      }
    } else {
      previewData.value = { columns: [], rows: [] }
    }
  } catch (err) {
    previewError.value = err instanceof Error ? err.message : 'Failed to preview data'
    console.error('Preview error:', err)
  } finally {
    isLoadingPreview.value = false
  }
}

/**
 * Format cell value for display
 */
const formatCellValue = (value: unknown): string => {
  if (value === null) return 'NULL'
  if (value === undefined) return ''
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

// Initialize selectedColumns with all columns
watch(
  () => props.columns,
  (newColumns) => {
    if (selectedColumns.value.length === 0 && newColumns.length > 0) {
      selectedColumns.value = newColumns.map((c) => c.name)
    }
  },
  { immediate: true }
)
</script>
