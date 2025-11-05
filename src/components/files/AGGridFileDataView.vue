<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import type {
  GridReadyEvent,
  ColDef,
  GridOptions,
  IDatasource,
  IGetRowsParams
} from 'ag-grid-community'
import { type FileSystemEntry } from '@/api/fileSystem'
import { type FileMetadata } from '@/types/files'
import { getFileFormat } from '@/utils/fileFormat'
import filesApi from '@/api/files'
import { formatTableValue } from '@/utils/dataUtils'
import { vHighlightjs } from '@/directives/highlightjs'
import ColumnContextMenu from '../database/ColumnContextMenu.vue'
import UnsupportedFileMessage from './UnsupportedFileMessage.vue'
import { useAGGridFiltering } from '@/composables/useAGGridFiltering'
import { convertFilterModelToSQL, determineFilterType } from '@/utils/agGridFilterUtils'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import '@/styles/agGridTheme.css'

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])

const props = defineProps<{
  entry: FileSystemEntry
  metadata: FileMetadata | null
  connectionId: string
}>()

// Use shared AG Grid filtering composable
const {
  gridApi,
  currentSortModel,
  agGridFilters,
  agGridWhereSQL,
  showContextMenu,
  contextMenuX,
  contextMenuY,
  contextMenuColumn,
  isSqlBannerExpanded,
  fullSqlQuery,
  needsTruncation,
  displayedSql,
  toggleSqlBanner,
  closeContextMenu
} = useAGGridFiltering()

// Component-specific state
const error = ref<string>()
const isLoading = ref(false)
const isInitialLoading = ref(true) // Track initial load (metadata + first data)
const warnings = ref<string[]>([])

const fileFormat = computed(() => getFileFormat(props.entry.name))

// Check if file format is supported
const isUnsupportedFile = computed(() => fileFormat.value === null)

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
    const filterType = determineFilterType(col.type)

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

// Clear all filters
function clearAllFilters() {
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

        // Use AG Grid filters only (no manual WHERE clause)
        const combinedWhere = agGridWhereClause

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
      } catch (err) {
        console.error('Error loading file data:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to load file data'
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

  // Don't set up grid for unsupported files
  if (isUnsupportedFile.value) {
    isInitialLoading.value = false
    return
  }

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
  getGridState,
  applyGridState
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
    <!-- Unsupported file type message -->
    <UnsupportedFileMessage
      v-if="isUnsupportedFile"
      :file-name="entry.name"
      variant="data"
      class="h-full"
    />

    <!-- SQL Query Banner (like DataGrip) -->
    <div
      v-if="!isUnsupportedFile && fullSqlQuery"
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
        <div class="flex items-center gap-1 shrink-0">
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
      v-if="!isUnsupportedFile && error"
      class="mb-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"
    >
      {{ error }}
    </div>

    <!-- Warnings -->
    <div
      v-if="!isUnsupportedFile && warnings.length > 0"
      class="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700"
    >
      <div class="font-medium mb-1">Warnings:</div>
      <ul class="list-disc list-inside">
        <li v-for="(warning, index) in warnings" :key="index">{{ warning }}</li>
      </ul>
    </div>

    <!-- AG Grid -->
    <div
      v-if="!isUnsupportedFile"
      class="relative ag-theme-alpine"
      style="height: 750px; width: 100%"
    >
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
      v-if="!isUnsupportedFile && showContextMenu"
      :x="contextMenuX"
      :y="contextMenuY"
      :column="contextMenuColumn"
      :grid-api="gridApi"
      @close="closeContextMenu"
    />
  </div>
</template>

<style scoped>
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
