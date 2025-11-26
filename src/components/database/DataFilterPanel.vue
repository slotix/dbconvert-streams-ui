<template>
  <div v-if="hasModifications || isExpanded" class="border-b border-gray-200 dark:border-gray-700">
    <!-- Collapsed State: Single-line SQL preview -->
    <div
      v-if="!isExpanded && hasModifications"
      class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      @click="toggleExpanded"
    >
      <ChevronRightIcon class="w-4 h-4 text-gray-400 shrink-0" />
      <code
        class="flex-1 text-xs text-gray-600 dark:text-gray-300 font-mono truncate"
        :title="collapsedSqlPreview"
      >
        {{ collapsedSqlPreview }}
      </code>
      <button
        type="button"
        class="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0"
        title="Clear all filters"
        @click.stop="clearAll"
      >
        <XMarkIcon class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Expanded State: Full Builder UI -->
    <div
      v-if="isExpanded"
      class="bg-linear-to-br from-gray-50 to-gray-100/50 dark:from-gray-900/60 dark:to-gray-800/40"
    >
      <!-- Collapse header -->
      <div
        class="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-200 dark:border-gray-700"
        @click="toggleExpanded"
      >
        <ChevronDownIcon class="w-4 h-4 text-gray-400" />
        <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Filter Builder</span>
      </div>

      <!-- Builder Content -->
      <div class="px-3 pb-3 pt-2 space-y-3">
        <!-- Column Selector -->
        <div
          v-if="showColumnSelector"
          class="p-2 bg-white dark:bg-gray-800/70 rounded border border-gray-200 dark:border-gray-700"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium text-gray-600 dark:text-gray-400">
              Select columns to display
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
              :key="col.field"
              class="inline-flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-colors"
              :class="
                selectedColumns.includes(col.field || '')
                  ? 'bg-teal-500/20 text-teal-700 dark:text-teal-400 border border-teal-500/40'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-transparent hover:border-gray-300 dark:hover:border-gray-600'
              "
            >
              <input
                v-model="selectedColumns"
                type="checkbox"
                :value="col.field"
                class="sr-only"
                @change="onColumnsChange"
              />
              <span class="text-xs">{{ col.headerName || col.field }}</span>
            </label>
          </div>
          <p
            v-if="selectedColumns.length === 0 || selectedColumns.length === columns.length"
            class="mt-1.5 text-[10px] text-gray-400"
          >
            All columns visible
          </p>
          <p v-else class="mt-1.5 text-[10px] text-gray-500 dark:text-gray-400">
            {{ selectedColumns.length }} of {{ columns.length }} columns selected
          </p>
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
              @change="markDirty"
            >
              <option value="" disabled>column</option>
              <option v-for="col in columns" :key="col.field" :value="col.field">
                {{ col.headerName || col.field }}
              </option>
            </select>
            <select
              v-model="filter.operator"
              class="w-44 shrink-0 px-1 py-1 text-xs border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded focus:ring-1 focus:ring-teal-500 cursor-pointer"
              @change="markDirty"
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
                @input="markDirty"
                @keyup.enter="applyFilters"
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
              @change="markDirty"
            >
              <option value="" disabled>column</option>
              <option
                v-for="col in getAvailableColumnsForSort(index)"
                :key="col.field"
                :value="col.field"
              >
                {{ col.headerName || col.field }}
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

        <!-- Generated Query Preview with Syntax Highlighting -->
        <div v-if="hasModifications" class="space-y-2">
          <div class="relative">
            <MonacoEditor
              :model-value="generatedSql"
              :language="monacoLanguage"
              height="80px"
              :options="{
                readOnly: true,
                minimap: { enabled: false },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                fontSize: 12,
                padding: { top: 8, bottom: 8 },
                automaticLayout: true,
                renderLineHighlight: 'none',
                scrollbar: { vertical: 'auto', horizontal: 'hidden' }
              }"
            />
            <div class="absolute top-1 right-1">
              <button
                type="button"
                class="p-1 text-gray-400 hover:text-teal-400 bg-gray-800/80 rounded transition-colors"
                title="Copy query"
                @click="copyQuery"
              >
                <ClipboardDocumentIcon class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Apply button -->
          <div v-if="isDirty" class="flex justify-end">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded transition-colors"
              @click="applyFilters"
            >
              <PlayIcon class="w-3.5 h-3.5" />
              Apply
            </button>
          </div>
        </div>

        <!-- Empty state hint when expanded but no filters -->
        <div
          v-if="!hasModifications && !showColumnSelector"
          class="text-center py-2 text-xs text-gray-400 dark:text-gray-500"
        >
          Add filters or sorts using the buttons above
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  XMarkIcon,
  PlayIcon,
  ClipboardDocumentIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from '@heroicons/vue/24/outline'
import { MonacoEditor } from '@/components/monaco'
import type { ColDef } from 'ag-grid-community'
import { useObjectTabStateStore, type FilterConfig, type SortConfig } from '@/stores/objectTabState'

interface Props {
  columns: ColDef[]
  dialect?: 'mysql' | 'pgsql' | 'sql'
  tableName?: string
  objectKey?: string
}

const props = withDefaults(defineProps<Props>(), {
  dialect: 'mysql',
  tableName: '',
  objectKey: ''
})

const emit = defineEmits<{
  (e: 'apply', payload: { where: string; orderBy: string; orderDir: string }): void
  (e: 'clear'): void
  (e: 'columns-change', columns: string[]): void
}>()

// Operators list - ordered by common usage
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
const UNARY_OPERATORS = ['IS NULL', 'IS NOT NULL']

// Pinia store for state persistence
const tabStateStore = useObjectTabStateStore()

// UI State
const isExpanded = ref(false)
const showColumnSelector = ref(false)
const isDirty = ref(false)

// Data state
const selectedColumns = ref<string[]>([])
const filters = ref<FilterConfig[]>([])
const sorts = ref<SortConfig[]>([])

// Generate unique ID
let filterId = 0
const generateId = () => `filter-${++filterId}`

// Save state to store
function saveState() {
  if (!props.objectKey) return
  tabStateStore.setFilterPanelState(props.objectKey, {
    filters: filters.value,
    sorts: sorts.value,
    selectedColumns: selectedColumns.value,
    isExpanded: isExpanded.value,
    showColumnSelector: showColumnSelector.value
  })
}

// Restore state from store
function restoreState() {
  if (!props.objectKey) return
  const savedState = tabStateStore.getFilterPanelState(props.objectKey)
  if (savedState) {
    filters.value = savedState.filters || []
    sorts.value = savedState.sorts || []
    selectedColumns.value = savedState.selectedColumns || []
    isExpanded.value = savedState.isExpanded || false
    showColumnSelector.value = savedState.showColumnSelector || false
    // Update filterId to avoid ID collisions
    const maxId = filters.value.reduce((max, f) => {
      const num = parseInt(f.id.replace('filter-', ''), 10)
      return isNaN(num) ? max : Math.max(max, num)
    }, 0)
    filterId = maxId
  }
}

// Restore state when objectKey changes (switching tabs)
watch(
  () => props.objectKey,
  (newKey) => {
    if (newKey) {
      restoreState()
    }
  },
  { immediate: true }
)

// Monaco language
const monacoLanguage = computed(() => {
  if (props.dialect === 'pgsql') return 'pgsql'
  if (props.dialect === 'mysql') return 'mysql'
  return 'sql'
})

// Computed
const hasModifications = computed(() => {
  const hasFilters = filters.value.some((f) => f.column && (isUnaryOperator(f.operator) || f.value))
  const hasSorts = sorts.value.some((s) => s.column)
  return hasFilters || hasSorts
})

const canAddSort = computed(() => {
  const usedColumns = new Set(sorts.value.map((s) => s.column).filter(Boolean))
  return props.columns.some((col) => col.field && !usedColumns.has(col.field))
})

// Quote identifier based on dialect
const quoteIdentifier = (name: string): string => {
  if (props.dialect === 'mysql') return '`' + name + '`'
  if (props.dialect === 'pgsql') return '"' + name + '"'
  return name
}

// Collapsed SQL preview (single line)
const collapsedSqlPreview = computed(() => {
  const parts: string[] = []

  // WHERE conditions
  const whereConditions = filters.value
    .filter((f) => f.column && (isUnaryOperator(f.operator) || f.value))
    .map((f) => operatorToSqlCondition(f.column, f.operator, f.value, false))

  if (whereConditions.length > 0) {
    parts.push(`WHERE ${whereConditions.join(' AND ')}`)
  }

  // ORDER BY
  const sortClauses = sorts.value.filter((s) => s.column).map((s) => `${s.column} ${s.direction}`)

  if (sortClauses.length > 0) {
    parts.push(`ORDER BY ${sortClauses.join(', ')}`)
  }

  return parts.join(' ')
})

// Generate full SQL for preview
const generatedSql = computed(() => {
  const parts: string[] = []

  // SELECT columns FROM table
  if (props.tableName) {
    const cols =
      selectedColumns.value.length > 0 && selectedColumns.value.length < props.columns.length
        ? selectedColumns.value.map((c) => quoteIdentifier(c)).join(', ')
        : '*'
    parts.push(`SELECT ${cols}`)
    parts.push(`FROM ${quoteIdentifier(props.tableName)}`)
  }

  // WHERE clause
  const whereConditions = filters.value
    .filter((f) => f.column && (isUnaryOperator(f.operator) || f.value))
    .map((f) => operatorToSqlCondition(f.column, f.operator, f.value, true))

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

  return parts.join('\n')
})

// Helpers
function isUnaryOperator(op: string) {
  return UNARY_OPERATORS.includes(op)
}

function getPlaceholder(operator: string) {
  if (operator === 'CONTAINS' || operator === 'NOT_CONTAINS') return 'search text'
  if (operator === 'STARTS_WITH') return 'starts with...'
  if (operator === 'ENDS_WITH') return 'ends with...'
  if (operator === 'IN' || operator === 'NOT IN') return 'val1, val2, ...'
  return 'value'
}

// Convert UI operator to SQL condition (with quoted identifier for preview)
function operatorToSqlCondition(
  column: string,
  operator: string,
  value: string,
  quoted: boolean = false
): string {
  const col = quoted ? quoteIdentifier(column) : column

  switch (operator) {
    case 'IS NULL':
      return `${col} IS NULL`
    case 'IS NOT NULL':
      return `${col} IS NOT NULL`
    case 'CONTAINS':
      return `${col} LIKE '%${value}%'`
    case 'NOT_CONTAINS':
      return `${col} NOT LIKE '%${value}%'`
    case 'STARTS_WITH':
      return `${col} LIKE '${value}%'`
    case 'ENDS_WITH':
      return `${col} LIKE '%${value}'`
    case 'IN':
    case 'NOT IN': {
      const values = value
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v)
        .map((v) => (isNaN(Number(v)) ? `'${v}'` : v))
        .join(', ')
      return `${col} ${operator} (${values})`
    }
    default: {
      // =, !=, <, <=, >, >=
      const val = isNaN(Number(value)) ? `'${value}'` : value
      return `${col} ${operator} ${val}`
    }
  }
}

function getAvailableColumnsForSort(currentIndex: number) {
  const usedColumns = new Set(
    sorts.value
      .filter((_, i) => i !== currentIndex)
      .map((s) => s.column)
      .filter(Boolean)
  )
  return props.columns.filter((col) => col.field && !usedColumns.has(col.field))
}

// Actions
function toggleExpanded() {
  isExpanded.value = !isExpanded.value
  saveState()
}

function markDirty() {
  isDirty.value = true
  saveState()
}

function selectAllColumns() {
  selectedColumns.value = props.columns.map((c) => c.field || '').filter(Boolean)
  onColumnsChange()
}

function clearAllColumns() {
  selectedColumns.value = []
  onColumnsChange()
}

function onColumnsChange() {
  emit('columns-change', selectedColumns.value)
  saveState()
}

function addFilter() {
  filters.value.push({
    id: generateId(),
    column: '',
    operator: 'CONTAINS',
    value: ''
  })
  isDirty.value = true
  isExpanded.value = true
  saveState()
}

function removeFilter(id: string) {
  filters.value = filters.value.filter((f) => f.id !== id)
  isDirty.value = true
  saveState()
}

function addSort() {
  const usedColumns = new Set(sorts.value.map((s) => s.column).filter(Boolean))
  const availableCol = props.columns.find((col) => col.field && !usedColumns.has(col.field))
  if (availableCol && availableCol.field) {
    sorts.value.push({
      column: availableCol.field,
      direction: 'ASC'
    })
    isDirty.value = true
    isExpanded.value = true
    saveState()
  }
}

function removeSort(index: number) {
  sorts.value.splice(index, 1)
  isDirty.value = true
  saveState()
}

function toggleSortDirection(index: number) {
  if (sorts.value[index]) {
    sorts.value[index].direction = sorts.value[index].direction === 'ASC' ? 'DESC' : 'ASC'
    isDirty.value = true
    saveState()
  }
}

function applyFilters() {
  // Build WHERE clause (without quoting for backend)
  const whereConditions = filters.value
    .filter((f) => f.column && (isUnaryOperator(f.operator) || f.value))
    .map((f) => operatorToSqlCondition(f.column, f.operator, f.value, false))

  const where = whereConditions.join(' AND ')

  // Build ORDER BY
  const validSorts = sorts.value.filter((s) => s.column)
  const orderBy = validSorts.map((s) => s.column).join(',')
  const orderDir = validSorts.map((s) => s.direction).join(',')

  emit('apply', { where, orderBy, orderDir })
  isDirty.value = false
  // Collapse after applying
  isExpanded.value = false
  // Save state after applying
  saveState()
}

function clearAll() {
  filters.value = []
  sorts.value = []
  selectedColumns.value = []
  isDirty.value = false
  isExpanded.value = false
  showColumnSelector.value = false
  emit('clear')
  emit('columns-change', [])
  // Clear saved state
  if (props.objectKey) {
    tabStateStore.clearFilterPanelState(props.objectKey)
  }
}

async function copyQuery() {
  try {
    await navigator.clipboard.writeText(generatedSql.value)
  } catch (err) {
    console.error('Failed to copy query:', err)
  }
}

function toggleColumnSelector() {
  showColumnSelector.value = !showColumnSelector.value
  if (showColumnSelector.value) {
    isExpanded.value = true
  }
  saveState()
}

// Initialize columns when props change
watch(
  () => props.columns,
  () => {
    if (props.columns.length === 0) return

    // Get available column names
    const availableColumns = new Set(props.columns.map((c) => c.field).filter(Boolean) as string[])

    // Filter selected columns to only include valid ones for current table
    const validSelectedColumns = selectedColumns.value.filter((col) => availableColumns.has(col))

    // If no valid columns selected (either empty or all were invalid), select all
    if (validSelectedColumns.length === 0) {
      selectedColumns.value = props.columns.map((c) => c.field || '').filter(Boolean)
    } else if (validSelectedColumns.length !== selectedColumns.value.length) {
      // Some columns were invalid, update to only valid ones
      selectedColumns.value = validSelectedColumns
    }

    // Always emit columns-change to sync AG-Grid column visibility with restored state
    emit('columns-change', selectedColumns.value)
  },
  { immediate: true }
)

// Computed for active state (for header button indicators)
const hasActiveFilters = computed(() => filters.value.length > 0)
const hasActiveSorts = computed(() => sorts.value.length > 0)

// Expose methods to parent
defineExpose({
  clearAll,
  applyFilters,
  addFilter,
  addSort,
  toggleColumnSelector,
  canAddSort,
  showColumnSelector,
  selectedColumns,
  hasActiveFilters,
  hasActiveSorts,
  columns: () => props.columns
})
</script>
