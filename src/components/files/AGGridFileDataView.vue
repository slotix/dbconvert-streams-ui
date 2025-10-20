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
import { type FileSystemEntry } from '@/api/fileSystem'
import { type FileMetadata } from '@/types/files'
import { getFileFormat } from '@/utils/fileFormat'
import filesApi from '@/api/files'
import { formatTableValue } from '@/utils/dataUtils'
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

const fileFormat = computed(() => getFileFormat(props.entry.name))

// Get row count directly from metadata (DuckDB provides accurate counts)
const totalRowCount = computed(() => props.metadata?.rowCount ?? 0)

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

  return props.metadata.columns.map((col) => ({
    field: col.name,
    headerName: col.name,
    flex: 1,
    minWidth: 120,
    valueFormatter: (params) => formatTableValue(params.value),
    headerTooltip: col.type
  }))
})

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
  suppressMenuHide: true,
  defaultColDef: {
    sortable: false,
    filter: false,
    resizable: true,
    suppressHeaderFilterButton: false,
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

        // console.log(`Fetching rows ${startRow} to ${endRow} (limit: ${limit})`)

        const response = await filesApi.getFileData(props.entry.path, fileFormat.value, {
          limit,
          offset: startRow,
          skipCount: true // Always skip count for performance
        })

        // Mark initial loading as complete after first successful fetch
        if (isInitialLoading.value) {
          isInitialLoading.value = false
        }

        // Use row count from metadata (DuckDB provides accurate counts)
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
      } catch (err) {
        console.error('Error loading file data:', err)
        error.value = err instanceof Error ? err.message : 'Failed to load file data'
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

  // Set the datasource
  params.api.setGridOption('datasource', createDatasource())
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
  if (gridApi.value) {
    gridApi.value.destroy()
  }
})
</script>

<template>
  <div class="flex flex-col h-full">
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
        :columnDefs="columnDefs"
        :gridOptions="gridOptions"
        @grid-ready="onGridReady"
        class="h-full w-full"
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
</style>
