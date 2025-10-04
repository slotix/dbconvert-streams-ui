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
  IGetRowsParams
} from 'ag-grid-community'
import { type SQLTableMeta, type SQLViewMeta } from '@/types/metadata'
import connections from '@/api/connections'
import { formatTableValue } from '@/utils/dataUtils'
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

  return meta.columns.map((col) => ({
    field: col.name,
    headerName: col.name,
    sortable: false, // Server-side sorting can be added later
    filter: false, // Server-side filtering can be added later
    resizable: true,
    flex: 1,
    minWidth: 120,
    valueFormatter: (params) => formatTableValue(params.value),
    headerTooltip: `${col.dataType}${col.isNullable ? '' : ' NOT NULL'}`,
    wrapText: false,
    autoHeight: false
  }))
})

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
  maxBlocksInCache: 20 // Keep more blocks in cache (4000 rows)
}))

// Create datasource for Infinite Row Model
function createDatasource(): IDatasource {
  return {
    getRows: async (params: IGetRowsParams) => {
      // console.log('getRows called:', { startRow: params.startRow, endRow: params.endRow })
      isLoading.value = true
      error.value = undefined

      try {
        const objectName = getObjectName(props.tableMeta)
        const objectSchema = getObjectSchema(props.tableMeta)

        if (!objectName) throw new Error('Table/View name is undefined')

        const limit = params.endRow - params.startRow
        const offset = params.startRow

        const queryParams = {
          limit,
          offset,
          skip_count: offset > 0 && totalRowCount.value > 0, // Skip count if we already have it
          ...(objectSchema && objectSchema !== 'public' && objectSchema !== ''
            ? { schema: objectSchema }
            : {})
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
        if (offset === 0 && data.total_count > 0) {
          totalRowCount.value = data.total_count
        }

        // For small tables where we don't have a count, if this is the first block
        // and we got fewer rows than requested, we know the total
        if (offset === 0 && totalRowCount.value === 0 && convertedRowData.length < limit) {
          totalRowCount.value = convertedRowData.length
        }

        // Use totalRowCount for grid (either from API or approxRows prop)
        const rowCount = totalRowCount.value > 0 ? totalRowCount.value : undefined
        // console.log('successCallback:', { rows: convertedRowData.length, rowCount })
        params.successCallback(convertedRowData, rowCount)

        // Update visible rows immediately after data loads
        setTimeout(() => updateVisibleRows(), 100)

        error.value = undefined
      } catch (err) {
        console.error('Error loading data:', err)
        error.value = err instanceof Error ? err.message : 'Failed to load data'
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

  // Set datasource for infinite row model
  params.api.setGridOption('datasource', createDatasource())
}

// Reload data when table metadata changes
watch(
  () => props.tableMeta,
  () => {
    if (gridApi.value) {
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

// Jump to top functionality
function jumpToTop() {
  if (gridApi.value) {
    gridApi.value.ensureIndexVisible(0, 'top')
  }
}

// Export to CSV functionality
function exportToCsv() {
  if (gridApi.value) {
    gridApi.value.exportDataAsCsv({
      fileName: `${getObjectName(props.tableMeta)}.csv`,
      allColumns: true
    })
  }
}

// Cleanup
onBeforeUnmount(() => {
  if (gridApi.value) {
    gridApi.value.destroy()
  }
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header with stats and actions -->
    <div class="mb-3 flex items-center justify-between">
      <div class="flex items-center gap-4 text-sm text-gray-600">
        <span v-if="isLoading" class="flex items-center gap-2">
          <svg
            class="animate-spin h-4 w-4"
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
          Loading...
        </span>
        <!-- Position indicator -->
        <span class="font-medium text-gray-900">
          Showing {{ currentFirstRow.toLocaleString() }}-{{ currentLastRow.toLocaleString() }}
          <span v-if="totalRowCount > 0"
            >of {{ totalRowCount.toLocaleString() }} rows
            <span v-if="approxRows" class="text-xs text-amber-600">(approx)</span></span
          >
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="currentFirstRow > 1"
          type="button"
          class="px-3 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
          title="Jump to first row"
          @click="jumpToTop"
        >
          ↑ Back to Top
        </button>
        <button
          type="button"
          class="px-3 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
          :disabled="!gridApi"
          @click="exportToCsv"
        >
          Export CSV
        </button>
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
</style>
