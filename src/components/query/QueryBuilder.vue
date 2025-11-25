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
      <div v-if="hasModifications" class="relative">
        <SqlViewer
          :code="formattedQuery"
          :dialect="dialect"
          :show-header="false"
          :auto-resize="true"
          :min-height="60"
          :max-height="120"
          compact
        />
        <button
          type="button"
          class="absolute top-1 right-1 p-1 text-gray-500 hover:text-teal-400 bg-gray-800/80 rounded transition-colors"
          title="Copy query"
          @click="copyQuery"
        >
          <ClipboardDocumentIcon class="w-3.5 h-3.5" />
        </button>
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
  ViewColumnsIcon
} from '@heroicons/vue/24/outline'
import { SqlViewer } from '@/components/monaco'
import { useQueryBuilder } from './useQueryBuilder'
import { type ColumnInfo, type FilterOperator, UNARY_OPERATORS, getOperatorsForType } from './types'

interface Props {
  tableName: string
  modelValue: string
  dialect?: 'mysql' | 'pgsql' | 'sql'
  columns?: ColumnInfo[]
}

const props = withDefaults(defineProps<Props>(), {
  dialect: 'sql',
  columns: () => []
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

// Local UI state
const showColumnSelector = ref(false)

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
