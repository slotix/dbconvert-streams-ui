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
      className: 'ui-chip-muted',
      title: 'Single distinct value'
    })
  }
  if (isAtMaxLength(col)) {
    hints.push({
      label: 'Max length',
      className: 'ui-chip-muted',
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
  return 'text-red-600 dark:text-red-300'
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
      return 'ui-chip-muted'
    case 'low':
      return 'ui-chip-muted'
    case 'empty':
      return 'ui-chip-muted'
    default:
      return 'ui-chip-muted'
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
    <Loader2 class="ui-accent-icon h-8 w-8 animate-spin" />
    <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">Analyzing summary statistics...</p>

    <p v-if="showSlowHint" class="mt-1 text-xs text-gray-500 dark:text-gray-500">
      Large datasets can take a while. Use a smaller Sample value for faster results.
    </p>

    <button
      type="button"
      class="ui-surface-raised ui-border-default ui-accent-action mt-4 inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors dark:text-gray-300 dark:shadow-gray-900/30"
      @click="emit('cancel')"
    >
      Cancel
    </button>
  </div>

  <!-- Error State -->
  <div
    v-else-if="error"
    class="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/70 p-6"
  >
    <div class="flex items-start gap-3">
      <AlertCircle class="h-5 w-5 text-red-500 dark:text-red-300 shrink-0 mt-0.5" />
      <div>
        <h3 class="text-sm font-medium text-red-800 dark:text-red-200">Failed to load summary</h3>
        <p class="mt-1 text-sm text-red-700 dark:text-red-100/95">{{ error }}</p>
        <button
          type="button"
          class="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 dark:text-red-100 hover:text-red-800 dark:hover:text-red-50"
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
      <div class="ui-surface-muted ui-border-muted flex-1 min-w-[110px] rounded-lg border p-3">
        <div
          class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-[11px] font-medium uppercase tracking-wide"
        >
          <Hash class="h-3.5 w-3.5 shrink-0" />
          <span class="truncate">Rows</span>
        </div>
        <div
          v-tooltip="summary.rowCount.toLocaleString()"
          class="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100 truncate"
        >
          {{ formatCompact(summary.rowCount) }}
        </div>
        <div v-if="summary.sampled" class="mt-0.5 text-[10px] text-amber-600 dark:text-amber-400">
          {{ summary.samplePercent }}% sample
        </div>
      </div>
      <div class="ui-surface-muted ui-border-muted flex-1 min-w-[90px] rounded-lg border p-3">
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
      <div class="ui-surface-muted ui-border-muted flex-1 min-w-20 rounded-lg border p-3">
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
    <div class="ui-surface-raised ui-border-default overflow-hidden rounded-lg border">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y [border-color:var(--ui-border-default)]">
          <thead class="ui-surface-toolbar">
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
          <tbody class="ui-surface-raised divide-y [border-color:var(--ui-border-default)]">
            <tr
              v-for="col in summary.columns"
              :key="col.name"
              class="hover:bg-[var(--ui-surface-muted)]"
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
                      v-tooltip="hint.title"
                      :class="['px-1.5 py-0.5 text-[10px] font-medium rounded', hint.className]"
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
                  v-tooltip="String(col.min)"
                  class="text-sm text-gray-600 dark:text-gray-300 font-mono"
                >
                  {{ formatValue(col.min) }}
                </span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  v-tooltip="String(col.max)"
                  class="text-sm text-gray-600 dark:text-gray-300 font-mono"
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
          class="ui-surface-raised ui-border-default rounded-lg border p-3"
        >
          <h4
            v-tooltip="col.name"
            class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 truncate"
          >
            {{ col.name }}
          </h4>
          <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <span class="text-gray-500 dark:text-gray-400">Min</span>
            <span
              v-tooltip="String(col.min)"
              class="font-mono text-gray-900 dark:text-gray-100 text-right truncate"
              >{{ formatValue(col.min) }}</span
            >
            <span class="text-gray-500 dark:text-gray-400">Q25</span>
            <span
              v-tooltip="String(col.q25)"
              class="font-mono text-gray-900 dark:text-gray-100 text-right truncate"
              >{{ formatValue(col.q25) }}</span
            >
            <span class="text-gray-500 dark:text-gray-400">Median</span>
            <span
              v-tooltip="String(col.q50)"
              class="font-mono text-gray-900 dark:text-gray-100 text-right truncate"
              >{{ formatValue(col.q50) }}</span
            >
            <span class="text-gray-500 dark:text-gray-400">Q75</span>
            <span
              v-tooltip="String(col.q75)"
              class="font-mono text-gray-900 dark:text-gray-100 text-right truncate"
              >{{ formatValue(col.q75) }}</span
            >
            <span class="text-gray-500 dark:text-gray-400">Max</span>
            <span
              v-tooltip="String(col.max)"
              class="font-mono text-gray-900 dark:text-gray-100 text-right truncate"
              >{{ formatValue(col.max) }}</span
            >
            <span
              class="text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-700"
              >Std</span
            >
            <span
              v-tooltip="String(col.std)"
              class="font-mono text-gray-900 dark:text-gray-100 text-right truncate pt-1 border-t border-gray-100 dark:border-gray-700"
              >{{ formatValue(col.std) }}</span
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
