<template>
  <div class="sql-console-tab h-full flex flex-col bg-gray-50 dark:bg-gray-900 pb-2">
    <!-- Header -->
    <SqlConsoleHeader
      :title="consoleTitle"
      :scope-label="scopeLabel"
      :history-count="queryHistory.length"
      @toggle-templates="showTemplates = !showTemplates"
      @toggle-history="showHistory = !showHistory"
    />

    <!-- Templates Dropdown Panel -->
    <div
      v-if="showTemplates"
      class="absolute right-4 top-12 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto"
    >
      <div class="py-1">
        <button
          v-for="template in queryTemplates"
          :key="template.name"
          class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="insertTemplate(template.query)"
        >
          <div class="font-medium text-gray-700 dark:text-gray-300">{{ template.name }}</div>
          <div class="text-gray-500 dark:text-gray-400 truncate font-mono text-[10px]">
            {{ template.query.split('\n')[0] }}
          </div>
        </button>
      </div>
    </div>

    <!-- History Dropdown Panel -->
    <div
      v-if="showHistory && queryHistory.length > 0"
      class="absolute right-4 top-12 w-96 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50"
    >
      <div class="py-1">
        <button
          v-for="(item, index) in queryHistory"
          :key="index"
          class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
          @click="insertHistoryQuery(item)"
        >
          <div class="text-gray-500 dark:text-gray-400 text-[10px] mb-0.5">
            {{ formatHistoryTime(item.timestamp) }}
          </div>
          <div class="text-gray-700 dark:text-gray-300 font-mono truncate">
            {{ item.query }}
          </div>
        </button>
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
          @execute="executeQuery"
          @format="formatQuery"
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { SchemaContext } from '@/composables/useMonacoSqlProviders'
import { useConnectionsStore } from '@/stores/connections'
import { useSqlConsoleStore } from '@/stores/sqlConsole'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useLogsStore, type QueryPurpose } from '@/stores/logs'
import connections from '@/api/connections'
import { format as formatSQL } from 'sql-formatter'
import { SqlConsoleHeader, SqlQueryTabs, SqlEditorPane, SqlResultsPane } from './sql-console'
import { useSplitPaneResize } from '@/composables/useSplitPaneResize'

// Helper to detect query purpose from SQL
function detectQueryPurpose(query: string): QueryPurpose {
  const normalized = query.trim().toUpperCase()
  const firstWord = normalized.split(/\s+/)[0]

  // Schema changes
  if (['CREATE', 'ALTER', 'DROP', 'TRUNCATE'].includes(firstWord)) {
    return 'SCHEMA_CHANGE'
  }

  // DML operations
  if (['INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT'].includes(firstWord)) {
    return 'DML_OPERATION'
  }

  // Schema introspection
  if (
    ['SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN'].includes(firstWord) ||
    normalized.includes('INFORMATION_SCHEMA') ||
    normalized.includes('PG_CATALOG') ||
    normalized.includes('PG_TABLES') ||
    normalized.includes('PG_DATABASE')
  ) {
    return 'SCHEMA_INTROSPECTION'
  }

  // Count queries
  if (normalized.includes('COUNT(') || normalized.includes('COUNT (')) {
    return 'COUNT_QUERY'
  }

  // Default to data query for SELECT and other reads (including utility queries like VERSION())
  return 'DATA_QUERY'
}

const props = defineProps<{
  connectionId: string
  database?: string
  sqlScope: 'database' | 'connection'
}>()

const connectionsStore = useConnectionsStore()
const sqlConsoleStore = useSqlConsoleStore()
const navigationStore = useExplorerNavigationStore()
const logsStore = useLogsStore()

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
const showTemplates = ref(false)
const showHistory = ref(false)

// Query history
interface QueryHistoryItem {
  query: string
  timestamp: number
}
const queryHistory = ref<QueryHistoryItem[]>([])
const HISTORY_KEY = 'db-console-history'
const MAX_HISTORY_ITEMS = 50

// Database selection (for connection-scoped console)
const selectedDatabase = ref(props.database || '')
const availableDatabases = ref<string[]>([])

// Resizable panel
const {
  splitGrow: editorWidth,
  onDividerMouseDown: startResize,
  splitContainerRef,
  leftPaneRef
} = useSplitPaneResize()

// Schema context for autocomplete
const tablesList = ref<Array<{ name: string; schema?: string }>>([])
const columnsMap = ref<Record<string, Array<{ name: string; type: string; nullable: boolean }>>>({})

// ========== Computed ==========
const connection = computed(() => connectionsStore.connectionByID(props.connectionId))

const currentDialect = computed(() => connection.value?.type?.toLowerCase() || 'sql')

const scopeLabel = computed(() => {
  if (props.database) {
    return `${connection.value?.name || 'Connection'} → ${props.database}`
  }
  return connection.value?.name || 'Connection'
})

const consoleTitle = computed(() => {
  if (props.database) {
    return 'SQL Console'
  }
  return 'Database Console'
})

// Query templates based on console type and dialect
const queryTemplates = computed(() => {
  const dialect = currentDialect.value
  const isPostgres = dialect.includes('postgres') || dialect.includes('pgsql')
  const isMysql = dialect.includes('mysql')

  // Helper to quote identifiers based on dialect
  const quoteId = (name: string) => {
    if (isMysql) return `\`${name}\``
    if (isPostgres) return `"${name}"`
    return name
  }

  if (props.database) {
    // Database-scoped SQL Console - data exploration templates
    if (isPostgres) {
      return [
        { name: 'Select all rows', query: `SELECT * FROM ${quoteId('table_name')} LIMIT 100;` },
        { name: 'Count rows', query: `SELECT COUNT(*) FROM ${quoteId('table_name')};` },
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
          query: `SELECT column_name, COUNT(*) as count FROM ${quoteId('table_name')} GROUP BY column_name HAVING COUNT(*) > 1;`
        },
        {
          name: 'Search text',
          query: `SELECT * FROM ${quoteId('table_name')} WHERE column_name ILIKE '%search_term%';`
        }
      ]
    } else {
      // MySQL
      return [
        { name: 'Select all rows', query: `SELECT * FROM ${quoteId('table_name')} LIMIT 100;` },
        { name: 'Count rows', query: `SELECT COUNT(*) FROM ${quoteId('table_name')};` },
        { name: 'Show tables', query: `SHOW TABLES;` },
        { name: 'Describe table', query: `DESCRIBE ${quoteId('table_name')};` },
        {
          name: 'Find duplicates',
          query: `SELECT column_name, COUNT(*) as count FROM ${quoteId('table_name')} GROUP BY column_name HAVING COUNT(*) > 1;`
        },
        {
          name: 'Search text',
          query: `SELECT * FROM ${quoteId('table_name')} WHERE column_name LIKE '%search_term%';`
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
})

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

// Query tabs from store
const queryTabs = computed(() => sqlConsoleStore.getTabs(props.connectionId, props.database))
const activeQueryTabId = computed(() =>
  sqlConsoleStore.getActiveTabId(props.connectionId, props.database)
)
const activeQueryTab = computed(() =>
  sqlConsoleStore.getActiveTab(props.connectionId, props.database)
)

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
      sqlConsoleStore.updateTabQuery(props.connectionId, props.database, tabId, newQuery)
    }, 500)
  }
})

// ========== Tab Management ==========
function setActiveQueryTab(tabId: string) {
  const currentTabId = activeQueryTabId.value
  if (currentTabId) {
    sqlConsoleStore.updateTabQuery(props.connectionId, props.database, currentTabId, sqlQuery.value)
  }
  sqlConsoleStore.setActiveTab(props.connectionId, props.database, tabId)
}

function getDefaultQueryTemplate(): string {
  const dialect = currentDialect.value
  const isPostgres = dialect.includes('postgres') || dialect.includes('pgsql')

  if (props.database) {
    // Database-scoped console - minimal template for new queries
    return `-- Write your query here\nSELECT * FROM  LIMIT 100;`
  } else if (props.sqlScope === 'connection') {
    // Connection-scoped console - admin operations
    if (isPostgres) {
      return `-- Write your query here\n`
    } else {
      return `-- Write your query here\n`
    }
  }
  return `-- Write your query here\n`
}

// ========== Templates & History ==========
function insertTemplate(query: string) {
  sqlQuery.value = query
  showTemplates.value = false
}

function loadHistory() {
  try {
    const stored = localStorage.getItem(HISTORY_KEY)
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
    localStorage.setItem(HISTORY_KEY, JSON.stringify(queryHistory.value))
  } catch (e) {
    console.warn('Failed to save query history:', e)
  }
}

function insertHistoryQuery(item: QueryHistoryItem) {
  sqlQuery.value = item.query
  showHistory.value = false
}

function formatHistoryTime(timestamp: number): string {
  const now = new Date()
  const date = new Date(timestamp)
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (isToday) return `Today ${time}`
  if (isYesterday) return `Yesterday ${time}`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` ${time}`
}

function addQueryTab() {
  const currentTabId = activeQueryTabId.value
  if (currentTabId) {
    sqlConsoleStore.updateTabQuery(props.connectionId, props.database, currentTabId, sqlQuery.value)
  }
  const newTab = sqlConsoleStore.addTab(props.connectionId, props.database)
  // Set a minimal template for the new tab
  sqlConsoleStore.updateTabQuery(
    props.connectionId,
    props.database,
    newTab.id,
    getDefaultQueryTemplate()
  )
}

function closeQueryTab(tabId: string) {
  sqlConsoleStore.closeTab(props.connectionId, props.database, tabId)
}

function closeAllQueryTabs() {
  sqlConsoleStore.clearTabs(props.connectionId, props.database)
}

function handleRenameTab(tabId: string, newName: string) {
  sqlConsoleStore.renameTab(props.connectionId, props.database, tabId, newName)
}

// ========== Data Loading ==========
async function loadDatabases() {
  if (props.database) return
  try {
    const dbs = await connections.getDatabases(props.connectionId)
    availableDatabases.value = dbs.map((d) => d.name)
  } catch (error) {
    console.error('Failed to load databases:', error)
  }
}

async function loadTableSuggestions() {
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

// ========== Query Execution ==========
function formatQuery() {
  if (!sqlQuery.value.trim()) return

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

    const knownTables = tablesList.value.map((t) => t.name)
    const knownColumns = new Set<string>()
    Object.values(columnsMap.value).forEach((cols) => {
      cols.forEach((c) => knownColumns.add(c.name))
    })

    const allIdentifiers = [...knownTables, ...knownColumns]
    for (const identifier of allIdentifiers) {
      const pattern = `(?<![${quoteChar}"\`])\\b${identifier}\\b(?![${quoteChar}"\`])`
      const regex = new RegExp(pattern, 'gi')
      formatted = formatted.replace(regex, `${quoteChar}${identifier}${quoteChar}`)
    }

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
    const db = props.database || selectedDatabase.value
    const result = await connections.executeQuery(props.connectionId, query, db || undefined)

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

    // Log the SQL query to SQL Logs
    logsStore.addSQLLog({
      id: `sql-console-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      connectionId: props.connectionId,
      tabId: activeQueryTabId.value || undefined,
      database: db || '',
      query: query,
      purpose: detectQueryPurpose(query),
      startedAt: new Date(startTime).toISOString(),
      durationMs: duration,
      rowCount: queryResults.value.length
    })

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

    // If DDL query succeeded, refresh the affected parts of the sidebar
    // Backend returns affectedObject: "database", "schema", or "table"
    if (result.affectedObject) {
      if (result.affectedObject === 'database' || result.affectedObject === 'schema') {
        // Refresh database list for CREATE/DROP DATABASE or SCHEMA
        navigationStore.invalidateDatabases(props.connectionId)
        await navigationStore.ensureDatabases(props.connectionId, true)
      }
      if (result.affectedObject === 'table' && db) {
        // Refresh metadata for CREATE/DROP/ALTER TABLE
        navigationStore.invalidateMetadata(props.connectionId, db)
      }
    }

    // Save successful query to history
    saveToHistory(query)
  } catch (error: unknown) {
    const err = error as Error
    queryError.value = err.message || 'Failed to execute query'
    queryResults.value = []
    resultColumns.value = []
    lastQueryStats.value = null

    const duration = Date.now() - startTime
    const db = props.database || selectedDatabase.value

    // Log the failed SQL query to SQL Logs
    logsStore.addSQLLog({
      id: `sql-console-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      connectionId: props.connectionId,
      tabId: activeQueryTabId.value || undefined,
      database: db || '',
      query: query,
      purpose: detectQueryPurpose(query),
      startedAt: new Date(startTime).toISOString(),
      durationMs: duration,
      rowCount: 0,
      error: queryError.value
    })

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

// ========== Lifecycle ==========
watch(() => selectedDatabase.value, loadTableSuggestions)

onMounted(async () => {
  // Load query history from localStorage
  loadHistory()

  await loadDatabases()
  await loadTableSuggestions()

  const activeTab = activeQueryTab.value
  if (activeTab && !activeTab.query.trim()) {
    // Set a minimal default query - templates are available via dropdown
    const defaultQuery = `-- Write your query here or select a template from the dropdown above\n`
    sqlQuery.value = defaultQuery
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
