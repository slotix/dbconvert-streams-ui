<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import type {
  GridApi,
  GridReadyEvent,
  ColDef,
  GridOptions,
  IDatasource,
  IGetRowsParams,
  SortModelItem,
  Column
} from 'ag-grid-community'
import { type SQLTableMeta, type SQLViewMeta } from '@/types/metadata'
import connections from '@/api/connections'
import { formatTableValue } from '@/utils/dataUtils'
import { vHighlightjs } from '@/directives/highlightjs'
import ColumnContextMenu from './ColumnContextMenu.vue'
import AdvancedFilterModal from './AdvancedFilterModal.vue'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])

const props = defineProps<{
  tableMeta: SQLTableMeta | SQLViewMeta
  connectionId: string
  database: string
  isView?: boolean
  approxRows?: number // Optional approximate row count from database overview
}>()

const gridApi = ref<GridApi | null>(null)
const error = ref<string>()
const totalRowCount = ref<number>(0)
const isLoading = ref(false)
const currentFirstRow = ref<number>(1)
const currentLastRow = ref<number>(100)
const currentSortModel = ref<SortModelItem[]>([])
const whereClause = ref<string>('')
const whereInput = ref<string>('')
const whereError = ref<string>()
const agGridFilters = ref<Record<string, any>>({})
const agGridWhereSQL = ref<string>('')

// Context menu state
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuColumn = ref<Column | null>(null)

// Advanced filter modal state
const showAdvancedFilterModal = ref(false)

// SQL banner expansion state
const isSqlBannerExpanded = ref(false)
const SQL_BANNER_MAX_LENGTH = 150

// Watch for approxRows prop changes and update totalRowCount
watch(
  () => props.approxRows,
  (newApproxRows) => {
    if (newApproxRows && newApproxRows > 0) {
      totalRowCount.value = newApproxRows
    } else if (newApproxRows === undefined) {
      // Reset count when switching to a table not in top tables list
      totalRowCount.value = 0
    }
  },
  { immediate: true }
)

// Watch for table changes and reset count
watch(
  () => props.tableMeta,
  () => {
    totalRowCount.value = 0
    currentFirstRow.value = 1
    currentLastRow.value = 100
    currentSortModel.value = []
    whereClause.value = ''
    whereInput.value = ''
    whereError.value = undefined
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
    let filterType: string | boolean = 'agTextColumnFilter'
    if (col.dataType) {
      const dataType = col.dataType.toLowerCase()
      if (
        dataType.includes('int') ||
        dataType.includes('float') ||
        dataType.includes('double') ||
        dataType.includes('decimal') ||
        dataType.includes('numeric')
      ) {
        filterType = 'agNumberColumnFilter'
      } else if (dataType.includes('date') || dataType.includes('time')) {
        filterType = 'agDateColumnFilter'
      }
    }

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

// Computed property to generate SQL WHERE clause for display
const combinedWhereClause = computed(() => {
  const agGridWhereClause = agGridWhereSQL.value
  const manualWhere = whereClause.value

  if (agGridWhereClause && manualWhere) {
    return `(${agGridWhereClause}) AND (${manualWhere})`
  } else if (agGridWhereClause) {
    return agGridWhereClause
  } else if (manualWhere) {
    return manualWhere
  }
  return ''
})

// Computed property to generate ORDER BY clause for display
const orderByClause = computed(() => {
  if (currentSortModel.value.length === 0) return ''

  const sortParts = currentSortModel.value.map((sort) => {
    const direction = sort.sort?.toUpperCase() || 'ASC'
    return `${sort.colId} ${direction}`
  })

  return sortParts.join(', ')
})

// Computed property for full SQL query display
const fullSqlQuery = computed(() => {
  const parts: string[] = []

  if (combinedWhereClause.value) {
    parts.push(`WHERE ${combinedWhereClause.value}`)
  }

  if (orderByClause.value) {
    parts.push(`ORDER BY ${orderByClause.value}`)
  }

  return parts.join(' ')
})

// Check if SQL query needs truncation
const needsTruncation = computed(() => {
  return fullSqlQuery.value.length > SQL_BANNER_MAX_LENGTH
})

// Displayed SQL (truncated or full based on expansion state)
const displayedSql = computed(() => {
  if (!needsTruncation.value || isSqlBannerExpanded.value) {
    return fullSqlQuery.value
  }
  return fullSqlQuery.value.substring(0, SQL_BANNER_MAX_LENGTH) + '...'
})

// Toggle SQL banner expansion
function toggleSqlBanner() {
  isSqlBannerExpanded.value = !isSqlBannerExpanded.value
}

// Clear all filters
function clearAllFilters() {
  // Clear manual WHERE clause
  whereInput.value = ''
  whereClause.value = ''
  whereError.value = undefined

  // Clear AG Grid filters
  if (gridApi.value) {
    gridApi.value.setFilterModel(null)
  }

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

  // Refresh data
  if (gridApi.value) {
    gridApi.value.setGridOption('datasource', createDatasource())
  }
}

// Convert AG Grid filter model to SQL WHERE clause
function convertFilterModelToSQL(filterModel: Record<string, any>): string {
  const whereClauses: string[] = []

  for (const [column, filter] of Object.entries(filterModel)) {
    if (!filter) continue

    const clause = buildFilterClause(column, filter)
    if (clause) {
      whereClauses.push(clause)
    }
  }

  return whereClauses.join(' AND ')
}

function buildFilterClause(column: string, filter: any): string | null {
  // Handle combined conditions (AND/OR)
  if (filter.operator) {
    console.log(`Building compound filter for ${column}:`, filter)

    // AG Grid uses 'conditions' array (newer versions) or 'condition1'/'condition2' (older versions)
    let condition1: string | null = null
    let condition2: string | null = null

    if (filter.conditions && Array.isArray(filter.conditions)) {
      // New format: conditions array
      condition1 = filter.conditions[0] ? buildFilterClause(column, filter.conditions[0]) : null
      condition2 = filter.conditions[1] ? buildFilterClause(column, filter.conditions[1]) : null
    } else {
      // Old format: condition1 and condition2 properties
      condition1 = filter.condition1 ? buildFilterClause(column, filter.condition1) : null
      condition2 = filter.condition2 ? buildFilterClause(column, filter.condition2) : null
    }

    console.log(`  Condition1: ${condition1}, Condition2: ${condition2}`)

    if (condition1 && condition2) {
      return `(${condition1} ${filter.operator} ${condition2})`
    }
    return condition1 || condition2
  }

  const filterValue = filter.filter

  // Skip if filter value is missing
  if (filterValue === undefined || filterValue === null || filterValue === '') {
    console.log(`Skipping filter for ${column}: no value`)
    return null
  }

  // Escape single quotes in string values to prevent SQL injection
  const escapeValue = (val: any): string => {
    if (typeof val === 'string') {
      return val.replace(/'/g, "''")
    }
    return String(val)
  }

  // Build SQL based on filter type
  switch (filter.type) {
    case 'equals':
      return `${column} = '${escapeValue(filterValue)}'`
    case 'notEqual':
      return `${column} != '${escapeValue(filterValue)}'`
    case 'contains':
      return `${column} LIKE '%${escapeValue(filterValue)}%'`
    case 'notContains':
      return `${column} NOT LIKE '%${escapeValue(filterValue)}%'`
    case 'startsWith':
      return `${column} LIKE '${escapeValue(filterValue)}%'`
    case 'endsWith':
      return `${column} LIKE '%${escapeValue(filterValue)}'`
    case 'lessThan':
      return `${column} < ${filterValue}`
    case 'lessThanOrEqual':
      return `${column} <= ${filterValue}`
    case 'greaterThan':
      return `${column} > ${filterValue}`
    case 'greaterThanOrEqual':
      return `${column} >= ${filterValue}`
    case 'inRange':
      return `${column} BETWEEN ${filter.filter} AND ${filter.filterTo}`
    case 'blank':
      return `(${column} IS NULL OR ${column} = '')`
    case 'notBlank':
      return `(${column} IS NOT NULL AND ${column} != '')`
    default:
      return null
  }
}

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
        const agGridWhereClause = convertFilterModelToSQL(filterModel)
        agGridWhereSQL.value = agGridWhereClause

        // Debug logging
        if (agGridWhereClause) {
          console.log('AG Grid Filter Model:', filterModel)
          console.log('Converted SQL WHERE:', agGridWhereClause)
        }

        // Combine AG Grid filters with manual WHERE clause
        let combinedWhereClause = ''
        if (agGridWhereClause && whereClause.value) {
          combinedWhereClause = `(${agGridWhereClause}) AND (${whereClause.value})`
        } else if (agGridWhereClause) {
          combinedWhereClause = agGridWhereClause
        } else if (whereClause.value) {
          combinedWhereClause = whereClause.value
        }

        const queryParams: {
          limit: number
          offset: number
          skip_count: boolean
          schema?: string
          order_by?: string
          order_dir?: string
          where?: string
        } = {
          limit,
          offset,
          // When filters are active, we need accurate count for first page
          // Skip count only if: no filters AND we already have count AND not first page
          skip_count: !combinedWhereClause && offset > 0 && totalRowCount.value > 0
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

        // Update total count if we have a real count from API (not -1)
        if (data.total_count > 0) {
          totalRowCount.value = data.total_count
        }

        // For small tables where we don't have a count, if this is the first block
        // and we got fewer rows than requested, we know the total
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

        // Check if it's a WHERE clause error
        if (
          errorMessage.toLowerCase().includes('where') ||
          errorMessage.toLowerCase().includes('syntax')
        ) {
          whereError.value = errorMessage
        }

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

    // When filter changes, refresh the datasource
    if (gridApi.value) {
      gridApi.value.setGridOption('datasource', createDatasource())
    }
  })

  // Add context menu listener for column headers - wait for next tick to ensure DOM is ready
  setTimeout(() => {
    const gridElement = document.querySelector('.ag-root') as HTMLElement
    if (gridElement) {
      gridElement.addEventListener('contextmenu', handleContextMenu)
    }
  }, 100)

  // Set datasource for infinite row model
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
  }
}

// Close context menu
function closeContextMenu() {
  showContextMenu.value = false
  contextMenuColumn.value = null
}

// Open advanced filter modal
function openAdvancedFilterModal() {
  showAdvancedFilterModal.value = true
}

// Apply WHERE filter from modal
function applyWhereFilterFromModal(newWhereClause: string) {
  whereError.value = undefined
  whereClause.value = newWhereClause
  whereInput.value = newWhereClause

  // Reset to first page when applying filter
  totalRowCount.value = 0
  currentFirstRow.value = 1
  currentLastRow.value = 100

  if (gridApi.value) {
    // Refresh the datasource with new filter
    gridApi.value.setGridOption('datasource', createDatasource())
  }
}

// Reload data when table metadata changes
watch(
  () => props.tableMeta,
  () => {
    if (gridApi.value) {
      // Clear any existing sort state when switching tables
      gridApi.value.applyColumnState({
        defaultState: { sort: null }
      })
      // Reset the datasource with the new table
      gridApi.value.setGridOption('datasource', createDatasource())
    }
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

// Refresh data - exposed to parent
function refresh() {
  if (gridApi.value) {
    // This will trigger a fresh data fetch from the backend
    gridApi.value.setGridOption('datasource', createDatasource())
  }
}

// Expose refresh to parent
defineExpose({
  refresh
})

// Cleanup
onBeforeUnmount(() => {
  const gridElement = document.querySelector('.ag-root') as HTMLElement
  if (gridElement) {
    gridElement.removeEventListener('contextmenu', handleContextMenu as EventListener)
  }
  if (gridApi.value) {
    gridApi.value.destroy()
  }
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- WHERE error message -->
    <div
      v-if="whereError"
      class="mb-3 p-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"
    >
      {{ whereError }}
    </div>

    <!-- SQL Query Banner (like DataGrip) -->
    <div
      v-if="fullSqlQuery"
      class="mb-3 bg-amber-50 border border-amber-200 rounded-md overflow-hidden"
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
            class="px-2 py-1 text-xs text-amber-700 hover:bg-amber-100 rounded transition-colors"
            :title="isSqlBannerExpanded ? 'Collapse' : 'Expand'"
            @click="toggleSqlBanner"
          >
            {{ isSqlBannerExpanded ? 'Collapse' : 'Expand' }}
          </button>

          <!-- Clear filters button -->
          <button
            type="button"
            class="px-2 py-1 text-xs text-amber-700 hover:bg-amber-100 rounded transition-colors flex items-center gap-1"
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

    <!-- Header with actions -->
    <div v-if="approxRows && approxRows > 1000000" class="mb-3 flex items-center justify-between">
      <div class="flex items-center gap-4 text-sm text-gray-600">
        <!-- Large table warning -->
        <span class="text-xs text-blue-600 flex items-center gap-1">
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
    </div>

    <!-- Error message -->
    <div
      v-if="error"
      class="mb-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"
    >
      {{ error }}
    </div>

    <!-- AG Grid -->
    <div
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

    <!-- Custom Context Menu -->
    <ColumnContextMenu
      v-if="showContextMenu"
      :x="contextMenuX"
      :y="contextMenuY"
      :column="contextMenuColumn"
      :grid-api="gridApi"
      @close="closeContextMenu"
      @open-advanced-filter="openAdvancedFilterModal"
    />

    <!-- Advanced Filter Modal -->
    <AdvancedFilterModal
      :is-open="showAdvancedFilterModal"
      :current-where-clause="whereClause"
      @close="showAdvancedFilterModal = false"
      @apply="applyWhereFilterFromModal"
    />
  </div>
</template>

<style scoped>
.ag-theme-alpine {
  --ag-font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
  --ag-font-size: 14px;
  --ag-header-height: 40px;
  --ag-row-height: 32px;
  --ag-border-color: #e5e7eb;
  --ag-header-background-color: #f9fafb;
  --ag-odd-row-background-color: #ffffff;
  --ag-even-row-background-color: #f9fafb;
}

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

/* Add a subtle indicator for sortable columns */
:deep(.ag-header-cell.ag-header-cell-sortable:not(.ag-header-cell-sorted):hover) {
  background-color: #e8f0fe;
}

/* Show sort icons for sortable columns on hover */
:deep(.ag-header-cell.ag-header-cell-sortable:not(.ag-header-cell-sorted):hover::after) {
  content: '⇅';
  margin-left: 4px;
  color: #9ca3af;
  font-size: 12px;
}

/* Always show menu icon for all columns */
:deep(.ag-header-cell-menu-button) {
  opacity: 1 !important;
  display: inline-flex !important;
  visibility: visible !important;
  width: auto !important;
  height: auto !important;
}

:deep(.ag-header-cell:hover .ag-header-cell-menu-button) {
  opacity: 1 !important;
  background-color: rgba(0, 0, 0, 0.05);
}

/* Make sure the menu button is visible in the header */
:deep(.ag-header-cell-comp-wrapper) {
  display: flex !important;
  align-items: center !important;
}

:deep(.ag-header-cell) {
  display: flex !important;
  align-items: center !important;
}

/* Highlight columns that have active filters */
:deep(.ag-header-cell-filtered) {
  background-color: #dbeafe !important;
}

:deep(.ag-header-cell-filtered .ag-header-cell-menu-button) {
  opacity: 1;
  color: #2563eb;
}

/* SQL Syntax highlighting for inline code */
:deep(.hljs) {
  background: transparent;
  padding: 0;
  color: #24292e;
}

:deep(.hljs-keyword) {
  color: #d73a49;
  font-weight: 600;
}

:deep(.hljs-string) {
  color: #032f62;
}

:deep(.hljs-number) {
  color: #005cc5;
}

:deep(.hljs-operator) {
  color: #d73a49;
}

:deep(.hljs-built_in) {
  color: #6f42c1;
}

:deep(.hljs-literal) {
  color: #005cc5;
}
</style>
