<template>
  <div class="console-tab h-full flex flex-col bg-gray-50 dark:bg-gray-900 pb-2">
    <!-- Execution Context Toolbar -->
    <div
      ref="executionToolbarRef"
      class="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-start gap-3"
    >
      <div class="shrink-0 w-auto">
        <div v-if="showUnifiedExecutionSelector" class="inline-flex flex-col items-start">
          <div class="inline-flex items-center" :class="hideToolbarLabels ? 'gap-0' : 'gap-2'">
            <span
              v-show="!hideToolbarLabels"
              class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap"
            >
              Run on:
            </span>
            <FormSelect
              v-model="executionContextValue"
              :options="executionContextOptions"
              class="execution-context-select w-[280px] min-w-[280px] max-w-[280px]"
              placeholder="Select execution mode"
            />
          </div>
          <span
            v-show="!hideToolbarLabels"
            class="execution-context-hint mt-1 text-[11px] leading-4 text-gray-500 dark:text-gray-400"
          >
            Templates &amp; autocomplete follow selected source
          </span>
          <span
            v-if="fileScopeWarning && !hideToolbarLabels"
            class="execution-context-hint mt-1 text-[11px] leading-4 text-amber-600 dark:text-amber-400"
          >
            {{ fileScopeWarning }}
          </span>
        </div>

        <div
          v-else
          class="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-850 text-gray-700 dark:text-gray-300 max-w-[320px] truncate"
        >
          {{ singleExecutionLabel }}
        </div>
      </div>

      <button
        type="button"
        class="sources-inline-trigger group self-start mt-0.5 min-w-0 flex-1 inline-flex items-center gap-2 text-sm text-left px-0 py-1"
        title="Edit sources"
        aria-label="Edit sources"
        @click="isSourceDrawerOpen = true"
      >
        <span v-show="!hideToolbarLabels" class="text-gray-500 dark:text-gray-400 shrink-0 text-xs"
          >Sources:</span
        >
        <div ref="sourcesPillsRef" class="sources-pills">
          <span
            v-for="pill in sourcePills"
            :key="pill.connectionId"
            class="inline-flex shrink-0 items-center max-w-[140px] px-2 py-0.5 text-[11px] rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
          >
            <span class="truncate">{{ pill.alias }}</span>
          </span>
          <span v-if="sourcePills.length === 0" class="text-xs text-gray-500 dark:text-gray-400">
            none
          </span>
        </div>
        <ChevronRight
          class="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors"
        />
      </button>
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
          :format-state="formatState"
          :stats="lastQueryStats"
          :templates="queryTemplates"
          :history="queryHistory"
          @execute="handleExecute"
          @format="formatQuery"
          @select-template="insertTemplate"
          @select-history="insertHistoryQuery"
          @rerun-history="rerunHistoryQuery"
          @delete-history="removeHistoryItem"
          @toggle-history-pin="toggleHistoryPinned"
          @open-history-new-tab="openHistoryQueryInNewTab"
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
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import type { SchemaContext } from '@/composables/useMonacoSqlProviders'
import { useConnectionsStore } from '@/stores/connections'
import { useConfirmDialogStore } from '@/stores/confirmDialog'
import { usePaneTabsStore, createConsoleSessionId } from '@/stores/paneTabs'
import connections from '@/api/connections'
import { SqlQueryTabs, SqlEditorPane, SqlResultsPane } from '@/components/database/sql-console'
import FormSelect from '@/components/base/FormSelect.vue'
import SlideOverPanel from '@/components/common/SlideOverPanel.vue'
import ConnectionAliasPanel from './ConnectionAliasPanel.vue'
import { useConsoleTab, type QueryHistoryItem } from '@/composables/useConsoleTab'
import { useConsoleSources, type ConsoleMode } from '@/composables/useConsoleSources'
import { useQueryExecution } from '@/composables/useQueryExecution'
import { useSqlExecutionContextSelector } from '@/composables/useSqlExecutionContextSelector'
import { useSqlConsoleTabName } from '@/composables/useSqlConsoleTabName'
import { useSqlSourcePresentation } from '@/composables/useSqlSourcePresentation'
import {
  getConnectionKindFromSpec,
  getSqlDialectFromConnection,
  isFileBasedKind
} from '@/types/specs'
import {
  getFederatedTemplates,
  getFileTemplates,
  getDatabaseTemplates,
  computeFileTemplatePrefix
} from './queryTemplates'

type DirectSourceReadiness = {
  ready: boolean
  reason?: 'missing-database' | 'database-not-found'
}

type ScopedSourceReadiness = {
  ready: boolean
  reason?: 'missing-folder-scope'
}

// ========== Props ==========
export type { ConsoleMode }
export type DatabaseScope = 'database' | 'connection'
export type FileConnectionType = 'files' | 's3'

const props = defineProps<{
  connectionId: string
  mode: ConsoleMode
  paneTabId?: string
  consoleSessionId?: string
  // Database mode props
  database?: string
  sqlScope?: DatabaseScope
  // File mode props
  connectionType?: FileConnectionType
  basePath?: string
}>()

const connectionsStore = useConnectionsStore()
const confirmDialogStore = useConfirmDialogStore()
const paneTabsStore = usePaneTabsStore()
const isSourceDrawerOpen = ref(false)
const executionToolbarRef = ref<HTMLElement | null>(null)
const sourcesPillsRef = ref<HTMLElement | null>(null)
const hideToolbarLabels = ref(false)
const TOOLBAR_LABEL_RECOVERY_SPACE = 120
const TOOLBAR_KEEP_LABELS_MIN_WIDTH = 980

let executionToolbarResizeObserver: ResizeObserver | null = null

function updateToolbarLabelVisibility() {
  const toolbar = executionToolbarRef.value
  if (!toolbar) return

  // Keep labels visible on wide layouts; compact mode is for constrained widths only.
  if (toolbar.clientWidth >= TOOLBAR_KEEP_LABELS_MIN_WIDTH) {
    hideToolbarLabels.value = false
    return
  }

  const overflows = toolbar.scrollWidth > toolbar.clientWidth + 1
  const pills = sourcesPillsRef.value
  const pillsOverflow = pills ? pills.scrollWidth > pills.clientWidth + 1 : false
  const needsCompact = overflows || pillsOverflow

  if (!hideToolbarLabels.value) {
    if (needsCompact) hideToolbarLabels.value = true
    return
  }

  if (needsCompact) return

  const spareSpace = toolbar.clientWidth - toolbar.scrollWidth
  if (spareSpace < TOOLBAR_LABEL_RECOVERY_SPACE) return

  hideToolbarLabels.value = false

  nextTick(() => {
    const currentToolbar = executionToolbarRef.value
    if (!currentToolbar) return
    if (currentToolbar.scrollWidth > currentToolbar.clientWidth + 1) {
      hideToolbarLabels.value = true
    }
  })
}

function setupToolbarResizeObserver() {
  const toolbar = executionToolbarRef.value
  if (!toolbar || typeof ResizeObserver === 'undefined') return

  executionToolbarResizeObserver = new ResizeObserver(() => {
    updateToolbarLabelVisibility()
  })
  executionToolbarResizeObserver.observe(toolbar)
}

function cleanupToolbarResizeObserver() {
  executionToolbarResizeObserver?.disconnect()
  executionToolbarResizeObserver = null
}

// ========== Console Key Computation ==========
const generatedConsoleSessionId = createConsoleSessionId()
const consoleKey = computed(
  () => props.paneTabId?.trim() || props.consoleSessionId?.trim() || generatedConsoleSessionId
)

const historyKey = computed(() => {
  if (props.mode === 'file') {
    return `file-console-history:${consoleKey.value}`
  }
  return `db-console-history:${consoleKey.value}`
})

// ========== Base Connection ==========
const connection = computed(() => connectionsStore.connectionByID(props.connectionId))

// ========== Data Sources Composable ==========
// Note: Must be before useConsoleTab so we can compute dialect
const modeRef = computed(() => props.mode)
const connectionIdRef = computed(() => props.connectionId)
const databaseRef = computed(() => props.database)

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

const { sourcePills, isDatabaseMapping, getDatabaseTypeDisplay } = useSqlSourcePresentation({
  selectedConnections,
  getConnectionById: (connectionId) => connectionsStore.connectionByID(connectionId)
})

const federatedScopeConnectionId = ref('')

function getDirectSourceReadiness(mapping: {
  connectionId: string
  database?: string
}): DirectSourceReadiness {
  const selectedDatabase = mapping.database?.trim() || ''
  if (!selectedDatabase) {
    return { ready: false, reason: 'missing-database' }
  }

  const conn = connectionsStore.connectionByID(mapping.connectionId)
  const availableDatabases =
    conn?.databasesInfo
      ?.filter((db) => !db.isSystem)
      .map((db) => db.name)
      .filter((name): name is string => Boolean(name?.trim())) || []

  // If DB list is unavailable, avoid false negatives and treat current selection as usable.
  if (availableDatabases.length === 0) {
    return { ready: true }
  }

  const exists = availableDatabases.some((dbName) => dbName === selectedDatabase)
  if (!exists) {
    return { ready: false, reason: 'database-not-found' }
  }

  return { ready: true }
}

const readyDatabaseSourceMappings = computed(() =>
  databaseSourceMappings.value.filter((mapping) => getDirectSourceReadiness(mapping).ready)
)

function getScopedSourceReadiness(mapping: {
  connectionId: string
  database?: string
}): ScopedSourceReadiness {
  const conn = connectionsStore.connectionByID(mapping.connectionId)
  const kind = getConnectionKindFromSpec(conn?.spec)
  if (!isFileBasedKind(kind)) {
    return { ready: true }
  }

  const folderScope = mapping.database?.trim() || ''
  if (!folderScope) {
    return { ready: false, reason: 'missing-folder-scope' }
  }

  return { ready: true }
}

const hasUnscopedFileSources = computed(() => {
  if (props.mode !== 'file') return false

  return selectedConnections.value.some((mapping) => {
    const readiness = getScopedSourceReadiness(mapping)
    return readiness.reason === 'missing-folder-scope'
  })
})

const fileScopeWarning = computed(() => {
  if (!hasUnscopedFileSources.value) return ''
  return 'Folder scope is optional, but selecting one improves autocomplete for file sources.'
})

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

const autocompleteDatabaseMappings = computed(() => {
  if (props.mode !== 'database') return []

  if (runMode.value === 'federated') {
    return readyDatabaseSourceMappings.value
  }

  const direct = singleSourceMapping.value
  if (!direct) return []
  if (!getDirectSourceReadiness(direct).ready) return []
  return [direct]
})

const {
  showUnifiedExecutionSelector,
  executionContextOptions,
  executionContextValue,
  singleExecutionLabel
} = useSqlExecutionContextSelector({
  mode: modeRef,
  contextKey: consoleKey,
  runMode,
  selectedConnections,
  databaseSourceMappings,
  singleSourceMapping,
  federatedScopeConnectionId,
  setRunMode,
  setSingleSourceConnectionId,
  isDatabaseMapping,
  getDatabaseTypeDisplay,
  getConnectionName: (connectionId) => connectionsStore.connectionByID(connectionId)?.name || null,
  getDirectSourceReadiness,
  getScopedSourceReadiness
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
  formatState,
  lastQueryStats,
  currentPage,
  pageSize,
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
  removeHistoryItem,
  toggleHistoryPinned,
  openHistoryQueryInNewTab,
  setExecutionResult,
  setExecutionError,

  // Lifecycle
  initialize,
  cleanup
} = useConsoleTab({
  // SQL console tabs in Pinia are keyed by connectionId + optional database.
  // Keep this aligned with addTabWithQuery/open actions.
  consoleKey,
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
  loadTableSuggestionsWithRefresh,
  confirmDestructiveQuery: async () => {
    return await confirmDialogStore.confirm({
      title: 'Run destructive query?',
      description:
        'This SQL appears destructive (DROP/TRUNCATE or UPDATE/DELETE without WHERE). Continue?',
      confirmLabel: 'Run query',
      cancelLabel: 'Cancel',
      danger: true
    })
  },
  validateDatabaseTarget: (target) => {
    const selected = selectedConnections.value.find(
      (mapping) => mapping.connectionId === target.connectionId
    )
    const readiness = getDirectSourceReadiness({
      connectionId: target.connectionId,
      database: target.database || selected?.database
    })

    if (readiness.reason === 'missing-database') {
      return 'Select database in Query Session before running direct database queries.'
    }

    if (readiness.reason === 'database-not-found') {
      return 'Selected database is no longer available for this connection. Choose another database in Query Session.'
    }

    return null
  }
})

// ========== Schema Context (database mode) ==========
const tablesList = ref<Array<{ name: string; schema?: string }>>([])
const columnsMap = ref<Record<string, Array<{ name: string; type: string; nullable: boolean }>>>({})
const federatedTablesList = ref<Array<{ name: string; schema?: string }>>([])
const federatedColumnsMap = ref<
  Record<string, Array<{ name: string; type: string; nullable: boolean }>>
>({})
let schemaLoadRequestId = 0

const schemaContext = computed<SchemaContext>(() => {
  if (props.mode === 'file') {
    return { tables: [], columns: {}, dialect: 'sql' }
  }
  if (useFederatedEngine.value) {
    return {
      tables: federatedTablesList.value,
      columns: federatedColumnsMap.value,
      dialect: 'sql'
    }
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
  const requestId = ++schemaLoadRequestId
  if (props.mode !== 'database') return

  const dbMappings = autocompleteDatabaseMappings.value
  if (dbMappings.length === 0) {
    if (requestId !== schemaLoadRequestId) return
    tablesList.value = []
    columnsMap.value = {}
    federatedTablesList.value = []
    federatedColumnsMap.value = {}
    return
  }

  if (runMode.value === 'federated') {
    tablesList.value = []
    columnsMap.value = {}

    const nextTables: Array<{ name: string; schema?: string }> = []
    const nextColumns: Record<string, Array<{ name: string; type: string; nullable: boolean }>> = {}

    await Promise.all(
      dbMappings.map(async (mapping) => {
        const alias = mapping.alias?.trim()
        const database = mapping.database?.trim() || ''

        if (!alias || !database) return

        try {
          const metadata = await connections.getMetadata(
            mapping.connectionId,
            database,
            forceRefresh
          )

          for (const [tableName, table] of Object.entries(metadata.tables)) {
            const qualifiedTable = `${alias}.${tableName}`
            nextTables.push({ name: qualifiedTable })

            nextColumns[qualifiedTable] = (
              table as { columns: Array<{ name: string; dataType?: string; isNullable?: boolean }> }
            ).columns.map((column) => ({
              name: column.name,
              type: column.dataType || 'unknown',
              nullable: column.isNullable ?? true
            }))
          }
        } catch (error) {
          console.error('Failed to load federated table suggestions:', {
            connectionId: mapping.connectionId,
            alias,
            database,
            error
          })
        }
      })
    )

    if (requestId !== schemaLoadRequestId) return
    federatedTablesList.value = nextTables
    federatedColumnsMap.value = nextColumns
    return
  }

  if (requestId !== schemaLoadRequestId) return
  federatedTablesList.value = []
  federatedColumnsMap.value = {}
  tablesList.value = []
  columnsMap.value = {}

  const selected = dbMappings[0]
  const targetConnectionId = selected.connectionId
  const db = selected.database?.trim() || ''

  if (!db) {
    tablesList.value = []
    columnsMap.value = {}
    return
  }

  try {
    const metadata = await connections.getMetadata(targetConnectionId, db, forceRefresh)
    if (requestId !== schemaLoadRequestId) return
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
    if (requestId !== schemaLoadRequestId) return
    tablesList.value = []
    columnsMap.value = {}
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
const { paneTabName } = useSqlConsoleTabName({
  mode: modeRef,
  runMode,
  selectedConnections,
  effectiveSelectedConnections,
  singleSourceMapping,
  databaseSourceMappings,
  federatedScopeConnectionId,
  getConnectionName: (connectionId) => connectionsStore.connectionByID(connectionId)?.name || null,
  currentConnectionName: computed(() => connection.value?.name || null)
})

async function rerunHistoryQuery(item: QueryHistoryItem) {
  insertHistoryQuery(item)
  await nextTick()
  await executeQuery()
}

async function handleExecute(selectedSql?: string) {
  await executeQuery(selectedSql)
}

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

  setupToolbarResizeObserver()
  await nextTick()
  updateToolbarLabelVisibility()
})

onUnmounted(() => {
  cleanupToolbarResizeObserver()
  cleanup()
})

watch(
  paneTabName,
  (name) => {
    const paneTabId = props.paneTabId?.trim()
    if (!paneTabId) return
    paneTabsStore.renameConsoleTab(paneTabId, name)
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

watch([selectedConnections, executionContextValue, showUnifiedExecutionSelector], async () => {
  if (props.mode === 'database' && !useFederatedEngine.value) {
    await loadTableSuggestions()
  }
  await nextTick()
  updateToolbarLabelVisibility()
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

.sources-pills {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.25rem;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.sources-pills::-webkit-scrollbar {
  display: none;
}

.sources-inline-trigger {
  border: 0;
  background: transparent;
}

.sources-inline-trigger:focus-visible {
  outline: 2px solid #14b8a6;
  outline-offset: 2px;
  border-radius: 0.375rem;
}

.execution-context-select :deep(button) {
  height: 2rem;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
  padding-left: 0.75rem;
  padding-right: 2rem;
  font-size: 0.75rem;
  line-height: 1rem;
  overflow: hidden;
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

.execution-context-hint {
  margin-left: 3.25rem;
}
</style>
