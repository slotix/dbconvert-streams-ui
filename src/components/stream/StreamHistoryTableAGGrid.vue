<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h3 class="text-base font-semibold text-gray-900">Run History</h3>
      <div class="flex items-center gap-3">
        <span v-if="pagination.total > 0" class="text-xs text-gray-500">
          {{ pagination.total }} total run{{ pagination.total !== 1 ? 's' : '' }}
        </span>
        <button
          v-if="pagination.total > 0"
          type="button"
          title="Delete all runs from history"
          class="p-1.5 text-red-600 hover:text-red-700 rounded-md hover:bg-red-50 transition-colors duration-200"
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
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="pagination.total === 0"
      class="text-center py-8 bg-gray-50 rounded-lg border border-gray-200"
    >
      <svg
        class="mx-auto h-12 w-12 text-gray-400"
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
      <p class="mt-2 text-sm text-gray-500">No run history available</p>
      <p class="text-xs text-gray-400">Start the stream to see execution history</p>
    </div>

    <!-- AG Grid table -->
    <div v-else class="space-y-3">
      <div
        class="ag-theme-alpine"
        :style="{
          width: '100%',
          height: '600px'
        }"
      >
        <AgGridVue
          :row-data="runs"
          :column-defs="columnDefs"
          :grid-options="gridOptions"
          style="width: 100%; height: 100%"
          @grid-ready="onGridReady"
        />
      </div>

      <!-- Custom Backend Pagination Controls -->
      <div
        v-if="pagination.total > 0"
        class="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-md"
      >
        <div class="text-xs text-gray-600">
          Showing {{ (pagination.page - 1) * pagination.pageSize + 1 }} to
          {{ Math.min(pagination.page * pagination.pageSize, pagination.total) }} of
          {{ pagination.total }} runs
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            :disabled="pagination.page <= 1"
            :class="[
              'p-1.5 rounded-md transition-colors',
              pagination.page <= 1
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-200'
            ]"
            @click="goToPage(pagination.page - 1)"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <span class="text-xs text-gray-600 px-2">
            Page {{ pagination.page }} of {{ pagination.totalPages }}
          </span>
          <button
            type="button"
            :disabled="pagination.page >= pagination.totalPages"
            :class="[
              'p-1.5 rounded-md transition-colors',
              pagination.page >= pagination.totalPages
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-200'
            ]"
            @click="goToPage(pagination.page + 1)"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
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
  ICellRendererParams
} from 'ag-grid-community'
import { formatDateTime, formatDuration } from '@/utils/formats'
import { useLogsStore } from '@/stores/logs'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import '@/styles/agGridTheme.css'

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])

interface StreamRun {
  id: string
  configId: string
  streamId: string
  timestamp: number
  durationMs: number
  status: string
  dataSize?: string
  rowsInserted?: number
  rowsSkipped?: number
  errorMessage?: string
}

interface PaginationData {
  runs: StreamRun[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const props = defineProps<{
  configId: string
  paginationData?: PaginationData
}>()

const emit = defineEmits<{
  'delete-run': [runId: string]
  'page-change': [page: number]
  'sort-change': [sortBy: string, sortOrder: 'asc' | 'desc']
  'clear-all': []
}>()

const logsStore = useLogsStore()
const showDeleteConfirm = ref(false)
const pendingDeleteRunId = ref<string | null>(null)
const showClearAllConfirm = ref(false)
const gridApi = ref<GridApi | null>(null)

// Default to empty pagination if not provided
const defaultPagination: PaginationData = {
  runs: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0
}

const pagination = computed(() => props.paginationData || defaultPagination)
const runs = computed(() => pagination.value.runs || [])

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M'
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K'
  }
  return num.toString()
}

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
    classes += ' bg-green-50 text-green-700 ring-green-600/20'
  } else if (statusLower === 'failed') {
    classes += ' bg-red-50 text-red-700 ring-red-600/20'
  } else if (statusLower === 'stopped') {
    classes += ' bg-gray-50 text-gray-700 ring-gray-600/20'
  } else {
    classes += ' bg-blue-50 text-blue-700 ring-blue-600/20'
  }

  return `<span class="${classes}">${status}</span>`
}

// Rows cell renderer
function rowsCellRenderer(params: ICellRendererParams) {
  const run = params.data as StreamRun
  if (!run || (!run.rowsInserted && !run.rowsSkipped)) {
    return '<div class="text-gray-400">—</div>'
  }

  let html = '<div>'
  if (run.rowsInserted) {
    html += `<div class="text-green-700 font-medium">+${formatNumber(run.rowsInserted)}</div>`
  }
  if (run.rowsSkipped) {
    html += `<div class="text-yellow-600 text-xs">Skipped: ${formatNumber(run.rowsSkipped)}</div>`
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
        class="p-1.5 text-blue-600 hover:text-blue-700 rounded-md hover:bg-blue-50 transition-colors duration-200 action-view-logs"
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
        class="p-1.5 text-red-600 hover:text-red-700 rounded-md hover:bg-red-50 transition-colors duration-200 action-delete-run"
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

const gridOptions = computed<GridOptions>(() => ({
  theme: 'legacy',
  rowHeight: 48,
  headerHeight: 40,
  suppressCellFocus: true,
  animateRows: false,
  enableCellTextSelection: true,
  domLayout: 'normal',
  pagination: false,
  defaultColDef: {
    sortable: true,
    filter: false,
    resizable: true
  },
  onSortChanged: (event) => {
    // Get the current sort model
    const sortModel = event.api.getColumnState().find((col) => col.sort !== null)
    if (sortModel && sortModel.colId && sortModel.sort) {
      // Emit sort change to parent
      emit('sort-change', sortModel.colId, sortModel.sort as 'asc' | 'desc')
    }
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

function goToPage(page: number) {
  if (page >= 1 && page <= pagination.value.totalPages) {
    emit('page-change', page)
  }
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
