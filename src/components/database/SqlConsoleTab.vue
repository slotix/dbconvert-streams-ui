<template>
  <div class="sql-console-tab h-full flex flex-col bg-gray-50 dark:bg-gray-900">
    <!-- Header with context info -->
    <div
      class="bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between"
    >
      <div class="flex items-center gap-3">
        <CommandLineIcon class="h-5 w-5 text-teal-500" />
        <div>
          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">SQL Console</span>
          <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">
            {{ scopeLabel }}
          </span>
        </div>
      </div>

      <!-- Database selector for connection-scoped consoles -->
      <div v-if="!database" class="flex items-center gap-2">
        <label class="text-xs text-gray-500 dark:text-gray-400">Database:</label>
        <select
          v-model="selectedDatabase"
          class="block w-48 text-xs rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-teal-500 focus:ring-teal-500"
        >
          <option value="">No database selected</option>
          <option v-for="db in availableDatabases" :key="db" :value="db">
            {{ db }}
          </option>
        </select>
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
          class="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-1.5 flex items-center gap-2"
        >
          <button
            :disabled="isExecuting"
            class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="executeQuery"
          >
            <PlayIcon class="h-3.5 w-3.5 mr-1.5" />
            {{ isExecuting ? 'Running...' : 'Run' }}
          </button>

          <span class="text-xs text-gray-400 dark:text-gray-500">Ctrl+Enter</span>

          <div class="flex-1"></div>

          <!-- Query Stats -->
          <div v-if="lastQueryStats" class="flex items-center gap-3 text-xs">
            <span class="text-gray-500 dark:text-gray-400">
              <span class="font-medium text-gray-700 dark:text-gray-300">{{
                lastQueryStats.rowCount
              }}</span>
              rows
            </span>
            <span class="text-gray-500 dark:text-gray-400">
              <span class="font-medium text-gray-700 dark:text-gray-300"
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
        class="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-teal-500 dark:hover:bg-teal-500 cursor-col-resize transition-colors"
        @mousedown="startResize"
      ></div>

      <!-- Results Panel -->
      <div
        class="flex flex-col bg-white dark:bg-gray-850"
        :style="{ width: `${100 - editorWidth}%` }"
      >
        <!-- Results Toolbar -->
        <div
          class="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-1.5 flex items-center gap-2"
        >
          <span class="text-xs font-medium text-gray-600 dark:text-gray-400">Results</span>

          <div class="flex-1"></div>

          <button
            v-if="queryResults.length > 0"
            class="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            @click="exportResults('csv')"
          >
            <ArrowDownTrayIcon class="h-3.5 w-3.5 mr-1" />
            CSV
          </button>

          <button
            v-if="queryResults.length > 0"
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
            v-if="!hasExecutedQuery"
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
            v-else-if="queryError"
            class="m-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3"
          >
            <div class="flex">
              <XCircleIcon class="h-4 w-4 text-red-400 dark:text-red-500 shrink-0" />
              <div class="ml-2">
                <h3 class="text-xs font-medium text-red-800 dark:text-red-200">Query Error</h3>
                <pre
                  class="mt-1 whitespace-pre-wrap font-mono text-xs text-red-700 dark:text-red-300"
                  >{{ queryError }}</pre
                >
              </div>
            </div>
          </div>

          <!-- Results Table -->
          <div
            v-else-if="queryResults.length > 0"
            class="border-t border-gray-200 dark:border-gray-700"
          >
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th
                      v-for="column in resultColumns"
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
                    v-for="(row, rowIndex) in paginatedResults"
                    :key="rowIndex"
                    class="hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td
                      v-for="column in resultColumns"
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
                  Math.min(currentPage * pageSize, queryResults.length)
                }}
                of {{ queryResults.length }}
              </div>
              <div class="flex gap-1">
                <button
                  :disabled="currentPage === 1"
                  class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs disabled:opacity-50"
                  @click="currentPage--"
                >
                  Prev
                </button>
                <button
                  :disabled="currentPage === totalPages"
                  class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs disabled:opacity-50"
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
              <CheckCircleIcon class="h-12 w-12 mx-auto mb-3 text-green-300 dark:text-green-600" />
              <p class="text-sm font-medium">Query executed successfully</p>
              <p class="text-xs mt-1">No rows returned</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { SqlEditor } from '@/components/monaco'
import { useConnectionsStore } from '@/stores/connections'
import connections from '@/api/connections'
import {
  PlayIcon,
  ArrowDownTrayIcon,
  CommandLineIcon,
  XCircleIcon,
  CheckCircleIcon
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  connectionId: string
  database?: string // If provided, console is database-scoped
  sqlScope: 'database' | 'connection'
}>()

const connectionsStore = useConnectionsStore()

// State
const sqlQuery = ref('')
const isExecuting = ref(false)
const hasExecutedQuery = ref(false)
const queryError = ref<string | null>(null)
const queryResults = ref<Record<string, unknown>[]>([])
const resultColumns = ref<string[]>([])
const lastQueryStats = ref<{ rowCount: number; duration: number } | null>(null)
const currentPage = ref(1)
const pageSize = ref(100)
const sqlEditorRef = ref()

// For connection-scoped console: track selected database
const selectedDatabase = ref(props.database || '')
const availableDatabases = ref<string[]>([])

// Resizable panel state
const editorWidth = ref(50)
const isResizing = ref(false)

// Computed
const connection = computed(() => connectionsStore.connectionByID(props.connectionId))

const currentDialect = computed(() => {
  return connection.value?.type?.toLowerCase() || 'sql'
})

const scopeLabel = computed(() => {
  if (props.database) {
    return `${connection.value?.name || 'Connection'} → ${props.database}`
  }
  return connection.value?.name || 'Connection'
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

// Load databases for connection-scoped console
async function loadDatabases() {
  if (props.database) return // Don't need this for database-scoped console

  try {
    const dbs = await connections.getDatabases(props.connectionId)
    availableDatabases.value = dbs.map((d) => d.name)
  } catch (error) {
    console.error('Failed to load databases:', error)
  }
}

// Load table suggestions for autocomplete
async function loadTableSuggestions() {
  const db = props.database || selectedDatabase.value
  if (!db) {
    tableSuggestions.value = []
    columnSuggestions.value = {}
    return
  }

  try {
    const metadata = await connections.getMetadata(props.connectionId, db)
    // metadata.tables is Record<string, SQLTableMeta>
    tableSuggestions.value = Object.keys(metadata.tables)

    // Build column suggestions map
    const colMap: Record<string, string[]> = {}
    for (const [tableName, table] of Object.entries(metadata.tables)) {
      colMap[tableName] = table.columns.map((c: { name: string }) => c.name)
    }
    columnSuggestions.value = colMap
  } catch (error) {
    console.error('Failed to load table suggestions:', error)
  }
}

// Execute query
async function executeQuery() {
  const query = sqlQuery.value.trim()
  if (!query) return

  isExecuting.value = true
  queryError.value = null
  hasExecutedQuery.value = true
  const startTime = Date.now()

  try {
    const db = props.database || selectedDatabase.value

    // Call the API
    const result = await connections.executeQuery(props.connectionId, query, db || undefined)

    // Process results
    if (result.columns && result.rows) {
      resultColumns.value = result.columns
      queryResults.value = result.rows.map((row) => {
        const obj: Record<string, unknown> = {}
        result.columns.forEach((col, idx) => {
          obj[col] = row[idx]
        })
        return obj
      })
    } else {
      resultColumns.value = []
      queryResults.value = []
    }

    const duration = Date.now() - startTime
    lastQueryStats.value = {
      rowCount: queryResults.value.length,
      duration
    }
    currentPage.value = 1
  } catch (error: unknown) {
    const err = error as Error
    queryError.value = err.message || 'Failed to execute query'
    queryResults.value = []
    resultColumns.value = []
    lastQueryStats.value = null
  } finally {
    isExecuting.value = false
  }
}

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'NULL'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

const exportResults = (format: 'csv' | 'json') => {
  if (queryResults.value.length === 0) return

  let content = ''
  let filename = ''
  let mimeType = ''

  if (format === 'csv') {
    const headers = resultColumns.value.join(',')
    const rows = queryResults.value.map((row) =>
      resultColumns.value.map((col) => JSON.stringify(row[col] ?? '')).join(',')
    )
    content = [headers, ...rows].join('\n')
    filename = 'query-results.csv'
    mimeType = 'text/csv'
  } else {
    content = JSON.stringify(queryResults.value, null, 2)
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

// Resize handlers
const startResize = (e: MouseEvent) => {
  isResizing.value = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
}

const handleResize = (e: MouseEvent) => {
  if (!isResizing.value) return

  const container = document.querySelector('.sql-console-tab')
  if (!container) return

  const containerRect = container.getBoundingClientRect()
  const containerWidth = containerRect.width
  const mouseX = e.clientX - containerRect.left

  let newWidth = (mouseX / containerWidth) * 100
  newWidth = Math.max(25, Math.min(75, newWidth))

  editorWidth.value = newWidth
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

// Watch for database changes to reload suggestions
watch(
  () => selectedDatabase.value,
  () => {
    loadTableSuggestions()
  }
)

onMounted(async () => {
  await loadDatabases()
  await loadTableSuggestions()

  // Set default query hint based on scope
  if (props.database) {
    sqlQuery.value = `-- Database: ${props.database}\nSELECT * FROM  LIMIT 100;`
  } else {
    sqlQuery.value = `-- Use: USE database_name; or prefix tables with database.table\nSHOW DATABASES;`
  }
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<style scoped>
.sql-console-tab {
  min-height: 400px;
}
</style>
