<template>
  <div
    v-if="hasValidModifications || isExpanded"
    class="border-b border-gray-200 dark:border-gray-700"
  >
    <!-- Collapsed State: Single-line SQL preview -->
    <div
      v-if="!isExpanded && hasValidModifications"
      class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      @click="toggleExpanded"
    >
      <ChevronRight class="w-4 h-4 text-gray-400 shrink-0" />
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
        <X class="w-3.5 h-3.5" />
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
        <ChevronDown class="w-4 h-4 text-gray-400" />
        <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Filter Builder</span>
      </div>

      <!-- Builder Content - using shared FilterBuilder component -->
      <div class="px-3 pb-3 pt-2">
        <FilterBuilder
          ref="filterBuilderRef"
          :columns="normalizedColumns"
          :dialect="dialect"
          :table-name="tableName"
          mode="explorer"
          :show-column-selector="showColumnSelector"
          :initial-selected-columns="selectedColumns"
          :initial-filters="filters"
          :initial-sorts="sorts"
          :initial-limit="limit"
          @update="onBuilderUpdate"
          @apply="applyFilters"
          @columns-change="onColumnsChange"
        >
          <template #footer="{ hasModifications: hasMod, isDirty: dirty }">
            <div class="flex items-center justify-between gap-2">
              <p class="text-[10px] text-gray-500 dark:text-gray-400 italic">
                {{
                  !dirty
                    ? 'No changes to apply'
                    : hasMod
                      ? 'Click Apply to execute the query'
                      : 'Click Apply to refresh data'
                }}
              </p>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :class="
                  dirty
                    ? 'text-white bg-teal-600 hover:bg-teal-700'
                    : 'text-gray-400 bg-gray-200 dark:bg-gray-700 cursor-not-allowed'
                "
                :disabled="!dirty"
                @click="applyFilters"
              >
                <Play class="w-3.5 h-3.5" />
                Apply
              </button>
            </div>
          </template>
        </FilterBuilder>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ChevronDown, ChevronRight, Play, X } from 'lucide-vue-next'
import type { ColDef } from 'ag-grid-community'
import { useObjectTabStateStore, type FilterConfig, type SortConfig } from '@/stores/objectTabState'
import {
  FilterBuilder,
  type ColumnDef,
  type FilterCondition,
  type SortCondition,
  operatorToSql,
  isUnaryOperator
} from '@/components/query'

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
  (e: 'apply', payload: { where: string; orderBy: string; orderDir: string; limit?: number }): void
  (e: 'clear'): void
  (e: 'columns-change', columns: string[]): void
}>()

// Pinia store for state persistence
const tabStateStore = useObjectTabStateStore()

// Reference to FilterBuilder component
const filterBuilderRef = ref<InstanceType<typeof FilterBuilder> | null>(null)

// UI State
const isExpanded = ref(false)
const showColumnSelector = ref(false)
const isDirty = ref(false)

// Data state - synced with FilterBuilder via events
const selectedColumns = ref<string[]>([])
const filters = ref<FilterConfig[]>([])
const sorts = ref<SortConfig[]>([])
const limit = ref<number | null>(null)

// Convert AG Grid ColDef[] to ColumnDef[]
const normalizedColumns = computed<ColumnDef[]>(() =>
  props.columns.map((col) => ({
    name: col.field || '',
    label: (col.headerName as string) || col.field || '',
    type: col.type as string | undefined
  }))
)

// Collapsed SQL preview (single line)
const collapsedSqlPreview = computed(() => {
  const parts: string[] = []

  // WHERE conditions
  const whereConditions = filters.value
    .filter((f) => f.column && (isUnaryOperator(f.operator) || f.value))
    .map((f) => operatorToSql(f.column, f.operator, f.value, props.dialect, false))

  if (whereConditions.length > 0) {
    parts.push(`WHERE ${whereConditions.join(' AND ')}`)
  }

  // ORDER BY
  const sortClauses = sorts.value.filter((s) => s.column).map((s) => `${s.column} ${s.direction}`)

  if (sortClauses.length > 0) {
    parts.push(`ORDER BY ${sortClauses.join(', ')}`)
  }

  // LIMIT
  if (limit.value !== null && limit.value > 0) {
    parts.push(`LIMIT ${limit.value}`)
  }

  return parts.join(' ')
})

// Check for modifications
const hasModifications = computed(() => {
  const hasFilters = filters.value.some((f) => f.column && (isUnaryOperator(f.operator) || f.value))
  const hasSorts = sorts.value.some((s) => s.column)
  const hasLimit = limit.value !== null && limit.value > 0
  return hasFilters || hasSorts || hasLimit
})

// More lenient check - includes incomplete filters
const hasValidModifications = computed(() => {
  const hasAnyFilters = filters.value.some((f) => f.column)
  const hasAnySorts = sorts.value.some((s) => s.column)
  return hasAnyFilters || hasAnySorts || hasModifications.value
})

const canAddSort = computed(() => {
  const usedColumns = new Set(sorts.value.map((s) => s.column).filter(Boolean))
  return props.columns.some((col) => col.field && !usedColumns.has(col.field))
})

// Save state to store
function saveState() {
  if (!props.objectKey) return
  tabStateStore.setFilterPanelState(props.objectKey, {
    filters: filters.value,
    sorts: sorts.value,
    selectedColumns: selectedColumns.value,
    isExpanded: isExpanded.value,
    showColumnSelector: showColumnSelector.value,
    limit: limit.value
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
    limit.value = savedState.limit ?? null

    // Auto-apply restored filters if there are any modifications
    nextTick(() => {
      if (hasModifications.value) {
        applyFilters()
      }
    })
  }
}

// Handle updates from FilterBuilder
function onBuilderUpdate(payload: {
  selectedColumns: string[]
  filters: FilterCondition[]
  sorts: SortCondition[]
  limit: number | null
}) {
  selectedColumns.value = payload.selectedColumns
  filters.value = payload.filters as FilterConfig[]
  sorts.value = payload.sorts as SortConfig[]
  limit.value = payload.limit
  isDirty.value = true
  saveState()
}

function onColumnsChange(columns: string[]) {
  selectedColumns.value = columns
  emit('columns-change', columns)
  saveState()
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

// Initialize selectedColumns with all columns when columns become available
watch(
  () => props.columns,
  (newColumns) => {
    if (selectedColumns.value.length === 0 && newColumns.length > 0) {
      selectedColumns.value = newColumns.map((col) => col.field || '').filter(Boolean)
      saveState()
    }
    // Always emit columns-change to sync AG-Grid column visibility
    emit('columns-change', selectedColumns.value)
  },
  { immediate: true }
)

// Actions
function toggleExpanded() {
  isExpanded.value = !isExpanded.value
  saveState()
}

function addFilter() {
  filterBuilderRef.value?.addFilter()
  isDirty.value = true
  isExpanded.value = true
  saveState()
}

function addSort() {
  filterBuilderRef.value?.addSort()
  isDirty.value = true
  isExpanded.value = true
  saveState()
}

function toggleColumnSelector() {
  showColumnSelector.value = !showColumnSelector.value
  if (showColumnSelector.value) {
    isExpanded.value = true
  }
  saveState()
}

function applyFilters() {
  // Build WHERE clause
  const whereConditions = filters.value
    .filter((f) => f.column && (isUnaryOperator(f.operator) || f.value))
    .map((f) => operatorToSql(f.column, f.operator, f.value, props.dialect, false))

  const where = whereConditions.join(' AND ')

  // Build ORDER BY
  const validSorts = sorts.value.filter((s) => s.column)
  const orderBy = validSorts.map((s) => s.column).join(',')
  const orderDir = validSorts.map((s) => s.direction).join(',')

  // Build LIMIT
  const limitValue = limit.value !== null && limit.value > 0 ? limit.value : undefined

  emit('apply', { where, orderBy, orderDir, limit: limitValue })
  isDirty.value = false
  isExpanded.value = false
  saveState()
}

function clearAll() {
  filters.value = []
  sorts.value = []
  selectedColumns.value = []
  limit.value = null
  isDirty.value = false
  isExpanded.value = false
  showColumnSelector.value = false
  emit('clear')
  emit('columns-change', [])
  if (props.objectKey) {
    tabStateStore.clearFilterPanelState(props.objectKey)
  }
}

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
