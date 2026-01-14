<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">Run History</h3>
      <div class="flex items-center gap-3">
        <span v-if="runs.length > 0" class="text-xs text-gray-500 dark:text-gray-400">
          {{ runs.length }} total run{{ runs.length !== 1 ? 's' : '' }}
        </span>
        <BaseButton
          v-if="runs.length > 0"
          variant="danger"
          size="sm"
          title="Delete all runs from history"
          @click="handleClearAll"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </BaseButton>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="runs.length === 0"
      class="text-center py-8 bg-gray-50 dark:bg-gray-900/40 rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <svg
        class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">No run history available</p>
      <p class="text-xs text-gray-400 dark:text-gray-500">
        Start the stream to see execution history
      </p>
    </div>

    <!-- AG Grid table with built-in pagination -->
    <div v-else class="ag-theme-alpine" :style="{ width: '100%', height: '850px' }">
      <AgGridVue
        :row-data="runs"
        :column-defs="columnDefs"
        :grid-options="gridOptions"
        style="width: 100%; height: 100%"
        @grid-ready="onGridReady"
      />
    </div>

    <!-- Delete Single Run Confirmation Dialog -->
    <ConfirmDialog
      v-model:is-open="showDeleteConfirm"
      title="Delete run from history?"
      description="This action cannot be undone. The run will be permanently removed from history."
      confirm-label="Delete"
      cancel-label="Cancel"
      :danger="true"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />

    <!-- Clear All Runs Confirmation Dialog -->
    <ConfirmDialog
      v-model:is-open="showClearAllConfirm"
      title="Delete all runs from history?"
      description="This action cannot be undone. All runs will be permanently removed from history."
      confirm-label="Delete All"
      cancel-label="Cancel"
      :danger="true"
      @confirm="confirmClearAll"
      @cancel="cancelClearAll"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import type {
  GridApi,
  ColDef,
  GridReadyEvent,
  GridOptions,
  ICellRendererParams,
  PostProcessPopupParams
} from 'ag-grid-community'
import { formatDateTime, formatDuration, formatNumberCompact } from '@/utils/formats'
import { useLogsStore } from '@/stores/logs'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import '@/styles/agGridTheme.css'
import {
  PAGE_SIZE_OPTIONS,
  DEFAULT_PAGE_SIZE,
  GRID_HEADER_HEIGHT,
  GRID_ROW_HEIGHT_LARGE
} from '@/constants/gridConfig'
import type { StreamRun } from '@/types/streamHistory'

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])

defineProps<{
  configId: string
  runs: StreamRun[]
}>()

const emit = defineEmits<{
  'delete-run': [runId: string]
  'clear-all': []
}>()

const logsStore = useLogsStore()
const showDeleteConfirm = ref(false)
const pendingDeleteRunId = ref<string | null>(null)
const showClearAllConfirm = ref(false)
const gridApi = ref<GridApi | null>(null)

// Helper to format duration from milliseconds using the shared formatter
function formatDurationMs(ms: number): string {
  // Convert milliseconds to nanoseconds for the shared formatter
  return formatDuration((ms || 0) * 1000000)
}

// Status cell renderer
function statusCellRenderer(params: ICellRendererParams) {
  const status = params.value || ''
  const statusLower = status.toLowerCase()

  let classes =
    'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset'
  if (statusLower === 'finished') {
    classes +=
      ' bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-500/30'
  } else if (statusLower === 'failed') {
    classes +=
      ' bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-500/30'
  } else if (statusLower === 'stopped') {
    classes +=
      ' bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-900/40 dark:text-gray-300 dark:ring-gray-600/40'
  } else {
    classes +=
      ' bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-500/30'
  }

  return `<span class="${classes}">${status}</span>`
}

// Rows cell renderer
function rowsCellRenderer(params: ICellRendererParams) {
  const run = params.data as StreamRun
  if (!run || (!run.rowsInserted && !run.rowsSkipped)) {
    return '<div class="text-gray-400 dark:text-gray-500">—</div>'
  }

  let html = '<div>'
  if (run.rowsInserted) {
    html += `<div class="text-green-700 dark:text-green-300 font-medium">+${formatNumberCompact(run.rowsInserted)}</div>`
  }
  if (run.rowsSkipped) {
    html += `<div class="text-yellow-600 dark:text-yellow-300 text-xs">Skipped: ${formatNumberCompact(run.rowsSkipped)}</div>`
  }
  html += '</div>'

  return html
}

// Actions cell renderer
function actionsCellRenderer(params: ICellRendererParams) {
  const run = params.data as StreamRun
  if (!run) return ''

  return `
    <div class="flex items-center gap-2">
      <button 
        type="button" 
        class="p-1.5 text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200 action-view-logs"
        data-stream-id="${run.streamId}"
        title="View logs for this run"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>
      <button 
        type="button" 
        class="p-1.5 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200 action-delete-run"
        data-run-id="${run.id}"
        title="Delete this run from history"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  `
}

// Column definitions
const columnDefs = ref<ColDef[]>([
  {
    field: 'timestamp',
    headerName: 'Date & Time',
    sortable: true,
    filter: false,
    width: 200,
    valueFormatter: (params) => formatDateTime(params.value)
  },
  {
    field: 'durationMs',
    headerName: 'Duration',
    sortable: true,
    filter: false,
    width: 130,
    valueFormatter: (params) => formatDurationMs(params.value || 0)
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    filter: false,
    width: 150,
    cellRenderer: statusCellRenderer
  },
  {
    field: 'dataSize',
    headerName: 'Data Size',
    sortable: true,
    filter: false,
    width: 130,
    valueFormatter: (params) => params.value || '—'
  },
  {
    field: 'rowsInserted',
    headerName: 'Rows',
    sortable: true,
    filter: false,
    width: 150,
    cellRenderer: rowsCellRenderer
  },
  {
    headerName: 'Actions',
    sortable: false,
    filter: false,
    width: 120,
    cellRenderer: actionsCellRenderer,
    pinned: 'right',
    suppressHeaderMenuButton: true
  }
])

// Adjust popup position for CSS zoom (desktop app)
const postProcessPopup = (params: PostProcessPopupParams) => {
  const zoomValue = getComputedStyle(document.documentElement).getPropertyValue('--app-zoom')
  const zoom = parseFloat(zoomValue) || 1
  if (zoom === 1 || !params.ePopup) return

  // Apply inverse zoom to the popup to counteract the CSS zoom effect on positioning
  params.ePopup.style.zoom = `${1 / zoom}`
}

const gridOptions = computed<GridOptions>(() => ({
  theme: 'legacy',
  rowHeight: GRID_ROW_HEIGHT_LARGE,
  headerHeight: GRID_HEADER_HEIGHT,
  suppressCellFocus: true,
  animateRows: false,
  enableCellTextSelection: true,
  domLayout: 'normal',
  // Enable client-side pagination
  pagination: true,
  paginationPageSize: DEFAULT_PAGE_SIZE,
  paginationPageSizeSelector: PAGE_SIZE_OPTIONS as unknown as number[],
  postProcessPopup,
  defaultColDef: {
    sortable: true,
    filter: false,
    resizable: true
  },
  onCellClicked: (event) => {
    const target = event.event?.target as HTMLElement
    if (target) {
      // Handle view logs button
      const viewLogsBtn = target.closest('.action-view-logs')
      if (viewLogsBtn) {
        const streamId = viewLogsBtn.getAttribute('data-stream-id')
        if (streamId) handleViewLogs(streamId)
        return
      }

      // Handle delete run button
      const deleteBtn = target.closest('.action-delete-run')
      if (deleteBtn) {
        const runId = deleteBtn.getAttribute('data-run-id')
        if (runId) handleDeleteRun(runId)
        return
      }
    }
  }
}))

function onGridReady(params: GridReadyEvent) {
  gridApi.value = params.api
}

async function handleViewLogs(streamId: string) {
  await logsStore.loadHistoricalLogs(streamId)
}

function handleDeleteRun(runId: string) {
  pendingDeleteRunId.value = runId
  showDeleteConfirm.value = true
}

function confirmDelete() {
  if (pendingDeleteRunId.value) {
    emit('delete-run', pendingDeleteRunId.value)
    showDeleteConfirm.value = false
    pendingDeleteRunId.value = null
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false
  pendingDeleteRunId.value = null
}

function handleClearAll() {
  showClearAllConfirm.value = true
}

function confirmClearAll() {
  emit('clear-all')
  showClearAllConfirm.value = false
}

function cancelClearAll() {
  showClearAllConfirm.value = false
}
</script>

<style scoped>
/* No custom styles needed - using default AG Grid Alpine theme */
</style>
