<template>
  <div class="console-tab h-full flex flex-col bg-gray-50 dark:bg-gray-900 pb-2">
    <!-- Header -->
    <div
      v-if="showConsoleHeader"
      class="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center space-x-2">
        <component :is="headerIcon" class="h-5 w-5 text-teal-600 dark:text-teal-400" />
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
          {{ consoleTitle }}
        </span>
        <span
          v-if="hasExecutedQuery && resultSetCount > 0"
          class="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
        >
          {{ resultSetCount }} result{{ resultSetCount === 1 ? '' : 's' }}
        </span>
        <span v-if="mode === 'file'" class="text-xs text-gray-500 dark:text-gray-400">
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
          <CircleHelp class="h-5 w-5" />
        </button>
      </div>
    </div>

    <!-- Help Panel (file mode only) -->
    <div
      v-if="mode === 'file' && showHelp"
      class="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 text-xs max-h-64 overflow-y-auto"
    >
      <div class="flex items-start space-x-2">
        <Info class="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
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

    <!-- Data Sources (collapsed by default) -->
    <ConnectionAliasPanel
      :model-value="selectedConnections"
      :show-file-connections="true"
      :default-collapsed="true"
      :show-create-connection-link="true"
      @update:modelValue="handleUpdateSelectedConnections"
    />

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
          :result-sets="resultSets"
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
import { CircleHelp, Database, Info, Terminal } from 'lucide-vue-next'
import type { SchemaContext } from '@/composables/useMonacoSqlProviders'
import type { Connection } from '@/types/connections'
import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useDatabaseOverviewStore } from '@/stores/databaseOverview'
import { useLogsStore } from '@/stores/logs'
import connections from '@/api/connections'
import { executeFileQuery } from '@/api/files'
import { executeFederatedQuery, type ConnectionMapping } from '@/api/federated'
import { SqlQueryTabs, SqlEditorPane, SqlResultsPane } from '@/components/database/sql-console'
import ConnectionAliasPanel from './ConnectionAliasPanel.vue'
import { useConsoleTab, detectQueryPurpose } from '@/composables/useConsoleTab'
import { getConnectionTypeLabel, getSqlDialectFromConnection } from '@/types/specs'

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
const overviewStore = useDatabaseOverviewStore()
const logsStore = useLogsStore()

const showConsoleHeader = computed(() => props.mode === 'file')

// ========== Persistence (Data Sources) ==========
interface PersistedConsoleSourcesEntry {
  touched: boolean
  connections: ConnectionMapping[]
}

type PersistedConsoleSourcesState = Record<string, PersistedConsoleSourcesEntry>

const SOURCES_STORAGE_KEY = 'explorer.sqlConsoleSources'

function hasBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function loadPersistedSources(): PersistedConsoleSourcesState {
  if (!hasBrowserStorage()) return {}
  try {
    const raw = window.localStorage.getItem(SOURCES_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as PersistedConsoleSourcesState
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function persistSources(state: PersistedConsoleSourcesState) {
  if (!hasBrowserStorage()) return
  try {
    window.localStorage.setItem(SOURCES_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

// ========== Base Connection ==========
const connection = computed(() => connectionsStore.connectionByID(props.connectionId))

// ========== Console Key Computation ==========
const consoleKey = computed(() => {
  if (props.mode === 'file') {
    return `file:${props.connectionId}`
  }
  return props.database ? `${props.connectionId}:${props.database}` : props.connectionId
})

// ========== Mode-Specific State ==========
// Schema context for autocomplete (database mode only)
const tablesList = ref<Array<{ name: string; schema?: string }>>([])
const columnsMap = ref<Record<string, Array<{ name: string; type: string; nullable: boolean }>>>({})

// ========== Federated Data Sources ==========
const selectedConnections = ref<ConnectionMapping[]>([])
const userModifiedSources = ref(false)

const sourcesKey = computed(() => `${props.mode}:${consoleKey.value}`)

function sanitizeMappings(mappings: ConnectionMapping[]): ConnectionMapping[] {
  const existingIds =
    connectionsStore.connections.length > 0
      ? new Set(connectionsStore.connections.map((c) => c.id))
      : null

  const seen = new Set<string>()
  const cleaned: ConnectionMapping[] = []

  for (const m of mappings) {
    if (!m || typeof m !== 'object') continue
    if (typeof m.connectionId !== 'string' || typeof m.alias !== 'string') continue
    if (existingIds && !existingIds.has(m.connectionId)) continue
    if (seen.has(m.connectionId)) continue
    seen.add(m.connectionId)
    cleaned.push({
      connectionId: m.connectionId,
      alias: m.alias,
      database: typeof m.database === 'string' ? m.database : undefined
    })
  }

  return cleaned
}

function defaultAliasForConnection(connection?: Connection | null): string {
  const normalized = getConnectionTypeLabel(connection?.spec, connection?.type) || ''
  if (normalized === 'postgresql' || normalized === 'postgres') return 'pg1'
  if (normalized === 'mysql' || normalized === 'mariadb') return 'my1'
  if (normalized === 's3') return 's31'
  if (normalized === 'gcs') return 'gcs1'
  if (normalized === 'azure') return 'azure1'
  if (normalized === 'files') return 'files1'
  return 'db1'
}

const primaryDefaultDatabase = computed(() => {
  if (props.mode !== 'database') return ''
  return props.database || ''
})

const primaryMapping = computed<ConnectionMapping>(() => {
  const conn = connection.value
  const mapping: ConnectionMapping = {
    connectionId: props.connectionId,
    alias: defaultAliasForConnection(conn)
  }
  if (props.mode === 'database') {
    const db = primaryDefaultDatabase.value
    if (db) mapping.database = db
  }
  return mapping
})

function handleUpdateSelectedConnections(value: ConnectionMapping[]) {
  userModifiedSources.value = true
  selectedConnections.value = value
}

function restoreSelectedConnections() {
  const saved = loadPersistedSources()
  const entry = saved[sourcesKey.value]
  if (!entry || !entry.touched) return

  selectedConnections.value = sanitizeMappings(entry.connections || [])
  userModifiedSources.value = true
}

function persistSelectedConnections() {
  if (!userModifiedSources.value) return

  const saved = loadPersistedSources()
  saved[sourcesKey.value] = {
    touched: true,
    connections: selectedConnections.value
  }
  persistSources(saved)
}

function initializeDefaultSources() {
  if (userModifiedSources.value) return
  if (selectedConnections.value.length > 0) return
  selectedConnections.value = [primaryMapping.value]
}

function syncPrimarySource() {
  if (userModifiedSources.value) return

  const primary = primaryMapping.value
  const existingIndex = selectedConnections.value.findIndex(
    (m) => m.connectionId === primary.connectionId
  )

  if (existingIndex === -1) {
    selectedConnections.value = [primary]
    return
  }

  const existing = selectedConnections.value[existingIndex]
  const shouldReplaceAlias = existing.alias === 'db1' && primary.alias !== 'db1'
  selectedConnections.value.splice(existingIndex, 1, {
    ...existing,
    alias: shouldReplaceAlias ? primary.alias : existing.alias || primary.alias,
    database: existing.database || primary.database
  })
}

function isDuckDbFileQuery(query: string): boolean {
  const lowered = query.toLowerCase()
  return (
    lowered.includes('read_parquet') ||
    lowered.includes('read_csv') ||
    lowered.includes('read_csv_auto') ||
    lowered.includes('read_json') ||
    lowered.includes('read_json_auto')
  )
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const useFederatedEngine = computed(() => {
  // If user cleared all sources, allow running DuckDB file queries via federated endpoint
  if (selectedConnections.value.length === 0) return true

  // Single source: keep the current behavior when it matches the console's root connection
  if (selectedConnections.value.length === 1) {
    return selectedConnections.value[0].connectionId !== props.connectionId
  }

  // Multiple sources => federated
  return true
})

watch([primaryMapping, () => props.connectionId], syncPrimarySource, { immediate: true })

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
  resultSets,
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

// ========== Computed ==========
const currentDialect = computed(() => {
  if (useFederatedEngine.value) {
    return 'sql'
  }
  if (props.mode === 'file') {
    return 'sql' // DuckDB uses standard SQL
  }
  return getSqlDialectFromConnection(connection.value?.spec, connection.value?.type)
})

const headerIcon = computed<Component>(() => {
  return props.mode === 'file' ? Terminal : Database
})

const consoleTitle = computed(() => {
  if (props.mode === 'file') {
    return 'File Console'
  }
  return 'SQL Console'
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

const resultSetCount = computed(() => {
  if (!hasExecutedQuery.value) return 0
  if (Array.isArray(resultSets.value) && resultSets.value.length > 0) {
    return resultSets.value.length
  }
  // Backward-compatible fallback (should rarely be needed)
  return resultColumns.value.length > 0 || queryResults.value.length > 0 ? 1 : 0
})

// Query templates based on mode and dialect
const queryTemplates = computed(() => {
  if (useFederatedEngine.value) {
    return getFederatedTemplates()
  }
  if (props.mode === 'file') {
    return getFileTemplates()
  }
  return getDatabaseTemplates()
})

function getFederatedTemplates() {
  const aliases = selectedConnections.value.map((c) => c.alias)
  const pg1 = aliases.find((a) => a.startsWith('pg')) || 'pg1'
  const my1 = aliases.find((a) => a.startsWith('my')) || 'my1'
  // Find S3 aliases (common patterns: aws, do, s3, minio)
  const s3Aliases = aliases.filter((a) =>
    ['aws', 'do', 's3', 'minio', 'gcs', 'azure'].some(
      (prefix) => a.toLowerCase().startsWith(prefix) || a.toLowerCase().includes('s3')
    )
  )
  const aws = s3Aliases.find((a) => a.toLowerCase().startsWith('aws')) || 'aws'
  const doAlias = s3Aliases.find((a) => a.toLowerCase().startsWith('do')) || 'do'

  return [
    {
      name: 'Cross-database JOIN',
      query: `-- Join tables from different databases
SELECT a.*, b.*
FROM ${pg1}.public.table1 a
JOIN ${my1}.table2 b ON a.id = b.id
LIMIT 100;`
    },
    {
      name: 'PostgreSQL query',
      query: `-- Query PostgreSQL connection
SELECT * FROM ${pg1}.public.table_name LIMIT 100;`
    },
    {
      name: 'MySQL query',
      query: `-- Query MySQL connection
SELECT * FROM ${my1}.database.table_name LIMIT 100;`
    },
    {
      name: 'Query S3 with alias',
      query: `-- Query S3 using connection alias (select an S3 connection first)
-- Alias becomes the URL scheme: aws://bucket/path
SELECT * FROM read_parquet('${aws}://bucket-name/path/*.parquet') LIMIT 100;`
    },
    {
      name: 'JOIN across S3 providers',
      query: `-- Join data from different S3 providers (AWS + DigitalOcean)
SELECT a.*, b.*
FROM read_parquet('${aws}://bucket/data_a.parquet') a
JOIN read_parquet('${doAlias}://bucket/data_b.parquet') b ON a.id = b.id
LIMIT 100;`
    },
    {
      name: 'Database + S3 JOIN',
      query: `-- Join database table with S3 data
SELECT db.*, s3.*
FROM ${pg1}.public.customers db
JOIN read_parquet('${aws}://bucket/orders/*.parquet') s3
ON db.id = s3.customer_id
LIMIT 100;`
    },
    {
      name: 'Aggregate across databases',
      query: `-- Aggregate data from multiple sources
SELECT
  a.category,
  COUNT(DISTINCT b.id) as count,
  SUM(b.amount) as total
FROM ${pg1}.public.categories a
JOIN ${my1}.orders b ON a.id = b.category_id
GROUP BY a.category
ORDER BY total DESC;`
    },
    {
      name: 'UNION from multiple sources',
      query: `-- Combine results from different databases
SELECT 'postgres' as source, name, created_at
FROM ${pg1}.public.users
UNION ALL
SELECT 'mysql' as source, name, created_at
FROM ${my1}.users
ORDER BY created_at DESC
LIMIT 100;`
    },
    {
      name: 'List attached schemas',
      query: `-- Show all schemas in an attached database
SELECT schema_name
FROM ${pg1}.information_schema.schemata;`
    },
    {
      name: 'Query Parquet file',
      query: `-- Query local Parquet file (no connection needed)
SELECT * FROM read_parquet('/path/to/file.parquet') LIMIT 100;`
    },
    {
      name: 'Query CSV file',
      query: `-- Query local CSV file (no connection needed)
SELECT * FROM read_csv('/path/to/file.csv', header=true) LIMIT 100;`
    },
    {
      name: 'JOIN database + local file',
      query: `-- Join database table with local Parquet file
SELECT db.*, f.*
FROM ${pg1}.public.table_name db
JOIN read_parquet('/path/to/file.parquet') f ON db.id = f.id
LIMIT 100;`
    }
  ]
}

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
    if (actualPath.includes('*')) {
      // Already a glob pattern - use the parent directory as the prefix
      const lastSlash = actualPath.lastIndexOf('/')
      prefix = lastSlash >= 0 ? actualPath.substring(0, lastSlash) : ''
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

  const joinPath = (prefixPath: string, suffix: string) => {
    const cleanedPrefix = prefixPath.replace(/\/+$/, '')
    const cleanedSuffix = suffix.replace(/^\/+/, '')
    if (cleanedPrefix === '') return cleanedSuffix
    return `${cleanedPrefix}/${cleanedSuffix}`
  }

  return [
    {
      name: 'Select all files',
      query: `SELECT * FROM read_parquet('${joinPath(prefix, '*.parquet')}') LIMIT 100;`
    },
    {
      name: 'Select from CSV',
      query: `SELECT * FROM read_csv_auto('${joinPath(prefix, '*.csv')}') LIMIT 100;`
    },
    {
      name: 'Select from Parquet',
      query: `SELECT * FROM read_parquet('${joinPath(prefix, '*.parquet')}') LIMIT 100;`
    },
    {
      name: 'Select from JSON/JSONL',
      query: `SELECT * FROM read_json_auto('${joinPath(prefix, '*.json*')}') LIMIT 100;`
    },
    {
      name: 'Join two tables',
      query: `SELECT a.*, b.*
FROM read_parquet('${joinPath(prefix, 'table1.*')}') a
JOIN read_parquet('${joinPath(prefix, 'table2.*')}') b
  ON a.id = b.id
LIMIT 100;`
    },
    {
      name: 'Aggregate with GROUP BY',
      query: `SELECT column_name, COUNT(*) as count
FROM read_parquet('${joinPath(prefix, '*.parquet')}')
GROUP BY column_name
ORDER BY count DESC;`
    },
    {
      name: 'Count rows',
      query: `SELECT COUNT(*) as total_rows FROM read_parquet('${joinPath(prefix, '*.parquet')}');`
    },
    {
      name: 'Schema inspection',
      query: `DESCRIBE SELECT * FROM read_parquet('${joinPath(prefix, '*.parquet')}');`
    },
    {
      name: 'File metadata (Parquet)',
      query: `SELECT * FROM parquet_metadata('${joinPath(prefix, '*.parquet')}');`
    }
  ]
}

function getDatabaseTemplates() {
  const dialect = currentDialect.value
  const isPostgres = dialect === 'pgsql'
  const isMysql = dialect === 'mysql'

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
  if (useFederatedEngine.value) {
    return { tables: [], columns: {}, dialect: 'sql' }
  }
  if (props.mode === 'file') {
    // No table autocomplete for file mode - users use DuckDB functions
    return {
      tables: [],
      columns: {},
      dialect: 'sql'
    }
  }

  // Database mode - provide table/column suggestions
  const sqlDialect = currentDialect.value

  return {
    tables: tablesList.value,
    columns: columnsMap.value,
    dialect: sqlDialect
  }
})

async function loadTableSuggestions() {
  if (props.mode !== 'database') return
  if (useFederatedEngine.value) return

  const db = props.database?.trim()
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

  if (useFederatedEngine.value) {
    // Allow file queries without connections
    if (selectedConnections.value.length === 0 && !isDuckDbFileQuery(query)) {
      setExecutionError(
        'Select at least one data source (or query files with read_parquet/read_csv)'
      )
      return
    }

    // Help catch a common confusion when users add data sources but keep unqualified table names
    if (
      selectedConnections.value.length > 0 &&
      !isDuckDbFileQuery(query) &&
      /\b(from|join|update|into|delete)\b/i.test(query)
    ) {
      const hasAliasReference = selectedConnections.value.some((c) => {
        if (!c.alias) return false
        return new RegExp(`\\b${escapeRegExp(c.alias)}\\.`, 'i').test(query)
      })
      if (!hasAliasReference) {
        setExecutionError(
          'Federated queries must reference tables using aliases (e.g. pg1.public.table, my1.db.table)'
        )
        return
      }
    }

    isExecuting.value = true
    const startTime = Date.now()

    try {
      const result = await executeFederatedQuery({
        query,
        connections: selectedConnections.value
      })

      const columns = result.columns || []
      const rows = (result.rows || []).map((row) => {
        const obj: Record<string, unknown> = {}
        columns.forEach((col, idx) => {
          obj[col] = row[idx]
        })
        return obj
      })

      const duration = result.duration || Date.now() - startTime

      setExecutionResult({
        columns,
        rows,
        stats: { rowCount: result.count || rows.length, duration }
      })

      logsStore.addSQLLog({
        id: `federated-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        connectionId: 'federated',
        tabId: activeQueryTabId.value || undefined,
        database: selectedConnections.value.map((c) => c.alias).join(', '),
        query,
        purpose: detectQueryPurpose(query),
        startedAt: new Date(startTime).toISOString(),
        durationMs: duration,
        rowCount: rows.length
      })

      saveToHistory(query)
    } catch (error: unknown) {
      const err = error as Error
      const errorMsg = err.message || 'Failed to execute federated query'
      const duration = Date.now() - startTime

      setExecutionError(errorMsg)

      logsStore.addSQLLog({
        id: `federated-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        connectionId: 'federated',
        tabId: activeQueryTabId.value || undefined,
        database: selectedConnections.value.map((c) => c.alias).join(', '),
        query,
        purpose: detectQueryPurpose(query),
        startedAt: new Date(startTime).toISOString(),
        durationMs: duration,
        rowCount: 0,
        error: errorMsg
      })
    } finally {
      isExecuting.value = false
    }

    return
  }

  isExecuting.value = true
  const startTime = Date.now()

  try {
    let result: {
      columns: string[]
      rows: unknown[][]
      results?: Array<{
        columns?: string[]
        rows?: unknown[][]
        commandTag?: string
        rowsAffected?: number
      }>
      affectedObject?: string
    }

    if (props.mode === 'file') {
      // File mode - use DuckDB file query API with connection ID for S3 credentials
      result = await executeFileQuery(query, props.connectionId)
    } else {
      // Database mode - use database connection API
      const db = props.database?.trim() || undefined
      result = await connections.executeQuery(props.connectionId, query, db)
    }

    const normalizedSets: Array<{
      columns: string[]
      rows: Record<string, unknown>[]
      commandTag?: string
      rowsAffected?: number
    }> = []

    if (Array.isArray(result.results) && result.results.length > 0) {
      for (const set of result.results) {
        const cols = set.columns || []
        const rows = (set.rows || []).map((row) => {
          const obj: Record<string, unknown> = {}
          cols.forEach((col, idx) => {
            obj[col] = row[idx]
          })
          return obj
        })
        normalizedSets.push({
          columns: cols,
          rows,
          commandTag: set.commandTag,
          rowsAffected: set.rowsAffected
        })
      }
    } else {
      const cols = result.columns || []
      const rows = (result.rows || []).map((row) => {
        const obj: Record<string, unknown> = {}
        cols.forEach((col, idx) => {
          obj[col] = row[idx]
        })
        return obj
      })
      normalizedSets.push({ columns: cols, rows })
    }

    let primary = normalizedSets.find((s) => s.columns.length > 0)
    if (!primary) primary = normalizedSets[0]
    if (!primary) primary = { columns: [], rows: [] }

    const totalRowCount = normalizedSets.reduce((acc, s) => acc + s.rows.length, 0)

    const duration = Date.now() - startTime

    setExecutionResult({
      columns: primary.columns,
      rows: primary.rows,
      resultSets: normalizedSets,
      stats: { rowCount: totalRowCount, duration }
    })

    // Log the SQL query to SQL Logs
    logsStore.addSQLLog({
      id: `sql-console-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      connectionId: props.connectionId,
      tabId: activeQueryTabId.value || undefined,
      database: props.mode === 'file' ? '' : props.database || '',
      query: query,
      purpose: detectQueryPurpose(query),
      startedAt: new Date(startTime).toISOString(),
      durationMs: duration,
      rowCount: totalRowCount
    })

    // Save successful query to history
    saveToHistory(query)

    // Database mode: refresh sidebar and overview if DDL query succeeded
    if (props.mode === 'database' && result.affectedObject) {
      const db = props.database?.trim()
      if (result.affectedObject === 'database' || result.affectedObject === 'schema') {
        navigationStore.invalidateDatabases(props.connectionId)
        await navigationStore.ensureDatabases(props.connectionId, true)
      }
      if (result.affectedObject === 'table' && db) {
        navigationStore.invalidateMetadata(props.connectionId, db)
        // Clear overview cache so it refetches with fresh table stats
        overviewStore.clearOverview(props.connectionId, db)
        await navigationStore.ensureMetadata(props.connectionId, db, true)
        // Refresh overview in background (don't await - let it update reactively)
        overviewStore.fetchOverview(props.connectionId, db, true)
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
      database: props.mode === 'file' ? '' : props.database || '',
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
watch(selectedConnections, persistSelectedConnections, { deep: true })

onMounted(async () => {
  // Initialize composable (loads history, sets up tabs)
  initialize()

  // Ensure base connections are loaded (needed for Data Sources panel)
  if (connectionsStore.connections.length === 0) {
    await connectionsStore.refreshConnections()
  }

  // Restore persisted data sources first (if any)
  restoreSelectedConnections()

  // Preselect current connection as a default data source (unless the user already changed it)
  initializeDefaultSources()
  syncPrimarySource()

  // Database mode: load table suggestions
  if (props.mode === 'database') await loadTableSuggestions()
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
