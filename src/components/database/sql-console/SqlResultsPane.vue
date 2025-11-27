<template>
  <div class="flex flex-col bg-white dark:bg-gray-850 min-h-0 h-full">
    <!-- Results Toolbar -->
    <div
      class="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-1.5 flex items-center gap-2"
    >
      <span class="text-xs font-medium text-gray-600 dark:text-gray-400">Results</span>

      <div class="flex-1"></div>

      <!-- Export Buttons -->
      <template v-if="rows.length > 0">
        <!-- Primary: CSV -->
        <button
          class="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          title="Export as CSV"
          @click="exportResults('csv')"
        >
          <ArrowDownTrayIcon class="h-3.5 w-3.5 mr-1" />
          CSV
        </button>

        <!-- Primary: JSON -->
        <button
          class="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          title="Export as JSON"
          @click="exportResults('json')"
        >
          <ArrowDownTrayIcon class="h-3.5 w-3.5 mr-1" />
          JSON
        </button>

        <!-- More Formats Dropdown -->
        <div class="relative">
          <button
            class="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            title="More export formats"
            @click="showExportMenu = !showExportMenu"
          >
            <EllipsisHorizontalIcon class="h-3.5 w-3.5" />
          </button>

          <!-- Dropdown Menu -->
          <div
            v-if="showExportMenu"
            class="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10"
            @mouseleave="showExportMenu = false"
          >
            <button
              v-for="format in moreExportFormats"
              :key="format.id"
              class="w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-md last:rounded-b-md"
              @click="exportResults(format.id)"
            >
              {{ format.label }}
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Results Display -->
    <div class="flex-1 overflow-auto">
      <!-- Empty State -->
      <div
        v-if="!hasExecuted"
        class="h-full flex items-center justify-center text-gray-400 dark:text-gray-500"
      >
        <div class="text-center">
          <CommandLineIcon class="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
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
          <XCircleIcon class="h-4 w-4 text-red-400 dark:text-red-500 shrink-0" />
          <div class="ml-2">
            <h3 class="text-xs font-medium text-red-800 dark:text-red-200">Query Error</h3>
            <pre
              class="mt-1 whitespace-pre-wrap font-mono text-xs text-red-700 dark:text-red-300"
              >{{ error }}</pre
            >
          </div>
        </div>
      </div>

      <!-- Results Table -->
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

        <!-- Pagination -->
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
          <CheckCircleIcon class="h-12 w-12 mx-auto mb-3 text-green-300 dark:text-green-600" />
          <p class="text-sm font-medium">Query executed successfully</p>
          <p class="text-xs mt-1">No rows returned</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ArrowDownTrayIcon,
  CommandLineIcon,
  XCircleIcon,
  CheckCircleIcon,
  EllipsisHorizontalIcon
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  columns: string[]
  rows: Record<string, unknown>[]
  error: string | null
  hasExecuted: boolean
  currentPage: number
  pageSize: number
}>()

defineEmits<{
  'update:currentPage': [page: number]
}>()

// Export menu state
const showExportMenu = ref(false)

// Available export formats
type ExportFormat = 'csv' | 'json' | 'jsonl' | 'tsv' | 'sql' | 'markdown'

// More formats for the dropdown (excluding primary CSV/JSON)
const moreExportFormats: { id: ExportFormat; label: string }[] = [
  { id: 'jsonl', label: 'JSONL' },
  { id: 'tsv', label: 'TSV' },
  { id: 'sql', label: 'SQL INSERT' },
  { id: 'markdown', label: 'Markdown' }
]

const paginatedRows = computed(() => {
  const start = (props.currentPage - 1) * props.pageSize
  const end = start + props.pageSize
  return props.rows.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(props.rows.length / props.pageSize)
})

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

function escapeCSV(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function escapeSQLValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  const str = String(value)
  return `'${str.replace(/'/g, "''")}'`
}

function escapeMarkdown(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  // Escape pipe characters
  return str.replace(/\|/g, '\\|')
}

function exportResults(format: ExportFormat) {
  if (props.rows.length === 0) return
  showExportMenu.value = false

  let content = ''
  let filename = ''
  let mimeType = ''

  switch (format) {
    case 'csv': {
      const headers = props.columns.map((c) => escapeCSV(c)).join(',')
      const rows = props.rows.map((row) =>
        props.columns.map((col) => escapeCSV(row[col])).join(',')
      )
      content = [headers, ...rows].join('\n')
      filename = 'query-results.csv'
      mimeType = 'text/csv'
      break
    }

    case 'json': {
      content = JSON.stringify(props.rows, null, 2)
      filename = 'query-results.json'
      mimeType = 'application/json'
      break
    }

    case 'jsonl': {
      // JSON Lines - one JSON object per line
      content = props.rows.map((row) => JSON.stringify(row)).join('\n')
      filename = 'query-results.jsonl'
      mimeType = 'application/x-ndjson'
      break
    }

    case 'tsv': {
      // Tab-separated values
      const headers = props.columns.join('\t')
      const rows = props.rows.map((row) =>
        props.columns.map((col) => String(row[col] ?? '')).join('\t')
      )
      content = [headers, ...rows].join('\n')
      filename = 'query-results.tsv'
      mimeType = 'text/tab-separated-values'
      break
    }

    case 'sql': {
      // SQL INSERT statements
      const tableName = 'exported_data'
      const columnList = props.columns.join(', ')
      const inserts = props.rows.map((row) => {
        const values = props.columns.map((col) => escapeSQLValue(row[col])).join(', ')
        return `INSERT INTO ${tableName} (${columnList}) VALUES (${values});`
      })
      content = inserts.join('\n')
      filename = 'query-results.sql'
      mimeType = 'application/sql'
      break
    }

    case 'markdown': {
      // Markdown table
      const header = `| ${props.columns.join(' | ')} |`
      const separator = `| ${props.columns.map(() => '---').join(' | ')} |`
      const rows = props.rows.map(
        (row) => `| ${props.columns.map((col) => escapeMarkdown(row[col])).join(' | ')} |`
      )
      content = [header, separator, ...rows].join('\n')
      filename = 'query-results.md'
      mimeType = 'text/markdown'
      break
    }
  }

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
</script>
