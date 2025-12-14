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
      @close-all="closeAllQueryTabs"
      @add="addQueryTab"
      @rename="handleRenameTab"
    />

    <!-- Main Content Area -->
    <div ref="splitContainerRef" class="flex-1 flex overflow-hidden min-h-0">
      <!-- Editor Pane -->
      <div
        ref="leftPaneRef"
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
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useLogsStore } from '@/stores/logs'
import connections from '@/api/connections'
import { executeFileQuery } from '@/api/files'
import { SqlQueryTabs, SqlEditorPane, SqlResultsPane } from '@/components/database/sql-console'
import { useConsoleTab, detectQueryPurpose } from '@/composables/useConsoleTab'

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
const navigationStore = useExplorerNavigationStore()
const logsStore = useLogsStore()

// ========== Console Key Computation ==========
const consoleKey = computed(() => {
  if (props.mode === 'file') {
    return `file:${props.connectionId}`
  }
  return props.database ? `${props.connectionId}:${props.database}` : props.connectionId
})

const historyKey = computed(() => {
  if (props.mode === 'file') {
    return `file-console-history:${props.connectionId}`
  }
  return `db-console-history:${props.connectionId}`
})

// ========== Use Console Tab Composable ==========
const {
  // State
  sqlQuery,
  isExecuting,
  hasExecutedQuery,
  queryError,
  queryResults,
  resultColumns,
  lastQueryStats,
  currentPage,
  pageSize,
  showHelp,
  queryHistory,

  // Split pane
  editorWidth,
  startResize,
  splitContainerRef,
  leftPaneRef,

  // Tabs
  queryTabs,
  activeQueryTabId,
  activeQueryTab,
  setActiveQueryTab,
  addQueryTab,
  closeQueryTab,
  closeAllQueryTabs,
  handleRenameTab,

  // Query operations
  formatQuery,
  insertTemplate,
  insertHistoryQuery,
  saveToHistory,
  setExecutionResult,
  setExecutionError,

  // Lifecycle
  initialize,
  cleanup
} = useConsoleTab({
  consoleKey,
  historyKey,
  getDefaultQuery: () => `-- Write your query here or select a template from the dropdown above\n`
})

// ========== Mode-Specific State ==========
// Database selection (for connection-scoped database console)
const selectedDatabase = ref(props.database || '')
const availableDatabases = ref<string[]>([])

// Schema context for autocomplete (database mode only)
const tablesList = ref<Array<{ name: string; schema?: string }>>([])
const columnsMap = ref<Record<string, Array<{ name: string; type: string; nullable: boolean }>>>({})

// ========== Computed ==========
const connection = computed(() => connectionsStore.connectionByID(props.connectionId))

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
  // Get file context from active tab if available
  const activeTab = activeQueryTab.value
  const fileCtx = activeTab?.fileContext

  // Use file context path if available, otherwise fall back to basePath or generic path
  let prefix: string
  let actualPath: string | undefined

  if (fileCtx?.path) {
    actualPath = fileCtx.path
    // For directory paths, keep as-is; for file paths, extract directory
    if (actualPath.includes('/*')) {
      // Already a glob pattern
      prefix = actualPath.replace(/\/\*\.\*$/, '')
    } else if (actualPath.match(/\.(csv|parquet|json|jsonl)$/i)) {
      // Single file - extract directory
      prefix = actualPath.substring(0, actualPath.lastIndexOf('/'))
    } else {
      // Assume it's a directory
      prefix = actualPath
    }
  } else {
    const basePath = props.basePath || '/path/to'
    const isS3 = props.connectionType === 's3'
    prefix = isS3 ? 's3://bucket/path' : basePath
  }

  return [
    {
      name: 'Select all files',
      query: `SELECT * FROM read_parquet('${prefix}/*.*') LIMIT 100;`
    },
    {
      name: 'Select from CSV',
      query: `SELECT * FROM read_csv_auto('${prefix}/*.csv') LIMIT 100;`
    },
    {
      name: 'Select from Parquet',
      query: `SELECT * FROM read_parquet('${prefix}/*.parquet') LIMIT 100;`
    },
    {
      name: 'Select from JSON/JSONL',
      query: `SELECT * FROM read_json_auto('${prefix}/*.json*') LIMIT 100;`
    },
    {
      name: 'Join two tables',
      query: `SELECT a.*, b.*
FROM read_parquet('${prefix}/table1.*') a
JOIN read_parquet('${prefix}/table2.*') b
  ON a.id = b.id
LIMIT 100;`
    },
    {
      name: 'Aggregate with GROUP BY',
      query: `SELECT column_name, COUNT(*) as count
FROM read_parquet('${prefix}/*.*')
GROUP BY column_name
ORDER BY count DESC;`
    },
    {
      name: 'Count rows',
      query: `SELECT COUNT(*) as total_rows FROM read_parquet('${prefix}/*.*');`
    },
    {
      name: 'Schema inspection',
      query: `DESCRIBE SELECT * FROM read_parquet('${prefix}/*.*');`
    },
    {
      name: 'File metadata (Parquet)',
      query: `SELECT * FROM parquet_metadata('${prefix}/*.parquet');`
    }
  ]
}

function getDatabaseTemplates() {
  const dialect = currentDialect.value
  const isPostgres = dialect.includes('postgres') || dialect.includes('pgsql')
  const isMysql = dialect.includes('mysql')

  // Helper to quote identifiers based on dialect
  const quoteId = (name: string) => {
    if (isMysql) return `\`${name}\``
    if (isPostgres) return `"${name}"`
    return name
  }

  // Get table context from active tab if available
  const activeTab = activeQueryTab.value
  const tableCtx = activeTab?.tableContext
  const tableName = tableCtx
    ? tableCtx.schema
      ? `${quoteId(tableCtx.schema)}.${quoteId(tableCtx.tableName)}`
      : quoteId(tableCtx.tableName)
    : quoteId('table_name')
  const bareTableName = tableCtx?.tableName || 'table_name'

  if (props.database) {
    // Database-scoped SQL Console - data exploration templates
    if (isPostgres) {
      return [
        { name: 'Select all rows', query: `SELECT * FROM ${tableName} LIMIT 100;` },
        { name: 'Count rows', query: `SELECT COUNT(*) FROM ${tableName};` },
        {
          name: 'List tables',
          query: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
        },
        {
          name: 'Describe table',
          query: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${bareTableName}';`
        },
        {
          name: 'Find duplicates',
          query: `SELECT column_name, COUNT(*) as count FROM ${tableName} GROUP BY column_name HAVING COUNT(*) > 1;`
        },
        {
          name: 'Search text',
          query: `SELECT * FROM ${tableName} WHERE column_name ILIKE '%search_term%';`
        }
      ]
    } else {
      // MySQL
      return [
        { name: 'Select all rows', query: `SELECT * FROM ${tableName} LIMIT 100;` },
        { name: 'Count rows', query: `SELECT COUNT(*) FROM ${tableName};` },
        { name: 'Show tables', query: `SHOW TABLES;` },
        { name: 'Describe table', query: `DESCRIBE ${tableName};` },
        {
          name: 'Find duplicates',
          query: `SELECT column_name, COUNT(*) as count FROM ${tableName} GROUP BY column_name HAVING COUNT(*) > 1;`
        },
        {
          name: 'Search text',
          query: `SELECT * FROM ${tableName} WHERE column_name LIKE '%search_term%';`
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
async function executeQuery() {
  const query = sqlQuery.value.trim()
  if (!query) return

  isExecuting.value = true
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

    let columns: string[] = []
    let rows: Record<string, unknown>[] = []

    if (result.columns && result.rows) {
      columns = result.columns
      rows = result.rows.map((row) => {
        const obj: Record<string, unknown> = {}
        result.columns.forEach((col, idx) => {
          obj[col] = row[idx]
        })
        return obj
      })
    }

    const duration = Date.now() - startTime

    setExecutionResult({
      columns,
      rows,
      stats: { rowCount: rows.length, duration }
    })

    // Log the SQL query to SQL Logs
    logsStore.addSQLLog({
      id: `sql-console-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      connectionId: props.connectionId,
      tabId: activeQueryTabId.value || undefined,
      database: props.mode === 'file' ? '' : props.database || selectedDatabase.value || '',
      query: query,
      purpose: detectQueryPurpose(query),
      startedAt: new Date(startTime).toISOString(),
      durationMs: duration,
      rowCount: rows.length
    })

    // Save successful query to history
    saveToHistory(query)

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
    const errorMsg = err.message || 'Failed to execute query'
    const duration = Date.now() - startTime

    setExecutionError(errorMsg)

    // Log the failed SQL query to SQL Logs
    logsStore.addSQLLog({
      id: `sql-console-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      connectionId: props.connectionId,
      tabId: activeQueryTabId.value || undefined,
      database: props.mode === 'file' ? '' : props.database || selectedDatabase.value || '',
      query: query,
      purpose: detectQueryPurpose(query),
      startedAt: new Date(startTime).toISOString(),
      durationMs: duration,
      rowCount: 0,
      error: errorMsg
    })
  } finally {
    isExecuting.value = false
  }
}

// ========== Lifecycle ==========
watch(() => selectedDatabase.value, loadTableSuggestions)

onMounted(async () => {
  // Initialize composable (loads history, sets up tabs)
  initialize()

  // Database mode: load databases and table suggestions
  if (props.mode === 'database') {
    await loadDatabases()
    await loadTableSuggestions()
  }
})

onUnmounted(() => {
  cleanup()
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
