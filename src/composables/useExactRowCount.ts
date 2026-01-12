import { ref, computed, watch, type ComputedRef, type Ref } from 'vue'
import type { GridApi } from 'ag-grid-community'
import connections from '@/api/connections'
import { useObjectTabStateStore } from '@/stores/objectTabState'

export type ExactRowCountDeps = {
  objectKey: ComputedRef<string>
  isView: ComputedRef<boolean>
  approxRows: ComputedRef<number | undefined>

  connectionId: ComputedRef<string>
  database: ComputedRef<string>
  objectName: ComputedRef<string>
  objectSchema: ComputedRef<string | null>

  whereClause: Ref<string>
  totalRowCount: Ref<number>
  gridApi: Ref<GridApi | null>

  recreateDatasource: () => void

  // Query Filter Panel state (for persistence)
  panelWhereSQL: Ref<string>
  panelSortModel: Ref<Array<{ colId: string; sort: 'asc' | 'desc' }>>
  setPanelFilters: (
    where: string,
    sortModel: Array<{ colId: string; sort: 'asc' | 'desc' }>,
    limit?: number
  ) => void

  // Optional: column state persistence
  getColumnState?: () => unknown
  applyColumnState?: (state: unknown) => void

  // Unique cache key per object
  getCacheKey: () => string
}

export function useExactRowCount(deps: ExactRowCountDeps) {
  const tabStateStore = useObjectTabStateStore()

  const isCountingRows = ref(false)
  const exactRowCount = ref<number | null>(null)
  const countError = ref<string | null>(null)

  // Cache for exact counts (persists across table switches within same context)
  const exactCountCache = ref<Map<string, number>>(new Map())

  const isCountExact = computed(() => {
    if (exactRowCount.value !== null) return true
    if (deps.approxRows.value && deps.approxRows.value <= 10000) return true
    return false
  })

  // Sync approxRows into totalRowCount unless an exact count is already saved.
  watch(
    () => deps.approxRows.value,
    (newApproxRows) => {
      const savedState = tabStateStore.getAGGridDataState(deps.objectKey.value)

      if (savedState && savedState.exactRowCount !== null) {
        deps.totalRowCount.value = savedState.exactRowCount
        exactRowCount.value = savedState.exactRowCount
        return
      }

      if (newApproxRows && newApproxRows > 0) {
        deps.totalRowCount.value = newApproxRows
      } else if (newApproxRows === -1) {
        deps.totalRowCount.value = -1
      } else if (newApproxRows === undefined) {
        deps.totalRowCount.value = 0
      }

      if (deps.gridApi.value && !deps.gridApi.value.isDestroyed()) {
        deps.recreateDatasource()
      }
    },
    { immediate: true }
  )

  // Restore state when object changes.
  watch(
    () => deps.getCacheKey(),
    () => {
      const savedState = tabStateStore.getAGGridDataState(deps.objectKey.value)

      if (savedState) {
        exactRowCount.value = savedState.exactRowCount || null

        if (savedState.panelWhereSQL || (savedState.sortModel && savedState.sortModel.length > 0)) {
          deps.setPanelFilters(savedState.panelWhereSQL || '', savedState.sortModel || [])
        }
      } else {
        countError.value = null

        const cacheKey = deps.getCacheKey()
        const cachedCount = exactCountCache.value.get(cacheKey)
        if (cachedCount !== undefined) {
          exactRowCount.value = cachedCount
          deps.totalRowCount.value = cachedCount
        } else {
          exactRowCount.value = null
        }
      }

      if (deps.gridApi.value && !deps.gridApi.value.isDestroyed()) {
        deps.recreateDatasource()
      }
    },
    { immediate: true }
  )

  // Auto-calculate exact count when backend returns unknown count (-1) and no filters are applied.
  watch(
    () => deps.totalRowCount.value,
    (newCount) => {
      if (
        newCount === -1 &&
        exactRowCount.value === null &&
        !deps.whereClause.value &&
        !isCountingRows.value &&
        !countError.value
      ) {
        void calculateExactCount()
      }
    }
  )

  // Persist exactRowCount (+ panel filters) into tab state.
  watch(
    () => exactRowCount.value,
    (exactCount) => {
      tabStateStore.setAGGridDataState(deps.objectKey.value, {
        sortModel: deps.panelSortModel.value,
        panelWhereSQL: deps.panelWhereSQL.value,
        filterModel: {},
        totalRowCount: deps.totalRowCount.value,
        exactRowCount: exactCount
      })
    }
  )

  async function calculateExactCount() {
    isCountingRows.value = true
    countError.value = null

    try {
      const params: { schema?: string; where?: string; tabId?: string } = {}
      if (
        deps.objectSchema.value &&
        deps.objectSchema.value !== 'public' &&
        deps.objectSchema.value !== ''
      ) {
        params.schema = deps.objectSchema.value
      }
      if (deps.whereClause.value) {
        params.where = deps.whereClause.value
      }
      params.tabId = deps.objectName.value

      const result = deps.isView.value
        ? await connections.getViewExactCount(
            deps.connectionId.value,
            deps.database.value,
            deps.objectName.value,
            params
          )
        : await connections.getTableExactCount(
            deps.connectionId.value,
            deps.database.value,
            deps.objectName.value,
            params
          )

      exactRowCount.value = result.count
      deps.totalRowCount.value = result.count

      if (!deps.whereClause.value) {
        exactCountCache.value.set(deps.getCacheKey(), result.count)
      }

      if (deps.gridApi.value) {
        deps.gridApi.value.purgeInfiniteCache()
      }
    } catch (err) {
      console.error('Error calculating exact count:', err)
      countError.value = err instanceof Error ? err.message : 'Failed to calculate count'
    } finally {
      isCountingRows.value = false
    }
  }

  function resetOnFilterChange() {
    exactRowCount.value = null
    countError.value = null
  }

  function applyDeletedCount(deletedCount: number) {
    if (deps.totalRowCount.value > 0) {
      deps.totalRowCount.value = Math.max(0, deps.totalRowCount.value - deletedCount)
    }
    if (exactRowCount.value !== null) {
      exactRowCount.value = Math.max(0, exactRowCount.value - deletedCount)
    }
  }

  return {
    isCountingRows,
    exactRowCount,
    countError,
    isCountExact,
    calculateExactCount,
    resetOnFilterChange,
    applyDeletedCount
  }
}
