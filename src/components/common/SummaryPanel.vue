<script setup lang="ts">
import { AlertCircle, BarChart3, Hash, Loader2, RefreshCw } from 'lucide-vue-next'
import type { ColumnSummary } from '@/types/tableSummary'
import type { SummaryResponse } from '@/types/fileSummary'

defineProps<{
  summary: SummaryResponse | null
  loading: boolean
  error: string | null
  showSlowHint: boolean
}>()

const emit = defineEmits<{
  retry: []
  cancel: []
}>()

type SummaryHint = {
  label: string
  className: string
  title?: string
}

// Format numbers with commas (compact for large numbers)
function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  if (Math.abs(value) >= 1_000_000) {
    return value.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 1 })
  }
  return value.toLocaleString()
}

// Format large numbers for display in cards (always compact)
function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  if (Math.abs(value) >= 1_000_000) {
    return value.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 2 })
  }
  return value.toLocaleString()
}

// Format percentage
function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return `${value.toFixed(1)}%`
}

// Format numeric value with limited decimals
function formatNumericValue(value: number): string {
  if (Number.isInteger(value) || Math.abs(value - Math.round(value)) < 0.0001) {
    return Math.round(value).toLocaleString()
  }
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
  return value.toFixed(2)
}

// Format value for display (handles various types)
function formatValue(value: string | number | null | undefined, maxLength = 30): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'number') {
    return formatNumericValue(value)
  }
  const str = String(value)
  return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str
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

// Check if column is string-like
function isStringColumn(col: ColumnSummary): boolean {
  const textTypes = ['char', 'text', 'string', 'uuid', 'json']
  const lowerType = col.type.toLowerCase()
  return textTypes.some((t) => lowerType.includes(t))
}

function getDeclaredLength(type: string): number | null {
  const patterns = [/(?:var)?char\s*\((\d+)\)/i, /character\s+varying\s*\((\d+)\)/i]
  for (const pattern of patterns) {
    const match = type.match(pattern)
    if (match && match[1]) {
      const parsed = Number.parseInt(match[1], 10)
      if (!Number.isNaN(parsed)) return parsed
    }
  }
  return null
}

function isAtMaxLength(col: ColumnSummary): boolean {
  if (!isStringColumn(col)) return false
  if (col.count === 0) return false
  const declared = getDeclaredLength(col.type)
  if (!declared) return false
  if (col.minLength == null || col.maxLength == null) return false
  if (col.minLength !== declared || col.maxLength !== declared) return false
  if (col.avgLength != null && Math.abs(col.avgLength - declared) > 0.01) {
    return false
  }
  return true
}

function getDataQualityHints(col: ColumnSummary): SummaryHint[] {
  const hints: SummaryHint[] = []
  if (col.count > 0 && col.nullPercentage >= 95) {
    hints.push({
      label: 'Mostly null',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
      title: 'Over 95% of values are NULL'
    })
  }
  if (col.count > 0 && col.approxUnique <= 1) {
    hints.push({
      label: 'Constant',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      title: 'Single distinct value'
    })
  }
  if (isAtMaxLength(col)) {
    hints.push({
      label: 'Max length',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
      title: 'Values always at declared max length'
    })
  }
  return hints
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
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="flex flex-col items-center justify-center py-16">
    <Loader2 class="h-8 w-8 animate-spin text-teal-500" />
    <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">Analyzing summary statistics...</p>

    <p v-if="showSlowHint" class="mt-1 text-xs text-gray-500 dark:text-gray-500">
      Large datasets can take a while. Use a smaller Sample value for faster results.
    </p>

    <button
      type="button"
      class="mt-4 inline-flex items-center rounded-md bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 shadow-sm dark:shadow-gray-900/30 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      @click="emit('cancel')"
    >
      Cancel
    </button>
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
          @click="emit('retry')"
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
    <div class="flex flex-wrap gap-3">
      <div class="flex-1 min-w-[110px] rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
        <div
          class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-[11px] font-medium uppercase tracking-wide"
        >
          <Hash class="h-3.5 w-3.5 shrink-0" />
          <span class="truncate">Rows</span>
        </div>
        <div
          class="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100 truncate"
          :title="summary.rowCount.toLocaleString()"
        >
          {{ formatCompact(summary.rowCount) }}
        </div>
        <div v-if="summary.sampled" class="mt-0.5 text-[10px] text-amber-600 dark:text-amber-400">
          {{ summary.samplePercent }}% sample
        </div>
      </div>
      <div class="flex-1 min-w-[90px] rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
        <div
          class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-[11px] font-medium uppercase tracking-wide"
        >
          <BarChart3 class="h-3.5 w-3.5 shrink-0" />
          <span>Cols</span>
        </div>
        <div class="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {{ summary.columnCount }}
        </div>
      </div>
      <div class="flex-1 min-w-20 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
        <div
          class="text-gray-500 dark:text-gray-400 text-[11px] font-medium uppercase tracking-wide truncate"
        >
          Time
        </div>
        <div class="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {{
            summary.executionTimeMs >= 1000
              ? (summary.executionTimeMs / 1000).toFixed(1) + 's'
              : summary.executionTimeMs + 'ms'
          }}
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
                <div class="flex flex-col gap-1">
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
                  <div v-if="getDataQualityHints(col).length" class="flex flex-wrap gap-1">
                    <span
                      v-for="hint in getDataQualityHints(col)"
                      :key="`${col.name}-${hint.label}`"
                      :class="['px-1.5 py-0.5 text-[10px] font-medium rounded', hint.className]"
                      :title="hint.title"
                    >
                      {{ hint.label }}
                    </span>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span class="text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {{ col.type }}
                </span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-right">
                <span :class="['text-sm font-medium', getNullPercentageClass(col.nullPercentage)]">
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
    <div v-if="summary.columns.some((c) => isNumericColumn(c) && c.q25 != null)" class="space-y-3">
      <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">
        Numeric Column Distribution
      </h3>
      <div class="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="col in summary.columns.filter((c) => isNumericColumn(c) && c.q25 != null)"
          :key="`dist-${col.name}`"
          class="rounded-lg border border-gray-200 dark:border-gray-700 p-3"
        >
          <h4
            class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 truncate"
            :title="col.name"
          >
            {{ col.name }}
          </h4>
          <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <span class="text-gray-500 dark:text-gray-400">Min</span>
            <span
              class="font-mono text-gray-900 dark:text-gray-100 text-right truncate"
              :title="String(col.min)"
              >{{ formatValue(col.min) }}</span
            >
            <span class="text-gray-500 dark:text-gray-400">Q25</span>
            <span
              class="font-mono text-gray-900 dark:text-gray-100 text-right truncate"
              :title="String(col.q25)"
              >{{ formatValue(col.q25) }}</span
            >
            <span class="text-gray-500 dark:text-gray-400">Median</span>
            <span
              class="font-mono text-gray-900 dark:text-gray-100 text-right truncate"
              :title="String(col.q50)"
              >{{ formatValue(col.q50) }}</span
            >
            <span class="text-gray-500 dark:text-gray-400">Q75</span>
            <span
              class="font-mono text-gray-900 dark:text-gray-100 text-right truncate"
              :title="String(col.q75)"
              >{{ formatValue(col.q75) }}</span
            >
            <span class="text-gray-500 dark:text-gray-400">Max</span>
            <span
              class="font-mono text-gray-900 dark:text-gray-100 text-right truncate"
              :title="String(col.max)"
              >{{ formatValue(col.max) }}</span
            >
            <span
              class="text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-700"
              >Std</span
            >
            <span
              class="font-mono text-gray-900 dark:text-gray-100 text-right truncate pt-1 border-t border-gray-100 dark:border-gray-700"
              :title="String(col.std)"
              >{{ formatValue(col.std) }}</span
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
