<template>
  <div class="federated-console h-full flex flex-col bg-gray-50 dark:bg-gray-900 pb-2">
    <!-- Header -->
    <div
      class="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center space-x-2">
        <GlobeAltIcon class="h-5 w-5 text-teal-600 dark:text-teal-400" />
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
          Federated Query Console
        </span>
        <span class="text-xs text-gray-500 dark:text-gray-400"> Cross-connection SQL queries </span>
      </div>

      <div class="flex items-center space-x-2">
        <!-- Help button -->
        <button
          class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
          title="Query Help"
          @click="showHelp = !showHelp"
        >
          <QuestionMarkCircleIcon class="h-5 w-5" />
        </button>
      </div>
    </div>

    <!-- Help Panel -->
    <div
      v-if="showHelp"
      class="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 text-xs max-h-80 overflow-y-auto"
    >
      <div class="flex items-start space-x-2">
        <InformationCircleIcon class="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <div class="text-blue-700 dark:text-blue-300 space-y-2">
          <p class="font-medium">Federated Queries - Query Multiple Databases & Files</p>

          <div>
            <p class="font-medium mb-1">Database Queries:</p>
            <ul class="list-disc list-inside space-y-0.5 ml-2">
              <li>Select connections from the Data Sources panel below</li>
              <li>
                Each connection gets an alias (e.g.,
                <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded">pg1</code>,
                <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded">my1</code>)
              </li>
              <li>
                PostgreSQL:
                <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded">pg1.schema.table</code>
              </li>
              <li>
                MySQL:
                <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded">my1.table</code>
              </li>
            </ul>
          </div>

          <div>
            <p class="font-medium mb-1">File Queries (no connection needed):</p>
            <ul class="list-disc list-inside space-y-0.5 ml-2">
              <li>
                Parquet:
                <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded text-[10px]">
                  SELECT * FROM read_parquet('/path/file.parquet')
                </code>
              </li>
              <li>
                CSV:
                <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded text-[10px]">
                  SELECT * FROM read_csv('/path/file.csv', header=true)
                </code>
              </li>
              <li>
                S3:
                <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded text-[10px]">
                  SELECT * FROM read_parquet('s3://bucket/path/file.parquet')
                </code>
              </li>
            </ul>
          </div>

          <div>
            <p class="font-medium mb-1">Cross-Source Examples:</p>
            <ul class="list-disc list-inside space-y-0.5 ml-2">
              <li>
                <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded text-[10px]">
                  SELECT * FROM pg1.public.customers c JOIN my1.orders o ON c.id = o.customer_id
                </code>
              </li>
              <li>
                <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded text-[10px]">
                  SELECT db.*, f.rating FROM pg1.public.films db JOIN read_parquet('/data.parquet')
                  f ON db.id = f.id
                </code>
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

    <!-- Connection Alias Panel -->
    <ConnectionAliasPanel v-model="selectedConnections" />

    <!-- Warning: No connections selected -->
    <div
      v-if="selectedConnections.length === 0"
      class="mx-4 mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md"
    >
      <div class="flex items-start space-x-2">
        <InformationCircleIcon class="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5" />
        <div class="text-xs text-blue-700 dark:text-blue-300">
          <p>
            <strong>Database queries:</strong> Select connections from Data Sources above to query
            databases.
          </p>
          <p class="mt-1">
            <strong>File queries:</strong> You can query files directly without selecting any
            connection:
            <code class="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded font-mono"
              >read_parquet('/path/file.parquet')</code
            >
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
    <div class="flex-1 flex overflow-hidden min-h-0">
      <!-- Editor Pane -->
      <div
        class="border-r border-gray-200 dark:border-gray-700 min-h-0"
        :style="{ width: `${editorWidth}%` }"
      >
        <SqlEditorPane
          v-model="sqlQuery"
          dialect="sql"
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  GlobeAltIcon,
  QuestionMarkCircleIcon,
  InformationCircleIcon
} from '@heroicons/vue/24/outline'
import type { SchemaContext } from '@/composables/useMonacoSqlProviders'
import { useSqlConsoleStore } from '@/stores/sqlConsole'
import { useLogsStore, type QueryPurpose } from '@/stores/logs'
import { useConnectionsStore } from '@/stores/connections'
import { executeFederatedQuery, type ConnectionMapping } from '@/api/federated'
import { format as formatSQL } from 'sql-formatter'
import { SqlQueryTabs, SqlEditorPane, SqlResultsPane } from '@/components/database/sql-console'
import ConnectionAliasPanel from './ConnectionAliasPanel.vue'

// Helper to detect query purpose from SQL
function detectQueryPurpose(query: string): QueryPurpose {
  const normalized = query.trim().toUpperCase()
  const firstWord = normalized.split(/\s+/)[0]

  if (['CREATE', 'ALTER', 'DROP', 'TRUNCATE'].includes(firstWord)) {
    return 'SCHEMA_CHANGE'
  }
  if (['INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT'].includes(firstWord)) {
    return 'DML_OPERATION'
  }
  if (
    ['SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN'].includes(firstWord) ||
    normalized.includes('INFORMATION_SCHEMA')
  ) {
    return 'SCHEMA_INTROSPECTION'
  }
  if (normalized.includes('COUNT(') || normalized.includes('COUNT (')) {
    return 'COUNT_QUERY'
  }
  return 'DATA_QUERY'
}

// Stores
const sqlConsoleStore = useSqlConsoleStore()
const logsStore = useLogsStore()
const connectionsStore = useConnectionsStore()

// State
const selectedConnections = ref<ConnectionMapping[]>([])
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

// Resizable panel
const editorWidth = ref(50)
const isResizing = ref(false)

// Console key for tabs - unique for federated console
const consoleKey = 'federated-console'
const historyKey = 'federated-console-history'

// Query tabs from store
const queryTabs = computed(() => sqlConsoleStore.getTabs(consoleKey))
const activeQueryTabId = computed(() => sqlConsoleStore.getActiveTabId(consoleKey))
const activeQueryTab = computed(() => sqlConsoleStore.getActiveTab(consoleKey))

// Schema context for autocomplete (limited for federated - future enhancement)
const schemaContext = computed<SchemaContext>(() => ({
  tables: [],
  columns: {},
  dialect: 'sql'
}))

// Query templates for federated queries
const queryTemplates = computed(() => {
  const aliases = selectedConnections.value.map((c) => c.alias)
  const pg1 = aliases.find((a) => a.startsWith('pg')) || 'pg1'
  const my1 = aliases.find((a) => a.startsWith('my')) || 'my1'

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
      name: 'Query S3 Parquet',
      query: `-- Query Parquet file from S3 (no connection needed)
SELECT * FROM read_parquet('s3://bucket-name/path/to/file.parquet') LIMIT 100;`
    },
    {
      name: 'JOIN database + file',
      query: `-- Join database table with Parquet file
SELECT db.*, f.*
FROM ${pg1}.public.table_name db
JOIN read_parquet('/path/to/file.parquet') f ON db.id = f.id
LIMIT 100;`
    }
  ]
})

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
      sqlConsoleStore.updateTabQuery(consoleKey, undefined, tabId, newQuery)
    }, 500)
  }
})

// ========== Tab Management ==========
function setActiveQueryTab(tabId: string) {
  const currentTabId = activeQueryTabId.value
  if (currentTabId) {
    sqlConsoleStore.updateTabQuery(consoleKey, undefined, currentTabId, sqlQuery.value)
  }
  sqlConsoleStore.setActiveTab(consoleKey, undefined, tabId)
}

function getDefaultQueryTemplate(): string {
  return `-- Federated Query
-- Select connections from Data Sources above, then use their aliases in your query
-- Example: SELECT * FROM pg1.public.table JOIN my1.table ON ...

`
}

function addQueryTab() {
  const currentTabId = activeQueryTabId.value
  if (currentTabId) {
    sqlConsoleStore.updateTabQuery(consoleKey, undefined, currentTabId, sqlQuery.value)
  }
  const newTab = sqlConsoleStore.addTab(consoleKey, undefined)
  sqlConsoleStore.updateTabQuery(consoleKey, undefined, newTab.id, getDefaultQueryTemplate())
}

function closeQueryTab(tabId: string) {
  sqlConsoleStore.closeTab(consoleKey, undefined, tabId)
}

function closeAllQueryTabs() {
  sqlConsoleStore.clearTabs(consoleKey, undefined)
}

function handleRenameTab(tabId: string, newName: string) {
  sqlConsoleStore.renameTab(consoleKey, undefined, tabId, newName)
}

// ========== Templates & History ==========
function insertTemplate(query: string) {
  sqlQuery.value = query
}

function loadHistory() {
  try {
    const stored = localStorage.getItem(historyKey)
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
    localStorage.setItem(historyKey, JSON.stringify(queryHistory.value))
  } catch (e) {
    console.warn('Failed to save query history:', e)
  }
}

function insertHistoryQuery(item: QueryHistoryItem) {
  sqlQuery.value = item.query
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

  if (selectedConnections.value.length === 0) {
    queryError.value = 'Please select at least one connection from Data Sources'
    hasExecutedQuery.value = true
    return
  }

  isExecuting.value = true
  queryError.value = null
  hasExecutedQuery.value = true
  const startTime = Date.now()

  try {
    const result = await executeFederatedQuery({
      query,
      connections: selectedConnections.value
    })

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

    const duration = result.duration || Date.now() - startTime
    lastQueryStats.value = { rowCount: result.count || queryResults.value.length, duration }
    currentPage.value = 1

    // Log the SQL query
    logsStore.addSQLLog({
      id: `federated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      connectionId: 'federated',
      tabId: activeQueryTabId.value || undefined,
      database: selectedConnections.value.map((c) => c.alias).join(', '),
      query: query,
      purpose: detectQueryPurpose(query),
      startedAt: new Date(startTime).toISOString(),
      durationMs: duration,
      rowCount: queryResults.value.length
    })

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
  } catch (error: unknown) {
    const err = error as Error
    queryError.value = err.message || 'Failed to execute federated query'
    queryResults.value = []
    resultColumns.value = []
    lastQueryStats.value = null

    const duration = Date.now() - startTime

    // Log the failed query
    logsStore.addSQLLog({
      id: `federated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      connectionId: 'federated',
      tabId: activeQueryTabId.value || undefined,
      database: selectedConnections.value.map((c) => c.alias).join(', '),
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

// ========== Resize Handling ==========
function startResize(e: MouseEvent) {
  isResizing.value = true
  e.preventDefault()
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

function handleResize(e: MouseEvent) {
  if (!isResizing.value) return
  const container = document.querySelector('.federated-console')
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
onMounted(async () => {
  // Load query history
  loadHistory()

  // Ensure connections are loaded
  if (connectionsStore.connections.length === 0) {
    await connectionsStore.refreshConnections()
  }

  // Initialize first tab if needed
  if (queryTabs.value.length === 0) {
    const newTab = sqlConsoleStore.addTab(consoleKey, undefined)
    sqlConsoleStore.updateTabQuery(consoleKey, undefined, newTab.id, getDefaultQueryTemplate())
  }
})

onUnmounted(() => {
  if (saveTimeout) clearTimeout(saveTimeout)
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>
