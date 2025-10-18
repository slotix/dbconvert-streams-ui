<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import type { GridApi, GridReadyEvent, ColDef, GridOptions } from 'ag-grid-community'
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
const totalRowCount = computed(() => props.metadata?.rowCount || 0)
const isLoading = ref(false)
const rowData = ref<Array<Record<string, unknown>>>([])
const warnings = ref<string[]>([])

const fileFormat = computed(() => getFileFormat(props.entry.name))

// Generate column definitions from file metadata
const columnDefs = computed<ColDef[]>(() => {
  if (!props.metadata?.columns) return []

  return props.metadata.columns.map((col) => ({
    field: col.name,
    headerName: col.name,
    sortable: false,
    filter: false,
    resizable: true,
    flex: 1,
    minWidth: 120,
    valueFormatter: (params) => formatTableValue(params.value),
    headerTooltip: col.type,
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
  if (!fileFormat.value) {
    error.value = 'Unknown file format'
    return
  }

  isLoading.value = true
  error.value = undefined

  try {
    // Load a reasonable amount of data for client-side model
    const limit = Math.min(totalRowCount.value || 1000, 5000) // Cap at 5000 rows
    const response = await filesApi.getFileData(props.entry.path, fileFormat.value, {
      limit,
      offset: 0,
      skipCount: false
    })

    rowData.value = response.data
    warnings.value = response.warnings || []
  } catch (err) {
    console.error('Error loading file data:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load file data'
    rowData.value = []
    warnings.value = []
  } finally {
    isLoading.value = false
  }
}

// Grid ready handler
function onGridReady(params: GridReadyEvent) {
  gridApi.value = params.api
  loadData()
}

// Reload data when entry changes
watch(
  () => props.entry,
  () => {
    if (gridApi.value) {
      loadData()
    }
  },
  { deep: true }
)

// Reload when metadata changes (column info)
watch(
  () => props.metadata,
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
      fileName: `${props.entry.name}.csv`,
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
        <span v-if="metadata?.size" class="text-gray-500">
          {{ (metadata.size / 1024 / 1024).toFixed(2) }} MB
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

    <!-- Warning messages for corrupted files -->
    <div
      v-if="warnings.length > 0"
      class="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800"
    >
      <div class="flex items-start gap-2">
        <svg
          class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div class="flex-1">
          <div class="font-semibold mb-1">File Corrupted</div>
          <ul class="list-disc list-inside space-y-1">
            <li v-for="(warning, index) in warnings" :key="index">{{ warning }}</li>
          </ul>
          <div class="mt-2 text-xs text-amber-700">
            The displayed data may be incomplete. Check the System Logs for more details.
          </div>
        </div>
      </div>
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
