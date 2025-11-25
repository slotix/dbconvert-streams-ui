/**
 * Base composable for AG Grid data views
 * Provides shared logic for database tables and file data grids
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
import { convertFilterModelToSQL } from '@/utils/agGridFilterUtils'
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
  filterModel: Record<string, unknown>
  whereClause: string
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

  // Use shared AG Grid filtering composable
  const {
    gridApi,
    currentSortModel,
    agGridFilters,
    agGridWhereSQL,
    isSqlBannerExpanded,
    combinedWhereClause,
    orderByClause,
    fullSqlQuery,
    needsTruncation,
    displayedSql,
    toggleSqlBanner,
    clearAllFilters: clearAgGridFilters
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
    multiSortKey: 'ctrl',
    alwaysMultiSort: false,
    suppressMenuHide: true,
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      suppressHeaderFilterButton: false,
      suppressHeaderMenuButton: false
    }
  }))

  /**
   * Create datasource for Infinite Row Model
   */
  function createDatasource(): IDatasource {
    return {
      getRows: async (params: IGetRowsParams) => {
        isLoading.value = true
        error.value = undefined

        try {
          const limit = params.endRow - params.startRow
          const offset = params.startRow

          // Extract sort information from params (support multi-column sorting)
          const sortModel = params.sortModel || []
          currentSortModel.value = sortModel

          // Extract filter model from AG Grid and convert to SQL
          const filterModel = params.filterModel || {}
          agGridFilters.value = filterModel
          const agGridWhereClause = convertFilterModelToSQL(
            filterModel,
            connectionType?.value || 'mysql'
          )
          agGridWhereSQL.value = agGridWhereClause

          // Call the injected fetch callback
          const result = await fetchData({
            limit,
            offset,
            sortModel,
            filterModel,
            whereClause: agGridWhereClause
          })

          // Update total count if we have a real count from the result
          if (result.totalCount > 0) {
            totalRowCount.value = result.totalCount
          } else if (result.totalCount === -1 && totalRowCount.value <= 0) {
            // Handle unknown count (e.g., for views)
            totalRowCount.value = -1
          }

          // For small datasets where we don't have a count, if this is the first block
          // and we got fewer rows than requested, we know the total
          if (offset === 0 && totalRowCount.value === 0 && result.rows.length < limit) {
            totalRowCount.value = result.rows.length
          }

          // Use totalRowCount for grid
          const rowCount = totalRowCount.value > 0 ? totalRowCount.value : undefined
          params.successCallback(result.rows, rowCount)

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
    clearAgGridFilters()

    // Clear sorting
    if (gridApi.value) {
      gridApi.value.applyColumnState({
        defaultState: { sort: null }
      })
    }

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
      sortModel: currentSortModel.value,
      filterModel: agGridFilters.value,
      sqlBannerExpanded: isSqlBannerExpanded.value
    }
  }

  /**
   * Apply grid state from sync (without triggering watchers)
   */
  function applyGridState(state: {
    sortModel?: SortModelItem[]
    filterModel?: Record<string, unknown>
    sqlBannerExpanded?: boolean
  }) {
    if (!gridApi.value) return

    // Apply sort model
    if (state.sortModel !== undefined) {
      currentSortModel.value = state.sortModel
      if (state.sortModel.length > 0) {
        const columnState = state.sortModel.map((sort: SortModelItem, index: number) => ({
          colId: sort.colId,
          sort: sort.sort,
          sortIndex: index
        }))
        gridApi.value.applyColumnState({
          state: columnState,
          defaultState: { sort: null }
        })
      } else {
        // Clear sorting
        gridApi.value.applyColumnState({
          defaultState: { sort: null }
        })
      }
    }

    // Apply filter model
    if (state.filterModel !== undefined) {
      agGridFilters.value = state.filterModel
      gridApi.value.setFilterModel(state.filterModel)
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

    // Add filter changed listener
    params.api.addEventListener('filterChanged', () => {
      // Reset total count so we get fresh count with filters
      totalRowCount.value = 0
      currentFirstRow.value = 1
      currentLastRow.value = 100

      // Call optional callback
      if (onFilterChanged) {
        onFilterChanged()
      }

      // Note: AG Grid Infinite Row Model automatically purges cache and refetches when filters change
    })

    // Add sort changed listener
    if (onSortChanged) {
      params.api.addEventListener('sortChanged', onSortChanged)
    }

    // Add context menu listener for column headers
    setTimeout(() => {
      if (gridContainerRef.value) {
        gridContainerRef.value.addEventListener('contextmenu', handleContextMenu)
      }
    }, 100)

    // Restore saved state before setting datasource
    const savedState = tabStateStore.getAGGridDataState(objectKey.value)

    if (savedState) {
      // Restore filters
      if (savedState.filterModel && Object.keys(savedState.filterModel).length > 0) {
        params.api.setFilterModel(savedState.filterModel)
      }

      // Restore sort - apply before setting datasource
      if (savedState.sortModel && savedState.sortModel.length > 0) {
        const columnState = savedState.sortModel.map((sort, index) => ({
          colId: sort.colId,
          sort: sort.sort,
          sortIndex: index
        }))
        params.api.applyColumnState({
          state: columnState,
          defaultState: { sort: null }
        })
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
   * Save AG Grid state to store when it changes
   */
  watch(
    () => [currentSortModel.value, agGridFilters.value] as const,
    ([sortModel, filterModel]) => {
      tabStateStore.setAGGridDataState(objectKey.value, {
        sortModel,
        filterModel
      })
    },
    { deep: true }
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
    currentSortModel,
    agGridFilters,
    agGridWhereSQL,

    // Context menu
    showContextMenu,
    contextMenuX,
    contextMenuY,
    contextMenuColumn,
    closeContextMenu,

    // SQL banner
    isSqlBannerExpanded,
    combinedWhereClause,
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
    refresh,
    getGridState,
    applyGridState,
    updateVisibleRows
  }
}
