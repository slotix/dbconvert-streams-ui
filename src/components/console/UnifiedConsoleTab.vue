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
          <p class="font-medium">SQL Console - Query Files with SQL</p>

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
import { ref, computed, onMounted, onUnmounted, type Component } from 'vue'
import { CircleHelp, Database, Info, Terminal } from 'lucide-vue-next'
import type { SchemaContext } from '@/composables/useMonacoSqlProviders'
import { useConnectionsStore } from '@/stores/connections'
import connections from '@/api/connections'
import { SqlQueryTabs, SqlEditorPane, SqlResultsPane } from '@/components/database/sql-console'
import ConnectionAliasPanel from './ConnectionAliasPanel.vue'
import { useConsoleTab } from '@/composables/useConsoleTab'
import { useConsoleSources, type ConsoleMode } from '@/composables/useConsoleSources'
import { useQueryExecution } from '@/composables/useQueryExecution'
import { getSqlDialectFromConnection } from '@/types/specs'
import {
  getFederatedTemplates,
  getFileTemplates,
  getDatabaseTemplates,
  computeFileTemplatePrefix
} from './queryTemplates'

// ========== Props ==========
export type { ConsoleMode }
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

const showConsoleHeader = computed(() => props.mode === 'file')

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

// ========== Base Connection ==========
const connection = computed(() => connectionsStore.connectionByID(props.connectionId))

// ========== Console Tab Composable ==========
const {
  // State
  sqlQuery,
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

// ========== Data Sources Composable ==========
const modeRef = computed(() => props.mode)
const connectionIdRef = computed(() => props.connectionId)
const databaseRef = computed(() => props.database)

const {
  selectedConnections,
  useFederatedEngine,
  handleUpdateSelectedConnections,
  initializeDefaultSources,
  syncPrimarySource,
  restoreSelectedConnections
} = useConsoleSources({
  connectionId: connectionIdRef,
  mode: modeRef,
  database: databaseRef,
  consoleKey
})

// ========== Query Execution Composable ==========
const { isExecuting, executeQuery } = useQueryExecution({
  mode: modeRef,
  connectionId: connectionIdRef,
  database: databaseRef,
  selectedConnections,
  useFederatedEngine,
  sqlQuery,
  activeQueryTabId,
  setExecutionResult,
  setExecutionError,
  saveToHistory,
  loadTableSuggestionsWithRefresh
})

// ========== Schema Context (database mode) ==========
const tablesList = ref<Array<{ name: string; schema?: string }>>([])
const columnsMap = ref<Record<string, Array<{ name: string; type: string; nullable: boolean }>>>({})

const currentDialect = computed(() => {
  if (useFederatedEngine.value) {
    return 'sql'
  }
  if (props.mode === 'file') {
    return 'sql' // DuckDB uses standard SQL
  }
  return getSqlDialectFromConnection(connection.value?.spec, connection.value?.type)
})

const schemaContext = computed<SchemaContext>(() => {
  if (useFederatedEngine.value) {
    return { tables: [], columns: {}, dialect: 'sql' }
  }
  if (props.mode === 'file') {
    return { tables: [], columns: {}, dialect: 'sql' }
  }
  return {
    tables: tablesList.value,
    columns: columnsMap.value,
    dialect: currentDialect.value
  }
})

async function loadTableSuggestions() {
  await loadTableSuggestionsWithRefresh(false)
}

async function loadTableSuggestionsWithRefresh(forceRefresh: boolean) {
  if (props.mode !== 'database') return
  if (useFederatedEngine.value) return

  const db = props.database?.trim()
  if (!db) {
    tablesList.value = []
    columnsMap.value = {}
    return
  }

  try {
    const metadata = await connections.getMetadata(props.connectionId, db, forceRefresh)
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

// ========== Query Templates ==========
const queryTemplates = computed(() => {
  if (useFederatedEngine.value) {
    const aliases = selectedConnections.value.map((c) => c.alias)
    return getFederatedTemplates(aliases)
  }
  if (props.mode === 'file') {
    const prefix = computeFileTemplatePrefix({
      fileContext: activeQueryTab.value?.fileContext,
      basePath: props.basePath,
      connectionType: props.connectionType
    })
    return getFileTemplates({ prefix })
  }
  return getDatabaseTemplates({
    dialect: currentDialect.value,
    database: props.database,
    tableContext: activeQueryTab.value?.tableContext
  })
})

// ========== UI Computed ==========
const headerIcon = computed<Component>(() => {
  return props.mode === 'file' ? Terminal : Database
})

const consoleTitle = 'SQL Console'

const scopeLabel = computed(() => {
  const connName = connection.value?.name || 'Connection'
  if (props.mode === 'file') {
    if (props.basePath) {
      return `${connName} → ${props.basePath}`
    }
    return connName
  }
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
  return resultColumns.value.length > 0 || queryResults.value.length > 0 ? 1 : 0
})

// ========== Lifecycle ==========
onMounted(async () => {
  initialize()

  if (connectionsStore.connections.length === 0) {
    await connectionsStore.refreshConnections()
  }

  restoreSelectedConnections()
  initializeDefaultSources()
  syncPrimarySource()

  if (props.mode === 'database') await loadTableSuggestions()
})

onUnmounted(() => {
  cleanup()
})

// ========== Public API ==========
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
