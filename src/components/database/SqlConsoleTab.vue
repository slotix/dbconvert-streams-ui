<template>
  <div class="sql-console-tab h-full flex flex-col bg-gray-50 dark:bg-gray-900 pb-2">
    <!-- Header -->
    <SqlConsoleHeader
      :scope-label="scopeLabel"
      :show-database-selector="!database"
      :selected-database="selectedDatabase"
      :available-databases="availableDatabases"
      @update:selected-database="selectedDatabase = $event"
    />

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
import connections from '@/api/connections'
import { format as formatSQL } from 'sql-formatter'
import { SqlConsoleHeader, SqlQueryTabs, SqlEditorPane, SqlResultsPane } from './sql-console'

const props = defineProps<{
  connectionId: string
  database?: string
  sqlScope: 'database' | 'connection'
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

// Database selection (for connection-scoped console)
const selectedDatabase = ref(props.database || '')
const availableDatabases = ref<string[]>([])

// Resizable panel
const editorWidth = ref(50)
const isResizing = ref(false)

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

function addQueryTab() {
  const currentTabId = activeQueryTabId.value
  if (currentTabId) {
    sqlConsoleStore.updateTabQuery(props.connectionId, props.database, currentTabId, sqlQuery.value)
  }
  sqlConsoleStore.addTab(props.connectionId, props.database)
}

function closeQueryTab(tabId: string) {
  sqlConsoleStore.closeTab(props.connectionId, props.database, tabId)
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

// ========== Resize Handling ==========
function startResize(e: MouseEvent) {
  isResizing.value = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
}

function handleResize(e: MouseEvent) {
  if (!isResizing.value) return

  const container = document.querySelector('.sql-console-tab')
  if (!container) return

  const containerRect = container.getBoundingClientRect()
  const mouseX = e.clientX - containerRect.left
  let newWidth = (mouseX / containerRect.width) * 100
  newWidth = Math.max(25, Math.min(75, newWidth))
  editorWidth.value = newWidth
}

function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

// ========== Lifecycle ==========
watch(() => selectedDatabase.value, loadTableSuggestions)

onMounted(async () => {
  await loadDatabases()
  await loadTableSuggestions()

  const activeTab = activeQueryTab.value
  if (activeTab && !activeTab.query.trim()) {
    const defaultQuery = props.database
      ? `-- Database: ${props.database}\nSELECT * FROM  LIMIT 100;`
      : `-- Use: USE database_name; or prefix tables with database.table\nSHOW DATABASES;`
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
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
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
