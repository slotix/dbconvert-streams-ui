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

    <!-- Execution Context Toolbar -->
    <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
      <button
        type="button"
        class="group min-w-0 flex-1 inline-flex items-center gap-2 text-sm text-left rounded-md px-2.5 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        title="Manage attached sources"
        aria-label="Manage attached sources"
        @click="isSourceDrawerOpen = true"
      >
        <span class="text-gray-500 dark:text-gray-400 shrink-0 text-xs">Attached</span>
        <span class="truncate text-gray-700 dark:text-gray-300">{{ attachedSourcesLabel }}</span>
        <span class="shrink-0 text-[11px] text-teal-600 dark:text-teal-400 group-hover:underline">
          Manage
        </span>
        <ChevronRight
          class="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-teal-600 dark:group-hover:text-teal-400"
        />
      </button>

      <div class="shrink-0 execution-context-wrap">
        <div v-if="showUnifiedExecutionSelector">
          <FormSelect
            v-model="executionContextValue"
            :options="executionContextOptions"
            class="execution-context-select"
            placeholder="Select execution mode"
          />
        </div>

        <div
          v-else
          class="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-850 text-gray-700 dark:text-gray-300 max-w-[320px] truncate"
        >
          {{ singleExecutionLabel }}
        </div>
      </div>
    </div>

    <!-- Query Tabs -->
    <SqlQueryTabs
      :tabs="queryTabs"
      :active-tab-id="activeQueryTabId"
      :can-reopen-tab="canReopenQueryTab()"
      @select="setActiveQueryTab"
      @close="closeQueryTab"
      @close-others="closeOthersQueryTabs"
      @close-all="closeAllQueryTabs"
      @add="addQueryTab"
      @rename="handleRenameTab"
      @reorder="reorderQueryTab"
      @reopen-closed-tab="reopenQueryTab"
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

    <SlideOverPanel
      :open="isSourceDrawerOpen"
      title="Query Session"
      size="lg"
      :body-scrollable="false"
      :body-padding="false"
      @close="isSourceDrawerOpen = false"
    >
      <ConnectionAliasPanel
        class="h-full"
        :model-value="selectedConnections"
        :show-file-connections="true"
        :default-collapsed="false"
        :compact="true"
        :show-hints="true"
        :show-header="false"
        :show-create-connection-link="true"
        @update:modelValue="handleUpdateSelectedConnections"
      />
    </SlideOverPanel>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, type Component } from 'vue'
import { ChevronRight, CircleHelp, Database, Info, Terminal } from 'lucide-vue-next'
import type { SchemaContext } from '@/composables/useMonacoSqlProviders'
import { useConnectionsStore } from '@/stores/connections'
import { usePaneTabsStore } from '@/stores/paneTabs'
import connections from '@/api/connections'
import { SqlQueryTabs, SqlEditorPane, SqlResultsPane } from '@/components/database/sql-console'
import FormSelect from '@/components/base/FormSelect.vue'
import SlideOverPanel from '@/components/common/SlideOverPanel.vue'
import ConnectionAliasPanel from './ConnectionAliasPanel.vue'
import { useConsoleTab } from '@/composables/useConsoleTab'
import { useConsoleSources, type ConsoleMode } from '@/composables/useConsoleSources'
import { useQueryExecution } from '@/composables/useQueryExecution'
import {
  getConnectionKindFromSpec,
  getSqlDialectFromConnection,
  isDatabaseKind
} from '@/types/specs'
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
const paneTabsStore = usePaneTabsStore()
const isSourceDrawerOpen = ref(false)

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

// ========== Data Sources Composable ==========
// Note: Must be before useConsoleTab so we can compute dialect
const modeRef = computed(() => props.mode)
const connectionIdRef = computed(() => props.connectionId)
const databaseRef = computed(() => props.database)

const sqlConsoleStoreConnectionKey = computed(() => props.connectionId)

const {
  selectedConnections,
  useFederatedEngine,
  runMode,
  databaseSourceMappings,
  singleSourceMapping,
  handleUpdateSelectedConnections,
  setRunMode,
  setSingleSourceConnectionId,
  initializeDefaultSources,
  syncPrimarySource,
  restoreSelectedConnections,
  restoreRunMode,
  restoreSingleSourceConnection
} = useConsoleSources({
  connectionId: connectionIdRef,
  mode: modeRef,
  database: databaseRef,
  consoleKey
})

const attachedSourcesLabel = computed(() => {
  if (selectedConnections.value.length === 0) return 'none'

  const previewLimit = 2
  const aliases = selectedConnections.value.slice(0, previewLimit).map((m) => m.alias || 'db')
  const overflow = Math.max(0, selectedConnections.value.length - previewLimit)
  return overflow > 0 ? `${aliases.join(', ')} +${overflow}` : aliases.join(', ')
})

const federatedScopeConnectionId = ref('')

function isDatabaseMapping(mapping: { connectionId: string }): boolean {
  const conn = connectionsStore.connectionByID(mapping.connectionId)
  const kind = getConnectionKindFromSpec(conn?.spec)
  return isDatabaseKind(kind)
}

const effectiveSelectedConnections = computed(() => {
  if (runMode.value !== 'federated') {
    return selectedConnections.value
  }

  if (!federatedScopeConnectionId.value) {
    return selectedConnections.value
  }

  const scoped = selectedConnections.value.find(
    (mapping) =>
      mapping.connectionId === federatedScopeConnectionId.value && !isDatabaseMapping(mapping)
  )
  return scoped ? [scoped] : selectedConnections.value
})

const directExecutionOptions = computed(() =>
  databaseSourceMappings.value.map((mapping) => {
    const conn = connectionsStore.connectionByID(mapping.connectionId)
    const alias = mapping.alias || 'db'
    const connName = conn?.name || mapping.connectionId
    return {
      value: `direct:${mapping.connectionId}`,
      label: `Direct: ${alias} · ${connName}`
    }
  })
)

const scopedExecutionOptions = computed(() =>
  selectedConnections.value
    .filter((mapping) => !isDatabaseMapping(mapping))
    .map((mapping) => {
      const conn = connectionsStore.connectionByID(mapping.connectionId)
      const alias = mapping.alias || 'src'
      const connName = conn?.name || mapping.connectionId
      return {
        value: `scoped:${mapping.connectionId}`,
        label: `Scoped: ${alias} · ${connName}`
      }
    })
)

const showUnifiedExecutionSelector = computed(() => {
  if (props.mode !== 'database') return false
  return databaseSourceMappings.value.length > 1 || scopedExecutionOptions.value.length > 0
})

const executionContextOptions = computed(() => {
  return [
    ...directExecutionOptions.value,
    ...scopedExecutionOptions.value,
    { value: 'federated', label: 'Multi source' }
  ]
})

const executionContextValue = computed<string>({
  get() {
    if (runMode.value === 'federated') {
      if (
        federatedScopeConnectionId.value &&
        scopedExecutionOptions.value.some(
          (option) => option.value === `scoped:${federatedScopeConnectionId.value}`
        )
      ) {
        return `scoped:${federatedScopeConnectionId.value}`
      }
      return 'federated'
    }

    const directId =
      singleSourceMapping.value?.connectionId || databaseSourceMappings.value[0]?.connectionId
    return directId ? `direct:${directId}` : 'federated'
  },
  set(value) {
    if (value === 'federated') {
      federatedScopeConnectionId.value = ''
      setRunMode('federated')
      return
    }
    if (value.startsWith('scoped:')) {
      const connectionId = value.slice('scoped:'.length)
      if (connectionId) {
        federatedScopeConnectionId.value = connectionId
      }
      setRunMode('federated')
      return
    }
    if (value.startsWith('direct:')) {
      federatedScopeConnectionId.value = ''
      const connectionId = value.slice('direct:'.length)
      if (connectionId) {
        setSingleSourceConnectionId(connectionId)
      }
      setRunMode('single')
    }
  }
})

const singleExecutionLabel = computed(() => {
  if (runMode.value === 'federated') {
    if (federatedScopeConnectionId.value) {
      const mapping = selectedConnections.value.find(
        (m) => m.connectionId === federatedScopeConnectionId.value
      )
      const conn = mapping ? connectionsStore.connectionByID(mapping.connectionId) : null
      if (mapping) {
        return `Executing: Scoped · ${mapping.alias || 'src'} · ${conn?.name || mapping.connectionId}`
      }
    }
    return 'Executing: Multi source'
  }

  const mapping = singleSourceMapping.value || databaseSourceMappings.value[0]
  if (!mapping) return 'Executing: Single source'

  const conn = connectionsStore.connectionByID(mapping.connectionId)
  return `Executing: ${mapping.alias || 'db'} · ${conn?.name || mapping.connectionId}`
})

// ========== SQL Dialect ==========
const currentDialect = computed(() => {
  if (useFederatedEngine.value) {
    return 'sql'
  }
  if (props.mode === 'file') {
    return 'sql' // DuckDB uses standard SQL
  }
  const targetConnection =
    runMode.value === 'single' && singleSourceMapping.value
      ? connectionsStore.connectionByID(singleSourceMapping.value.connectionId)
      : connection.value
  return getSqlDialectFromConnection(targetConnection?.spec, targetConnection?.type)
})

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
  closeOthersQueryTabs,
  handleRenameTab,
  reorderQueryTab,
  canReopenQueryTab,
  reopenQueryTab,

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
  // SQL console tabs in Pinia are keyed by connectionId + optional database.
  // Keep this aligned with addTabWithQuery/open actions.
  consoleKey: sqlConsoleStoreConnectionKey,
  database: databaseRef,
  historyKey,
  dialect: currentDialect
})

// ========== Query Execution Composable ==========
const { isExecuting, executeQuery } = useQueryExecution({
  mode: modeRef,
  connectionId: connectionIdRef,
  database: databaseRef,
  selectedConnections: effectiveSelectedConnections,
  singleSourceMapping,
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

  const targetConnectionId = singleSourceMapping.value?.connectionId || props.connectionId
  const db = singleSourceMapping.value?.database?.trim() || props.database?.trim()
  if (!db) {
    tablesList.value = []
    columnsMap.value = {}
    return
  }

  try {
    const metadata = await connections.getMetadata(targetConnectionId, db, forceRefresh)
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
    const sources = effectiveSelectedConnections.value
      .map((mapping) => {
        const conn = connectionsStore.connectionByID(mapping.connectionId)
        const kind = getConnectionKindFromSpec(conn?.spec)
        if (!kind || !mapping.alias) return null
        return {
          alias: mapping.alias,
          kind
        }
      })
      .filter(
        (
          source
        ): source is {
          alias: string
          kind: NonNullable<ReturnType<typeof getConnectionKindFromSpec>>
        } => Boolean(source)
      )
    return getFederatedTemplates(sources)
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

const paneTabDefaultName = computed(() => {
  const connName = connection.value?.name || (props.mode === 'file' ? 'Files' : 'SQL')
  if (props.mode === 'file') {
    return `${connName} (DuckDB)`
  }
  if (props.database) {
    return `${connName} → ${props.database}`
  }
  return `${connName} (Admin)`
})

const paneTabFederatedName = computed(() => {
  const sourceCount = effectiveSelectedConnections.value.length
  const sourcePart = `${sourceCount} source${sourceCount === 1 ? '' : 's'}`
  if (props.mode === 'database' && props.database) {
    return `Multi • DB: ${props.database} • ${sourcePart}`
  }
  return `Multi • ${scopeLabel.value} • ${sourcePart}`
})

const paneTabName = computed(() =>
  runMode.value === 'federated' ? paneTabFederatedName.value : paneTabDefaultName.value
)

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
  restoreRunMode()
  restoreSingleSourceConnection()

  if (props.mode === 'database') await loadTableSuggestions()
})

onUnmounted(() => {
  cleanup()
})

watch(
  paneTabName,
  (name) => {
    paneTabsStore.renameSqlConsoleTabs(props.connectionId, props.database, name)
  },
  { immediate: true }
)

watch(
  selectedConnections,
  (mappings) => {
    if (!federatedScopeConnectionId.value) return
    const stillExists = mappings.some(
      (mapping) =>
        mapping.connectionId === federatedScopeConnectionId.value && !isDatabaseMapping(mapping)
    )
    if (!stillExists) {
      federatedScopeConnectionId.value = ''
    }
  },
  { deep: true }
)

watch(
  databaseSourceMappings,
  (mappings) => {
    if (props.mode !== 'database') return
    if (runMode.value === 'single' && mappings.length === 0) {
      setRunMode('federated')
    }
  },
  { immediate: true }
)

watch([runMode, singleSourceMapping], async () => {
  if (props.mode !== 'database') return
  if (useFederatedEngine.value) return
  await loadTableSuggestions()
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

.execution-context-select {
  width: 100%;
}

.execution-context-wrap {
  width: 280px;
}

.execution-context-select :deep(button) {
  height: 2rem;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
  padding-left: 0.75rem;
  padding-right: 2rem;
  font-size: 0.75rem;
  line-height: 1rem;
}

.execution-context-select :deep(ul) {
  left: auto;
  right: 0;
  width: max-content;
  min-width: max(100%, 340px);
  max-width: min(78vw, 520px);
  font-size: 0.75rem;
  background-color: #f9fafb;
}

:global(.dark) .execution-context-select :deep(ul) {
  background-color: #374151;
}

.execution-context-select :deep(li span) {
  overflow: visible;
  text-overflow: clip;
}
</style>
