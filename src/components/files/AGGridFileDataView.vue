<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import type { ColDef } from 'ag-grid-community'
import { type FileSystemEntry } from '@/api/fileSystem'
import { type FileMetadata } from '@/types/files'
import { getFileFormat } from '@/utils/fileFormat'
import filesApi from '@/api/files'
import { formatTableValue } from '@/utils/dataUtils'
import ColumnContextMenu from '../database/ColumnContextMenu.vue'
import UnsupportedFileMessage from './UnsupportedFileMessage.vue'
import { MonacoEditor } from '@/components/monaco'
import { determineFilterType } from '@/utils/agGridFilterUtils'
import {
  useBaseAGGridView,
  type FetchDataParams,
  type FetchDataResult
} from '@/composables/useBaseAGGridView'
import { useObjectTabStateStore } from '@/stores/objectTabState'

const props = defineProps<{
  entry: FileSystemEntry
  metadata: FileMetadata | null
  connectionId: string
  objectKey: string
}>()

const tabStateStore = useObjectTabStateStore()

// Component-specific state
const isInitialLoading = ref(true)
const warnings = ref<string[]>([])

const fileFormat = computed(() => props.entry.format || getFileFormat(props.entry.name))

// Check if file format is supported
const isUnsupportedFile = computed(() => fileFormat.value === null)

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

// Data fetching callback for base composable
async function fetchData(params: FetchDataParams): Promise<FetchDataResult> {
  if (!fileFormat.value) {
    throw new Error('Unsupported file format')
  }

  // Build comma-separated order_by and order_dir for multi-column sorting
  let orderBy: string | undefined
  let orderDir: string | undefined

  if (params.sortModel.length > 0) {
    orderBy = params.sortModel.map((s) => s.colId).join(',')
    orderDir = params.sortModel.map((s) => s.sort?.toUpperCase() || 'ASC').join(',')
  }

  const response = await filesApi.getFileData(props.entry.path, fileFormat.value, {
    limit: params.limit,
    offset: params.offset,
    skipCount: params.offset > 0, // Skip count on subsequent pages
    order_by: orderBy,
    order_dir: orderDir,
    where: params.whereClause || undefined
  })

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

  // Mark initial loading as complete on first successful fetch
  if (isInitialLoading.value) {
    isInitialLoading.value = false
  }

  return {
    rows,
    columns: response.schema.map((field) => field.name),
    totalCount: response.total
  }
}

// Initialize base AG Grid composable
const baseGrid = useBaseAGGridView({
  objectKey: computed(() => props.objectKey),
  connectionType: computed(() => 'duckdb'),
  initialTotalRowCount: computed(() => props.metadata?.rowCount ?? 0),
  fetchData,
  onGridReady: () => {
    // Don't set up grid for unsupported files
    if (isUnsupportedFile.value) {
      isInitialLoading.value = false
    }
  }
})

// Sync grid state from store on mount
function syncGridStateFromStore() {
  const savedState = tabStateStore.getAGGridDataState(props.objectKey)

  if (savedState) {
    baseGrid.currentSortModel.value = savedState.sortModel || []
    baseGrid.agGridFilters.value = savedState.filterModel || {}
  } else {
    baseGrid.currentSortModel.value = []
    baseGrid.agGridFilters.value = {}
  }

  return savedState
}

onMounted(() => {
  syncGridStateFromStore()
})

// Watch for objectKey changes (tab switches)
watch(
  () => props.objectKey,
  () => {
    const savedState = syncGridStateFromStore()

    if (!baseGrid.gridApi.value) return

    if (savedState) {
      baseGrid.applyGridState({
        sortModel: savedState.sortModel,
        filterModel: savedState.filterModel
      })
    } else {
      baseGrid.gridApi.value.applyColumnState({
        defaultState: { sort: null }
      })
      baseGrid.gridApi.value.setFilterModel(null)
    }

    baseGrid.gridApi.value.setGridOption('datasource', baseGrid.createDatasource())
  }
)

// Reload data when entry changes
watch(
  () => props.entry,
  () => {
    if (baseGrid.gridApi.value) {
      // Reset state and reload
      isInitialLoading.value = true
      baseGrid.gridApi.value.setGridOption('datasource', baseGrid.createDatasource())
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
    if (schemaChanged && baseGrid.gridApi.value && columnDefs.value.length > 0) {
      // Refresh the grid with new datasource
      baseGrid.gridApi.value.setGridOption('datasource', baseGrid.createDatasource())
    }
  },
  { deep: true }
)

// Expose methods to parent
defineExpose({
  getGridState: baseGrid.getGridState,
  applyGridState: baseGrid.applyGridState
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
      v-if="!isUnsupportedFile && baseGrid.fullSqlQuery.value"
      class="mb-3 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden"
    >
      <div class="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900/40">
        <!-- SQL Content with Syntax Highlighting -->
        <div class="flex-1 min-w-0">
          <MonacoEditor
            :model-value="baseGrid.displayedSql.value"
            language="sql"
            :height="baseGrid.sqlBannerHeight.value"
            :read-only="true"
            :options="baseGrid.sqlBannerEditorOptions.value"
          />
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-1 shrink-0">
          <!-- Expand/Collapse button (only show if truncation is needed) -->
          <button
            v-if="baseGrid.needsTruncation.value"
            type="button"
            class="px-2 py-1 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            :title="baseGrid.isSqlBannerExpanded.value ? 'Collapse' : 'Expand'"
            @click="baseGrid.toggleSqlBanner"
          >
            {{ baseGrid.isSqlBannerExpanded.value ? 'Collapse' : 'Expand' }}
          </button>

          <!-- Clear filters button -->
          <button
            type="button"
            class="px-2 py-1 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors flex items-center gap-1"
            title="Clear all filters and sorting"
            @click="baseGrid.clearAllFilters"
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

    <!-- Warnings (only show when there's no error) -->
    <div
      v-if="!isUnsupportedFile && !baseGrid.error.value && warnings.length > 0"
      class="mb-3 p-3 bg-yellow-50 dark:bg-amber-900 border border-yellow-200 dark:border-amber-700 rounded-md text-sm text-yellow-700 dark:text-amber-300"
    >
      <div class="font-medium mb-1">Warnings:</div>
      <ul class="list-disc list-inside">
        <li v-for="(warning, index) in warnings" :key="index">{{ warning }}</li>
      </ul>
    </div>

    <!-- Error State Placeholder -->
    <div
      v-if="!isUnsupportedFile && baseGrid.error.value"
      class="flex items-center justify-center py-12 bg-gray-50 dark:bg-gray-900/40 rounded-md border border-gray-200 dark:border-gray-700"
    >
      <div class="text-center p-8 max-w-md">
        <svg
          class="mx-auto h-12 w-12 text-red-400 dark:text-red-500 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Failed to Load File
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {{ baseGrid.error.value }}
        </p>
        <div
          class="text-xs text-gray-500 dark:text-gray-500 bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700"
        >
          <p class="font-semibold mb-1">Common causes:</p>
          <ul class="list-disc list-inside text-left space-y-1">
            <li>File was deleted or moved after being listed</li>
            <li>File permissions changed</li>
            <li>File is corrupted or inaccessible</li>
            <li>Network or disk I/O error</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- AG Grid (only show when no error) -->
    <div
      v-if="!isUnsupportedFile && !baseGrid.error.value"
      :ref="(el) => (baseGrid.gridContainerRef.value = el as HTMLElement)"
      class="relative ag-theme-alpine"
      style="height: 750px; width: 100%"
    >
      <ag-grid-vue
        class="h-full w-full"
        :columnDefs="columnDefs"
        :gridOptions="baseGrid.gridOptions.value"
        @grid-ready="baseGrid.onGridReady"
      ></ag-grid-vue>

      <!-- Loading overlay -->
      <div
        v-if="isInitialLoading"
        class="absolute inset-0 bg-white dark:bg-gray-850 bg-opacity-75 dark:bg-opacity-90 flex items-center justify-center z-10"
      >
        <div class="flex flex-col items-center gap-3">
          <svg
            class="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400"
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
          <span class="text-sm text-gray-600 dark:text-gray-300">Loading file data...</span>
        </div>
      </div>
    </div>

    <!-- Custom Context Menu -->
    <ColumnContextMenu
      v-if="!isUnsupportedFile && baseGrid.showContextMenu.value"
      :x="baseGrid.contextMenuX.value"
      :y="baseGrid.contextMenuY.value"
      :column="baseGrid.contextMenuColumn.value"
      :grid-api="baseGrid.gridApi.value"
      @close="baseGrid.closeContextMenu"
    />
  </div>
</template>

<style scoped>
/* Component-specific styles only */
</style>
