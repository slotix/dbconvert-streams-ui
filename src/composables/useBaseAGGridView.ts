/**
 * Base composable for AG Grid data views
 * Provides shared logic for database tables and file data grids
 *
 * SIMPLIFIED: Query Filter Panel is the single source of truth for filtering/sorting.
 * AG-Grid only displays data - it does not manage filter or sort state.
 */

import { ref, computed, watch, onBeforeUnmount, type Ref } from 'vue'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import type {
  GridApi,
  GridOptions,
  IDatasource,
  IGetRowsParams,
  GridReadyEvent,
  SortModelItem,
  Column
} from 'ag-grid-community'
import { useAGGridFiltering } from '@/composables/useAGGridFiltering'
import { useObjectTabStateStore } from '@/stores/objectTabState'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import '@/styles/agGridTheme.css'

// Register AG Grid modules once
ModuleRegistry.registerModules([AllCommunityModule])

const SQL_BANNER_COLLAPSED_HEIGHT = '3.25rem'
const SQL_BANNER_EXPANDED_HEIGHT = '12rem'

/**
 * Data fetching result interface
 */
export interface FetchDataResult {
  rows: Record<string, unknown>[]
  columns: string[]
  totalCount: number
}

/**
 * Data fetching parameters
 */
export interface FetchDataParams {
  limit: number
  offset: number
  sortModel: SortModelItem[]
  whereClause: string
  /** Maximum total rows to return (user-specified LIMIT clause) */
  maxRows?: number
}

/**
 * Options for the base AG Grid view composable
 */
export interface BaseAGGridViewOptions {
  /** Unique key for this grid instance (for state persistence) */
  objectKey: Ref<string>

  /** Connection type for SQL quoting (e.g., 'mysql', 'postgres', 'duckdb') */
  connectionType?: Ref<string>

  /** Initial total row count (optional) */
  initialTotalRowCount?: Ref<number>

  /** Data fetching callback */
  fetchData: (params: FetchDataParams) => Promise<FetchDataResult>

  /** Callback when filters change */
  onFilterChanged?: () => void

  /** Callback when sort changes */
  onSortChanged?: () => void

  /** Callback after grid is ready (after base setup) */
  onGridReady?: (api: GridApi) => void
}

/**
 * Base AG Grid view composable
 * Handles all shared logic between database and file data grids
 */
export function useBaseAGGridView(options: BaseAGGridViewOptions) {
  const {
    objectKey,
    connectionType,
    initialTotalRowCount,
    fetchData,
    onFilterChanged,
    onSortChanged,
    onGridReady: onGridReadyCallback
  } = options

  // Tab state store for persistence
  const tabStateStore = useObjectTabStateStore()

  // Use shared AG Grid filtering composable (simplified - panel only)
  const {
    gridApi,
    panelWhereSQL,
    panelSortModel,
    panelLimit,
    isSqlBannerExpanded,
    whereClause,
    sortModel,
    orderByClause,
    fullSqlQuery,
    hasActiveFilters,
    needsTruncation,
    displayedSql,
    toggleSqlBanner,
    setPanelFilters,
    clearAllFilters: clearFilteringState
  } = useAGGridFiltering()

  // Local state
  const error = ref<string>()
  const isLoading = ref(false)
  const totalRowCount = ref<number>(initialTotalRowCount?.value ?? 0)
  const currentFirstRow = ref<number>(1)
  const currentLastRow = ref<number>(100)

  // Context menu state (local to each instance)
  const showContextMenu = ref(false)
  const contextMenuX = ref(0)
  const contextMenuY = ref(0)
  const contextMenuColumn = ref<Column | null>(null)

  // Grid container ref for scoped event listeners
  const gridContainerRef = ref<HTMLElement | null>(null)

  // SQL banner dimensions
  const sqlBannerHeight = computed(() =>
    isSqlBannerExpanded.value ? SQL_BANNER_EXPANDED_HEIGHT : SQL_BANNER_COLLAPSED_HEIGHT
  )

  // Monaco language based on connection type
  const monacoLanguage = computed(() => {
    if (!connectionType?.value) return 'sql'
    const type = connectionType.value.toLowerCase()
    if (type.includes('mysql')) return 'mysql'
    if (type.includes('postgres')) return 'pgsql'
    if (type.includes('duckdb')) return 'sql'
    return 'sql'
  })

  // Monaco editor options for inline SQL banner
  const sqlBannerEditorOptions = computed<Record<string, unknown>>(() => ({
    readOnly: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 13,
    lineNumbers: 'off',
    glyphMargin: false,
    folding: false,
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 0,
    renderLineHighlight: 'none',
    automaticLayout: true,
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8
    },
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    overviewRulerBorder: false,
    wordWrap: 'off',
    contextmenu: false,
    domReadOnly: true,
    renderValidationDecorations: 'off',
    padding: { top: 10, bottom: 2 }
  }))

  // AG Grid options for Infinite Row Model
  // Note: sortable and filter are disabled - Query Filter Panel is the single source of truth
  const gridOptions = computed<GridOptions>(() => ({
    theme: 'legacy',
    rowModelType: 'infinite',
    rowHeight: 32,
    headerHeight: 40,
    suppressCellFocus: true,
    animateRows: false,
    enableCellTextSelection: true,
    ensureDomOrder: true,
    domLayout: 'normal',
    pagination: true,
    paginationAutoPageSize: true,
    cacheBlockSize: 200,
    cacheOverflowSize: 2,
    maxConcurrentDatasourceRequests: 2,
    infiniteInitialRowCount: 100,
    maxBlocksInCache: 20,
    suppressMenuHide: true,
    defaultColDef: {
      // Disable native sorting/filtering - Query Filter Panel controls these
      sortable: false,
      filter: false,
      resizable: true,
      suppressHeaderFilterButton: true,
      suppressHeaderMenuButton: false
    }
  }))

  /**
   * Create datasource for Infinite Row Model
   * Uses panel filters only - single source of truth
   */
  function createDatasource(): IDatasource {
    return {
      getRows: async (params: IGetRowsParams) => {
        isLoading.value = true
        error.value = undefined

        try {
          const pageSize = params.endRow - params.startRow
          const startRow = params.startRow

          // Check if we have a user-specified max rows limit
          const userLimit = panelLimit.value

          // If user specified a limit and we're trying to fetch beyond it, return empty
          if (userLimit && startRow >= userLimit) {
            params.successCallback([], userLimit)
            isLoading.value = false
            return
          }

          // Adjust the fetch limit if user's limit would be exceeded
          let adjustedLimit = pageSize
          if (userLimit) {
            const remainingRows = userLimit - startRow
            adjustedLimit = Math.min(pageSize, remainingRows)
          }

          // Call the injected fetch callback with panel filters
          const result = await fetchData({
            limit: adjustedLimit,
            offset: startRow,
            sortModel: panelSortModel.value,
            whereClause: panelWhereSQL.value,
            maxRows: userLimit
          })

          const rowsThisPage = result.rows || []

          // Determine the effective total count
          // Priority order:
          // 1. User-specified limit (intentional restriction - always highest priority)
          // 2. Existing totalRowCount if we already have it (from exact count or previous fetch)
          // 3. Backend's total_count from response
          let effectiveTotal = result.totalCount

          if (userLimit) {
            // User-specified limit takes highest priority (intentional restriction)
            // Cap to actual count if we know it's smaller
            if (result.totalCount > 0 && result.totalCount < userLimit) {
              // Actual data is less than limit - use actual count
              effectiveTotal = result.totalCount
            } else if (totalRowCount.value > 0 && totalRowCount.value < userLimit) {
              // We have an exact count that's less than the limit
              effectiveTotal = totalRowCount.value
            } else {
              // Use the user's limit as the total
              effectiveTotal = userLimit
            }
          } else if (totalRowCount.value > 0) {
            // No limit, but we already have a known total (e.g., from exact count calculation)
            // Use that instead of the backend's response (which may be 0 due to skip_count)
            effectiveTotal = totalRowCount.value
          } else {
            // Use backend's total count
            effectiveTotal = result.totalCount
          }

          // Update total count for display only if we got a new valid count
          if (effectiveTotal > 0 && result.totalCount > 0) {
            totalRowCount.value = effectiveTotal
          } else if (result.totalCount === -1 && totalRowCount.value <= 0) {
            // Handle unknown count (e.g., for views)
            totalRowCount.value = -1
          }
          // Note: if result.totalCount is 0 (skip_count=true) and we already have
          // a totalRowCount, we keep the existing value

          // For small datasets where we don't have a count, if this is the first block
          // and we got fewer rows than requested, we know the total
          if (startRow === 0 && totalRowCount.value === 0 && rowsThisPage.length < adjustedLimit) {
            totalRowCount.value = rowsThisPage.length
            effectiveTotal = rowsThisPage.length
          }

          // Calculate lastRow for AG-Grid pagination
          // lastRow = undefined means "more rows available"
          // lastRow = N means "total is exactly N rows"
          let lastRow: number | undefined = undefined

          const fetchedUpTo = startRow + rowsThisPage.length

          if (rowsThisPage.length < adjustedLimit) {
            // We got fewer rows than requested - this is the last page
            lastRow = fetchedUpTo
          } else if (effectiveTotal > 0) {
            // We have a known total count - tell AG-Grid so pagination works
            lastRow = effectiveTotal
          }

          // console.log('[AG-Grid Datasource]', {
          //   userLimit,
          //   resultTotalCount: result.totalCount,
          //   effectiveTotal,
          //   rowsThisPage: rowsThisPage.length,
          //   adjustedLimit,
          //   startRow,
          //   fetchedUpTo,
          //   lastRow
          // })

          params.successCallback(rowsThisPage, lastRow)

          // Update visible rows immediately after data loads
          setTimeout(() => updateVisibleRows(), 100)

          error.value = undefined
        } catch (err) {
          console.error('Error loading data:', err)
          const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
          error.value = errorMessage
          params.failCallback()
        } finally {
          isLoading.value = false
        }
      }
    }
  }

  /**
   * Close context menu
   */
  function closeContextMenu(): void {
    showContextMenu.value = false
  }

  /**
   * Handle right-click on column headers
   */
  function handleContextMenu(event: MouseEvent) {
    const target = event.target as HTMLElement

    // Check if click was on a column header
    const headerCell = target.closest('.ag-header-cell')

    if (headerCell && gridApi.value) {
      event.preventDefault()

      // Get the column from the header cell
      const colId = headerCell.getAttribute('col-id')

      if (colId) {
        const column = gridApi.value.getColumn(colId)

        if (column) {
          contextMenuColumn.value = column
          contextMenuX.value = event.clientX
          contextMenuY.value = event.clientY
          showContextMenu.value = true
        }
      }
    } else {
      // Prevent system context menu on data cells too
      event.preventDefault()
    }
  }

  /**
   * Track visible rows for position indicator
   */
  function updateVisibleRows() {
    if (!gridApi.value || gridApi.value.isDestroyed()) return

    const firstRow = gridApi.value.getFirstDisplayedRowIndex()
    const lastRow = gridApi.value.getLastDisplayedRowIndex()

    if (firstRow !== null && lastRow !== null && firstRow >= 0 && lastRow >= 0) {
      currentFirstRow.value = firstRow + 1 // 1-indexed for display
      currentLastRow.value = lastRow + 1
    }
  }

  /**
   * Clear all filters and sorting
   */
  function clearAllFilters() {
    // Use the base clearing from composable
    clearFilteringState()

    // Reset to first page
    totalRowCount.value = initialTotalRowCount?.value ?? 0
    currentFirstRow.value = 1
    currentLastRow.value = 100

    // Clear state from store
    tabStateStore.setAGGridDataState(objectKey.value, {
      sortModel: [],
      filterModel: {},
      totalRowCount: 0,
      exactRowCount: null
    })

    // Refresh data
    if (gridApi.value) {
      gridApi.value.setGridOption('datasource', createDatasource())
    }
  }

  /**
   * Refresh grid data
   */
  function refresh() {
    if (gridApi.value) {
      gridApi.value.setGridOption('datasource', createDatasource())
    }
  }

  /**
   * Get current grid state for sync purposes
   */
  function getGridState() {
    return {
      sortModel: panelSortModel.value,
      whereClause: panelWhereSQL.value,
      sqlBannerExpanded: isSqlBannerExpanded.value
    }
  }

  /**
   * Apply grid state from sync (without triggering watchers)
   */
  function applyGridState(state: {
    sortModel?: SortModelItem[]
    whereClause?: string
    sqlBannerExpanded?: boolean
  }) {
    // Apply panel filters
    if (state.sortModel !== undefined || state.whereClause !== undefined) {
      setPanelFilters(
        state.whereClause ?? panelWhereSQL.value,
        state.sortModel ?? panelSortModel.value
      )
    }

    // Apply SQL banner expansion state
    if (state.sqlBannerExpanded !== undefined) {
      isSqlBannerExpanded.value = state.sqlBannerExpanded
    }
  }

  /**
   * Grid ready handler
   */
  function onGridReady(params: GridReadyEvent) {
    gridApi.value = params.api

    // Add scroll listener to update position indicator
    params.api.addEventListener('bodyScroll', updateVisibleRows)
    params.api.addEventListener('modelUpdated', updateVisibleRows)
    params.api.addEventListener('firstDataRendered', updateVisibleRows)

    // Add context menu listener for column headers
    setTimeout(() => {
      if (gridContainerRef.value) {
        gridContainerRef.value.addEventListener('contextmenu', handleContextMenu)
      }
    }, 100)

    // Restore saved state before setting datasource
    const savedState = tabStateStore.getAGGridDataState(objectKey.value)

    if (savedState) {
      // Restore panel filters from saved state
      if (
        savedState.panelWhereSQL ||
        (savedState.sortModel && savedState.sortModel.length > 0) ||
        savedState.panelLimit
      ) {
        setPanelFilters(
          savedState.panelWhereSQL || '',
          savedState.sortModel || [],
          savedState.panelLimit
        )
      }
    }

    // Set datasource for infinite row model
    params.api.setGridOption('datasource', createDatasource())

    // Call optional callback
    if (onGridReadyCallback) {
      onGridReadyCallback(params.api)
    }
  }

  /**
   * Save panel filter state to store when it changes
   */
  watch(
    () => [panelWhereSQL.value, panelSortModel.value, panelLimit.value] as const,
    ([whereSQL, sortModel, limit]) => {
      tabStateStore.setAGGridDataState(objectKey.value, {
        sortModel,
        panelWhereSQL: whereSQL,
        panelLimit: limit,
        filterModel: {} // Keep for backwards compatibility
      })
    },
    { deep: true }
  )

  /**
   * Watch for totalRowCount changes and update AG Grid's pagination
   * This ensures AG Grid displays the correct total when count is updated after initial load
   */
  watch(
    () => totalRowCount.value,
    (newCount, oldCount) => {
      // If count changed from unknown/zero to a known value, or changed to a different value
      // we need to tell AG Grid by recreating the datasource
      if (
        gridApi.value &&
        !gridApi.value.isDestroyed() &&
        newCount > 0 &&
        newCount !== oldCount &&
        (oldCount === -1 || oldCount === 0 || oldCount !== newCount)
      ) {
        // Purge cache and refresh to update pagination with new total
        gridApi.value.purgeInfiniteCache()
      }
    }
  )

  /**
   * Cleanup on unmount
   */
  onBeforeUnmount(() => {
    if (gridContainerRef.value) {
      gridContainerRef.value.removeEventListener('contextmenu', handleContextMenu)
    }
    if (gridApi.value) {
      gridApi.value.destroy()
    }
  })

  return {
    // Refs
    gridApi,
    gridContainerRef,

    // State
    error,
    isLoading,
    totalRowCount,
    currentFirstRow,
    currentLastRow,

    // Panel filters state (single source of truth)
    panelWhereSQL,
    panelSortModel,
    panelLimit,
    whereClause,
    sortModel,
    hasActiveFilters,

    // Context menu
    showContextMenu,
    contextMenuX,
    contextMenuY,
    contextMenuColumn,
    closeContextMenu,

    // SQL banner
    isSqlBannerExpanded,
    orderByClause,
    fullSqlQuery,
    needsTruncation,
    displayedSql,
    toggleSqlBanner,
    sqlBannerHeight,
    sqlBannerEditorOptions,
    monacoLanguage,

    // Grid options
    gridOptions,

    // Methods
    createDatasource,
    onGridReady,
    clearAllFilters,
    setPanelFilters,
    refresh,
    getGridState,
    applyGridState,
    updateVisibleRows
  }
}
