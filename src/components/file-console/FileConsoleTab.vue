<template>
  <div class="file-console-tab h-full flex flex-col bg-gray-50 dark:bg-gray-900 pb-2">
    <!-- Header -->
    <div
      class="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center space-x-2">
        <CommandLineIcon class="h-5 w-5 text-teal-600 dark:text-teal-400" />
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100"> DuckDB Console </span>
        <span class="text-xs text-gray-500 dark:text-gray-400">
          {{ scopeLabel }}
        </span>
      </div>

      <div class="flex items-center space-x-2">
        <!-- Quick help button -->
        <button
          class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
          title="Query Help"
          @click="showHelp = !showHelp"
        >
          <QuestionMarkCircleIcon class="h-5 w-5" />
        </button>
      </div>
    </div>

    <!-- Help Panel (collapsible) -->
    <div
      v-if="showHelp"
      class="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 text-xs"
    >
      <div class="flex items-start space-x-2">
        <InformationCircleIcon class="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <div class="text-blue-700 dark:text-blue-300 space-y-1">
          <p class="font-medium">DuckDB SQL Console for File Queries</p>
          <p>Use DuckDB file reading functions to query your data:</p>
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
              - S3 files
            </li>
          </ul>
          <p class="mt-1">
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
          dialect="sql"
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
import {
  CommandLineIcon,
  QuestionMarkCircleIcon,
  InformationCircleIcon
} from '@heroicons/vue/24/outline'
import type { SchemaContext } from '@/composables/useMonacoSqlProviders'
import { useConnectionsStore } from '@/stores/connections'
import { useSqlConsoleStore } from '@/stores/sqlConsole'
import { executeFileQuery } from '@/api/files'
import { format as formatSQL } from 'sql-formatter'
import { SqlQueryTabs, SqlEditorPane, SqlResultsPane } from '@/components/database/sql-console'

const props = defineProps<{
  connectionId: string
  connectionType: 'files' | 's3'
  basePath?: string // Base path for local files or S3 bucket/prefix
}>()

const connectionsStore = useConnectionsStore()
const sqlConsoleStore = useSqlConsoleStore()

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

// Resizable panel
const editorWidth = ref(50)
const isResizing = ref(false)

// ========== Computed ==========
const connection = computed(() => connectionsStore.connectionByID(props.connectionId))

const scopeLabel = computed(() => {
  const connName = connection.value?.name || 'Files'
  if (props.basePath) {
    return `${connName} → ${props.basePath}`
  }
  return connName
})

// Empty schema context for file queries (no table autocomplete - users use DuckDB functions)
const schemaContext = computed<SchemaContext>(() => ({
  tables: [],
  columns: {},
  dialect: 'sql'
}))

// Query tabs from store - use 'file-console' as the "database" key to separate from database tabs
const consoleKey = computed(() => `file:${props.connectionId}`)
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
  // Provide a helpful template based on connection type
  if (props.connectionType === 's3') {
    const prefix = props.basePath || 's3://bucket/path'
    return `-- DuckDB SQL Console for S3 Files
-- Query S3 files using read_* functions

-- Example: Query all Parquet files in a prefix
SELECT * FROM read_parquet('${prefix}/*.parquet') LIMIT 100;

-- Example: Query CSV files
-- SELECT * FROM read_csv_auto('${prefix}/data.csv') LIMIT 100;
`
  }

  const basePath = props.basePath || '/path/to/files'
  return `-- DuckDB SQL Console for Local Files
-- Query files using read_* functions

-- Example: Query a CSV file
SELECT * FROM read_csv_auto('${basePath}/data.csv') LIMIT 100;

-- Example: Query a Parquet file
-- SELECT * FROM read_parquet('${basePath}/data.parquet') LIMIT 100;

-- Example: Query all CSV files in a directory
-- SELECT * FROM read_csv_auto('${basePath}/*.csv') LIMIT 100;
`
}

function addQueryTab() {
  const currentTabId = activeQueryTabId.value
  if (currentTabId) {
    sqlConsoleStore.updateTabQuery(consoleKey.value, undefined, currentTabId, sqlQuery.value)
  }
  const newTab = sqlConsoleStore.addTab(consoleKey.value, undefined)
  // Set a helpful template for the new tab
  sqlConsoleStore.updateTabQuery(consoleKey.value, undefined, newTab.id, getDefaultQueryTemplate())
}

function closeQueryTab(tabId: string) {
  sqlConsoleStore.closeTab(consoleKey.value, undefined, tabId)
}

function handleRenameTab(tabId: string, newName: string) {
  sqlConsoleStore.renameTab(consoleKey.value, undefined, tabId, newName)
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
    const result = await executeFileQuery(query)

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

// ========== Resizable Panel ==========
function startResize() {
  isResizing.value = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

function handleResize(e: MouseEvent) {
  if (!isResizing.value) return

  const container = document.querySelector('.file-console-tab')
  if (!container) return

  const containerRect = container.getBoundingClientRect()
  const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

  // Clamp between 20% and 80%
  editorWidth.value = Math.max(20, Math.min(80, newWidth))
}

function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

// ========== Lifecycle ==========
onMounted(() => {
  // Initialize with default template if no tabs exist
  if (queryTabs.value.length === 0) {
    addQueryTab()
  } else if (!sqlQuery.value) {
    // Load active tab's query
    const activeTab = activeQueryTab.value
    if (activeTab) {
      sqlQuery.value = activeTab.query || getDefaultQueryTemplate()
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
</script>

<style scoped>
.file-console-tab {
  min-height: 400px;
}
</style>
