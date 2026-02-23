<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">Run History</h3>
      <div class="flex items-center gap-3">
        <span v-if="safeRuns.length > 0" class="text-xs text-gray-500 dark:text-gray-400">
          {{ safeRuns.length }} total run{{ safeRuns.length !== 1 ? 's' : '' }}
        </span>
        <BaseButton
          v-if="safeRuns.length > 0"
          variant="danger"
          size="sm"
          title="Delete all runs from history"
          @click="handleClearAll"
        >
          <Trash2 class="h-4 w-4" />
        </BaseButton>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="safeRuns.length === 0"
      class="text-center py-8 bg-gray-50 dark:bg-gray-900/40 rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <History class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">No run history available</p>
      <p class="text-xs text-gray-400 dark:text-gray-500">
        Start the stream to see execution history
      </p>
    </div>

    <!-- AG Grid table with built-in pagination -->
    <div v-else class="ag-theme-alpine" :style="{ width: '100%', height: '850px' }">
      <AgGridVue
        :row-data="safeRuns"
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
import { ref, computed, defineComponent, h } from 'vue'
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
import { FileText, History, Trash2 } from 'lucide-vue-next'
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

const ActionsCell = defineComponent({
  props: {
    params: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const viewLogs = () => {
      const streamId = (props.params?.data as StreamRun | undefined)?.streamId
      if (streamId) {
        props.params?.onViewLogs?.(streamId)
      }
    }

    const deleteRun = () => {
      const runId = (props.params?.data as StreamRun | undefined)?.id
      if (runId) {
        props.params?.onDeleteRun?.(runId)
      }
    }

    return () =>
      h('div', { class: 'flex items-center gap-2' }, [
        h(
          'button',
          {
            type: 'button',
            class:
              'p-1.5 text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200',
            title: 'View logs for this run',
            onClick: viewLogs
          },
          [h(FileText, { class: 'h-4 w-4' })]
        ),
        h(
          'button',
          {
            type: 'button',
            class:
              'p-1.5 text-red-600 dark:text-red-300 hover:text-red-700 dark:hover:text-red-300 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors duration-200',
            title: 'Delete this run from history',
            onClick: deleteRun
          },
          [h(Trash2, { class: 'h-4 w-4' })]
        )
      ])
  }
})

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])

const props = withDefaults(
  defineProps<{
    configId: string
    runs: StreamRun[] | null
  }>(),
  {
    runs: () => []
  }
)

// Computed to safely access runs (handles null)
const safeRuns = computed(() => props.runs ?? [])

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
    minWidth: 100,
    flex: 1,
    cellRenderer: rowsCellRenderer
  },
  {
    headerName: 'Actions',
    sortable: false,
    filter: false,
    width: 100,
    cellRenderer: 'ActionsCell',
    cellRendererParams: {
      onViewLogs: (streamId: string) => handleViewLogs(streamId),
      onDeleteRun: (runId: string) => handleDeleteRun(runId)
    },
    pinned: 'right',
    suppressHeaderMenuButton: true
  }
])

// Fix AG Grid popup positioning. Same pattern as StreamContextMenu / ColumnContextMenu:
// use position:fixed + coord/zoom. getBoundingClientRect() returns visual pixels;
// dividing by zoom converts to CSS layout pixels for fixed positioning under html{zoom:N}.
const postProcessPopup = (params: PostProcessPopupParams) => {
  if (!params.ePopup || !params.eventSource) return

  const anchorRect = params.eventSource.getBoundingClientRect()
  const popupHeight = params.ePopup.getBoundingClientRect().height
  const popupWidth = params.ePopup.getBoundingClientRect().width

  let top = anchorRect.top - popupHeight
  if (top < 0) top = anchorRect.bottom

  let left = anchorRect.left
  if (left + popupWidth > window.innerWidth) left = window.innerWidth - popupWidth
  if (left < 0) left = 0
  if (top + popupHeight > window.innerHeight) top = window.innerHeight - popupHeight
  if (top < 0) top = 0

  params.ePopup.style.position = 'fixed'
  params.ePopup.style.left = `${left}px`
  params.ePopup.style.top = `${top}px`
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
  popupParent: document.body,
  postProcessPopup,
  defaultColDef: {
    sortable: true,
    filter: false,
    resizable: true
  },
  components: {
    ActionsCell
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
