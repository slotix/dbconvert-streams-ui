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
    <div ref="splitContainerRef" class="flex-1 flex overflow-hidden min-h-0">
      <!-- Editor Pane -->
      <div
        ref="leftPaneRef"
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  GlobeAltIcon,
  QuestionMarkCircleIcon,
  InformationCircleIcon
} from '@heroicons/vue/24/outline'
import type { SchemaContext } from '@/composables/useMonacoSqlProviders'
import { useConnectionsStore } from '@/stores/connections'
import { useLogsStore } from '@/stores/logs'
import { executeFederatedQuery, type ConnectionMapping } from '@/api/federated'
import { SqlQueryTabs, SqlEditorPane, SqlResultsPane } from '@/components/database/sql-console'
import ConnectionAliasPanel from './ConnectionAliasPanel.vue'
import { useConsoleTab, detectQueryPurpose } from '@/composables/useConsoleTab'

// Stores
const connectionsStore = useConnectionsStore()
const logsStore = useLogsStore()

// Console key for tabs - unique for federated console
const consoleKey = 'federated-console'
const historyKey = 'federated-console-history'

// Use console tab composable
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
  getDefaultQuery: () => `-- Federated Query
-- Select connections from Data Sources above, then use their aliases in your query
-- Example: SELECT * FROM pg1.public.table JOIN my1.table ON ...

`
})

// Federated-specific state
const selectedConnections = ref<ConnectionMapping[]>([])

// Schema context for autocomplete (limited for federated)
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

// ========== Query Execution ==========
async function executeQuery() {
  const query = sqlQuery.value.trim()
  if (!query) return

  // Allow file queries without connections
  const hasFileQuery =
    query.includes('read_parquet') || query.includes('read_csv') || query.includes('read_json')

  if (selectedConnections.value.length === 0 && !hasFileQuery) {
    setExecutionError('Please select at least one connection from Data Sources')
    return
  }

  isExecuting.value = true
  const startTime = Date.now()

  try {
    const result = await executeFederatedQuery({
      query,
      connections: selectedConnections.value
    })

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

    const duration = result.duration || Date.now() - startTime

    setExecutionResult({
      columns,
      rows,
      stats: { rowCount: result.count || rows.length, duration }
    })

    // Log the SQL query
    logsStore.addSQLLog({
      id: `federated-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      connectionId: 'federated',
      tabId: activeQueryTabId.value || undefined,
      database: selectedConnections.value.map((c) => c.alias).join(', '),
      query: query,
      purpose: detectQueryPurpose(query),
      startedAt: new Date(startTime).toISOString(),
      durationMs: duration,
      rowCount: rows.length
    })

    // Save successful query to history
    saveToHistory(query)
  } catch (error: unknown) {
    const err = error as Error
    const errorMsg = err.message || 'Failed to execute federated query'
    const duration = Date.now() - startTime

    setExecutionError(errorMsg)

    // Log the failed query
    logsStore.addSQLLog({
      id: `federated-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      connectionId: 'federated',
      tabId: activeQueryTabId.value || undefined,
      database: selectedConnections.value.map((c) => c.alias).join(', '),
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
onMounted(async () => {
  initialize()

  // Ensure connections are loaded
  if (connectionsStore.connections.length === 0) {
    await connectionsStore.refreshConnections()
  }
})

onUnmounted(() => {
  cleanup()
})
</script>
