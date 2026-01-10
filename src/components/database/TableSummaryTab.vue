<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { AlertCircle, BarChart3, Hash, Loader2, Percent, RefreshCw } from 'lucide-vue-next'
import { getTableSummary } from '@/api/tableSummary'
import type { TableSummaryResponse, ColumnSummary } from '@/types/tableSummary'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'

const props = defineProps<{
  tableMeta: SQLTableMeta | SQLViewMeta
  connectionId: string
  database: string
  isView?: boolean
  isActive?: boolean
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const summary = ref<TableSummaryResponse | null>(null)

// AbortController for cancelling in-flight requests
let abortController: AbortController | null = null
let activeRequestSeq = 0

function isCanceledRequest(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const err = e as { name?: string; code?: string }
  return err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED'
}

// Format numbers with commas
function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return value.toLocaleString()
}

// Format percentage
function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return `${value.toFixed(1)}%`
}

// Format value for display (handles various types)
function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'number') return formatNumber(value)
  // Truncate long strings
  const str = String(value)
  return str.length > 50 ? str.substring(0, 47) + '...' : str
}

// Check if column is numeric type
function isNumericColumn(col: ColumnSummary): boolean {
  const numericTypes = [
    'int',
    'integer',
    'bigint',
    'smallint',
    'tinyint',
    'float',
    'double',
    'decimal',
    'numeric',
    'real',
    'money',
    'serial'
  ]
  const lowerType = col.type.toLowerCase()
  return numericTypes.some((t) => lowerType.includes(t))
}

// Get null percentage color class
function getNullPercentageClass(pct: number): string {
  if (pct === 0) return 'text-green-600 dark:text-green-400'
  if (pct < 5) return 'text-yellow-600 dark:text-yellow-400'
  if (pct < 20) return 'text-orange-600 dark:text-orange-400'
  return 'text-red-600 dark:text-red-400'
}

// Get cardinality indicator
function getCardinalityIndicator(col: ColumnSummary): string {
  if (col.count === 0) return 'empty'
  const ratio = col.approxUnique / col.count
  if (ratio > 0.99) return 'unique'
  if (ratio < 0.01) return 'low'
  return 'normal'
}

function getCardinalityClass(indicator: string): string {
  switch (indicator) {
    case 'unique':
      return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
    case 'low':
      return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
    case 'empty':
      return 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
  }
}

function getCardinalityLabel(indicator: string): string {
  switch (indicator) {
    case 'unique':
      return 'Unique'
    case 'low':
      return 'Low Cardinality'
    case 'empty':
      return 'Empty'
    default:
      return ''
  }
}

async function fetchSummary() {
  // Cancel any existing request
  if (abortController) {
    abortController.abort()
  }

  // Create new controller for this request
  abortController = new AbortController()
  const currentController = abortController
  const signal = currentController.signal
  const requestSeq = ++activeRequestSeq

  loading.value = true
  error.value = null

  try {
    const result = await getTableSummary(
      {
        connectionId: props.connectionId,
        database: props.database,
        schema: props.tableMeta.schema,
        table: props.tableMeta.name
      },
      signal
    )

    // Ignore results from stale/overlapped requests.
    if (requestSeq !== activeRequestSeq || abortController !== currentController) {
      return
    }

    summary.value = result
  } catch (e) {
    // Ignore cancellation errors - this is expected when user switches tabs
    if (isCanceledRequest(e)) {
      return
    }

    // Ignore errors from stale/overlapped requests.
    if (requestSeq !== activeRequestSeq || abortController !== currentController) {
      return
    }

    error.value = e instanceof Error ? e.message : 'Failed to load summary'
    console.error('Failed to fetch table summary:', e)
  } finally {
    // Only clear loading for the active request.
    if (requestSeq === activeRequestSeq && abortController === currentController) {
      loading.value = false
    }
  }
}

// Expose refresh method
async function refresh() {
  await fetchSummary()
}

defineExpose({ refresh })

watch(
  () => props.isActive,
  (active) => {
    if (active) {
      fetchSummary()
      return
    }

    // If the tab becomes inactive, cancel any in-flight request.
    if (abortController) {
      abortController.abort()
      abortController = null
      activeRequestSeq++
    }
  },
  { immediate: true }
)

// Cancel any pending request when component unmounts
onBeforeUnmount(() => {
  if (abortController) {
    abortController.abort()
    abortController = null
    activeRequestSeq++
  }
})
</script>

<template>
  <div class="p-4">
    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-16">
      <Loader2 class="h-8 w-8 animate-spin text-teal-500" />
      <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">Analyzing table statistics...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="rounded-lg bg-red-50 dark:bg-red-900/20 p-6">
      <div class="flex items-start gap-3">
        <AlertCircle class="h-5 w-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
        <div>
          <h3 class="text-sm font-medium text-red-800 dark:text-red-200">Failed to load summary</h3>
          <p class="mt-1 text-sm text-red-700 dark:text-red-300">{{ error }}</p>
          <button
            type="button"
            class="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200"
            @click="fetchSummary"
          >
            <RefreshCw class="h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    </div>

    <!-- Summary Content -->
    <div v-else-if="summary" class="space-y-6">
      <!-- Overview Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
          <div
            class="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wide"
          >
            <Hash class="h-4 w-4" />
            {{ summary.sampled ? 'Rows analyzed' : 'Rows' }}
          </div>
          <div class="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {{ formatNumber(summary.rowCount) }}
          </div>
          <div v-if="summary.sampled" class="mt-1 text-xs text-amber-700 dark:text-amber-300">
            Based on {{ summary.samplePercent }}% sample
          </div>
        </div>
        <div class="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
          <div
            class="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wide"
          >
            <BarChart3 class="h-4 w-4" />
            Columns
          </div>
          <div class="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {{ formatNumber(summary.columnCount) }}
          </div>
        </div>
        <div class="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
          <div
            class="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wide"
          >
            Execution Time
          </div>
          <div class="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {{ summary.executionTimeMs }}ms
          </div>
        </div>
        <div v-if="summary.sampled" class="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4">
          <div
            class="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-medium uppercase tracking-wide"
          >
            <Percent class="h-4 w-4" />
            Sampled
          </div>
          <div class="mt-2 text-2xl font-semibold text-amber-700 dark:text-amber-300">
            {{ summary.samplePercent }}%
          </div>
        </div>
      </div>

      <!-- Column Statistics Table -->
      <div class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th
                  scope="col"
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Column
                </th>
                <th
                  scope="col"
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Type
                </th>
                <th
                  scope="col"
                  class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Null %
                </th>
                <th
                  scope="col"
                  class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Distinct
                </th>
                <th
                  scope="col"
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Min
                </th>
                <th
                  scope="col"
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Max
                </th>
                <th
                  scope="col"
                  class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Avg
                </th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-850 divide-y divide-gray-200 dark:divide-gray-700">
              <tr
                v-for="col in summary.columns"
                :key="col.name"
                class="hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {{ col.name }}
                    </span>
                    <span
                      v-if="getCardinalityLabel(getCardinalityIndicator(col))"
                      :class="[
                        'px-1.5 py-0.5 text-[10px] font-medium rounded',
                        getCardinalityClass(getCardinalityIndicator(col))
                      ]"
                    >
                      {{ getCardinalityLabel(getCardinalityIndicator(col)) }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span class="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {{ col.type }}
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right">
                  <span
                    :class="['text-sm font-medium', getNullPercentageClass(col.nullPercentage)]"
                  >
                    {{ formatPercent(col.nullPercentage) }}
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right">
                  <span class="text-sm text-gray-900 dark:text-gray-100">
                    {{ formatNumber(col.approxUnique) }}
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span
                    class="text-sm text-gray-600 dark:text-gray-300 font-mono"
                    :title="String(col.min)"
                  >
                    {{ formatValue(col.min) }}
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span
                    class="text-sm text-gray-600 dark:text-gray-300 font-mono"
                    :title="String(col.max)"
                  >
                    {{ formatValue(col.max) }}
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right">
                  <span
                    v-if="isNumericColumn(col) && col.avg != null"
                    class="text-sm text-gray-900 dark:text-gray-100"
                  >
                    {{ formatValue(col.avg) }}
                  </span>
                  <span v-else class="text-sm text-gray-400 dark:text-gray-500">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Additional Statistics (Quartiles for numeric columns) -->
      <div
        v-if="summary.columns.some((c) => isNumericColumn(c) && c.q25 != null)"
        class="space-y-4"
      >
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">
          Numeric Column Distribution
        </h3>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="col in summary.columns.filter((c) => isNumericColumn(c) && c.q25 != null)"
            :key="`dist-${col.name}`"
            class="rounded-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              {{ col.name }}
            </h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">Min</span>
                <span class="font-mono text-gray-900 dark:text-gray-100">{{
                  formatValue(col.min)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">Q25</span>
                <span class="font-mono text-gray-900 dark:text-gray-100">{{
                  formatValue(col.q25)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">Median (Q50)</span>
                <span class="font-mono text-gray-900 dark:text-gray-100">{{
                  formatValue(col.q50)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">Q75</span>
                <span class="font-mono text-gray-900 dark:text-gray-100">{{
                  formatValue(col.q75)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">Max</span>
                <span class="font-mono text-gray-900 dark:text-gray-100">{{
                  formatValue(col.max)
                }}</span>
              </div>
              <div
                class="flex justify-between border-t border-gray-100 dark:border-gray-700 pt-2 mt-2"
              >
                <span class="text-gray-500 dark:text-gray-400">Std Dev</span>
                <span class="font-mono text-gray-900 dark:text-gray-100">{{
                  formatValue(col.std)
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
