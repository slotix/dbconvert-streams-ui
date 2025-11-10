<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount, onMounted } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import type {
  GridReadyEvent,
  ColDef,
  GridOptions,
  IDatasource,
  IGetRowsParams,
  Column
} from 'ag-grid-community'
import { type SQLTableMeta, type SQLViewMeta } from '@/types/metadata'
import connections from '@/api/connections'
import { formatTableValue } from '@/utils/dataUtils'
import { vHighlightjs } from '@/directives/highlightjs'
import { useObjectTabStateStore } from '@/stores/objectTabState'
import { useConnectionsStore } from '@/stores/connections'
import ColumnContextMenu from './ColumnContextMenu.vue'
import { useAGGridFiltering } from '@/composables/useAGGridFiltering'
import { convertFilterModelToSQL, determineFilterType } from '@/utils/agGridFilterUtils'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import '@/styles/agGridTheme.css'

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])

const props = defineProps<{
  tableMeta: SQLTableMeta | SQLViewMeta
  connectionId: string
  database: string
  isView?: boolean
  approxRows?: number // Optional approximate row count from database overview
  objectKey: string // Unique key for this table/view tab (from paneTabs store)
}>()

// Store for persisting tab state including AG Grid data state
const tabStateStore = useObjectTabStateStore()

// Connections store to get database type
const connectionsStore = useConnectionsStore()

// Get connection type for proper SQL identifier quoting
const connectionType = computed(() => {
  const conn = connectionsStore.connectionByID(props.connectionId)
  return conn?.type || 'mysql' // Default to mysql if not found
})

// Use shared AG Grid filtering composable (but override context menu state locally)
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
  updateAgGridWhereSQL,
  clearAllFilters: clearAgGridFilters
} = useAGGridFiltering()

// Local context menu state (not shared between instances)
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuColumn = ref<Column | null>(null)

// Ref to grid container for scoped event listeners
const gridContainerRef = ref<HTMLElement | null>(null)

// Local closeContextMenu function
function closeContextMenu(): void {
  showContextMenu.value = false
}

// Component-specific state
const error = ref<string>()
const totalRowCount = ref<number>(0)
const isLoading = ref(false)
const currentFirstRow = ref<number>(1)
const currentLastRow = ref<number>(100)

// Exact row count state for views
const isCountingRows = ref(false)
const exactRowCount = ref<number | null>(null)
const countError = ref<string | null>(null)

// Cache for exact counts (persists across table switches)
// Key format: "connectionId:database:schema:tableName"
const exactCountCache = ref<Map<string, number>>(new Map())

// Generate cache key for current table/view
const getCacheKey = () => {
  const objectName = getObjectName(props.tableMeta)
  const objectSchema = getObjectSchema(props.tableMeta)
  return `${props.connectionId}:${props.database}:${objectSchema || ''}:${objectName}`
}

// Watch for approxRows prop changes and update totalRowCount
// Only update if we don't have an exact count saved
watch(
  () => props.approxRows,
  (newApproxRows) => {
    // Check if we have a saved exact count - if so, don't overwrite with approx
    const savedState = tabStateStore.getAGGridDataState(props.objectKey)
    if (savedState && savedState.exactRowCount !== null) {
      // Use the saved exact count
      totalRowCount.value = savedState.exactRowCount
      exactRowCount.value = savedState.exactRowCount
      return
    }

    // Otherwise use approxRows
    if (newApproxRows && newApproxRows > 0) {
      totalRowCount.value = newApproxRows
    } else if (newApproxRows === -1) {
      // -1 indicates unknown count (for views)
      totalRowCount.value = -1
    } else if (newApproxRows === undefined) {
      // Reset count when switching to a table not in top tables list
      totalRowCount.value = 0
    }
  },
  { immediate: true }
)

// Watch for table changes and restore state from store or reset
watch(
  () => props.tableMeta,
  () => {
    const savedState = tabStateStore.getAGGridDataState(props.objectKey)

    if (savedState) {
      // Restore state from store
      currentSortModel.value = savedState.sortModel || []
      totalRowCount.value = savedState.totalRowCount || 0
      exactRowCount.value = savedState.exactRowCount || null
      agGridFilters.value = savedState.filterModel || {}

      // Apply saved filters and sort to grid
      if (gridApi.value) {
        // Set filter model
        gridApi.value.setFilterModel(savedState.filterModel || null)

        // Apply sort model
        if (savedState.sortModel && savedState.sortModel.length > 0) {
          const columnState = savedState.sortModel.map((sort, index) => ({
            colId: sort.colId,
            sort: sort.sort,
            sortIndex: index
          }))
          gridApi.value.applyColumnState({
            state: columnState,
            defaultState: { sort: null }
          })
        }
      }
    } else {
      // Reset to default state
      totalRowCount.value = 0
      currentFirstRow.value = 1
      currentLastRow.value = 100
      currentSortModel.value = []
      countError.value = null
      agGridFilters.value = {}
      agGridWhereSQL.value = ''

      if (gridApi.value) {
        // Clear any AG Grid column filters carried over from the previous table
        gridApi.value.setFilterModel(null)
      }

      // Check if we have a cached exact count for this table
      const cacheKey = getCacheKey()
      const cachedCount = exactCountCache.value.get(cacheKey)
      if (cachedCount !== undefined) {
        exactRowCount.value = cachedCount
        totalRowCount.value = cachedCount
      } else {
        exactRowCount.value = null
      }
    }
  },
  { deep: true }
)

function getObjectName(meta: SQLTableMeta | SQLViewMeta): string {
  return props.isView ? (meta as SQLViewMeta).name : (meta as SQLTableMeta).name
}

function getObjectSchema(meta: SQLTableMeta | SQLViewMeta): string {
  return props.isView ? (meta as SQLViewMeta).schema : (meta as SQLTableMeta).schema
}

// Generate column definitions from table metadata
const columnDefs = computed<ColDef[]>(() => {
  const meta = props.tableMeta
  if (!meta || !meta.columns) return []

  const isLargeTable = props.approxRows && props.approxRows > 1000000

  // Build a set of indexed columns for fast lookup
  const indexedColumns = new Set<string>()

  // Add primary key columns
  if (!props.isView && (meta as SQLTableMeta).primaryKeys) {
    ;(meta as SQLTableMeta).primaryKeys.forEach((pk) => indexedColumns.add(pk.toLowerCase()))
  }

  // Add indexed columns from indexes
  if (!props.isView && (meta as SQLTableMeta).indexes) {
    ;(meta as SQLTableMeta).indexes.forEach((idx) => {
      // Only consider the first column of composite indexes for sorting
      // (sorting by first column can use the index efficiently)
      if (idx.columns && idx.columns.length > 0) {
        indexedColumns.add(idx.columns[0].toLowerCase())
      }
    })
  }

  return meta.columns.map((col) => {
    const isIndexed = indexedColumns.has(col.name.toLowerCase())
    const canSort = !isLargeTable || isIndexed

    let tooltip = `${col.dataType}${col.isNullable ? '' : ' NOT NULL'}`

    // Add tooltip info for large tables
    if (isLargeTable) {
      if (isIndexed) {
        tooltip += ' - Indexed (sortable, Ctrl+Click for multi-sort)'
      } else {
        tooltip += ' - No index (sorting disabled)'
      }
    } else {
      tooltip += ' - Click to sort, Ctrl+Click for multi-sort'
    }

    // Determine filter type based on column data type
    const filterType = determineFilterType(col.dataType)

    return {
      field: col.name,
      headerName: col.name,
      sortable: canSort,
      filter: filterType,
      floatingFilter: false,
      suppressHeaderMenuButton: false, // Ensure menu button is shown
      suppressHeaderFilterButton: true, // Hide the filter button, use menu only
      resizable: true,
      flex: 1,
      minWidth: 120,
      valueFormatter: (params) => formatTableValue(params.value),
      headerTooltip: tooltip,
      wrapText: false,
      autoHeight: false,
      // Add header class to distinguish sortable vs non-sortable
      headerClass: isLargeTable && !isIndexed ? 'ag-header-cell-not-sortable' : undefined
    }
  })
})

// Database-specific clear all filters wrapper
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
  totalRowCount.value = 0
  currentFirstRow.value = 1
  currentLastRow.value = 100

  // Reset exact count for views
  exactRowCount.value = null
  countError.value = null

  // Clear state from store
  tabStateStore.setAGGridDataState(props.objectKey, {
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

// Convert AG Grid filter model to SQL WHERE clause
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
  // paginationPageSize: 100,
  // paginationPageSizeSelector: [100, 200, 500, 1000],
  cacheBlockSize: 200, // Must match paginationPageSize for infinite row model
  cacheOverflowSize: 2, // Keep 2 extra blocks in cache before/after viewport
  maxConcurrentDatasourceRequests: 2, // Allow 2 concurrent requests for faster loading
  infiniteInitialRowCount: 100,
  maxBlocksInCache: 20, // Keep more blocks in cache (4000 rows)
  // Enable multi-column sorting with Alt+Click
  multiSortKey: 'ctrl', // Use Ctrl (or Cmd on Mac) for multi-sort
  alwaysMultiSort: false, // Only multi-sort when holding Ctrl/Cmd
  // Always show menu icon in column headers
  suppressMenuHide: true,
  // Default column settings (Community Edition compatible)
  defaultColDef: {
    sortable: true,
    filter: true,
    resizable: true,
    suppressHeaderFilterButton: false,
    suppressHeaderMenuButton: false
  }
}))

// Create datasource for Infinite Row Model
function createDatasource(): IDatasource {
  return {
    getRows: async (params: IGetRowsParams) => {
      isLoading.value = true
      error.value = undefined

      try {
        const objectName = getObjectName(props.tableMeta)
        const objectSchema = getObjectSchema(props.tableMeta)

        if (!objectName) throw new Error('Table/View name is undefined')

        const limit = params.endRow - params.startRow
        const offset = params.startRow

        // Extract sort information from params (support multi-column sorting)
        const sortModel = params.sortModel || []
        currentSortModel.value = sortModel

        // Build comma-separated order_by and order_dir for multi-column sorting
        let orderBy: string | undefined
        let orderDir: string | undefined

        if (sortModel.length > 0) {
          orderBy = sortModel.map((s) => s.colId).join(',')
          orderDir = sortModel.map((s) => s.sort?.toUpperCase() || 'ASC').join(',')
        }

        // Extract filter model from AG Grid and convert to SQL
        const filterModel = params.filterModel || {}
        agGridFilters.value = filterModel
        const agGridWhereClause = convertFilterModelToSQL(filterModel, connectionType.value)
        agGridWhereSQL.value = agGridWhereClause

        // Use AG Grid filters only (no manual WHERE clause)
        const combinedWhereClause = agGridWhereClause

        const queryParams: {
          limit: number
          offset: number
          skip_count: boolean
          schema?: string
          order_by?: string
          order_dir?: string
          where?: string
          tabId?: string
        } = {
          limit,
          offset,
          // Skip count if we already have one (either approximate or exact)
          // Always skip on subsequent pages (offset > 0)
          // Also skip if we have an exact count (exactRowCount.value !== null)
          skip_count:
            (offset > 0 && totalRowCount.value > 0) || // Skip on non-first pages
            (exactRowCount.value !== null && !combinedWhereClause) // Skip if we have exact count (without filters)
        }

        // Add optional parameters only if they have values
        if (objectSchema && objectSchema !== 'public' && objectSchema !== '') {
          queryParams.schema = objectSchema
        }
        if (orderBy) {
          queryParams.order_by = orderBy
        }
        if (orderDir) {
          queryParams.order_dir = orderDir
        }
        if (combinedWhereClause) {
          queryParams.where = combinedWhereClause
        }
        // Add tabId for query grouping (use table/view name)
        if (objectName) {
          queryParams.tabId = objectName
        }

        const data = props.isView
          ? await connections.getViewData(
              props.connectionId,
              props.database,
              objectName,
              queryParams
            )
          : await connections.getTableData(
              props.connectionId,
              props.database,
              objectName,
              queryParams
            )

        // Convert rows array to objects with column names as keys
        const convertedRowData = data.rows.map((row) => {
          const obj: Record<string, unknown> = {}
          data.columns.forEach((colName, idx) => {
            obj[colName] = row[idx]
          })
          return obj
        })

        // Update total count if we have a real count from API
        if (data.total_count > 0) {
          totalRowCount.value = data.total_count
        } else if (data.total_count === -1 && totalRowCount.value <= 0) {
          // Only set -1 if we don't already have an approximate count
          // (Views start with -1 from approxRows, tables have positive approxRows)
          totalRowCount.value = -1
        }

        // For small tables where we don't have a count, if this is the first block
        // and we got fewer rows than requested, we know the total
        // (Don't infer for views with -1)
        if (offset === 0 && totalRowCount.value === 0 && convertedRowData.length < limit) {
          totalRowCount.value = convertedRowData.length
        }

        // Use totalRowCount for grid (either from API or approxRows prop)
        const rowCount = totalRowCount.value > 0 ? totalRowCount.value : undefined
        params.successCallback(convertedRowData, rowCount)

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

// Grid ready handler
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

    // Reset exact count for views
    exactRowCount.value = null
    countError.value = null

    // Note: AG Grid Infinite Row Model automatically purges cache and refetches when filters change
    // No need to manually call purgeInfiniteCache() - it would cause duplicate fetch
  })

  // Add context menu listener for column headers - wait for next tick to ensure DOM is ready
  // Use the grid container ref to ensure we attach to the correct grid instance
  setTimeout(() => {
    if (gridContainerRef.value) {
      gridContainerRef.value.addEventListener('contextmenu', handleContextMenu)
    }
  }, 100)

  // Restore saved state before setting datasource
  const savedState = tabStateStore.getAGGridDataState(props.objectKey)

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

  // Set datasource for infinite row model (this will use the restored sort/filter state)
  params.api.setGridOption('datasource', createDatasource())
}

// Handle right-click on column headers
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
    // (Only show our custom context menu on header cells)
    event.preventDefault()
  }
}

// Reload data when table metadata changes
watch(
  () => props.tableMeta,
  () => {
    if (gridApi.value) {
      const savedState = tabStateStore.getAGGridDataState(props.objectKey)

      // Reset the datasource with the new table
      gridApi.value.setGridOption('datasource', createDatasource())

      // Apply saved state AFTER setting datasource (setTimeout to ensure grid is ready)
      setTimeout(() => {
        if (!gridApi.value) return

        if (savedState && savedState.sortModel && savedState.sortModel.length > 0) {
          const columnState = savedState.sortModel.map((sort, index) => ({
            colId: sort.colId,
            sort: sort.sort,
            sortIndex: index
          }))
          gridApi.value.applyColumnState({
            state: columnState,
            defaultState: { sort: null }
          })
        } else {
          // Clear any existing sort state when switching tables (only if no saved state)
          gridApi.value.applyColumnState({
            defaultState: { sort: null }
          })
        }
      }, 100)
    }
  },
  { deep: true }
)

// Save AG Grid state to store when it changes
watch(
  () =>
    [
      currentSortModel.value,
      agGridFilters.value,
      totalRowCount.value,
      exactRowCount.value
    ] as const,
  ([sortModel, filterModel, totalCount, exactCount]) => {
    tabStateStore.setAGGridDataState(props.objectKey, {
      sortModel,
      filterModel,
      totalRowCount: totalCount,
      exactRowCount: exactCount
    })
  },
  { deep: true }
)

// Track visible rows for position indicator
function updateVisibleRows() {
  if (!gridApi.value || gridApi.value.isDestroyed()) return

  const firstRow = gridApi.value.getFirstDisplayedRowIndex()
  const lastRow = gridApi.value.getLastDisplayedRowIndex()

  if (firstRow !== null && lastRow !== null && firstRow >= 0 && lastRow >= 0) {
    currentFirstRow.value = firstRow + 1 // 1-indexed for display
    currentLastRow.value = lastRow + 1
  }
}

// Calculate exact row count for tables and views (on-demand)
async function calculateExactCount() {
  isCountingRows.value = true
  countError.value = null

  try {
    const objectName = getObjectName(props.tableMeta)
    const objectSchema = getObjectSchema(props.tableMeta)

    if (!objectName) throw new Error(`${props.isView ? 'View' : 'Table'} name is undefined`)

    // Build parameters
    const params: { schema?: string; where?: string; tabId?: string } = {}
    if (objectSchema && objectSchema !== 'public' && objectSchema !== '') {
      params.schema = objectSchema
    }
    if (combinedWhereClause.value) {
      params.where = combinedWhereClause.value
    }
    // Use table/view name as tabId for SQL logging grouping
    params.tabId = objectName

    // Call appropriate API based on whether it's a view or table
    const result = props.isView
      ? await connections.getViewExactCount(props.connectionId, props.database, objectName, params)
      : await connections.getTableExactCount(props.connectionId, props.database, objectName, params)

    exactRowCount.value = result.count
    totalRowCount.value = result.count // Update grid's total count

    // Cache the exact count (only if no filters applied)
    if (!combinedWhereClause.value) {
      const cacheKey = getCacheKey()
      exactCountCache.value.set(cacheKey, result.count)
    }

    // Update AG Grid's pagination display with the exact count
    // We've updated totalRowCount.value which will be used in the next data fetch
    // Unfortunately AG Grid's Infinite Row Model doesn't have a direct API to update
    // the row count without triggering a data refresh. We have two options:
    //
    // Option 1: Don't refresh - pagination updates on next user interaction (scroll/page)
    //   Pros: Zero additional queries
    //   Cons: User doesn't see updated page count until they interact with the grid
    //
    // Option 2: Trigger cache purge to immediately update pagination
    //   Pros: User immediately sees updated page count (e.g., "Page 1 of 1,154,000")
    //   Cons: Triggers one data fetch + metadata queries (if not cached)
    //
    // We choose Option 2 for better UX. The backend fix to share metadata cache
    // should minimize additional queries on subsequent operations.
    if (gridApi.value) {
      gridApi.value.purgeInfiniteCache()
    }
  } catch (err) {
    console.error('Error calculating exact count:', err)
    countError.value = err instanceof Error ? err.message : 'Failed to calculate count'
  } finally {
    isCountingRows.value = false
  }
}

// Refresh data - exposed to parent
function refresh() {
  if (gridApi.value) {
    // This will trigger a fresh data fetch from the backend
    gridApi.value.setGridOption('datasource', createDatasource())
  }
}

// Get current grid state for sync purposes
function getGridState() {
  return {
    sortModel: currentSortModel.value,
    filterModel: agGridFilters.value,
    sqlBannerExpanded: isSqlBannerExpanded.value
  }
}

// Apply grid state from sync (without triggering watchers)
function applyGridState(state: {
  sortModel?: any[]
  filterModel?: Record<string, any>
  sqlBannerExpanded?: boolean
}) {
  if (!gridApi.value) return

  // Apply sort model
  if (state.sortModel !== undefined) {
    currentSortModel.value = state.sortModel
    if (state.sortModel.length > 0) {
      const columnState = state.sortModel.map((sort: any, index: number) => ({
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

// Expose methods to parent
defineExpose({
  refresh,
  getGridState,
  applyGridState
})

// Initialize and restore state on mount
onMounted(() => {
  const savedState = tabStateStore.getAGGridDataState(props.objectKey)

  if (savedState) {
    // Restore state from store
    currentSortModel.value = savedState.sortModel || []
    totalRowCount.value = savedState.totalRowCount || 0
    exactRowCount.value = savedState.exactRowCount || null
    agGridFilters.value = savedState.filterModel || {}
  }
})

// Cleanup
onBeforeUnmount(() => {
  if (gridContainerRef.value) {
    gridContainerRef.value.removeEventListener('contextmenu', handleContextMenu)
  }
  if (gridApi.value) {
    gridApi.value.destroy()
  }
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- SQL Query Banner (like DataGrip) -->
    <div
      v-if="fullSqlQuery"
      class="mb-3 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden"
    >
      <div class="flex items-start gap-2 px-3 py-2">
        <!-- SQL Content -->
        <div class="flex-1 min-w-0">
          <pre
            v-highlightjs
            class="m-0 p-0 overflow-x-auto"
            :class="{
              'whitespace-pre-wrap': isSqlBannerExpanded,
              'whitespace-nowrap': !isSqlBannerExpanded
            }"
          ><code class="language-sql font-mono text-xs leading-relaxed">{{ displayedSql }}</code></pre>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-1 flex-shrink-0">
          <!-- Expand/Collapse button (only show if truncation is needed) -->
          <button
            v-if="needsTruncation"
            type="button"
            class="px-2 py-1 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            :title="isSqlBannerExpanded ? 'Collapse' : 'Expand'"
            @click="toggleSqlBanner"
          >
            {{ isSqlBannerExpanded ? 'Collapse' : 'Expand' }}
          </button>

          <!-- Clear filters button -->
          <button
            type="button"
            class="px-2 py-1 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors flex items-center gap-1"
            title="Clear all filters and sorting"
            @click="clearAllFilters"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Clear
          </button>
        </div>
      </div>
    </div>

    <!-- Large table warning (keep at top) -->
    <div
      v-if="!isView && approxRows && approxRows > 1000000"
      class="mb-3 flex items-center justify-between"
    >
      <span class="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clip-rule="evenodd"
          />
        </svg>
        Large table: only indexed columns are sortable
      </span>
    </div>

    <!-- Error message -->
    <div
      v-if="error"
      class="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md text-sm text-red-700 dark:text-red-300"
    >
      {{ error }}
    </div>

    <!-- AG Grid -->
    <div
      ref="gridContainerRef"
      class="ag-theme-alpine"
      :style="{
        width: '100%',
        height: '750px'
      }"
    >
      <AgGridVue
        :columnDefs="columnDefs"
        :gridOptions="gridOptions"
        style="width: 100%; height: 100%"
        @grid-ready="onGridReady"
      />
    </div>

    <!-- Row count controls below table -->
    <div
      v-if="(!isView && approxRows && approxRows > 0) || isView === true"
      class="mt-3 flex items-center justify-between"
    >
      <div class="flex items-center gap-3">
        <!-- Approximate count hint -->
        <span
          v-if="!isView && totalRowCount > 0 && exactRowCount === null"
          class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"
        >
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clip-rule="evenodd"
            />
          </svg>
          <span>Count (~{{ totalRowCount.toLocaleString() }}) is approximate</span>
        </span>

        <!-- Exact count result -->
        <span
          v-if="exactRowCount !== null"
          class="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1"
        >
          <svg
            class="w-4 h-4 text-green-600 dark:text-green-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd"
            />
          </svg>
          <span
            >Exact count:
            <span class="font-semibold text-green-600 dark:text-green-400">{{
              exactRowCount.toLocaleString()
            }}</span></span
          >
        </span>

        <!-- Error display -->
        <span
          v-if="countError"
          class="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          {{ countError }}
        </span>
      </div>

      <!-- Calculate Exact Count link -->
      <button
        v-if="exactRowCount === null"
        type="button"
        :disabled="isCountingRows"
        class="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-800/30 rounded-full px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 w-fit"
        :title="`Execute COUNT(*) query to get exact ${isView ? 'row' : 'total'} count`"
        @click="calculateExactCount"
      >
        <svg
          v-if="!isCountingRows"
          class="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
        <svg v-else class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span>{{ isCountingRows ? 'Counting...' : 'Calculate exact count' }}</span>
      </button>
    </div>

    <!-- Custom Context Menu -->
    <ColumnContextMenu
      v-if="showContextMenu"
      :x="contextMenuX"
      :y="contextMenuY"
      :column="contextMenuColumn"
      :grid-api="gridApi"
      @close="closeContextMenu"
    />
  </div>
</template>

<style scoped>
:deep(.ag-cell-wrap-text) {
  white-space: normal;
  line-height: 1.5;
  padding: 8px;
}

/* Style for non-sortable columns in large tables */
:deep(.ag-header-cell-not-sortable) {
  opacity: 0.6;
  cursor: not-allowed !important;
}

:deep(.ag-header-cell-not-sortable .ag-header-cell-label) {
  cursor: not-allowed !important;
}

/* Component-specific styles only - code highlighting styles are centralized in src/styles/codeHighlighting.css */
</style>
