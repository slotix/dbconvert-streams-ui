<template>
  <div
    class="bg-linear-to-br from-gray-50 to-gray-100/50 dark:from-gray-900/60 dark:to-gray-800/40 border-b border-gray-200 dark:border-gray-700"
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
          title="Select columns to display"
          @click="showColumnSelector = !showColumnSelector"
        >
          <ViewColumnsIcon class="w-3.5 h-3.5" />
          <span>Columns</span>
          <span
            v-if="selectedColumns.length > 0 && selectedColumns.length < columns.length"
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
          <PlusIcon class="w-3.5 h-3.5" />
          <span>Filter</span>
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-white dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          :title="canAddSort ? 'Add ORDER BY' : 'All columns are already used in sorting'"
          :disabled="!canAddSort"
          @click="addSort"
        >
          <ArrowsUpDownIcon class="w-3.5 h-3.5" />
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
          <span class="text-xs text-gray-400 px-1 w-12">WHERE</span>
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
            class="w-24 px-1 py-1 text-xs border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded focus:ring-1 focus:ring-teal-500 cursor-pointer"
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
            class="p-1 text-gray-400 hover:text-red-500 transition-colors"
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
          <span class="text-xs text-gray-400 px-1 w-12">ORDER</span>
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
            class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors"
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
            class="p-1 text-gray-400 hover:text-red-500 transition-colors"
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

      <!-- Empty state hint -->
      <div
        v-if="!hasModifications && !showColumnSelector"
        class="text-center py-2 text-xs text-gray-400 dark:text-gray-500"
      >
        All rows displayed • Add filters or sorts to refine
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  FunnelIcon,
  ArrowsUpDownIcon,
  PlusIcon,
  XMarkIcon,
  PlayIcon,
  ViewColumnsIcon,
  ClipboardDocumentIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/vue/24/outline'
import { MonacoEditor } from '@/components/monaco'
import type { ColDef } from 'ag-grid-community'

interface FilterConfig {
  id: string
  column: string
  operator: string
  value: string
}

interface SortConfig {
  column: string
  direction: 'ASC' | 'DESC'
}

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

// Operators list
const OPERATORS = [
  { value: '=', label: '=' },
  { value: '!=', label: '!=' },
  { value: '<', label: '<' },
  { value: '<=', label: '<=' },
  { value: '>', label: '>' },
  { value: '>=', label: '>=' },
  { value: 'LIKE', label: 'LIKE' },
  { value: 'NOT LIKE', label: 'NOT LIKE' },
  { value: 'IN', label: 'IN' },
  { value: 'NOT IN', label: 'NOT IN' },
  { value: 'IS NULL', label: 'IS NULL' },
  { value: 'IS NOT NULL', label: 'IS NOT NULL' }
]
const UNARY_OPERATORS = ['IS NULL', 'IS NOT NULL']

// UI State
const showColumnSelector = ref(false)
const isDirty = ref(false)

// Data state
const selectedColumns = ref<string[]>([])
const filters = ref<FilterConfig[]>([])
const sorts = ref<SortConfig[]>([])

// Generate unique ID
let filterId = 0
const generateId = () => `filter-${++filterId}`

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
    .map((f) => {
      if (f.operator === 'IS NULL' || f.operator === 'IS NOT NULL') {
        return `${quoteIdentifier(f.column)} ${f.operator}`
      }
      if (f.operator === 'LIKE' || f.operator === 'NOT LIKE') {
        return `${quoteIdentifier(f.column)} ${f.operator} '${f.value}'`
      }
      if (f.operator === 'IN' || f.operator === 'NOT IN') {
        const values = f.value
          .split(',')
          .map((v) => v.trim())
          .filter((v) => v)
          .map((v) => (isNaN(Number(v)) ? `'${v}'` : v))
          .join(', ')
        return `${quoteIdentifier(f.column)} ${f.operator} (${values})`
      }
      const val = isNaN(Number(f.value)) ? `'${f.value}'` : f.value
      return `${quoteIdentifier(f.column)} ${f.operator} ${val}`
    })

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
  if (operator === 'LIKE' || operator === 'NOT LIKE') return '%value%'
  if (operator === 'IN' || operator === 'NOT IN') return 'val1, val2, ...'
  return 'value'
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
function markDirty() {
  isDirty.value = true
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
}

function addFilter() {
  filters.value.push({
    id: generateId(),
    column: '',
    operator: '=',
    value: ''
  })
  isDirty.value = true
}

function removeFilter(id: string) {
  filters.value = filters.value.filter((f) => f.id !== id)
  isDirty.value = true
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
  }
}

function removeSort(index: number) {
  sorts.value.splice(index, 1)
  isDirty.value = true
}

function toggleSortDirection(index: number) {
  if (sorts.value[index]) {
    sorts.value[index].direction = sorts.value[index].direction === 'ASC' ? 'DESC' : 'ASC'
    isDirty.value = true
  }
}

function applyFilters() {
  // Build WHERE clause (without quoting for backend)
  const whereConditions = filters.value
    .filter((f) => f.column && (isUnaryOperator(f.operator) || f.value))
    .map((f) => {
      if (f.operator === 'IS NULL' || f.operator === 'IS NOT NULL') {
        return `${f.column} ${f.operator}`
      }
      if (f.operator === 'LIKE' || f.operator === 'NOT LIKE') {
        return `${f.column} ${f.operator} '${f.value}'`
      }
      if (f.operator === 'IN' || f.operator === 'NOT IN') {
        const values = f.value
          .split(',')
          .map((v) => v.trim())
          .filter((v) => v)
          .map((v) => (isNaN(Number(v)) ? `'${v}'` : v))
          .join(', ')
        return `${f.column} ${f.operator} (${values})`
      }
      const val = isNaN(Number(f.value)) ? `'${f.value}'` : f.value
      return `${f.column} ${f.operator} ${val}`
    })

  const where = whereConditions.join(' AND ')

  // Build ORDER BY
  const validSorts = sorts.value.filter((s) => s.column)
  const orderBy = validSorts.map((s) => s.column).join(',')
  const orderDir = validSorts.map((s) => s.direction).join(',')

  emit('apply', { where, orderBy, orderDir })
  isDirty.value = false
}

function clearAll() {
  filters.value = []
  sorts.value = []
  selectedColumns.value = []
  isDirty.value = false
  emit('clear')
  emit('columns-change', [])
}

async function copyQuery() {
  try {
    await navigator.clipboard.writeText(generatedSql.value)
  } catch (err) {
    console.error('Failed to copy query:', err)
  }
}

// Initialize columns when props change
watch(
  () => props.columns,
  () => {
    // If no columns selected, select all by default
    if (selectedColumns.value.length === 0 && props.columns.length > 0) {
      selectedColumns.value = props.columns.map((c) => c.field || '').filter(Boolean)
    }
  },
  { immediate: true }
)

// Expose methods to parent
defineExpose({
  clearAll,
  applyFilters
})
</script>
