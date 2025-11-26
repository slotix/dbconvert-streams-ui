/**
 * Composable for Query Filter Panel
 *
 * Provides reactive integration between the DataFilterPanel component
 * and the central queryFilterStore.
 *
 * SIMPLIFIED: Query Filter Panel is the single source of truth.
 * AG-Grid no longer manages filters/sorts - it only displays data.
 */

import { ref, computed, watch, type Ref } from 'vue'
import {
  useQueryFilterStore,
  type FilterCondition,
  type SortColumn
} from '@/stores/queryFilterStore'
import type { ColDef } from 'ag-grid-community'

export interface UseQueryFilterPanelOptions {
  objectKey: Ref<string>
  tableName: Ref<string>
  dialect: Ref<'mysql' | 'pgsql' | 'sql'>
  columns: Ref<ColDef[]>
  // Callbacks
  onApply?: (payload: { where: string; orderBy: string; orderDir: string }) => void
  onClear?: () => void
}

export function useQueryFilterPanel(options: UseQueryFilterPanelOptions) {
  const { objectKey, tableName, dialect, columns, onApply, onClear } = options

  const store = useQueryFilterStore()

  // UI State
  const isExpanded = ref(false)
  const mode = ref<'visual' | 'sql'>('visual')
  const sqlQuery = ref('')

  // Set active object in store
  watch(
    objectKey,
    (key) => {
      if (key) {
        store.setActiveObject(key)
        // Initialize SQL query from store state
        updateSqlFromStore()
      }
    },
    { immediate: true }
  )

  // ============================================
  // Computed from Store
  // ============================================

  const filters = computed(() => {
    if (!objectKey.value) return []
    return store.getState(objectKey.value).filters
  })

  const sorts = computed(() => {
    if (!objectKey.value) return []
    return store.getState(objectKey.value).sorts
  })

  const activeFilterCount = computed(() => {
    return filters.value.filter(
      (f) => f.column && (['IS NULL', 'IS NOT NULL'].includes(f.operator) || f.value)
    ).length
  })

  const activeSortCount = computed(() => {
    return sorts.value.filter((s) => s.column).length
  })

  const hasActiveFilters = computed(() => {
    return activeFilterCount.value > 0 || activeSortCount.value > 0
  })

  const canAddSort = computed(() => {
    const usedColumns = new Set(sorts.value.map((s) => s.column).filter(Boolean))
    return columns.value.some((col) => col.field && !usedColumns.has(col.field))
  })

  // Full SQL query for display
  const fullSqlQuery = computed(() => {
    if (!objectKey.value || !tableName.value) return ''
    return store.buildFullSql(objectKey.value, tableName.value, dialect.value)
  })

  // ============================================
  // Update SQL from Store
  // ============================================

  function updateSqlFromStore() {
    if (!objectKey.value || !tableName.value) return
    sqlQuery.value = store.buildFullSql(objectKey.value, tableName.value, dialect.value)
  }

  // Watch for store changes and update SQL editor
  watch(
    [filters, sorts],
    () => {
      if (mode.value === 'sql') {
        updateSqlFromStore()
      }
    },
    { deep: true }
  )

  // ============================================
  // Visual Builder Actions
  // ============================================

  function addFilter() {
    if (!objectKey.value) return
    store.addFilter(objectKey.value)
  }

  function updateFilter(filterId: string, updates: Partial<FilterCondition>) {
    if (!objectKey.value) return
    store.updateFilter(objectKey.value, filterId, updates)
  }

  function removeFilter(filterId: string) {
    if (!objectKey.value) return
    store.removeFilter(objectKey.value, filterId)
  }

  function addSort() {
    if (!objectKey.value) return
    store.addSort(objectKey.value)
  }

  function updateSort(index: number, updates: Partial<SortColumn>) {
    if (!objectKey.value) return
    store.updateSort(objectKey.value, index, updates)
  }

  function removeSort(index: number) {
    if (!objectKey.value) return
    store.removeSort(objectKey.value, index)
  }

  // ============================================
  // Apply & Clear
  // ============================================

  function emitApply() {
    if (!objectKey.value) return

    const where = store.buildWhereClause(objectKey.value, false, dialect.value)
    const orderBy = store.buildOrderByColumns(objectKey.value)
    const orderDir = store.buildOrderByDirections(objectKey.value)

    onApply?.({ where, orderBy, orderDir })
  }

  function applyFilters() {
    emitApply()
  }

  function clearAll() {
    if (!objectKey.value) return
    store.clearAll(objectKey.value)
    sqlQuery.value = ''
    onClear?.()
  }

  // ============================================
  // Mode Switching
  // ============================================

  function switchToSqlMode() {
    mode.value = 'sql'
    updateSqlFromStore()
  }

  function switchToVisualMode() {
    mode.value = 'visual'
  }

  function toggleExpanded() {
    isExpanded.value = !isExpanded.value
  }

  // ============================================
  // Helper Functions
  // ============================================

  function getAvailableColumnsForSort(currentIndex: number) {
    const usedColumns = new Set(
      sorts.value
        .filter((_, i) => i !== currentIndex)
        .map((s) => s.column)
        .filter(Boolean)
    )
    return columns.value.filter((col) => col.field && !usedColumns.has(col.field))
  }

  function isUnaryOperator(op: string) {
    return ['IS NULL', 'IS NOT NULL'].includes(op)
  }

  function getPlaceholder(operator: string) {
    if (operator === 'LIKE' || operator === 'NOT LIKE') return '%value%'
    if (operator === 'IN' || operator === 'NOT IN') return 'val1, val2, ...'
    return 'value'
  }

  return {
    // Store reference
    store,

    // UI State
    isExpanded,
    mode,
    sqlQuery,

    // Computed
    filters,
    sorts,
    activeFilterCount,
    activeSortCount,
    hasActiveFilters,
    canAddSort,
    fullSqlQuery,

    // Visual Builder Actions
    addFilter,
    updateFilter,
    removeFilter,
    addSort,
    updateSort,
    removeSort,

    // Apply & Clear
    applyFilters,
    clearAll,

    // Mode Switching
    switchToSqlMode,
    switchToVisualMode,
    toggleExpanded,

    // Helpers
    getAvailableColumnsForSort,
    isUnaryOperator,
    getPlaceholder
  }
}
