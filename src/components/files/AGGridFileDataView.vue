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
import DataFilterPanel from '../database/DataFilterPanel.vue'
import UnsupportedFileMessage from './UnsupportedFileMessage.vue'
import {
  useBaseAGGridView,
  type FetchDataParams,
  type FetchDataResult
} from '@/composables/useBaseAGGridView'
import { useObjectTabStateStore } from '@/stores/objectTabState'
import { useCopyToClipboard } from '@/composables/useCopyToClipboard'
import { formatRowsForClipboard, type CopyFormat } from '@/utils/agGridClipboard'
import { useToast } from 'vue-toastification'
import SelectionContextMenu from '@/components/common/SelectionContextMenu.vue'

const props = defineProps<{
  entry: FileSystemEntry
  metadata: FileMetadata | null
  connectionId: string
  objectKey: string
}>()

const tabStateStore = useObjectTabStateStore()

const toast = useToast()
const { copy: copyToClipboard } = useCopyToClipboard()

const selectionMenuOpen = ref(false)
const selectionMenuX = ref(0)
const selectionMenuY = ref(0)

// Component-specific state
const isInitialLoading = ref(true)
const isRefreshing = ref(false)
const warnings = ref<string[]>([])
// Columns derived from data response when metadata is not yet available
const derivedColumns = ref<Array<{ name: string; type: string }>>([])
// Flag to force S3 cache invalidation on next fetch (set by refresh button)
const forceRefresh = ref(false)

const fileFormat = computed(() => props.entry.format || getFileFormat(props.entry.name))

// Check if file format is supported
const isUnsupportedFile = computed(() => fileFormat.value === null)

const allColumnNames = computed(() => {
  const cols = props.metadata?.columns || derivedColumns.value
  if (!cols || cols.length === 0) return []
  return cols.map((c) => c.name)
})

const canCopySelection = computed(() => baseGrid.selectedRowCount.value > 0)

function openSelectionMenu(event: unknown) {
  const nativeEvent = (event as { event?: MouseEvent }).event
  if (!nativeEvent) return
  nativeEvent.preventDefault()
  nativeEvent.stopPropagation()

  selectionMenuX.value = nativeEvent.clientX
  selectionMenuY.value = nativeEvent.clientY
  selectionMenuOpen.value = true
}

function selectAllOnCurrentPage() {
  const api = baseGrid.gridApi.value
  if (!api) return

  const pageSize = api.paginationGetPageSize()
  const currentPage = api.paginationGetCurrentPage()
  const startRow = currentPage * pageSize
  const endRow = startRow + pageSize

  for (let i = startRow; i < endRow; i++) {
    const node = api.getDisplayedRowAtIndex(i)
    if (node) node.setSelected(true)
  }
}

function deselectAll() {
  baseGrid.gridApi.value?.deselectAll()
}

async function copySelectedRows(format: CopyFormat) {
  const api = baseGrid.gridApi.value
  if (!api) return

  if (baseGrid.selectedRowCount.value === 0) {
    toast.info('Select one or more rows to copy')
    return
  }

  const columns = allColumnNames.value

  const text = formatRowsForClipboard({
    rows: baseGrid.selectedRows.value,
    columns,
    format
  })

  const ok = await copyToClipboard(text)
  if (!ok) {
    toast.error('Failed to copy to clipboard')
    return
  }

  toast.success('Copied')
}

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

// Generate column definitions from file metadata or derived columns from data response
// Note: sortable and filter are disabled - Query Filter Panel is the single source of truth
const columnDefs = computed<ColDef[]>(() => {
  // Don't show columns until initial data is loaded - prevents empty grid flash
  if (isInitialLoading.value) return []

  // Prefer metadata columns if available, otherwise use columns derived from data response
  const columns = props.metadata?.columns || derivedColumns.value
  if (!columns || columns.length === 0) return []

  return columns.map((col) => {
    const colType = col.type || 'unknown'
    const colNullable = 'nullable' in col ? col.nullable : true
    return {
      field: col.name,
      headerName: col.name,
      // Disable AG-Grid native sorting/filtering - Query Filter Panel is the single source of truth
      sortable: false,
      filter: false,
      floatingFilter: false,
      suppressHeaderMenuButton: false,
      suppressHeaderFilterButton: true,
      resizable: true,
      flex: 1,
      minWidth: 120,
      valueFormatter: (params) => formatTableValue(params.value),
      headerTooltip: `${colType}${colNullable ? '' : ' NOT NULL'} - Use Query Filter panel to sort/filter`,
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

  // Check if we should force refresh (invalidate S3 cache)
  // Only apply on first page request to trigger cache invalidation once
  const shouldRefresh = forceRefresh.value && params.offset === 0
  if (shouldRefresh) {
    forceRefresh.value = false // Reset after using
  }

  // Skip COUNT(*) only on pagination (offset > 0) since we already have the count
  // For first page (offset === 0) or refresh, always get count - data is cached locally so it's fast
  const skipCount = params.offset > 0

  const response = await filesApi.getFileData(
    props.entry.path,
    fileFormat.value,
    {
      limit: params.limit,
      offset: params.offset,
      skipCount,
      order_by: orderBy,
      order_dir: orderDir,
      where: params.whereClause || undefined,
      max_rows: params.maxRows,
      refresh: shouldRefresh
    },
    props.connectionId
  )

  // Convert data to row format expected by AG Grid
  const rows = response.data.map((row) => {
    const gridRow: Record<string, unknown> = {}
    Object.entries(row).forEach(([key, value]) => {
      gridRow[key] = value
    })
    return gridRow
  })

  // If we don't have metadata columns yet, derive them from the data response schema
  // This allows the grid to display data immediately while metadata loads in background
  if (!props.metadata?.columns && response.schema && response.schema.length > 0) {
    derivedColumns.value = response.schema.map((field) => ({
      name: field.name,
      type: field.type || 'unknown'
    }))
  }

  // Merge warnings from data response with existing metadata warnings
  const dataWarnings = response.warnings || []
  const metadataWarnings = props.metadata?.warnings || []
  const allWarnings = new Set([...metadataWarnings, ...dataWarnings])
  warnings.value = Array.from(allWarnings)

  // Mark loading as complete on successful fetch
  if (isInitialLoading.value) {
    isInitialLoading.value = false
  }
  if (isRefreshing.value) {
    isRefreshing.value = false
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
    // Restore panel filters from saved state
    if (savedState.panelWhereSQL || (savedState.sortModel && savedState.sortModel.length > 0)) {
      baseGrid.setPanelFilters(savedState.panelWhereSQL || '', savedState.sortModel || [])
    }
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
        whereClause: savedState.panelWhereSQL
      })
    }

    baseGrid.gridApi.value.setGridOption('datasource', baseGrid.createDatasource())
  }
)

// Reload data when entry changes
watch(
  () => props.entry,
  () => {
    if (baseGrid.gridApi.value) {
      // Reset derived columns and reload - don't reset isInitialLoading
      // as it would clear columnDefs causing empty grid
      derivedColumns.value = []
      baseGrid.gridApi.value.setGridOption('datasource', baseGrid.createDatasource())
    }
  },
  { deep: true }
)

// Reload when metadata SCHEMA changes (but not when only rowCount changes)
// Skip if we already have derived columns from the first data fetch
watch(
  () => props.metadata?.columns,
  (newCols, oldCols) => {
    // Skip if we already derived columns from data response - no need to refetch
    if (derivedColumns.value.length > 0) {
      return
    }
    // Only refresh if schema actually changed (not just row count update)
    const schemaChanged = JSON.stringify(newCols) !== JSON.stringify(oldCols)
    if (schemaChanged && baseGrid.gridApi.value && columnDefs.value.length > 0) {
      // Refresh the grid with new datasource
      baseGrid.gridApi.value.setGridOption('datasource', baseGrid.createDatasource())
    }
  },
  { deep: true }
)

// Reference to filter panel
const filterPanelRef = ref<InstanceType<typeof DataFilterPanel> | null>(null)

// Handle filter panel apply - applies custom WHERE/ORDER BY/LIMIT from the panel
function onFilterPanelApply(payload: {
  where: string
  orderBy: string
  orderDir: string
  limit?: number
}) {
  // Build sort model from payload
  let sortModel: { colId: string; sort: 'asc' | 'desc' }[] = []
  if (payload.orderBy) {
    const columns = payload.orderBy.split(',')
    const directions = payload.orderDir.split(',')
    sortModel = columns.map((col, i) => ({
      colId: col.trim(),
      sort: (directions[i]?.toLowerCase() || 'asc') as 'asc' | 'desc'
    }))
  }

  // Set panel filters - this is the single source of truth
  baseGrid.setPanelFilters(payload.where, sortModel, payload.limit)

  // Refresh the datasource to fetch data with new filters
  if (baseGrid.gridApi.value) {
    baseGrid.gridApi.value.setGridOption('datasource', baseGrid.createDatasource())
  }
}

// Pending column visibility (applied when grid is ready)
const pendingColumnVisibility = ref<string[] | null>(null)

// Handle column visibility changes from filter panel
function onColumnsChange(visibleColumns: string[]) {
  // Store for later if grid not ready
  pendingColumnVisibility.value = visibleColumns

  if (!baseGrid.gridApi.value) return

  applyColumnVisibility(visibleColumns)
}

// Apply column visibility to the grid
function applyColumnVisibility(visibleColumns: string[]) {
  if (!baseGrid.gridApi.value) return

  // If empty array or all columns selected, show all
  const showAll = visibleColumns.length === 0 || visibleColumns.length === columnDefs.value.length

  // Update column visibility
  columnDefs.value.forEach((col) => {
    const colId = col.field
    if (colId) {
      const isVisible = showAll || visibleColumns.includes(colId)
      baseGrid.gridApi.value?.setColumnsVisible([colId], isVisible)
    }
  })
}

// Watch for grid API to become ready and apply pending visibility
watch(
  () => baseGrid.gridApi.value,
  (api) => {
    if (api && pendingColumnVisibility.value) {
      applyColumnVisibility(pendingColumnVisibility.value)
    }
    // Restore column state (pinned, width, order) when grid is ready
    if (api) {
      const savedState = tabStateStore.getAGGridDataState(props.objectKey)
      if (savedState?.columnState) {
        api.applyColumnState({ state: savedState.columnState, applyOrder: true })
      }
    }
  }
)

// Save column state when it changes (pin, resize, reorder)
function saveColumnState() {
  if (!baseGrid.gridApi.value) return
  const columnState = baseGrid.gridApi.value.getColumnState()
  tabStateStore.setAGGridDataState(props.objectKey, { columnState })
}

// Custom refresh that invalidates S3 cache for fresh data
function refreshWithCacheInvalidation() {
  forceRefresh.value = true
  isRefreshing.value = true
  baseGrid.refresh()
}

// Expose methods to parent
defineExpose({
  refresh: refreshWithCacheInvalidation,
  getGridState: baseGrid.getGridState,
  applyGridState: baseGrid.applyGridState,
  filterPanelRef
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

    <!-- Data Filter Panel -->
    <DataFilterPanel
      v-if="!isUnsupportedFile"
      ref="filterPanelRef"
      :columns="columnDefs"
      dialect="sql"
      :table-name="entry.name"
      :object-key="objectKey"
      @apply="onFilterPanelApply"
      @clear="baseGrid.clearAllFilters"
      @columns-change="onColumnsChange"
    />

    <!-- Selection + Copy Toolbar -->
    <div
      v-if="!isUnsupportedFile"
      class="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700"
    >
      <span class="text-xs text-gray-500 dark:text-gray-400">
        {{
          baseGrid.selectedRowCount.value > 0
            ? `${baseGrid.selectedRowCount.value} selected`
            : 'Select rows to copy'
        }}
      </span>
      <span class="text-xs text-gray-500 dark:text-gray-400">Right-click for actions</span>
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
      class="relative ag-theme-alpine select-none"
      style="height: 750px; width: 100%"
    >
      <ag-grid-vue
        class="h-full w-full"
        :columnDefs="columnDefs"
        :gridOptions="baseGrid.gridOptions.value"
        @grid-ready="baseGrid.onGridReady"
        @cell-context-menu="openSelectionMenu"
        @column-pinned="saveColumnState"
        @column-moved="saveColumnState"
        @column-resized="saveColumnState"
      ></ag-grid-vue>

      <!-- Loading overlay - fully opaque to hide empty grid -->
      <div
        v-if="isInitialLoading || isRefreshing"
        class="absolute inset-0 bg-white dark:bg-gray-850 flex items-center justify-center z-50"
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
          <span class="text-sm text-gray-600 dark:text-gray-300">
            {{
              isRefreshing
                ? 'Refreshing data...'
                : props.entry.path.startsWith('s3://')
                  ? 'Loading data from S3...'
                  : 'Loading file data...'
            }}
          </span>
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

    <SelectionContextMenu
      :open="selectionMenuOpen"
      :x="selectionMenuX"
      :y="selectionMenuY"
      :has-selection="canCopySelection"
      @close="selectionMenuOpen = false"
      @select-all="selectAllOnCurrentPage"
      @deselect-all="deselectAll"
      @copy="copySelectedRows"
    />
  </div>
</template>

<style scoped>
/* Component-specific styles only */
</style>
