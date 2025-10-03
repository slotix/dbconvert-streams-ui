<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import type { GridApi, GridReadyEvent, ColDef, GridOptions } from 'ag-grid-community'
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
}>()

const gridApi = ref<GridApi | null>(null)
const error = ref<string>()
const totalRowCount = ref<number>(0)
const isLoading = ref(false)
const rowData = ref<Array<Record<string, unknown>>>([])

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

// AG Grid options
const gridOptions = computed<GridOptions>(() => ({
  theme: 'legacy',
  rowModelType: 'clientSide', // Changed to client-side for better UX
  rowHeight: 32,
  headerHeight: 40,
  suppressCellFocus: true,
  animateRows: false,
  enableCellTextSelection: true,
  ensureDomOrder: true,
  domLayout: 'normal',
  pagination: true,
  paginationPageSize: 100,
  paginationPageSizeSelector: [50, 100, 200, 500]
}))

// Load data function for client-side model
async function loadData() {
  isLoading.value = true
  error.value = undefined

  try {
    const objectName = getObjectName(props.tableMeta)
    const objectSchema = getObjectSchema(props.tableMeta)

    if (!objectName) throw new Error('Table/View name is undefined')

    // Load a reasonable amount of data for client-side model
    const estimatedRows = props.isView
      ? 1000 // Default for views
      : 1000 // Default for tables
    const limit = Math.min(estimatedRows, 5000) // Cap at 5000 rows
    const queryParams = {
      limit,
      offset: 0,
      skip_count: false,
      ...(objectSchema && objectSchema !== 'public' && objectSchema !== ''
        ? { schema: objectSchema }
        : {})
    }

    const data = props.isView
      ? await connections.getViewData(props.connectionId, props.database, objectName, queryParams)
      : await connections.getTableData(props.connectionId, props.database, objectName, queryParams)

    // Convert rows array to objects with column names as keys
    const convertedRowData = data.rows.map((row) => {
      const obj: Record<string, unknown> = {}
      data.columns.forEach((colName, idx) => {
        obj[colName] = row[idx]
      })
      return obj
    })

    rowData.value = convertedRowData
    totalRowCount.value = data.total_count
  } catch (err) {
    console.error('Error loading data:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load data'
    rowData.value = []
    totalRowCount.value = 0
  } finally {
    isLoading.value = false
  }
}

// Grid ready handler
function onGridReady(params: GridReadyEvent) {
  gridApi.value = params.api
  loadData()
}

// Reload data when table metadata changes
watch(
  () => props.tableMeta,
  () => {
    if (gridApi.value) {
      loadData()
    }
  },
  { deep: true }
)

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
        <span v-if="rowData.length > 0" class="font-medium">
          {{ rowData.length.toLocaleString() }} rows
          <span v-if="rowData.length < totalRowCount" class="text-gray-500">
            (of {{ totalRowCount.toLocaleString() }} total)
          </span>
        </span>
      </div>

      <div class="flex items-center gap-2">
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
        height: '500px'
      }"
    >
      <AgGridVue
        :rowData="rowData"
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
