<template>
  <div class="flex flex-col bg-white dark:bg-gray-850 min-h-0 h-full">
    <!-- Results Toolbar -->
    <div
      class="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-1.5 flex items-center gap-2"
    >
      <span class="text-xs font-medium text-gray-600 dark:text-gray-400">Results</span>

      <div class="flex-1"></div>

      <button
        v-if="rows.length > 0"
        class="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        @click="exportResults('csv')"
      >
        <ArrowDownTrayIcon class="h-3.5 w-3.5 mr-1" />
        CSV
      </button>

      <button
        v-if="rows.length > 0"
        class="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        @click="exportResults('json')"
      >
        <ArrowDownTrayIcon class="h-3.5 w-3.5 mr-1" />
        JSON
      </button>
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
import { computed } from 'vue'
import {
  ArrowDownTrayIcon,
  CommandLineIcon,
  XCircleIcon,
  CheckCircleIcon
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

function exportResults(format: 'csv' | 'json') {
  if (props.rows.length === 0) return

  let content = ''
  let filename = ''
  let mimeType = ''

  if (format === 'csv') {
    const headers = props.columns.join(',')
    const rows = props.rows.map((row) =>
      props.columns.map((col) => JSON.stringify(row[col] ?? '')).join(',')
    )
    content = [headers, ...rows].join('\n')
    filename = 'query-results.csv'
    mimeType = 'text/csv'
  } else {
    content = JSON.stringify(props.rows, null, 2)
    filename = 'query-results.json'
    mimeType = 'application/json'
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
