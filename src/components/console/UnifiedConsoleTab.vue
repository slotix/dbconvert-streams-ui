<template>
  <div class="console-tab h-full flex flex-col bg-gray-50 dark:bg-gray-900 pb-2">
    <!-- Header -->
    <div
      class="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center space-x-2">
        <component :is="headerIcon" class="h-5 w-5 text-teal-600 dark:text-teal-400" />
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
          {{ consoleTitle }}
        </span>
        <span class="text-xs text-gray-500 dark:text-gray-400">
          {{ scopeLabel }}
        </span>
      </div>

      <div class="flex items-center space-x-2">
        <!-- Help button (file mode only) -->
        <button
          v-if="mode === 'file'"
          class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
          title="Query Help"
          @click="showHelp = !showHelp"
        >
          <QuestionMarkCircleIcon class="h-5 w-5" />
        </button>
      </div>
    </div>

    <!-- Help Panel (file mode only) -->
    <div
      v-if="mode === 'file' && showHelp"
      class="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 text-xs max-h-64 overflow-y-auto"
    >
      <div class="flex items-start space-x-2">
        <InformationCircleIcon class="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <div class="text-blue-700 dark:text-blue-300 space-y-2">
          <p class="font-medium">File Console - Query Files with SQL</p>

          <div>
            <p class="font-medium mb-1">File Reading Functions:</p>
            <ul class="list-disc list-inside space-y-0.5 ml-2">
              <li>
                <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded"
                  >read_csv_auto('/path/file.csv')</code
                >
                - CSV files
              </li>
              <li>
                <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded"
                  >read_parquet('/path/file.parquet')</code
                >
                - Parquet files
              </li>
              <li>
                <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded"
                  >read_json_auto('/path/file.json')</code
                >
                - JSON/JSONL files
              </li>
              <li>
                <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded"
                  >read_parquet('s3://bucket/path/*.parquet')</code
                >
                - S3 files with glob
              </li>
            </ul>
          </div>

          <div>
            <p class="font-medium mb-1">Multi-File Join Examples:</p>
            <ul class="list-disc list-inside space-y-0.5 ml-2">
              <li>
                <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded text-[10px]"
                  >SELECT * FROM read_csv_auto('orders.csv') o JOIN read_csv_auto('customers.csv') c
                  ON o.customer_id = c.id</code
                >
              </li>
              <li>
                <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded text-[10px]"
                  >SELECT * FROM read_parquet('*.parquet')</code
                >
                - Query all parquet files
              </li>
            </ul>
          </div>

          <p>
            Press <kbd class="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">Ctrl+Enter</kbd> to
            execute.
          </p>
        </div>
      </div>
    </div>

    <!-- Query Tabs -->
    <SqlQueryTabs
      :tabs="queryTabs"
      :active-tab-id="activeQueryTabId"
      @select="setActiveQueryTab"
      @close="closeQueryTab"
      @add="addQueryTab"
      @rename="handleRenameTab"
    />

    <!-- Main Content Area -->
    <div class="flex-1 flex overflow-hidden min-h-0">
      <!-- Editor Pane -->
      <div
        class="border-r border-gray-200 dark:border-gray-700 min-h-0"
        :style="{ width: `${editorWidth}%` }"
      >
        <SqlEditorPane
          v-model="sqlQuery"
          :dialect="currentDialect"
          :schema-context="schemaContext"
          :is-executing="isExecuting"
          :stats="lastQueryStats"
          :templates="queryTemplates"
          :history="queryHistory"
          @execute="executeQuery"
          @format="formatQuery"
          @select-template="insertTemplate"
          @select-history="insertHistoryQuery"
        />
      </div>

      <!-- Resizable Divider -->
      <div
        class="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-teal-500 dark:hover:bg-teal-500 cursor-col-resize transition-colors"
        @mousedown="startResize"
      ></div>

      <!-- Results Pane -->
      <div class="min-h-0" :style="{ width: `${100 - editorWidth}%` }">
        <SqlResultsPane
          :columns="resultColumns"
          :rows="queryResults"
          :error="queryError"
          :has-executed="hasExecutedQuery"
          :current-page="currentPage"
          :page-size="pageSize"
          @update:current-page="currentPage = $event"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, type Component } from 'vue'
import {
  CommandLineIcon,
  CircleStackIcon,
  QuestionMarkCircleIcon,
  InformationCircleIcon
} from '@heroicons/vue/24/outline'
import type { SchemaContext } from '@/composables/useMonacoSqlProviders'
import { useConnectionsStore } from '@/stores/connections'
import { useSqlConsoleStore } from '@/stores/sqlConsole'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import connections from '@/api/connections'
import { executeFileQuery } from '@/api/files'
import { format as formatSQL } from 'sql-formatter'
import { SqlQueryTabs, SqlEditorPane, SqlResultsPane } from '@/components/database/sql-console'

// ========== Props ==========
export type ConsoleMode = 'database' | 'file'
export type DatabaseScope = 'database' | 'connection'
export type FileConnectionType = 'files' | 's3'

const props = defineProps<{
  connectionId: string
  mode: ConsoleMode
  // Database mode props
  database?: string
  sqlScope?: DatabaseScope
  // File mode props
  connectionType?: FileConnectionType
  basePath?: string
}>()

const connectionsStore = useConnectionsStore()
const sqlConsoleStore = useSqlConsoleStore()
const navigationStore = useExplorerNavigationStore()

// ========== State ==========
const sqlQuery = ref('')
const isExecuting = ref(false)
const hasExecutedQuery = ref(false)
const queryError = ref<string | null>(null)
const queryResults = ref<Record<string, unknown>[]>([])
const resultColumns = ref<string[]>([])
const lastQueryStats = ref<{ rowCount: number; duration: number } | null>(null)
const currentPage = ref(1)
const pageSize = ref(100)
const showHelp = ref(false)

// Query history
interface QueryHistoryItem {
  query: string
  timestamp: number
}
const queryHistory = ref<QueryHistoryItem[]>([])
const MAX_HISTORY_ITEMS = 50

// Database selection (for connection-scoped database console)
const selectedDatabase = ref(props.database || '')
const availableDatabases = ref<string[]>([])

// Resizable panel
const editorWidth = ref(50)
const isResizing = ref(false)

// Schema context for autocomplete (database mode only)
const tablesList = ref<Array<{ name: string; schema?: string }>>([])
const columnsMap = ref<Record<string, Array<{ name: string; type: string; nullable: boolean }>>>({})

// ========== Computed ==========
const connection = computed(() => connectionsStore.connectionByID(props.connectionId))

// Console key for store - different between database and file modes
const consoleKey = computed(() => {
  if (props.mode === 'file') {
    return `file:${props.connectionId}`
  }
  // Database mode: connectionId + optional database
  return props.database ? `${props.connectionId}:${props.database}` : props.connectionId
})

// History storage key
const historyKey = computed(() => {
  if (props.mode === 'file') {
    return `file-console-history:${props.connectionId}`
  }
  return `db-console-history:${props.connectionId}`
})

const currentDialect = computed(() => {
  if (props.mode === 'file') {
    return 'sql' // DuckDB uses standard SQL
  }
  return connection.value?.type?.toLowerCase() || 'sql'
})

const headerIcon = computed<Component>(() => {
  return props.mode === 'file' ? CommandLineIcon : CircleStackIcon
})

const consoleTitle = computed(() => {
  if (props.mode === 'file') {
    return 'File Console'
  }
  // Database mode
  if (props.database) {
    return 'SQL Console'
  }
  return 'Database Console'
})

const scopeLabel = computed(() => {
  const connName = connection.value?.name || 'Connection'
  if (props.mode === 'file') {
    if (props.basePath) {
      return `${connName} → ${props.basePath}`
    }
    return connName
  }
  // Database mode
  if (props.database) {
    return `${connName} → ${props.database}`
  }
  return connName
})

// Query templates based on mode and dialect
const queryTemplates = computed(() => {
  if (props.mode === 'file') {
    return getFileTemplates()
  }
  return getDatabaseTemplates()
})

function getFileTemplates() {
  const basePath = props.basePath || '/path/to'
  const isS3 = props.connectionType === 's3'
  const prefix = isS3 ? 's3://bucket/path' : basePath

  return [
    {
      name: 'Select from CSV',
      query: `SELECT * FROM read_csv_auto('${prefix}/data.csv') LIMIT 100;`
    },
    {
      name: 'Select from Parquet',
      query: `SELECT * FROM read_parquet('${prefix}/data.parquet') LIMIT 100;`
    },
    {
      name: 'Select from JSON/JSONL',
      query: `SELECT * FROM read_json_auto('${prefix}/data.json') LIMIT 100;`
    },
    {
      name: 'Query all CSV files (glob)',
      query: `SELECT * FROM read_csv_auto('${prefix}/*.csv') LIMIT 100;`
    },
    {
      name: 'Query all Parquet files (glob)',
      query: `SELECT * FROM read_parquet('${prefix}/*.parquet') LIMIT 100;`
    },
    {
      name: 'Join two CSV files',
      query: `SELECT a.*, b.*
FROM read_csv_auto('${prefix}/orders.csv') a
JOIN read_csv_auto('${prefix}/customers.csv') b
  ON a.customer_id = b.id
LIMIT 100;`
    },
    {
      name: 'Aggregate with GROUP BY',
      query: `SELECT category, COUNT(*) as count, SUM(amount) as total
FROM read_csv_auto('${prefix}/data.csv')
GROUP BY category
ORDER BY total DESC;`
    },
    {
      name: 'Schema inspection (CSV)',
      query: `DESCRIBE SELECT * FROM read_csv_auto('${prefix}/data.csv');`
    },
    {
      name: 'File metadata (Parquet)',
      query: `SELECT * FROM parquet_metadata('${prefix}/data.parquet');`
    }
  ]
}

function getDatabaseTemplates() {
  const dialect = currentDialect.value
  const isPostgres = dialect.includes('postgres') || dialect.includes('pgsql')

  if (props.database) {
    // Database-scoped SQL Console - data exploration templates
    if (isPostgres) {
      return [
        { name: 'Select all rows', query: `SELECT * FROM table_name LIMIT 100;` },
        { name: 'Count rows', query: `SELECT COUNT(*) FROM table_name;` },
        {
          name: 'List tables',
          query: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
        },
        {
          name: 'Describe table',
          query: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'table_name';`
        },
        {
          name: 'Find duplicates',
          query: `SELECT column_name, COUNT(*) as count FROM table_name GROUP BY column_name HAVING COUNT(*) > 1;`
        },
        {
          name: 'Search text',
          query: `SELECT * FROM table_name WHERE column_name ILIKE '%search_term%';`
        }
      ]
    } else {
      // MySQL
      return [
        { name: 'Select all rows', query: `SELECT * FROM table_name LIMIT 100;` },
        { name: 'Count rows', query: `SELECT COUNT(*) FROM table_name;` },
        { name: 'Show tables', query: `SHOW TABLES;` },
        { name: 'Describe table', query: `DESCRIBE table_name;` },
        {
          name: 'Find duplicates',
          query: `SELECT column_name, COUNT(*) as count FROM table_name GROUP BY column_name HAVING COUNT(*) > 1;`
        },
        {
          name: 'Search text',
          query: `SELECT * FROM table_name WHERE column_name LIKE '%search_term%';`
        }
      ]
    }
  } else {
    // Connection-scoped Database Console - admin templates
    if (isPostgres) {
      return [
        {
          name: 'List databases',
          query: `SELECT datname FROM pg_database WHERE datistemplate = false;`
        },
        { name: 'Create database', query: `CREATE DATABASE database_name;` },
        { name: 'Drop database', query: `DROP DATABASE database_name;` },
        { name: 'Show version', query: `SELECT version();` },
        { name: 'List users', query: `SELECT usename FROM pg_user;` },
        {
          name: 'Database size',
          query: `SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) AS size FROM pg_database;`
        },
        { name: 'Active connections', query: `SELECT * FROM pg_stat_activity;` }
      ]
    } else {
      // MySQL
      return [
        { name: 'Show databases', query: `SHOW DATABASES;` },
        { name: 'Create database', query: `CREATE DATABASE database_name;` },
        { name: 'Drop database', query: `DROP DATABASE database_name;` },
        { name: 'Show version', query: `SHOW VARIABLES LIKE '%version%';` },
        { name: 'Show users', query: `SELECT user, host FROM mysql.user;` },
        { name: 'Show processlist', query: `SHOW PROCESSLIST;` },
        { name: 'Show status', query: `SHOW STATUS;` }
      ]
    }
  }
}

// Schema context for autocomplete
const schemaContext = computed<SchemaContext>(() => {
  if (props.mode === 'file') {
    // No table autocomplete for file mode - users use DuckDB functions
    return {
      tables: [],
      columns: {},
      dialect: 'sql'
    }
  }

  // Database mode - provide table/column suggestions
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

// Query tabs from store
const queryTabs = computed(() => sqlConsoleStore.getTabs(consoleKey.value))
const activeQueryTabId = computed(() => sqlConsoleStore.getActiveTabId(consoleKey.value))
const activeQueryTab = computed(() => sqlConsoleStore.getActiveTab(consoleKey.value))

// ========== Tab Sync ==========
watch(
  activeQueryTab,
  (tab) => {
    if (tab) {
      sqlQuery.value = tab.query

      // Restore cached results
      const cached = sqlConsoleStore.getResultCache(tab.id)
      if (cached) {
        hasExecutedQuery.value = true
        queryError.value = cached.error
        queryResults.value = cached.rows
        resultColumns.value = cached.columns
        lastQueryStats.value = cached.stats
        currentPage.value = 1
      } else {
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

// Debounced save of query content
let saveTimeout: ReturnType<typeof setTimeout> | null = null
watch(sqlQuery, (newQuery) => {
  const tabId = activeQueryTabId.value
  if (tabId) {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      sqlConsoleStore.updateTabQuery(consoleKey.value, undefined, tabId, newQuery)
    }, 500)
  }
})

// ========== Tab Management ==========
function setActiveQueryTab(tabId: string) {
  const currentTabId = activeQueryTabId.value
  if (currentTabId) {
    sqlConsoleStore.updateTabQuery(consoleKey.value, undefined, currentTabId, sqlQuery.value)
  }
  sqlConsoleStore.setActiveTab(consoleKey.value, undefined, tabId)
}

function getDefaultQueryTemplate(): string {
  return `-- Write your query here or select a template from the dropdown above\n`
}

function addQueryTab() {
  const currentTabId = activeQueryTabId.value
  if (currentTabId) {
    sqlConsoleStore.updateTabQuery(consoleKey.value, undefined, currentTabId, sqlQuery.value)
  }
  const newTab = sqlConsoleStore.addTab(consoleKey.value, undefined)
  sqlConsoleStore.updateTabQuery(consoleKey.value, undefined, newTab.id, getDefaultQueryTemplate())
}

function closeQueryTab(tabId: string) {
  sqlConsoleStore.closeTab(consoleKey.value, undefined, tabId)
}

function handleRenameTab(tabId: string, newName: string) {
  sqlConsoleStore.renameTab(consoleKey.value, undefined, tabId, newName)
}

// ========== Templates & History ==========
function insertTemplate(query: string) {
  sqlQuery.value = query
}

function loadHistory() {
  try {
    const stored = localStorage.getItem(historyKey.value)
    if (stored) {
      queryHistory.value = JSON.parse(stored)
    }
  } catch (e) {
    console.warn('Failed to load query history:', e)
  }
}

function saveToHistory(query: string) {
  const trimmed = query.trim()
  if (!trimmed) return

  // Remove duplicate if exists
  queryHistory.value = queryHistory.value.filter((item) => item.query !== trimmed)

  // Add new entry at the beginning
  queryHistory.value.unshift({
    query: trimmed,
    timestamp: Date.now()
  })

  // Limit history size
  if (queryHistory.value.length > MAX_HISTORY_ITEMS) {
    queryHistory.value = queryHistory.value.slice(0, MAX_HISTORY_ITEMS)
  }

  // Persist to localStorage
  try {
    localStorage.setItem(historyKey.value, JSON.stringify(queryHistory.value))
  } catch (e) {
    console.warn('Failed to save query history:', e)
  }
}

function insertHistoryQuery(item: QueryHistoryItem) {
  sqlQuery.value = item.query
}

// ========== Data Loading (Database Mode) ==========
async function loadDatabases() {
  if (props.mode !== 'database' || props.database) return
  try {
    const dbs = await connections.getDatabases(props.connectionId)
    availableDatabases.value = dbs.map((d) => d.name)
  } catch (error) {
    console.error('Failed to load databases:', error)
  }
}

async function loadTableSuggestions() {
  if (props.mode !== 'database') return

  const db = props.database || selectedDatabase.value
  if (!db) {
    tablesList.value = []
    columnsMap.value = {}
    return
  }

  try {
    const metadata = await connections.getMetadata(props.connectionId, db)
    tablesList.value = Object.keys(metadata.tables).map((name) => ({ name }))

    const colMap: Record<string, Array<{ name: string; type: string; nullable: boolean }>> = {}
    for (const [tableName, table] of Object.entries(metadata.tables)) {
      colMap[tableName] = (
        table as { columns: Array<{ name: string; dataType?: string; isNullable?: boolean }> }
      ).columns.map((c) => ({
        name: c.name,
        type: c.dataType || 'unknown',
        nullable: c.isNullable ?? true
      }))
    }
    columnsMap.value = colMap
  } catch (error) {
    console.error('Failed to load table suggestions:', error)
  }
}

// ========== Query Execution ==========
function formatQuery() {
  if (!sqlQuery.value.trim()) return

  try {
    const formatted = formatSQL(sqlQuery.value, {
      language: 'sql',
      tabWidth: 2,
      keywordCase: 'upper',
      linesBetweenQueries: 2
    })
    sqlQuery.value = formatted
  } catch (error) {
    console.error('Failed to format SQL:', error)
  }
}

async function executeQuery() {
  const query = sqlQuery.value.trim()
  if (!query) return

  isExecuting.value = true
  queryError.value = null
  hasExecutedQuery.value = true
  const startTime = Date.now()

  try {
    let result: { columns: string[]; rows: unknown[][]; affectedObject?: string }

    if (props.mode === 'file') {
      // File mode - use DuckDB file query API with connection ID for S3 credentials
      result = await executeFileQuery(query, props.connectionId)
    } else {
      // Database mode - use database connection API
      const db = props.database || selectedDatabase.value
      result = await connections.executeQuery(props.connectionId, query, db || undefined)
    }

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
    lastQueryStats.value = { rowCount: queryResults.value.length, duration }
    currentPage.value = 1

    // Save successful query to history
    saveToHistory(query)

    // Cache results
    const tabId = activeQueryTabId.value
    if (tabId) {
      sqlConsoleStore.setResultCache(tabId, {
        columns: resultColumns.value,
        rows: queryResults.value,
        error: null,
        stats: lastQueryStats.value
      })
    }

    // Database mode: refresh sidebar if DDL query succeeded
    if (props.mode === 'database' && result.affectedObject) {
      const db = props.database || selectedDatabase.value
      if (result.affectedObject === 'database' || result.affectedObject === 'schema') {
        navigationStore.invalidateDatabases(props.connectionId)
        await navigationStore.ensureDatabases(props.connectionId, true)
      }
      if (result.affectedObject === 'table' && db) {
        navigationStore.invalidateMetadata(props.connectionId, db)
      }
    }
  } catch (error: unknown) {
    const err = error as Error
    queryError.value = err.message || 'Failed to execute query'
    queryResults.value = []
    resultColumns.value = []
    lastQueryStats.value = null

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

// ========== Resize Handling ==========
function startResize(e: MouseEvent) {
  isResizing.value = true
  e.preventDefault()
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

function handleResize(e: MouseEvent) {
  if (!isResizing.value) return
  const container = document.querySelector('.console-tab')
  if (!container) return

  const rect = container.getBoundingClientRect()
  const newWidth = ((e.clientX - rect.left) / rect.width) * 100
  editorWidth.value = Math.min(Math.max(newWidth, 20), 80)
}

function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

// ========== Lifecycle ==========
watch(() => selectedDatabase.value, loadTableSuggestions)

onMounted(async () => {
  // Load query history
  loadHistory()

  if (props.mode === 'database') {
    await loadDatabases()
    await loadTableSuggestions()
  }

  // Initialize first tab if needed
  if (queryTabs.value.length === 0) {
    addQueryTab()
  }

  // Set default query if tab is empty
  const activeTab = activeQueryTab.value
  if (activeTab && !activeTab.query.trim()) {
    sqlQuery.value = getDefaultQueryTemplate()
    if (activeQueryTabId.value) {
      sqlConsoleStore.updateTabQuery(
        consoleKey.value,
        undefined,
        activeQueryTabId.value,
        sqlQuery.value
      )
    }
  }
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  if (saveTimeout) clearTimeout(saveTimeout)
  const tabId = activeQueryTabId.value
  if (tabId) {
    sqlConsoleStore.updateTabQuery(consoleKey.value, undefined, tabId, sqlQuery.value)
  }
})

// ========== Public API for external interaction ==========
function insertIntoEditor(text: string) {
  sqlQuery.value = text
}

defineExpose({
  insertIntoEditor
})
</script>

<style scoped>
.console-tab {
  min-height: 400px;
}
</style>
