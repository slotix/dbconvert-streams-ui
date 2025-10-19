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
const totalRowCount = ref<number>(0)
const isLoading = ref(false)
const isInitialLoading = ref(true) // Track initial load (metadata + first data)
const warnings = ref<string[]>([])

// Exact row count state
const isCountingRows = ref(false)
const exactRowCount = ref<number | null>(null)
const countError = ref<string | null>(null)

const fileFormat = computed(() => getFileFormat(props.entry.name))

// Watch for metadata changes and update totalRowCount and warnings
watch(
  () => props.metadata,
  (newMetadata) => {
    if (newMetadata && newMetadata.rowCount && newMetadata.rowCount > 0) {
      totalRowCount.value = newMetadata.rowCount
    } else if (newMetadata && newMetadata.rowCount === -1) {
      totalRowCount.value = -1
    }

    // Update warnings from metadata
    if (newMetadata?.warnings && newMetadata.warnings.length > 0) {
      warnings.value = [...newMetadata.warnings]
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

        // Handle row count
        let rowCount: number | undefined

        if (response.total === -1) {
          // Unknown count - use metadata estimate if available
          if (totalRowCount.value > 0) {
            rowCount = totalRowCount.value
          } else {
            rowCount = undefined // Infinite scroll
          }
        } else if (response.total !== undefined && response.total >= 0) {
          // Exact or partial count from response
          totalRowCount.value = response.total
          rowCount = response.total
        }

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
      exactRowCount.value = null
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

// Calculate exact row count for files (on-demand, similar to database COUNT(*))
async function calculateExactCount() {
  if (!fileFormat.value) {
    countError.value = 'Unknown file format'
    return
  }

  isCountingRows.value = true
  countError.value = null

  try {
    const result = await filesApi.getFileExactCount(props.entry.path, fileFormat.value)

    // Set the exact count
    exactRowCount.value = result.count
    totalRowCount.value = result.count

    // Update AG Grid's row count
    if (gridApi.value) {
      gridApi.value.setGridOption('datasource', createDatasource())
    }
  } catch (err) {
    console.error('Error calculating exact count:', err)
    countError.value = err instanceof Error ? err.message : 'Failed to calculate count'
  } finally {
    isCountingRows.value = false
  }
}

// Check if count is approximate
const isApproximateCount = computed(() => {
  return exactRowCount.value === null && totalRowCount.value > 0
})

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

    <!-- Bottom status bar (matches database approach) -->
    <div class="mt-3 flex items-center justify-between text-sm text-gray-600">
      <div class="flex items-center gap-3">
        <!-- Approximate count indicator -->
        <span v-if="isApproximateCount" class="text-xs text-gray-500 flex items-center gap-1">
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clip-rule="evenodd"
            />
          </svg>
          <span>Count (~{{ totalRowCount.toLocaleString() }}) is approximate</span>
        </span>

        <!-- Count error display -->
        <span v-if="countError" class="flex items-center gap-1.5 text-red-600">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
          </svg>
          {{ countError }}
        </span>
      </div>

      <!-- Calculate Exact Count button (matches database approach) -->
      <button
        v-if="exactRowCount === null && totalRowCount > 0"
        type="button"
        :disabled="isCountingRows"
        @click="calculateExactCount"
        class="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        title="Count all rows in file to get exact total"
      >
        <svg v-if="isCountingRows" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
        <span>{{ isCountingRows ? 'Counting...' : 'Calculate Exact Count' }}</span>
      </button>
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
