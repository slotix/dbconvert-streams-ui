<template>
  <div ref="resultsPaneRef" class="flex flex-col bg-white dark:bg-gray-850 min-h-0 h-full">
    <!-- Results Toolbar -->
    <div
      ref="resultsToolbarRef"
      class="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-1.5 flex items-center gap-2"
    >
      <span class="text-xs font-medium text-gray-600 dark:text-gray-400">Results</span>

      <div class="flex-1"></div>

      <span
        v-if="exportFeedback"
        class="hidden lg:inline-flex max-w-[340px] truncate text-[11px]"
        :class="
          exportFeedback.tone === 'error'
            ? 'text-red-600 dark:text-red-300'
            : exportFeedback.tone === 'success'
              ? 'text-teal-600 dark:text-teal-300'
              : 'text-gray-500 dark:text-gray-400'
        "
        :title="exportFeedback.message"
      >
        {{ exportFeedback.message }}
      </span>

      <!-- Export Buttons (single-result legacy only) -->
      <ExportToolbar
        v-if="!useResultSetsView && rows.length > 0"
        :primary-count="exportPrimaryCount"
        @export="exportSingle"
      />
    </div>

    <!-- Results Display -->
    <div class="flex-1 overflow-auto">
      <!-- Empty State -->
      <div
        v-if="!hasExecuted"
        class="h-full flex items-center justify-center text-gray-400 dark:text-gray-500"
      >
        <div class="text-center">
          <Terminal class="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p class="text-sm font-medium">Ready to execute</p>
          <p class="text-xs mt-1">Write a query and press Run or Ctrl+Enter</p>
        </div>
      </div>

      <!-- Error Display -->
      <div
        v-else-if="error"
        class="m-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3"
      >
        <div class="flex">
          <XCircle class="h-4 w-4 text-red-400 dark:text-red-500 shrink-0" />
          <div class="ml-2">
            <h3 class="text-xs font-medium text-red-800 dark:text-red-200">Query Error</h3>
            <pre
              class="mt-1 whitespace-pre-wrap font-mono text-xs text-red-700 dark:text-red-300"
              >{{ error }}</pre
            >
          </div>
        </div>
      </div>

      <!-- Multiple Result Sets / Command-only Results -->
      <div
        v-else-if="useResultSetsView"
        class="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700"
      >
        <div v-for="(set, setIndex) in displayResultSets" :key="setIndex" class="">
          <div
            class="bg-gray-50 dark:bg-gray-900 px-3 py-2 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700"
          >
            <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
              Result {{ setIndex + 1 }}
            </span>
            <span v-if="set.commandTag" class="text-xs text-gray-500 dark:text-gray-400">
              {{ set.commandTag }}
            </span>
            <span
              v-if="set.rowsAffected !== undefined && set.rowsAffected !== null"
              class="text-xs text-gray-500 dark:text-gray-400"
            >
              • {{ set.rowsAffected }} affected
            </span>
            <span v-if="set.rows.length > 0" class="text-xs text-gray-500 dark:text-gray-400">
              • {{ set.rows.length }} rows
            </span>

            <div class="flex-1"></div>

            <ExportToolbar
              v-if="set.rows.length > 0"
              :primary-count="exportPrimaryCount"
              @export="(f) => exportSet(f, setIndex)"
            />
          </div>

          <!-- Table or command-only result -->
          <div v-if="set.columns.length > 0 && set.rows.length > 0" class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th
                    v-for="column in set.columns"
                    :key="column"
                    class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    {{ column }}
                  </th>
                </tr>
              </thead>
              <tbody
                class="bg-white dark:bg-gray-850 divide-y divide-gray-200 dark:divide-gray-700"
              >
                <tr
                  v-for="(row, rowIndex) in paginatedRowsForSet(setIndex)"
                  :key="rowIndex"
                  class="hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td
                    v-for="column in set.columns"
                    :key="column"
                    class="px-3 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-gray-100"
                  >
                    {{ formatCellValue(row[column]) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            v-else
            class="px-3 py-3 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-850"
          >
            <span v-if="set.columns.length === 0">Command executed successfully</span>
            <span v-else>No rows returned</span>
          </div>

          <!-- Pagination (per-set, only when needed) -->
          <div
            v-if="totalPagesForSet(setIndex) > 1"
            class="bg-gray-50 dark:bg-gray-900 px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between"
          >
            <div class="text-xs text-gray-600 dark:text-gray-400">
              {{ (currentPageForSet(setIndex) - 1) * pageSize + 1 }}-{{
                Math.min(
                  currentPageForSet(setIndex) * pageSize,
                  displayResultSets[setIndex]?.rows.length || 0
                )
              }}
              of {{ displayResultSets[setIndex]?.rows.length || 0 }}
            </div>
            <div class="flex gap-1">
              <button
                :disabled="currentPageForSet(setIndex) === 1"
                class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs disabled:opacity-50"
                @click="setPageForSet(setIndex, currentPageForSet(setIndex) - 1)"
              >
                Prev
              </button>
              <button
                :disabled="currentPageForSet(setIndex) === totalPagesForSet(setIndex)"
                class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs disabled:opacity-50"
                @click="setPageForSet(setIndex, currentPageForSet(setIndex) + 1)"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Results Table (single) -->
      <div v-else-if="rows.length > 0" class="border-t border-gray-200 dark:border-gray-700">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-800 sticky top-0">
              <tr>
                <th
                  v-for="column in columns"
                  :key="column"
                  class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {{ column }}
                </th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-850 divide-y divide-gray-200 dark:divide-gray-700">
              <tr
                v-for="(row, rowIndex) in paginatedRows"
                :key="rowIndex"
                class="hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <td
                  v-for="column in columns"
                  :key="column"
                  class="px-3 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-gray-100"
                >
                  {{ formatCellValue(row[column]) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination (single) -->
        <div
          v-if="totalPages > 1"
          class="bg-gray-50 dark:bg-gray-900 px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between"
        >
          <div class="text-xs text-gray-600 dark:text-gray-400">
            {{ (currentPage - 1) * pageSize + 1 }}-{{
              Math.min(currentPage * pageSize, rows.length)
            }}
            of {{ rows.length }}
          </div>
          <div class="flex gap-1">
            <button
              :disabled="currentPage === 1"
              class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs disabled:opacity-50"
              @click="$emit('update:currentPage', currentPage - 1)"
            >
              Prev
            </button>
            <button
              :disabled="currentPage === totalPages"
              class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs disabled:opacity-50"
              @click="$emit('update:currentPage', currentPage + 1)"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <!-- No Results -->
      <div v-else class="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
        <div class="text-center">
          <CheckCircle class="h-12 w-12 mx-auto mb-3 text-green-300 dark:text-green-600" />
          <p class="text-sm font-medium">Query executed successfully</p>
          <p class="text-xs mt-1">No rows returned</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { CheckCircle, Terminal, XCircle } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { useDesktopMode } from '@/composables/useDesktopMode'
import { allExportFormats, useDataExport, type ExportFormat } from '@/composables/useDataExport'
import ExportToolbar from '@/components/common/ExportToolbar.vue'

const props = defineProps<{
  columns: string[]
  rows: Record<string, unknown>[]
  resultSets?: Array<{
    columns: string[]
    rows: Record<string, unknown>[]
    commandTag?: string
    rowsAffected?: number
  }>
  error: string | null
  hasExecuted: boolean
  currentPage: number
  pageSize: number
}>()

defineEmits<{
  'update:currentPage': [page: number]
}>()

// Use the export composable
const { exportData } = useDataExport()
const toast = useToast()
const { isDesktop } = useDesktopMode()
const resultsPaneRef = ref<HTMLElement | null>(null)
const resultsToolbarRef = ref<HTMLElement | null>(null)
const exportPrimaryCount = ref(3)
const exportFeedback = ref<{ message: string; tone: 'info' | 'success' | 'error' } | null>(null)

const useResultSetsView = computed(() => {
  if (!props.resultSets || props.resultSets.length === 0) return false
  if (props.resultSets.length > 1) return true

  // For a single result set, keep legacy UX unless it's a command-only result.
  const only = props.resultSets[0]
  return (only?.columns?.length || 0) === 0
})

const displayResultSets = computed(() => {
  return props.resultSets || []
})

const paginatedRows = computed(() => {
  const start = (props.currentPage - 1) * props.pageSize
  const end = start + props.pageSize
  return props.rows.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(props.rows.length / props.pageSize)
})

// Per-set pagination state (used for multi-result scripts)
const setPages = ref<Record<number, number>>({})

function currentPageForSet(setIndex: number): number {
  if (!useResultSetsView.value) {
    return props.currentPage
  }
  return setPages.value[setIndex] || 1
}

function setPageForSet(setIndex: number, page: number) {
  if (!useResultSetsView.value) {
    // single-result legacy paging is controlled by parent
    return
  }
  setPages.value = { ...setPages.value, [setIndex]: Math.max(1, page) }
}

function totalPagesForSet(setIndex: number): number {
  const set = displayResultSets.value[setIndex]
  const rowCount = set?.rows?.length || 0
  return Math.ceil(rowCount / props.pageSize)
}

function paginatedRowsForSet(setIndex: number): Array<Record<string, unknown>> {
  const set = displayResultSets.value[setIndex]
  const page = currentPageForSet(setIndex)
  const start = (page - 1) * props.pageSize
  const end = start + props.pageSize
  return (set?.rows || []).slice(start, end)
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

let exportFeedbackTimeout: ReturnType<typeof setTimeout> | null = null

function formatLabel(format: ExportFormat): string {
  return allExportFormats.find((item) => item.id === format)?.label || format.toUpperCase()
}

function setExportFeedback(message: string, tone: 'info' | 'success' | 'error') {
  exportFeedback.value = { message, tone }
  if (exportFeedbackTimeout) {
    clearTimeout(exportFeedbackTimeout)
  }
  exportFeedbackTimeout = setTimeout(() => {
    exportFeedback.value = null
  }, 6000)
}

function handleExportFeedback(
  format: ExportFormat,
  filenameBase: string,
  rows: Record<string, unknown>[]
) {
  const label = formatLabel(format)

  const result = exportData(format, {
    columns: props.columns,
    rows,
    filename: filenameBase
  })

  if (!result) {
    const msg = `Failed to export ${label}. No data available.`
    setExportFeedback(msg, 'error')
    toast.error(msg)
    return
  }

  const locationHint = isDesktop.value
    ? 'Check your system Downloads folder.'
    : 'Check your browser downloads.'
  const successMsg = `${label} export completed: ${result.filename}`
  setExportFeedback(successMsg, 'success')
  toast.success(`${successMsg} ${locationHint}`)
}

function exportSingle(format: ExportFormat) {
  if (props.rows.length === 0) return
  handleExportFeedback(format, 'query-results', props.rows)
}

function exportSet(format: ExportFormat, setIndex: number) {
  const set = displayResultSets.value[setIndex]
  if (!set || set.rows.length === 0) return

  const label = formatLabel(format)

  const result = exportData(format, {
    columns: set.columns,
    rows: set.rows,
    filename: `query-results-${setIndex + 1}`
  })

  if (!result) {
    const msg = `Failed to export ${label}. No data available.`
    setExportFeedback(msg, 'error')
    toast.error(msg)
    return
  }

  const locationHint = isDesktop.value
    ? 'Check your system Downloads folder.'
    : 'Check your browser downloads.'
  const successMsg = `${label} export completed: ${result.filename}`
  setExportFeedback(successMsg, 'success')
  toast.success(`${successMsg} ${locationHint}`)
}

let isMeasuringToolbar = false

async function updateToolbarDensity() {
  if (isMeasuringToolbar) return
  isMeasuringToolbar = true
  try {
    const toolbar = resultsToolbarRef.value
    if (!toolbar) return

    exportPrimaryCount.value = 3
    await nextTick()

    while (toolbar.scrollWidth > toolbar.clientWidth + 1 && exportPrimaryCount.value > 0) {
      exportPrimaryCount.value -= 1
      await nextTick()
    }
  } finally {
    isMeasuringToolbar = false
  }
}

function handleWindowResize() {
  void updateToolbarDensity()
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  void updateToolbarDensity()
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      void updateToolbarDensity()
    })
    if (resultsPaneRef.value) {
      resizeObserver.observe(resultsPaneRef.value)
    }
    if (resultsToolbarRef.value) {
      resizeObserver.observe(resultsToolbarRef.value)
    }
  } else {
    window.addEventListener('resize', handleWindowResize)
  }
})

watch(
  () => [
    props.rows.length,
    props.columns.length,
    props.resultSets?.length || 0,
    exportFeedback.value?.message || ''
  ],
  () => {
    void updateToolbarDensity()
  },
  { flush: 'post' }
)

onUnmounted(() => {
  if (exportFeedbackTimeout) {
    clearTimeout(exportFeedbackTimeout)
    exportFeedbackTimeout = null
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  } else {
    window.removeEventListener('resize', handleWindowResize)
  }
})
</script>
