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
import { type FileSystemEntry } from '@/api/fileSystem'
import { type FileMetadata } from '@/types/files'
import { getFileFormat } from '@/utils/fileFormat'
import filesApi from '@/api/files'
import { formatTableValue } from '@/utils/dataUtils'
import { vHighlightjs } from '@/directives/highlightjs'
import ColumnContextMenu from '../database/ColumnContextMenu.vue'
import AdvancedFilterModal from '../database/AdvancedFilterModal.vue'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])

const props = defineProps<{
  entry: FileSystemEntry
  metadata: FileMetadata | null
  connectionId: string
}>()

const gridApi = ref<GridApi | null>(null)
const error = ref<string>()
const isLoading = ref(false)
const isInitialLoading = ref(true) // Track initial load (metadata + first data)
const warnings = ref<string[]>([])
const currentSortModel = ref<SortModelItem[]>([])
const whereClause = ref<string>('')
const whereInput = ref<string>('')
const whereError = ref<string>()
const agGridFilters = ref<Record<string, unknown>>({})
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

const fileFormat = computed(() => getFileFormat(props.entry.name))

// Get row count directly from metadata (DuckDB provides accurate counts)
const totalRowCount = ref<number>(props.metadata?.rowCount ?? 0)

// Watch for metadata warnings
watch(
  () => props.metadata?.warnings,
  (newWarnings) => {
    if (newWarnings && newWarnings.length > 0) {
      warnings.value = [...newWarnings]
    }
  },
  { immediate: true }
)

// Generate column definitions from file metadata
const columnDefs = computed<ColDef[]>(() => {
  if (!props.metadata?.columns) return []

  return props.metadata.columns.map((col) => {
    // Determine filter type based on column data type
    let filterType: string | boolean = 'agTextColumnFilter'
    if (col.type) {
      const dataType = col.type.toLowerCase()
      if (
        dataType.includes('int') ||
        dataType.includes('float') ||
        dataType.includes('double') ||
        dataType.includes('decimal') ||
        dataType.includes('numeric') ||
        dataType.includes('bigint')
      ) {
        filterType = 'agNumberColumnFilter'
      } else if (dataType.includes('date') || dataType.includes('time')) {
        filterType = 'agDateColumnFilter'
      }
    }

    const tooltip = `${col.type}${col.nullable ? '' : ' NOT NULL'} - Click to sort, Ctrl+Click for multi-sort`

    return {
      field: col.name,
      headerName: col.name,
      sortable: true,
      filter: filterType,
      floatingFilter: false,
      suppressHeaderMenuButton: false,
      suppressHeaderFilterButton: true,
      resizable: true,
      flex: 1,
      minWidth: 120,
      valueFormatter: (params) => formatTableValue(params.value),
      headerTooltip: tooltip,
      wrapText: false,
      autoHeight: false
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
  totalRowCount.value = props.metadata?.rowCount ?? 0

  // Refresh data
  if (gridApi.value) {
    gridApi.value.setGridOption('datasource', createDatasource())
  }
}

// Convert AG Grid filter model to SQL WHERE clause
function convertFilterModelToSQL(filterModel: Record<string, unknown>): string {
  const whereClauses: string[] = []

  for (const [column, filter] of Object.entries(filterModel)) {
    if (!filter) continue

    const clause = buildFilterClause(column, filter as Record<string, unknown>)
    if (clause) {
      whereClauses.push(clause)
    }
  }

  return whereClauses.join(' AND ')
}

function buildFilterClause(column: string, filter: Record<string, unknown>): string | null {
  // Handle combined conditions (AND/OR)
  if (filter.operator) {
    let condition1: string | null = null
    let condition2: string | null = null

    if (filter.conditions && Array.isArray(filter.conditions)) {
      // New format: conditions array
      condition1 = filter.conditions[0]
        ? buildFilterClause(column, filter.conditions[0] as Record<string, unknown>)
        : null
      condition2 = filter.conditions[1]
        ? buildFilterClause(column, filter.conditions[1] as Record<string, unknown>)
        : null
    } else {
      // Old format: condition1 and condition2 properties
      condition1 = filter.condition1
        ? buildFilterClause(column, filter.condition1 as Record<string, unknown>)
        : null
      condition2 = filter.condition2
        ? buildFilterClause(column, filter.condition2 as Record<string, unknown>)
        : null
    }

    if (condition1 && condition2) {
      return `(${condition1} ${filter.operator} ${condition2})`
    }
    return condition1 || condition2
  }

  const filterValue = filter.filter

  // Skip if filter value is missing
  if (filterValue === undefined || filterValue === null || filterValue === '') {
    return null
  }

  // Escape single quotes in string values to prevent SQL injection
  const escapeValue = (val: unknown): string => {
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

// AG Grid options with infinite row model (matches database grid exactly)
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
  cacheBlockSize: 200, // Must match paginationPageSize for infinite row model
  cacheOverflowSize: 2,
  maxConcurrentDatasourceRequests: 2,
  infiniteInitialRowCount: 100,
  maxBlocksInCache: 20,
  multiSortKey: 'ctrl', // Use Ctrl (or Cmd on Mac) for multi-sort
  alwaysMultiSort: false, // Only multi-sort when holding Ctrl/Cmd
  suppressMenuHide: true,
  defaultColDef: {
    sortable: true,
    filter: true,
    resizable: true,
    suppressHeaderFilterButton: false,
    suppressHeaderMenuButton: false,
    wrapText: false,
    autoHeight: false
  }
}))

// Create datasource for infinite row model
function createDatasource(): IDatasource {
  return {
    getRows: async (params: IGetRowsParams) => {
      if (!fileFormat.value) {
        params.failCallback()
        return
      }

      isLoading.value = true
      error.value = undefined

      try {
        const startRow = params.startRow || 0
        const endRow = params.endRow || 200
        const limit = endRow - startRow
        const offset = startRow

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

        // Combine AG Grid filters with manual WHERE clause
        let combinedWhere = ''
        if (agGridWhereClause && whereClause.value) {
          combinedWhere = `(${agGridWhereClause}) AND (${whereClause.value})`
        } else if (agGridWhereClause) {
          combinedWhere = agGridWhereClause
        } else if (whereClause.value) {
          combinedWhere = whereClause.value
        }

        const response = await filesApi.getFileData(props.entry.path, fileFormat.value, {
          limit,
          offset,
          skipCount: offset > 0, // Skip count on subsequent pages
          order_by: orderBy,
          order_dir: orderDir,
          where: combinedWhere || undefined
        })

        // Mark initial loading as complete after first successful fetch
        if (isInitialLoading.value) {
          isInitialLoading.value = false
        }

        // Update total count if we have a real count from API
        if (response.total > 0) {
          totalRowCount.value = response.total
        }

        // Use row count from state
        const rowCount = totalRowCount.value > 0 ? totalRowCount.value : undefined

        // Convert data to row format expected by AG Grid
        const rows = response.data.map((row) => {
          const gridRow: Record<string, unknown> = {}
          Object.entries(row).forEach(([key, value]) => {
            gridRow[key] = value
          })
          return gridRow
        })

        // Merge warnings from data response with existing metadata warnings
        const dataWarnings = response.warnings || []
        const metadataWarnings = props.metadata?.warnings || []
        const allWarnings = new Set([...metadataWarnings, ...dataWarnings])
        warnings.value = Array.from(allWarnings)

        params.successCallback(rows, rowCount)
        error.value = undefined
        whereError.value = undefined
      } catch (err) {
        console.error('Error loading file data:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to load file data'

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

  // Add filter changed listener
  params.api.addEventListener('filterChanged', () => {
    // Reset total count so we get fresh count with filters
    totalRowCount.value = 0
  })

  // Add context menu listener for column headers
  setTimeout(() => {
    const gridElement = document.querySelector('.ag-root') as HTMLElement
    if (gridElement) {
      gridElement.addEventListener('contextmenu', handleContextMenu)
    }
  }, 100)

  // Set the datasource
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

  if (gridApi.value) {
    // Purge and refresh
    gridApi.value.purgeInfiniteCache()
  }
}

// Reload data when entry changes
watch(
  () => props.entry,
  () => {
    if (gridApi.value) {
      // Reset state and reload
      isInitialLoading.value = true
      gridApi.value.setGridOption('datasource', createDatasource())
    }
  },
  { deep: true }
)

// Reload when metadata SCHEMA changes (but not when only rowCount changes)
watch(
  () => props.metadata?.columns,
  (newCols, oldCols) => {
    // Only refresh if schema actually changed (not just row count update)
    const schemaChanged = JSON.stringify(newCols) !== JSON.stringify(oldCols)
    if (schemaChanged && gridApi.value && columnDefs.value.length > 0) {
      // Refresh the grid with new datasource
      gridApi.value.setGridOption('datasource', createDatasource())
    }
  },
  { deep: true }
)

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

    <!-- Error message -->
    <div
      v-if="error"
      class="mb-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"
    >
      {{ error }}
    </div>

    <!-- Warnings -->
    <div
      v-if="warnings.length > 0"
      class="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700"
    >
      <div class="font-medium mb-1">Warnings:</div>
      <ul class="list-disc list-inside">
        <li v-for="(warning, index) in warnings" :key="index">{{ warning }}</li>
      </ul>
    </div>

    <!-- AG Grid -->
    <div class="relative ag-theme-alpine" style="height: 750px; width: 100%">
      <ag-grid-vue
        class="h-full w-full"
        :columnDefs="columnDefs"
        :gridOptions="gridOptions"
        @grid-ready="onGridReady"
      ></ag-grid-vue>

      <!-- Loading overlay -->
      <div
        v-if="isInitialLoading"
        class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10"
      >
        <div class="flex flex-col items-center gap-3">
          <svg
            class="animate-spin h-8 w-8 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
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
          <span class="text-sm text-gray-600">Loading file data...</span>
        </div>
      </div>
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
