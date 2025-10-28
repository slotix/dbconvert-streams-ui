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

    <!-- History table -->
    <div v-else class="space-y-4">
      <div class="overflow-hidden rounded-lg border border-gray-200">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                scope="col"
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Date & Time
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Duration
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Data Size
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Rows
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="run in runs" :key="run.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {{ formatDateTime(run.timestamp) }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                {{ run.duration }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset',
                    getStatusClass(run.status)
                  ]"
                >
                  <component :is="getStatusIcon(run.status)" class="h-3 w-3" />
                  {{ run.status }}
                </span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                {{ run.dataSize || '—' }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                <div v-if="run.rowsInserted || run.rowsSkipped">
                  <div class="text-green-700 font-medium">
                    +{{ formatNumber(run.rowsInserted || 0) }}
                  </div>
                  <div v-if="run.rowsSkipped" class="text-yellow-600 text-xs">
                    Skipped: {{ formatNumber(run.rowsSkipped) }}
                  </div>
                </div>
                <div v-else class="text-gray-400">—</div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm space-x-2 flex">
                <button
                  type="button"
                  title="View logs for this run"
                  class="p-1.5 text-blue-600 hover:text-blue-700 rounded-md hover:bg-blue-50 transition-colors duration-200"
                  @click="handleViewLogs(run.id)"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </button>
                <button
                  v-if="isDeleteEnabled"
                  type="button"
                  title="Delete this run from history"
                  class="p-1.5 text-red-600 hover:text-red-700 rounded-md hover:bg-red-50 transition-colors duration-200"
                  @click="handleDeleteRun(run.id)"
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
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Controls -->
      <div v-if="pagination.totalPages > 1" class="flex items-center justify-between">
        <div class="text-sm text-gray-600">
          Page {{ pagination.page }} of {{ pagination.totalPages }}
          <span class="ml-2 text-gray-500">({{ pagination.total }} total runs)</span>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            :disabled="pagination.page === 1"
            class="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            @click="previousPage"
          >
            Previous
          </button>
          <button
            type="button"
            :disabled="pagination.page === pagination.totalPages"
            class="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            @click="nextPage"
          >
            Next
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
import {
  CheckCircleIcon,
  XCircleIcon,
  StopCircleIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'
import { formatDateTime } from '@/utils/formats'
import { useLogsStore } from '@/stores/logs'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

interface StreamRun {
  id: string
  configId: string
  streamId: string
  timestamp: number
  duration: string
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
  'clear-all': []
}>()

const logsStore = useLogsStore()
const isDeleteEnabled = ref(true)
const showDeleteConfirm = ref(false)
const pendingDeleteRunId = ref<string | null>(null)
const showClearAllConfirm = ref(false)

// Default to empty pagination if not provided
const defaultPagination: PaginationData = {
  runs: [],
  total: 0,
  page: 1,
  pageSize: 50,
  totalPages: 0
}

const pagination = computed(() => props.paginationData || defaultPagination)
const runs = computed(() => pagination.value.runs || [])

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

function nextPage() {
  if (pagination.value.page < pagination.value.totalPages) {
    emit('page-change', pagination.value.page + 1)
  }
}

function previousPage() {
  if (pagination.value.page > 1) {
    emit('page-change', pagination.value.page - 1)
  }
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M'
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K'
  }
  return num.toString()
}

function getStatusClass(status: string): string {
  const statusLower = status.toLowerCase()
  if (statusLower === 'finished') {
    return 'bg-green-50 text-green-700 ring-green-600/20'
  } else if (statusLower === 'failed') {
    return 'bg-red-50 text-red-700 ring-red-600/20'
  } else if (statusLower === 'stopped') {
    return 'bg-gray-50 text-gray-700 ring-gray-600/20'
  } else {
    return 'bg-blue-50 text-blue-700 ring-blue-600/20'
  }
}

function getStatusIcon(status: string) {
  const statusLower = status.toLowerCase()
  if (statusLower === 'finished') {
    return CheckCircleIcon
  } else if (statusLower === 'failed') {
    return XCircleIcon
  } else if (statusLower === 'stopped') {
    return StopCircleIcon
  } else {
    return ArrowPathIcon
  }
}
</script>
