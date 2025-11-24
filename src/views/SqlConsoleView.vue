<template>
  <div class="sql-console-view h-full flex flex-col bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div class="bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">SQL Console</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Execute SQL queries and explore your data
          </p>
        </div>

        <!-- Connection Selector -->
        <div class="flex items-center gap-4">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Connection:</label>
          <select
            v-model="selectedConnectionId"
            class="block w-64 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
            @change="handleConnectionChange"
          >
            <option value="">Select a connection...</option>
            <option v-for="conn in databaseConnections" :key="conn.id" :value="conn.id">
              {{ conn.name }} ({{ conn.type }})
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Query Editor Section -->
      <div
        class="flex flex-col border-r border-gray-200 dark:border-gray-700"
        :style="{ width: `${editorWidth}%` }"
      >
        <!-- Toolbar -->
        <div
          class="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-3"
        >
          <button
            :disabled="!selectedConnectionId || isExecuting"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="executeQuery"
          >
            <PlayIcon class="h-4 w-4 mr-2" />
            {{ isExecuting ? 'Executing...' : 'Execute (Ctrl+Enter)' }}
          </button>

          <button
            class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            @click="formatQuery"
          >
            <DocumentTextIcon class="h-4 w-4 mr-2" />
            Format
          </button>

          <button
            class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            @click="clearEditor"
          >
            <XMarkIcon class="h-4 w-4 mr-2" />
            Clear
          </button>

          <div class="flex-1"></div>

          <!-- Query Stats -->
          <div v-if="lastQueryStats" class="flex items-center gap-4 text-sm">
            <span class="text-gray-600 dark:text-gray-400">
              Rows:
              <span class="font-semibold text-gray-900 dark:text-gray-100">{{
                lastQueryStats.rowCount
              }}</span>
            </span>
            <span class="text-gray-600 dark:text-gray-400">
              Time:
              <span class="font-semibold text-gray-900 dark:text-gray-100"
                >{{ lastQueryStats.duration }}ms</span
              >
            </span>
          </div>
        </div>

        <!-- SQL Editor -->
        <div class="flex-1 overflow-hidden bg-white dark:bg-gray-900">
          <SqlEditor
            ref="sqlEditorRef"
            v-model="sqlQuery"
            :dialect="currentDialect"
            height="100%"
            :table-suggestions="tableSuggestions"
            :column-suggestions="columnSuggestions"
            @execute="executeQuery"
          />
        </div>
      </div>

      <!-- Resizable Divider -->
      <div
        class="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-teal-500 dark:hover:bg-teal-500 cursor-col-resize transition-colors relative group"
        @mousedown="startResize"
      >
        <!-- Visual grip indicator -->
        <div
          class="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-gray-300 dark:bg-gray-600 group-hover:bg-teal-500 transition-colors"
        ></div>
      </div>

      <!-- Results Panel -->
      <div
        class="flex flex-col bg-white dark:bg-gray-850"
        :style="{ width: `${100 - editorWidth}%` }"
      >
        <!-- Results Toolbar -->
        <div
          class="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-3"
        >
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Results</span>

          <div class="flex-1"></div>

          <button
            v-if="queryResults.length > 0"
            class="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            @click="exportResults('csv')"
          >
            <ArrowDownTrayIcon class="h-4 w-4 mr-1" />
            Export CSV
          </button>

          <button
            v-if="queryResults.length > 0"
            class="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            @click="exportResults('json')"
          >
            <ArrowDownTrayIcon class="h-4 w-4 mr-1" />
            Export JSON
          </button>
        </div>

        <!-- Results Display -->
        <div class="flex-1 overflow-auto p-4">
          <!-- Empty State -->
          <div
            v-if="!hasExecutedQuery"
            class="h-full flex items-center justify-center text-gray-400 dark:text-gray-500"
          >
            <div class="text-center">
              <CommandLineIcon class="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p class="text-lg font-medium">No query executed yet</p>
              <p class="text-sm mt-2">Select a connection and execute a query to see results</p>
            </div>
          </div>

          <!-- Error Display -->
          <div
            v-else-if="queryError"
            class="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4"
          >
            <div class="flex">
              <div class="flex-shrink-0">
                <XCircleIcon class="h-5 w-5 text-red-400 dark:text-red-500" />
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800 dark:text-red-200">Query Error</h3>
                <div class="mt-2 text-sm text-red-700 dark:text-red-300">
                  <pre class="whitespace-pre-wrap font-mono text-xs">{{ queryError }}</pre>
                </div>
              </div>
            </div>
          </div>

          <!-- Results Table -->
          <div
            v-else-if="queryResults.length > 0"
            class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th
                      v-for="column in resultColumns"
                      :key="column"
                      class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {{ column }}
                    </th>
                  </tr>
                </thead>
                <tbody
                  class="bg-white dark:bg-gray-850 divide-y divide-gray-200 dark:divide-gray-700"
                >
                  <tr
                    v-for="(row, rowIndex) in paginatedResults"
                    :key="rowIndex"
                    class="hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td
                      v-for="column in resultColumns"
                      :key="column"
                      class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
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
              class="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between"
            >
              <div class="text-sm text-gray-700 dark:text-gray-300">
                Showing {{ (currentPage - 1) * pageSize + 1 }} to
                {{ Math.min(currentPage * pageSize, queryResults.length) }} of
                {{ queryResults.length }} results
              </div>
              <div class="flex gap-2">
                <button
                  :disabled="currentPage === 1"
                  class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50"
                  @click="currentPage--"
                >
                  Previous
                </button>
                <button
                  :disabled="currentPage === totalPages"
                  class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50"
                  @click="currentPage++"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <!-- No Results -->
          <div
            v-else
            class="h-full flex items-center justify-center text-gray-400 dark:text-gray-500"
          >
            <div class="text-center">
              <CheckCircleIcon class="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p class="text-lg font-medium">Query executed successfully</p>
              <p class="text-sm mt-2">No rows returned</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { SqlEditor } from '@/components/monaco'
import { useConnectionsStore } from '@/stores/connections'
import {
  PlayIcon,
  DocumentTextIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  CommandLineIcon,
  XCircleIcon,
  CheckCircleIcon
} from '@heroicons/vue/24/outline'

const connectionsStore = useConnectionsStore()

// State
const selectedConnectionId = ref('')
const sqlQuery = ref('SELECT * FROM users LIMIT 10;')
const isExecuting = ref(false)
const hasExecutedQuery = ref(false)
const queryError = ref<string | null>(null)
const queryResults = ref<any[]>([])
const resultColumns = ref<string[]>([])
const lastQueryStats = ref<{ rowCount: number; duration: number } | null>(null)
const currentPage = ref(1)
const pageSize = ref(50)
const sqlEditorRef = ref()

// Resizable panel state
const editorWidth = ref(50) // percentage
const isResizing = ref(false)

// Computed
const databaseConnections = computed(() => {
  return connectionsStore.connections.filter((conn) => {
    const type = conn.type?.toLowerCase() || ''
    // Only show actual database connections, not file-based
    return !type.includes('file') && !type.includes('s3')
  })
})

const selectedConnection = computed(() => {
  return connectionsStore.connectionByID(selectedConnectionId.value)
})

const currentDialect = computed(() => {
  return selectedConnection.value?.type?.toLowerCase() || 'sql'
})

const tableSuggestions = ref<string[]>([])
const columnSuggestions = ref<Record<string, string[]>>({})

const paginatedResults = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return queryResults.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(queryResults.value.length / pageSize.value)
})

// Methods
const handleConnectionChange = async () => {
  // Reset results when connection changes
  queryResults.value = []
  resultColumns.value = []
  queryError.value = null
  hasExecutedQuery.value = false
  lastQueryStats.value = null
  currentPage.value = 1

  // Load table suggestions for autocomplete
  if (selectedConnectionId.value) {
    await loadTableSuggestions()
  } else {
    tableSuggestions.value = []
    columnSuggestions.value = {}
  }
}

const loadTableSuggestions = async () => {
  try {
    // TODO: Implement API call to fetch tables
    // For now, use placeholder data
    tableSuggestions.value = ['users', 'orders', 'products', 'customers']
    columnSuggestions.value = {
      users: ['id', 'name', 'email', 'created_at'],
      orders: ['id', 'user_id', 'total', 'status'],
      products: ['id', 'name', 'price', 'stock'],
      customers: ['id', 'name', 'email', 'phone']
    }
  } catch (error) {
    console.error('Failed to load table suggestions:', error)
  }
}

const executeQuery = async () => {
  if (!selectedConnectionId.value || !sqlQuery.value.trim()) {
    return
  }

  isExecuting.value = true
  queryError.value = null
  hasExecutedQuery.value = true
  const startTime = Date.now()

  try {
    // TODO: Implement actual API call to execute query
    // For now, simulate query execution
    await simulateQueryExecution()

    const duration = Date.now() - startTime
    lastQueryStats.value = {
      rowCount: queryResults.value.length,
      duration
    }
    currentPage.value = 1
  } catch (error: any) {
    queryError.value = error.message || 'Failed to execute query'
    queryResults.value = []
    resultColumns.value = []
    lastQueryStats.value = null
  } finally {
    isExecuting.value = false
  }
}

// Temporary simulation - replace with actual API call
const simulateQueryExecution = async (): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock data
      queryResults.value = [
        { id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2024-01-15' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', created_at: '2024-01-16' },
        { id: 3, name: 'Bob Wilson', email: 'bob@example.com', created_at: '2024-01-17' }
      ]
      resultColumns.value = ['id', 'name', 'email', 'created_at']
      resolve()
    }, 500)
  })
}

const formatQuery = () => {
  sqlEditorRef.value?.formatQuery()
}

const clearEditor = () => {
  sqlQuery.value = ''
  queryResults.value = []
  resultColumns.value = []
  queryError.value = null
  hasExecutedQuery.value = false
  lastQueryStats.value = null
}

const exportResults = (format: 'csv' | 'json') => {
  if (queryResults.value.length === 0) return

  let content = ''
  let filename = ''
  let mimeType = ''

  if (format === 'csv') {
    // Generate CSV
    const headers = resultColumns.value.join(',')
    const rows = queryResults.value.map((row) =>
      resultColumns.value.map((col) => JSON.stringify(row[col] ?? '')).join(',')
    )
    content = [headers, ...rows].join('\n')
    filename = 'query-results.csv'
    mimeType = 'text/csv'
  } else {
    // Generate JSON
    content = JSON.stringify(queryResults.value, null, 2)
    filename = 'query-results.json'
    mimeType = 'application/json'
  }

  // Download file
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const formatCellValue = (value: any): string => {
  if (value === null || value === undefined) {
    return 'NULL'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

// Resize handlers
const startResize = (e: MouseEvent) => {
  isResizing.value = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
}

const handleResize = (e: MouseEvent) => {
  if (!isResizing.value) return

  const container = document.querySelector('.sql-console-view')
  if (!container) return

  const containerRect = container.getBoundingClientRect()
  const containerWidth = containerRect.width
  const mouseX = e.clientX - containerRect.left

  // Calculate percentage, constrain between 20% and 80%
  let newWidth = (mouseX / containerWidth) * 100
  newWidth = Math.max(20, Math.min(80, newWidth))

  editorWidth.value = newWidth
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

onMounted(async () => {
  await connectionsStore.refreshConnections()
})

onUnmounted(() => {
  // Cleanup resize listeners
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<style scoped>
.sql-console-view {
  @apply min-h-screen;
}
</style>
