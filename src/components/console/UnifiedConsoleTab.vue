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
            :key="`${pill.connectionId}:${pill.alias}`"
            class="inline-flex shrink-0 items-center max-w-[140px] px-2 py-0.5 text-[11px] rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
          >
            <span class="truncate">{{ pill.alias }}</span>
          </span>
          <span v-if="sourcePills.length === 0" class="text-xs text-gray-500 dark:text-gray-400">
            none
          </span>
        </div>
        <span class="sources-inline-chevron-hit shrink-0">
          <ChevronRight class="sources-inline-chevron shrink-0" />
        </span>
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
          :lsp-context="sqlLspContext"
          :is-executing="isExecuting"
          :format-state="formatState"
          :stats="lastQueryStats"
          :templates="queryTemplates"
          :history="queryHistory"
          @execute="handleExecute"
          @format="handleFormatRequest"
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
import type { SqlLspConnectionContext } from '@/composables/useSqlLspProviders'
import { useConnectionsStore } from '@/stores/connections'
import { useConfirmDialogStore } from '@/stores/confirmDialog'
import { usePaneTabsStore, createConsoleSessionId } from '@/stores/paneTabs'
import { SqlQueryTabs, SqlEditorPane, SqlResultsPane } from '@/components/database/sql-console'
import FormSelect from '@/components/base/FormSelect.vue'
import SlideOverPanel from '@/components/common/SlideOverPanel.vue'
import ConnectionAliasPanel from './ConnectionAliasPanel.vue'
import { useConsoleTab, type FormatMode, type QueryHistoryItem } from '@/composables/useConsoleTab'
import { useConsoleSources } from '@/composables/useConsoleSources'
import { useQueryExecution } from '@/composables/useQueryExecution'
import { useSqlExecutionContextSelector } from '@/composables/useSqlExecutionContextSelector'
import { useSqlConsoleTabName } from '@/composables/useSqlConsoleTabName'
import { useSqlSourcePresentation } from '@/composables/useSqlSourcePresentation'
import type { ConsoleMode, DatabaseScope, FileConnectionType } from './types'
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
  () => props.consoleSessionId?.trim() || props.paneTabId?.trim() || generatedConsoleSessionId
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
  // SQL console tabs are keyed by console session id (legacy fallback: pane tab id).
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

function collectDatabaseLspMappings(): Array<{
  connectionId: string
  alias?: string
  database?: string
}> {
  const federatedConnections: Array<{
    connectionId: string
    alias?: string
    database?: string
  }> = []

  selectedConnections.value.forEach((mapping) => {
    const conn = connectionsStore.connectionByID(mapping.connectionId)
    const kind = getConnectionKindFromSpec(conn?.spec)
    if (isFileBasedKind(kind)) {
      return
    }
    federatedConnections.push({
      connectionId: mapping.connectionId,
      alias: mapping.alias,
      database: mapping.database
    })
  })

  return federatedConnections
}

const sqlLspContext = computed<SqlLspConnectionContext | undefined>(() => {
  if (props.mode === 'file') {
    const filePath = activeQueryTab.value?.fileContext?.path?.trim() || ''
    const fileFormat = activeQueryTab.value?.fileContext?.format?.trim() || undefined
    const hasMultipleSelectedSources = selectedConnections.value.length > 1
    if (hasMultipleSelectedSources) {
      const federatedConnections = collectDatabaseLspMappings()
      return {
        provider: 'duckdb',
        filePath: filePath || undefined,
        fileFormat,
        federatedConnections: federatedConnections.length > 0 ? federatedConnections : undefined
      }
    }

    return {
      provider: 'duckdb',
      connectionId: props.connectionId,
      filePath: filePath || undefined,
      fileFormat
    }
  }

  const hasMultipleSelectedSources = selectedConnections.value.length > 1
  if (runMode.value !== 'single' || hasMultipleSelectedSources) {
    const federatedConnections = collectDatabaseLspMappings()
    if (federatedConnections.length === 0) {
      return undefined
    }

    return {
      provider: 'duckdb',
      federatedConnections
    }
  }

  if (props.mode !== 'database') {
    return undefined
  }

  const direct = singleSourceMapping.value
  if (!direct) {
    return undefined
  }

  const directConnection = connectionsStore.connectionByID(direct.connectionId)
  const directConnectionType = directConnection?.type?.trim().toLowerCase() || ''
  const useDuckDBLsp = directConnectionType.includes('duckdb')

  if (!useDuckDBLsp && !getDirectSourceReadiness(direct).ready) {
    return undefined
  }

  const database = direct.database?.trim() || ''
  if (!useDuckDBLsp && !database) {
    return undefined
  }

  return {
    provider: useDuckDBLsp ? 'duckdb' : 'sqls',
    connectionId: direct.connectionId,
    database: database || undefined
  }
})

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

function handleFormatRequest(mode?: FormatMode) {
  if (!mode) return
  formatQuery(mode)
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

watch([selectedConnections, executionContextValue, showUnifiedExecutionSelector], async () => {
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
  cursor: pointer;
}

.sources-inline-trigger:focus-visible {
  outline: 2px solid #14b8a6;
  outline-offset: 2px;
  border-radius: 0.375rem;
}

.sources-inline-chevron-hit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.125rem;
  border-radius: 9999px;
  cursor: pointer;
  transition: background-color 140ms ease;
}

.sources-inline-chevron {
  width: 1.125rem;
  height: 1.125rem;
  color: #0f766e;
  background: rgb(20 184 166 / 14%);
  border: 1px solid rgb(20 184 166 / 35%);
  border-radius: 9999px;
  transition:
    color 140ms ease,
    background-color 140ms ease,
    border-color 140ms ease,
    transform 140ms ease;
}

:global(.dark) .sources-inline-chevron {
  color: #5eead4;
  background: rgb(20 184 166 / 22%);
  border-color: rgb(94 234 212 / 40%);
}

.sources-inline-trigger:hover .sources-inline-chevron-hit {
  background: rgb(20 184 166 / 12%);
}

:global(.dark) .sources-inline-trigger:hover .sources-inline-chevron-hit {
  background: rgb(20 184 166 / 22%);
}

.sources-inline-trigger:hover .sources-inline-chevron {
  color: #0f766e;
  background: rgb(20 184 166 / 20%);
  border-color: rgb(20 184 166 / 50%);
  transform: translateX(1px);
}

:global(.dark) .sources-inline-trigger:hover .sources-inline-chevron {
  color: #99f6e4;
  background: rgb(20 184 166 / 28%);
  border-color: rgb(153 246 228 / 55%);
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
