<template>
  <div
    v-if="hasValidModifications && !isExpanded"
    class="border-b border-gray-200 dark:border-gray-700"
  >
    <!-- Collapsed State: Single-line SQL preview -->
    <div
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
  </div>

  <SlideOverPanel
    :open="isExpanded"
    title="Data Filter"
    :subtitle="tableName || undefined"
    size="xl"
    :body-padding="false"
    @close="toggleExpanded"
  >
    <div class="px-3 pt-3 pb-2 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-white dark:hover:bg-gray-800 rounded transition-colors"
          :class="showColumnSelector ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400' : ''"
          title="Select columns"
          @click="toggleColumnSelector"
        >
          <Columns2 class="w-3 h-3" />
          <span>Columns</span>
          <span
            v-if="selectedColumns.length > 0 && selectedColumns.length < normalizedColumns.length"
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
          <Plus class="w-3 h-3" />
          <span>Filter</span>
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-white dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-600 dark:disabled:hover:text-gray-400"
          :title="canAddSort ? 'Add ORDER BY' : 'All columns are already used in sorting'"
          :disabled="!canAddSort"
          @click="addSort"
        >
          <ArrowUpDown class="w-3 h-3" />
          <span>Sort</span>
        </button>
      </div>
    </div>

    <FilterBuilderShell class="border-0 bg-none" body-class="px-3 pb-3 pt-3">
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
    </FilterBuilderShell>
  </SlideOverPanel>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ArrowUpDown, ChevronRight, Columns2, Play, Plus, X } from 'lucide-vue-next'
import type { ColDef } from 'ag-grid-community'
import { useObjectTabStateStore, type FilterConfig, type SortConfig } from '@/stores/objectTabState'
import {
  FilterBuilderShell,
  FilterBuilder,
  type ColumnDef,
  type FilterCondition,
  type SortCondition,
  buildPanelClauses,
  isUnaryOperator
} from '@/components/query'
import SlideOverPanel from '@/components/common/SlideOverPanel.vue'

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
  props.columns
    .filter((col) => Boolean(col.field))
    .map((col) => ({
      name: col.field as string,
      label: (col.headerName as string) || (col.field as string),
      type: col.type as string | undefined
    }))
)

// Collapsed SQL preview (single line)
const collapsedSqlPreview = computed(() => {
  const parts: string[] = []

  const {
    where,
    orderBy,
    orderDir,
    limit: limitValue
  } = buildPanelClauses({
    filters: filters.value,
    sorts: sorts.value,
    limit: limit.value,
    dialect: props.dialect,
    quoteColumns: false
  })

  if (where) {
    parts.push(`WHERE ${where}`)
  }

  if (orderBy) {
    const columns = orderBy.split(',')
    const directions = orderDir.split(',')
    const sortClauses = columns.map((col, i) => {
      const direction = directions[i] || 'ASC'
      return `${col} ${direction}`
    })
    parts.push(`ORDER BY ${sortClauses.join(', ')}`)
  }

  if (limitValue) {
    parts.push(`LIMIT ${limitValue}`)
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

function openPanel() {
  isExpanded.value = true
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
  const {
    where,
    orderBy,
    orderDir,
    limit: limitValue
  } = buildPanelClauses({
    filters: filters.value,
    sorts: sorts.value,
    limit: limit.value,
    dialect: props.dialect,
    quoteColumns: false
  })

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
  openPanel,
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
