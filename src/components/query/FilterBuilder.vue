<template>
  <div class="space-y-3">
    <!-- Column Selector -->
    <div
      v-if="showColumnSelector"
      class="p-2 bg-white dark:bg-gray-800/70 rounded border border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium text-gray-600 dark:text-gray-400">
          Select columns to {{ mode === 'explorer' ? 'display' : 'transfer' }}
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
          v-for="col in columnList"
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
          <span class="text-xs">{{ col.label || col.name }}</span>
        </label>
      </div>
      <p
        v-if="selectedColumns.length === 0 || selectedColumns.length === columnList.length"
        class="mt-1.5 text-[10px] text-gray-400"
      >
        {{
          mode === 'explorer'
            ? 'All columns visible'
            : 'No columns selected = all columns (*) will be transferred'
        }}
      </p>
      <p v-else class="mt-1.5 text-[10px] text-gray-500 dark:text-gray-400">
        {{ selectedColumns.length }} of {{ columnList.length }} columns selected
      </p>
    </div>

    <!-- Row Limit -->
    <div
      class="flex items-center gap-2 p-1.5 bg-white dark:bg-gray-800/70 rounded border border-gray-200 dark:border-gray-700"
    >
      <span class="text-xs text-gray-400 px-1 w-12 shrink-0">Limit:</span>
      <input
        v-model.number="limitValue"
        type="number"
        min="0"
        :placeholder="mode === 'stream' ? '∞' : 'optional'"
        class="w-24 px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 placeholder:text-gray-400"
        @input="emitUpdate"
      />
      <span class="text-xs text-gray-400">rows</span>
      <span class="text-[10px] text-gray-400 italic ml-1">(optional)</span>
      <button
        v-if="limitValue !== null && limitValue > 0"
        type="button"
        class="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0 ml-auto"
        @click="clearLimit"
      >
        <XMarkIcon class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- WHERE Filters -->
    <div v-if="filters.length > 0" class="space-y-1.5">
      <div
        v-for="filter in filters"
        :key="filter.id"
        class="flex items-center gap-1.5 p-1.5 bg-white dark:bg-gray-800/70 rounded border border-gray-200 dark:border-gray-700"
      >
        <span class="text-xs text-gray-400 px-1 w-12 shrink-0">WHERE</span>
        <select
          v-model="filter.column"
          class="flex-1 min-w-0 px-1.5 py-1 text-xs border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:ring-1 focus:ring-teal-500 cursor-pointer"
          @change="emitUpdate"
        >
          <option value="" disabled>column</option>
          <option v-for="col in columnList" :key="col.name" :value="col.name">
            {{ col.label || col.name }}
          </option>
        </select>
        <select
          v-model="filter.operator"
          class="w-44 shrink-0 px-1 py-1 text-xs border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded focus:ring-1 focus:ring-teal-500 cursor-pointer"
          @change="emitUpdate"
        >
          <option v-for="op in OPERATORS" :key="op.value" :value="op.value">
            {{ op.label }}
          </option>
        </select>
        <template v-if="!isUnaryOperator(filter.operator)">
          <input
            v-model="filter.value"
            type="text"
            :placeholder="getPlaceholder(filter.operator)"
            class="flex-1 min-w-0 px-1.5 py-1 text-xs border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:ring-1 focus:ring-teal-500"
            @input="emitUpdate"
            @keyup.enter="$emit('apply')"
          />
        </template>
        <button
          type="button"
          class="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0"
          @click="removeFilter(filter.id)"
        >
          <XMarkIcon class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- ORDER BY -->
    <div v-if="sorts.length > 0" class="space-y-1.5">
      <div
        v-for="(sort, index) in sorts"
        :key="index"
        class="flex items-center gap-1.5 p-1.5 bg-white dark:bg-gray-800/70 rounded border border-gray-200 dark:border-gray-700"
      >
        <span class="text-xs text-gray-400 px-1 w-12 shrink-0">ORDER</span>
        <select
          v-model="sort.column"
          class="flex-1 min-w-0 px-1.5 py-1 text-xs border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:ring-1 focus:ring-teal-500 cursor-pointer"
          @change="emitUpdate"
        >
          <option value="" disabled>column</option>
          <option
            v-for="col in getAvailableColumnsForSort(index)"
            :key="col.name"
            :value="col.name"
          >
            {{ col.label || col.name }}
          </option>
        </select>
        <button
          type="button"
          class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors shrink-0"
          :class="
            sort.direction === 'ASC'
              ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/40'
              : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
          "
          @click="toggleSortDirection(index)"
        >
          <ArrowUpIcon v-if="sort.direction === 'ASC'" class="w-3 h-3" />
          <ArrowDownIcon v-else class="w-3 h-3" />
          {{ sort.direction }}
        </button>
        <button
          type="button"
          class="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0"
          @click="removeSort(index)"
        >
          <XMarkIcon class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Apply button slot for explorer mode -->
    <slot name="footer" :has-modifications="hasModifications" :is-dirty="isDirty" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { XMarkIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/vue/24/outline'
import type { ColumnDef, SortCondition, FilterCondition } from './types'
import {
  operatorToSql as sharedOperatorToSql,
  isUnaryOperator,
  quoteIdentifier as sharedQuoteIdentifier
} from './sql-utils'

// Re-export types for consumers
export type { ColumnDef, SortCondition, FilterCondition }

interface Props {
  /** Normalized column definitions */
  columns: ColumnDef[]
  /** SQL dialect for syntax */
  dialect?: 'mysql' | 'pgsql' | 'sql'
  /** Table name for SQL generation */
  tableName?: string
  /** Mode affects labels and behavior */
  mode?: 'explorer' | 'stream'
  /** Whether column selector is visible */
  showColumnSelector?: boolean
  /** Initial selected columns */
  initialSelectedColumns?: string[]
  /** Initial filters */
  initialFilters?: FilterCondition[]
  /** Initial sorts */
  initialSorts?: SortCondition[]
  /** Initial limit */
  initialLimit?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  dialect: 'mysql',
  tableName: '',
  mode: 'stream',
  showColumnSelector: false,
  initialSelectedColumns: () => [],
  initialFilters: () => [],
  initialSorts: () => [],
  initialLimit: null
})

const emit = defineEmits<{
  (
    e: 'update',
    payload: {
      selectedColumns: string[]
      filters: FilterCondition[]
      sorts: SortCondition[]
      limit: number | null
      sql: string
    }
  ): void
  (e: 'apply'): void
  (e: 'columns-change', columns: string[]): void
}>()

// Operators list - shared across all uses
const OPERATORS = [
  { value: 'CONTAINS', label: 'Contains (%val%)' },
  { value: 'NOT_CONTAINS', label: "Doesn't Contain" },
  { value: '=', label: 'Equals (=)' },
  { value: '!=', label: "Doesn't Equal (!=)" },
  { value: 'STARTS_WITH', label: 'Begins with (val%)' },
  { value: 'ENDS_WITH', label: 'Ends with (%val)' },
  { value: 'IS NULL', label: 'Blank (NULL)' },
  { value: 'IS NOT NULL', label: 'Not Blank' },
  { value: '<', label: 'Less than (<)' },
  { value: '<=', label: 'Less or equal (<=)' },
  { value: '>', label: 'Greater than (>)' },
  { value: '>=', label: 'Greater or equal (>=)' },
  { value: 'IN', label: 'In list (IN)' },
  { value: 'NOT IN', label: 'Not in list' }
]

// State
const selectedColumns = ref<string[]>([...props.initialSelectedColumns])
const filters = ref<FilterCondition[]>([...props.initialFilters])
const sorts = ref<SortCondition[]>([...props.initialSorts])
const limitValue = ref<number | null>(props.initialLimit)
const isDirty = ref(false)

// Normalized column list
const columnList = computed(() => props.columns)

// Filter ID generator
let filterId = 0
const generateId = () => `filter-${++filterId}`

// Quote identifier based on dialect - wrapper around shared utility
const quoteIdentifier = (name: string): string => sharedQuoteIdentifier(name, props.dialect)

// Check if has any modifications
const hasModifications = computed(() => {
  const hasColumnMod =
    selectedColumns.value.length > 0 && selectedColumns.value.length < columnList.value.length
  const hasFilters = filters.value.some((f) => f.column && (isUnaryOperator(f.operator) || f.value))
  const hasSorts = sorts.value.some((s) => s.column)
  const hasLimit = limitValue.value !== null && limitValue.value > 0
  return hasColumnMod || hasFilters || hasSorts || hasLimit
})

// Generate SQL
const generatedSql = computed(() => {
  const parts: string[] = []

  // SELECT columns FROM table
  if (props.tableName) {
    const cols =
      selectedColumns.value.length > 0 && selectedColumns.value.length < columnList.value.length
        ? selectedColumns.value.map((c) => quoteIdentifier(c)).join(', ')
        : '*'
    parts.push(`SELECT ${cols}`)
    parts.push(`FROM ${quoteIdentifier(props.tableName)}`)
  }

  // WHERE clause
  const whereConditions = filters.value
    .filter((f) => f.column && (isUnaryOperator(f.operator) || f.value))
    .map((f) => operatorToSql(f.column, f.operator, f.value))

  if (whereConditions.length > 0) {
    parts.push(`WHERE ${whereConditions.join(' AND ')}`)
  }

  // ORDER BY clause
  const sortClauses = sorts.value
    .filter((s) => s.column)
    .map((s) => `${quoteIdentifier(s.column)} ${s.direction}`)

  if (sortClauses.length > 0) {
    parts.push(`ORDER BY ${sortClauses.join(', ')}`)
  }

  // LIMIT clause
  if (limitValue.value !== null && limitValue.value > 0) {
    parts.push(`LIMIT ${limitValue.value}`)
  }

  return parts.join('\n')
})

// Convert operator to SQL - wrapper around shared utility
const operatorToSql = (column: string, operator: string, value: string): string =>
  sharedOperatorToSql(column, operator, value, props.dialect)

function getPlaceholder(operator: string) {
  switch (operator) {
    case 'CONTAINS':
    case 'NOT_CONTAINS':
      return 'search text'
    case 'STARTS_WITH':
      return 'starts with...'
    case 'ENDS_WITH':
      return 'ends with...'
    case 'IN':
    case 'NOT IN':
      return 'val1, val2, ...'
    default:
      return 'value'
  }
}

function getAvailableColumnsForSort(index: number) {
  const usedColumns = new Set(
    sorts.value
      .filter((_, i) => i !== index)
      .map((s) => s.column)
      .filter(Boolean)
  )
  return columnList.value.filter((col) => !usedColumns.has(col.name))
}

// Actions
function selectAllColumns() {
  selectedColumns.value = columnList.value.map((c) => c.name)
  emitUpdate()
}

function clearAllColumns() {
  selectedColumns.value = []
  emitUpdate()
}

function clearLimit() {
  limitValue.value = null
  emitUpdate()
}

function addFilter() {
  // Auto-select the first column
  const firstColumn = columnList.value.length > 0 ? columnList.value[0].name : ''
  filters.value.push({
    id: generateId(),
    column: firstColumn,
    operator: 'CONTAINS',
    value: ''
  })
  isDirty.value = true
}

function removeFilter(id: string) {
  filters.value = filters.value.filter((f) => f.id !== id)
  emitUpdate()
}

function addSort() {
  const availableColumns = getAvailableColumnsForSort(sorts.value.length)
  if (availableColumns.length > 0) {
    sorts.value.push({
      column: availableColumns[0].name,
      direction: 'ASC'
    })
    isDirty.value = true
    emitUpdate()
  }
}

function removeSort(index: number) {
  sorts.value.splice(index, 1)
  emitUpdate()
}

function toggleSortDirection(index: number) {
  sorts.value[index].direction = sorts.value[index].direction === 'ASC' ? 'DESC' : 'ASC'
  emitUpdate()
}

function emitUpdate() {
  isDirty.value = true
  emit('update', {
    selectedColumns: selectedColumns.value,
    filters: filters.value,
    sorts: sorts.value,
    limit: limitValue.value,
    sql: generatedSql.value
  })
  emit('columns-change', selectedColumns.value)
}

// Initialize selected columns with all columns when columns change
watch(
  () => props.columns,
  (newColumns) => {
    if (selectedColumns.value.length === 0 && newColumns.length > 0) {
      selectedColumns.value = newColumns.map((c) => c.name)
    }
  },
  { immediate: true }
)

// Watch for initial props changes (for edit mode when props arrive after mount)
watch(
  () => props.initialFilters,
  (newFilters) => {
    if (newFilters && newFilters.length > 0 && filters.value.length === 0) {
      filters.value = newFilters.map((f) => ({ ...f }))
    }
  },
  { immediate: true }
)

watch(
  () => props.initialSorts,
  (newSorts) => {
    if (newSorts && newSorts.length > 0 && sorts.value.length === 0) {
      sorts.value = newSorts.map((s) => ({ ...s }))
    }
  },
  { immediate: true }
)

watch(
  () => props.initialLimit,
  (newLimit) => {
    if (newLimit !== null && newLimit !== undefined && limitValue.value === null) {
      limitValue.value = newLimit
    }
  },
  { immediate: true }
)

watch(
  () => props.initialSelectedColumns,
  (newColumns) => {
    if (newColumns && newColumns.length > 0 && props.columns.length > 0) {
      // Only update if initialSelectedColumns is a subset (not all columns)
      if (newColumns.length < props.columns.length) {
        selectedColumns.value = [...newColumns]
      }
    }
  },
  { immediate: true }
)

// Check if more sorts can be added
const canAddSort = computed(() => getAvailableColumnsForSort(sorts.value.length).length > 0)

// Expose methods and state for parent components
defineExpose({
  selectedColumns,
  filters,
  sorts,
  limitValue,
  hasModifications,
  isDirty,
  canAddSort,
  generatedSql,
  addFilter,
  addSort,
  removeFilter,
  removeSort,
  selectAllColumns,
  clearAllColumns,
  clearLimit
})
</script>
