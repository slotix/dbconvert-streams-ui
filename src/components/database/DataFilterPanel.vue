<template>
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
          class="ui-accent-action inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 rounded border border-transparent transition-colors"
          :class="showColumnSelector ? 'ui-accent-action-active' : ''"
          title="Select columns"
          @click="toggleColumnSelector"
        >
          <Columns2 class="w-3 h-3" />
          <span>Columns</span>
          <span
            v-if="selectedColumns.length > 0 && selectedColumns.length < normalizedColumns.length"
            class="ui-chip-muted px-1 py-0.5 text-[10px] rounded"
          >
            {{ selectedColumns.length }}
          </span>
        </button>

        <button
          type="button"
          class="ui-accent-action inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 rounded transition-colors"
          title="Add WHERE condition"
          @click="addFilter"
        >
          <Plus class="w-3 h-3" />
          <span>Filter</span>
        </button>

        <button
          type="button"
          class="ui-accent-action inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-600 dark:disabled:hover:text-gray-400"
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
                  ? 'ui-accent-primary border'
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
import { ArrowUpDown, Columns2, Play, Plus } from 'lucide-vue-next'
import type { ColDef, SortModelItem } from 'ag-grid-community'
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

// Check for modifications
const hasModifications = computed(() => {
  const hasFilters = filters.value.some((f) => f.column && (isUnaryOperator(f.operator) || f.value))
  const hasSorts = sorts.value.some((s) => s.column)
  const hasLimit = limit.value !== null && limit.value > 0
  return hasFilters || hasSorts || hasLimit
})

const canAddSort = computed(() => {
  const usedColumns = new Set(sorts.value.map((s) => s.column).filter(Boolean))
  return props.columns.some((col) => col.field && !usedColumns.has(col.field))
})

function normalizeExternalSortModel(sortModel: SortModelItem[]): SortConfig[] {
  return sortModel
    .filter(
      (
        sort
      ): sort is {
        colId: string
        sort: 'asc' | 'desc'
      } => Boolean(sort?.colId) && (sort.sort === 'asc' || sort.sort === 'desc')
    )
    .map((sort) => ({
      column: sort.colId,
      direction: sort.sort.toUpperCase() as 'ASC' | 'DESC'
    }))
}

function sortConfigsEqual(left: SortConfig[], right: SortConfig[]): boolean {
  if (left.length !== right.length) return false
  return left.every(
    (sort, index) =>
      sort.column === right[index]?.column && sort.direction === right[index]?.direction
  )
}

const appliedSortModelFromStore = computed<SortModelItem[]>(() => {
  const key = props.objectKey
  if (!key) return []
  return tabStateStore.tabStates[key]?.agGridData?.sortModel || []
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

watch(
  appliedSortModelFromStore,
  (newSortModel) => {
    const syncedSorts = normalizeExternalSortModel(newSortModel || [])
    if (sortConfigsEqual(sorts.value, syncedSorts)) return
    sorts.value = syncedSorts
    saveState()
  },
  { deep: true, immediate: true }
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
const activeFilterCount = computed(
  () => filters.value.filter((f) => f.column && (isUnaryOperator(f.operator) || f.value)).length
)
const activeSortCount = computed(() => sorts.value.filter((s) => s.column).length)
const activeLimitValue = computed(() =>
  limit.value !== null && limit.value > 0 ? limit.value : null
)
const summaryTooltip = computed(() => {
  const parts: string[] = []
  if (activeFilterCount.value > 0) {
    parts.push(`${activeFilterCount.value} filter${activeFilterCount.value === 1 ? '' : 's'}`)
  }
  if (activeSortCount.value > 0) {
    parts.push(`${activeSortCount.value} sort${activeSortCount.value === 1 ? '' : 's'}`)
  }
  if (activeLimitValue.value !== null) {
    parts.push(`limit ${activeLimitValue.value}`)
  }
  if (parts.length === 0) return 'Open data filter'
  return `Active: ${parts.join(' • ')}`
})

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
  summaryTooltip,
  columns: () => props.columns
})
</script>
