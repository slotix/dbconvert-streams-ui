<template>
  <div class="sql-console-tab h-full flex flex-col bg-gray-50 dark:bg-gray-900 pb-2">
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

    <!-- Query Tabs Bar -->
    <div
      class="bg-gray-100 dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700 flex items-center"
    >
      <div class="flex-1 flex items-center overflow-x-auto scrollbar-thin">
        <div
          v-for="tab in queryTabs"
          :key="tab.id"
          class="group flex items-center gap-1 px-3 py-1.5 border-r border-gray-200 dark:border-gray-700 cursor-pointer text-xs transition-colors min-w-0"
          :class="[
            tab.id === activeQueryTabId
              ? 'bg-white dark:bg-gray-900 text-teal-600 dark:text-teal-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          ]"
          @click="setActiveQueryTab(tab.id)"
          @dblclick="startRenameTab(tab)"
        >
          <span v-if="renamingTabId !== tab.id" class="truncate max-w-[120px]">{{ tab.name }}</span>
          <input
            v-else
            ref="renameInputRef"
            v-model="renameValue"
            type="text"
            class="w-24 px-1 py-0 text-xs bg-white dark:bg-gray-800 border border-teal-500 rounded focus:outline-none"
            @blur="finishRenameTab"
            @keydown.enter="finishRenameTab"
            @keydown.escape="cancelRenameTab"
            @click.stop
          />
          <button
            v-if="queryTabs.length > 1 && renamingTabId !== tab.id"
            class="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity"
            title="Close tab"
            @click.stop="closeQueryTab(tab.id)"
          >
            <XMarkIcon class="h-3 w-3" />
          </button>
        </div>
      </div>
      <!-- Add Tab Button -->
      <button
        class="px-2 py-1.5 text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        title="New Query Tab"
        @click="addQueryTab"
      >
        <PlusIcon class="h-4 w-4" />
      </button>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex overflow-hidden min-h-0">
      <!-- Query Editor Section -->
      <div
        class="flex flex-col border-r border-gray-200 dark:border-gray-700 min-h-0"
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

          <button
            class="inline-flex items-center px-2 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            title="Format SQL (Shift+Alt+F)"
            @click="formatQuery"
          >
            <CodeBracketIcon class="h-3.5 w-3.5" />
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
            :schema-context="schemaContext"
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
        class="flex flex-col bg-white dark:bg-gray-850 min-h-0"
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { SqlEditor } from '@/components/monaco'
import type { SchemaContext } from '@/composables/useMonacoSqlProviders'
import { useConnectionsStore } from '@/stores/connections'
import { useSqlConsoleStore, type SqlQueryTab } from '@/stores/sqlConsole'
import connections from '@/api/connections'
import { format as formatSQL } from 'sql-formatter'
import {
  PlayIcon,
  ArrowDownTrayIcon,
  CommandLineIcon,
  XCircleIcon,
  CheckCircleIcon,
  CodeBracketIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  connectionId: string
  database?: string // If provided, console is database-scoped
  sqlScope: 'database' | 'connection'
}>()

const connectionsStore = useConnectionsStore()
const sqlConsoleStore = useSqlConsoleStore()

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

// Tab renaming state
const renamingTabId = ref<string | null>(null)
const renameValue = ref('')
const renameInputRef = ref<HTMLInputElement[]>()

// Query tabs - computed from store
const queryTabs = computed(() => sqlConsoleStore.getTabs(props.connectionId, props.database))
const activeQueryTabId = computed(() =>
  sqlConsoleStore.getActiveTabId(props.connectionId, props.database)
)
const activeQueryTab = computed(() =>
  sqlConsoleStore.getActiveTab(props.connectionId, props.database)
)

// Sync sqlQuery with active tab and restore cached results
watch(
  activeQueryTab,
  (tab) => {
    if (tab) {
      sqlQuery.value = tab.query

      // Restore cached results if available
      const cached = sqlConsoleStore.getResultCache(tab.id)
      if (cached) {
        hasExecutedQuery.value = true
        queryError.value = cached.error
        queryResults.value = cached.rows
        resultColumns.value = cached.columns
        lastQueryStats.value = cached.stats
        currentPage.value = 1
      } else {
        // No cached results - reset to empty state
        hasExecutedQuery.value = false
        queryError.value = null
        queryResults.value = []
        resultColumns.value = []
        lastQueryStats.value = null
        currentPage.value = 1
      }
    }
  },
  { immediate: true }
)

// Save query content to store when it changes (debounced)
let saveTimeout: ReturnType<typeof setTimeout> | null = null
watch(sqlQuery, (newQuery) => {
  const tabId = activeQueryTabId.value
  if (tabId) {
    // Debounce saving to avoid excessive localStorage writes
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      sqlConsoleStore.updateTabQuery(props.connectionId, props.database, tabId, newQuery)
    }, 500)
  }
})

// Query tab management functions
function setActiveQueryTab(tabId: string) {
  // Save current query before switching
  const currentTabId = activeQueryTabId.value
  if (currentTabId) {
    sqlConsoleStore.updateTabQuery(props.connectionId, props.database, currentTabId, sqlQuery.value)
  }
  sqlConsoleStore.setActiveTab(props.connectionId, props.database, tabId)
}

function addQueryTab() {
  // Save current query before adding new tab
  const currentTabId = activeQueryTabId.value
  if (currentTabId) {
    sqlConsoleStore.updateTabQuery(props.connectionId, props.database, currentTabId, sqlQuery.value)
  }
  sqlConsoleStore.addTab(props.connectionId, props.database)
}

function closeQueryTab(tabId: string) {
  sqlConsoleStore.closeTab(props.connectionId, props.database, tabId)
}

function startRenameTab(tab: SqlQueryTab) {
  renamingTabId.value = tab.id
  renameValue.value = tab.name
  nextTick(() => {
    const inputs = renameInputRef.value
    if (inputs && inputs.length > 0) {
      inputs[0].focus()
      inputs[0].select()
    }
  })
}

function finishRenameTab() {
  if (renamingTabId.value && renameValue.value.trim()) {
    sqlConsoleStore.renameTab(
      props.connectionId,
      props.database,
      renamingTabId.value,
      renameValue.value.trim()
    )
  }
  renamingTabId.value = null
  renameValue.value = ''
}

function cancelRenameTab() {
  renamingTabId.value = null
  renameValue.value = ''
}

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

// Schema context for Monaco autocomplete
const tablesList = ref<Array<{ name: string; schema?: string }>>([])
const columnsMap = ref<Record<string, Array<{ name: string; type: string; nullable: boolean }>>>({})

// Build SchemaContext for SqlEditor autocomplete
const schemaContext = computed<SchemaContext>(() => {
  const dialect = currentDialect.value
  let sqlDialect: 'mysql' | 'pgsql' | 'sql' = 'sql'
  if (dialect.includes('mysql')) sqlDialect = 'mysql'
  else if (dialect.includes('postgres') || dialect.includes('pgsql')) sqlDialect = 'pgsql'

  return {
    tables: tablesList.value,
    columns: columnsMap.value,
    dialect: sqlDialect
  }
})

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

// Load table and column suggestions for autocomplete
async function loadTableSuggestions() {
  const db = props.database || selectedDatabase.value
  if (!db) {
    tablesList.value = []
    columnsMap.value = {}
    return
  }

  try {
    const metadata = await connections.getMetadata(props.connectionId, db)
    // metadata.tables is Record<string, SQLTableMeta>
    // Build tables list for SchemaContext
    tablesList.value = Object.keys(metadata.tables).map((name) => ({ name }))

    // Build columns map with type info for SchemaContext
    const colMap: Record<string, Array<{ name: string; type: string; nullable: boolean }>> = {}
    for (const [tableName, table] of Object.entries(metadata.tables)) {
      colMap[tableName] = table.columns.map(
        (c: { name: string; dataType?: string; isNullable?: boolean }) => ({
          name: c.name,
          type: c.dataType || 'unknown',
          nullable: c.isNullable ?? true
        })
      )
    }
    columnsMap.value = colMap
  } catch (error) {
    console.error('Failed to load table suggestions:', error)
  }
}

// Format SQL query using sql-formatter
function formatQuery() {
  if (!sqlQuery.value.trim()) return

  // Determine dialect based on connection type
  const dialect = currentDialect.value
  let language: 'mysql' | 'postgresql' | 'sql' = 'sql'
  const quoteChar = dialect.includes('mysql') ? '`' : '"'
  if (dialect.includes('mysql')) language = 'mysql'
  else if (dialect.includes('postgres') || dialect.includes('pgsql')) language = 'postgresql'

  try {
    let formatted = formatSQL(sqlQuery.value, {
      language,
      tabWidth: 2,
      keywordCase: 'upper',
      linesBetweenQueries: 2
    })

    // Quote known table and column names from schema context
    const knownTables = tablesList.value.map((t) => t.name)
    const knownColumns = new Set<string>()
    Object.values(columnsMap.value).forEach((cols) => {
      cols.forEach((c) => knownColumns.add(c.name))
    })

    // Quote identifiers (tables and columns) - only unquoted ones
    const allIdentifiers = [...knownTables, ...knownColumns]
    for (const identifier of allIdentifiers) {
      // Match identifier that's not already quoted, as whole word
      const pattern = `(?<![${quoteChar}"\`])\\b${identifier}\\b(?![${quoteChar}"\`])`
      const regex = new RegExp(pattern, 'gi')
      formatted = formatted.replace(regex, `${quoteChar}${identifier}${quoteChar}`)
    }

    sqlQuery.value = formatted
  } catch (error) {
    console.error('Failed to format SQL:', error)
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

    // Cache results for this tab
    const tabId = activeQueryTabId.value
    if (tabId) {
      sqlConsoleStore.setResultCache(tabId, {
        columns: resultColumns.value,
        rows: queryResults.value,
        error: null,
        stats: lastQueryStats.value
      })
    }
  } catch (error: unknown) {
    const err = error as Error
    queryError.value = err.message || 'Failed to execute query'
    queryResults.value = []
    resultColumns.value = []
    lastQueryStats.value = null

    // Cache error state for this tab
    const tabId = activeQueryTabId.value
    if (tabId) {
      sqlConsoleStore.setResultCache(tabId, {
        columns: [],
        rows: [],
        error: queryError.value,
        stats: null
      })
    }
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

  // Set default query hint based on scope only if the active tab has no content
  const activeTab = activeQueryTab.value
  if (activeTab && !activeTab.query.trim()) {
    const defaultQuery = props.database
      ? `-- Database: ${props.database}\nSELECT * FROM  LIMIT 100;`
      : `-- Use: USE database_name; or prefix tables with database.table\nSHOW DATABASES;`
    sqlQuery.value = defaultQuery
    // Also save to store
    if (activeQueryTabId.value) {
      sqlConsoleStore.updateTabQuery(
        props.connectionId,
        props.database,
        activeQueryTabId.value,
        defaultQuery
      )
    }
  }
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  // Save current query before unmounting
  if (saveTimeout) clearTimeout(saveTimeout)
  const tabId = activeQueryTabId.value
  if (tabId) {
    sqlConsoleStore.updateTabQuery(props.connectionId, props.database, tabId, sqlQuery.value)
  }
})
</script>

<style scoped>
.sql-console-tab {
  min-height: 400px;
}
</style>
