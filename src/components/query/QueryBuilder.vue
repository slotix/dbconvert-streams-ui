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
      <!-- Quick action buttons moved to header -->
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-white dark:hover:bg-gray-800 rounded transition-colors"
          :class="showColumnSelector ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400' : ''"
          title="Select columns to transfer"
          @click="showColumnSelector = !showColumnSelector"
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
          class="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-white dark:hover:bg-gray-800 rounded transition-colors"
          title="Add ORDER BY"
          @click="addSort"
        >
          <ArrowsUpDownIcon class="w-3 h-3" />
          <span>Sort</span>
        </button>
      </div>
    </div>

    <!-- Builder Content -->
    <div class="p-3 space-y-3">
      <!-- Column Selector -->
      <div
        v-if="showColumnSelector"
        class="p-2 bg-white dark:bg-gray-800/70 rounded border border-gray-200 dark:border-gray-700"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-gray-600 dark:text-gray-400">
            Select columns to transfer
          </span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="text-[10px] text-teal-600 dark:text-teal-400 hover:underline"
              @click="selectAllColumns"
            >
              All
            </button>
            <button
              type="button"
              class="text-[10px] text-gray-500 dark:text-gray-400 hover:underline"
              @click="clearAllColumns"
            >
              None
            </button>
          </div>
        </div>
        <div class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
          <label
            v-for="col in columns"
            :key="col.name"
            class="inline-flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-colors"
            :class="
              selectedColumns.includes(col.name)
                ? 'bg-teal-500/20 text-teal-700 dark:text-teal-400 border border-teal-500/40'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-transparent hover:border-gray-300 dark:hover:border-gray-600'
            "
          >
            <input
              v-model="selectedColumns"
              type="checkbox"
              :value="col.name"
              class="sr-only"
              @change="emitUpdate"
            />
            <span class="text-xs">{{ col.name }}</span>
          </label>
        </div>
        <p v-if="selectedColumns.length === 0" class="mt-1.5 text-[10px] text-gray-400">
          No columns selected = all columns (*) will be transferred
        </p>
        <p v-else class="mt-1.5 text-[10px] text-gray-500 dark:text-gray-400">
          {{ selectedColumns.length }} of {{ columns.length }} columns selected
        </p>
      </div>
      <!-- Row Limit - Inline compact -->
      <div class="flex items-center gap-2">
        <label class="text-xs font-medium text-gray-600 dark:text-gray-400">Limit:</label>
        <input
          v-model.number="limit"
          type="number"
          min="0"
          placeholder="∞"
          class="w-24 px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 placeholder:text-gray-400"
          @input="emitUpdate"
        />
        <span class="text-xs text-gray-400">rows</span>
      </div>

      <!-- WHERE Filters -->
      <div v-if="filters.length > 0" class="space-y-1.5">
        <div
          v-for="filter in filters"
          :key="filter.id"
          class="flex items-center gap-1.5 p-1.5 bg-white dark:bg-gray-800/70 rounded border border-gray-200 dark:border-gray-700"
        >
          <span class="text-xs text-gray-400 px-1">WHERE</span>
          <select
            v-model="filter.column"
            class="flex-1 min-w-0 px-1.5 py-0.5 text-xs border-0 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:ring-0 cursor-pointer"
            @change="emitUpdate"
          >
            <option value="" disabled class="bg-white dark:bg-gray-800">column</option>
            <option
              v-for="col in columns"
              :key="col.name"
              :value="col.name"
              class="bg-white dark:bg-gray-800"
            >
              {{ col.name }}
            </option>
          </select>
          <select
            v-model="filter.operator"
            class="w-20 px-1 py-0.5 text-xs border-0 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded focus:ring-0 cursor-pointer"
            @change="emitUpdate"
          >
            <option
              v-for="op in getOperatorsForColumn(filter.column)"
              :key="op"
              :value="op"
              class="bg-white dark:bg-gray-700"
            >
              {{ op }}
            </option>
          </select>
          <template v-if="!isUnaryOperator(filter.operator)">
            <input
              v-model="filter.value"
              type="text"
              :placeholder="getValuePlaceholder(filter.operator)"
              class="flex-1 min-w-0 px-1.5 py-0.5 text-xs border-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-0"
              @input="emitUpdate"
            />
            <template v-if="filter.operator === 'BETWEEN'">
              <span class="text-xs text-gray-400">→</span>
              <input
                v-model="filter.valueTo"
                type="text"
                placeholder="to"
                class="w-16 px-1.5 py-0.5 text-xs border-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-0"
                @input="emitUpdate"
              />
            </template>
          </template>
          <button
            type="button"
            class="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
            @click="removeFilter(filter.id)"
          >
            <XMarkIcon class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- ORDER BY -->
      <div v-if="orderBy.length > 0" class="space-y-1.5">
        <div
          v-for="(sort, index) in orderBy"
          :key="index"
          class="flex items-center gap-1.5 p-1.5 bg-white dark:bg-gray-800/70 rounded border border-gray-200 dark:border-gray-700"
        >
          <span class="text-xs text-gray-400 px-1">ORDER</span>
          <select
            v-model="sort.column"
            class="flex-1 min-w-0 px-1.5 py-0.5 text-xs border-0 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:ring-0 cursor-pointer"
            @change="emitUpdate"
          >
            <option value="" disabled class="bg-white dark:bg-gray-800">column</option>
            <option
              v-for="col in columns"
              :key="col.name"
              :value="col.name"
              class="bg-white dark:bg-gray-800"
            >
              {{ col.name }}
            </option>
          </select>
          <select
            v-model="sort.direction"
            class="w-16 px-1 py-0.5 text-xs border-0 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded focus:ring-0 cursor-pointer"
            @change="emitUpdate"
          >
            <option value="ASC" class="bg-white dark:bg-gray-700">↑ ASC</option>
            <option value="DESC" class="bg-white dark:bg-gray-700">↓ DESC</option>
          </select>
          <button
            type="button"
            class="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
            @click="removeSort(index)"
          >
            <XMarkIcon class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Generated Query Preview with Syntax Highlighting -->
      <div v-if="hasModifications" class="space-y-2">
        <div class="relative">
          <SqlViewer
            :code="formattedQuery"
            :dialect="dialect"
            :show-header="false"
            :auto-resize="true"
            :min-height="60"
            :max-height="120"
            compact
          />
          <div class="absolute top-1 right-1 flex items-center gap-1">
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
            <button
              type="button"
              class="p-1 text-gray-500 hover:text-teal-400 bg-gray-800/80 rounded transition-colors"
              title="Copy query"
              @click="copyQuery"
            >
              <ClipboardDocumentIcon class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- Preview Results Panel -->
        <div
          v-if="showPreview"
          class="bg-white dark:bg-gray-800/70 rounded border border-gray-200 dark:border-gray-700 overflow-hidden"
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
          <div
            v-else-if="previewData && previewData.rows.length > 0"
            class="overflow-auto max-h-48"
          >
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

      <!-- Empty state hint -->
      <div
        v-if="!hasModifications"
        class="text-center py-2 text-xs text-gray-400 dark:text-gray-500"
      >
        All rows will be transferred • Add filters or limit to refine
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  PlusIcon,
  XMarkIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  ClipboardDocumentIcon,
  ViewColumnsIcon,
  PlayIcon,
  ArrowPathIcon,
  TableCellsIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'
import { SqlViewer } from '@/components/monaco'
import { useQueryBuilder } from './useQueryBuilder'
import { type ColumnInfo, type FilterOperator, UNARY_OPERATORS, getOperatorsForType } from './types'
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

// Local UI state
const showColumnSelector = ref(false)
const showPreview = ref(false)
const isLoadingPreview = ref(false)
const previewError = ref<string | null>(null)
const previewData = ref<{ columns: string[]; rows: Record<string, unknown>[] } | null>(null)
const previewLimit = 10

// Check if preview is available (requires connection info)
const canPreview = computed(() => {
  return Boolean(props.connectionId && props.database && props.tableName)
})

// Use the composable
const tableNameRef = computed(() => props.tableName)
const dialectRef = computed(() => props.dialect)
const columnsRef = computed(() => props.columns)

const {
  selectedColumns,
  filters,
  orderBy,
  limit,
  generatedQuery,
  formattedQuery,
  hasModifications,
  addFilter,
  removeFilter,
  addSort,
  removeSort,
  reset,
  parseQuery
} = useQueryBuilder({
  tableName: tableNameRef,
  dialect: dialectRef,
  columns: columnsRef
})

/**
 * Select all columns
 */
const selectAllColumns = () => {
  selectedColumns.value = props.columns.map((c) => c.name)
  emitUpdate()
}

/**
 * Clear all column selections (back to SELECT *)
 */
const clearAllColumns = () => {
  selectedColumns.value = []
  emitUpdate()
}

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
        .map((f) => {
          if (f.operator === 'IS NULL') return `${f.column} IS NULL`
          if (f.operator === 'IS NOT NULL') return `${f.column} IS NOT NULL`
          if (f.operator === 'IN' || f.operator === 'NOT IN') {
            const values = f.value
              .split(',')
              .map((v) => v.trim())
              .filter((v) => v)
              .map((v) => (isNaN(Number(v)) ? `'${v}'` : v))
              .join(', ')
            return `${f.column} ${f.operator} (${values})`
          }
          if (f.operator === 'LIKE' || f.operator === 'NOT LIKE') {
            return `${f.column} ${f.operator} '${f.value}'`
          }
          if (f.operator === 'BETWEEN' && f.valueTo) {
            return `${f.column} BETWEEN '${f.value}' AND '${f.valueTo}'`
          }
          // For numeric values, don't quote
          const val = isNaN(Number(f.value)) ? `'${f.value}'` : f.value
          return `${f.column} ${f.operator} ${val}`
        })
      whereClause = conditions.join(' AND ')
    }

    // Build ORDER BY
    let orderByCol = ''
    let orderDir = ''
    if (orderBy.value.length > 0 && orderBy.value[0].column) {
      orderByCol = orderBy.value[0].column
      orderDir = orderBy.value[0].direction
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
      // Determine which columns to display
      // If selectedColumns is not empty, only show those columns
      const displayColumns =
        selectedColumns.value.length > 0
          ? result.columns.filter((col) => selectedColumns.value.includes(col))
          : result.columns

      // API returns rows as arrays, transform to objects for easier display
      // Only include data for displayed columns
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

/**
 * Get operators for a specific column
 */
const getOperatorsForColumn = (columnName: string): FilterOperator[] => {
  const column = props.columns.find((c) => c.name === columnName)
  if (column) {
    return getOperatorsForType(column.type)
  }
  return getOperatorsForType('default')
}

/**
 * Check if operator is unary (no value needed)
 */
const isUnaryOperator = (operator: FilterOperator): boolean => {
  return UNARY_OPERATORS.includes(operator)
}

/**
 * Get placeholder text for value input
 */
const getValuePlaceholder = (operator: FilterOperator): string => {
  if (operator === 'IN' || operator === 'NOT IN') {
    return 'val1, val2, ...'
  }
  if (operator === 'LIKE' || operator === 'NOT LIKE') {
    return '%pattern%'
  }
  return 'value'
}

/**
 * Emit update to parent
 */
const emitUpdate = () => {
  const query = hasModifications.value ? generatedQuery.value : ''
  emit('update:modelValue', query)
}

/**
 * Copy generated query to clipboard
 */
const copyQuery = async () => {
  try {
    await navigator.clipboard.writeText(generatedQuery.value)
  } catch (err) {
    console.error('Failed to copy query:', err)
  }
}

/**
 * Initialize from existing modelValue
 */
const initializeFromValue = () => {
  if (!props.modelValue) {
    reset()
    return
  }

  const parsed = parseQuery(props.modelValue)
  reset()
  limit.value = parsed.limit
  orderBy.value = [...parsed.orderBy]
}

// Watch builder state changes and emit
watch(
  [selectedColumns, filters, orderBy, limit],
  () => {
    emitUpdate()
  },
  { deep: true }
)

onMounted(() => {
  initializeFromValue()
})
</script>
