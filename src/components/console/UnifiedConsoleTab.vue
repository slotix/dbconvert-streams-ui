<template>
  <div class="console-tab flex h-full flex-col overflow-hidden">
    <!-- Unified header: breadcrumb + pills + settings -->
    <div
      class="ui-surface-toolbar ui-border-default flex min-w-0 items-center gap-2 border-b px-4 py-2"
    >
      <!-- Breadcrumb text -->
      <span class="shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300">{{
        paneTabName
      }}</span>

      <!-- Pills (overflow hidden, clipped at right) -->
      <div ref="pillsContainerRef" class="flex-1 min-w-0 flex items-center gap-1 overflow-hidden">
        <span
          v-for="pill in sourcePills"
          :key="pill.key"
          data-source-pill
          class="ui-chip-muted ui-border-default inline-flex max-w-[140px] shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] text-gray-700 dark:text-gray-200"
        >
          <span class="truncate">{{ pill.label }}</span>
        </span>
      </div>

      <!-- Overflow count -->
      <span
        v-if="overflowCount > 0"
        class="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400"
        >+{{ overflowCount }}</span
      >

      <!-- Settings gear (always visible) -->
      <button
        type="button"
        class="sources-inline-trigger ui-accent-text group shrink-0 inline-flex items-center gap-1 rounded px-1 py-1 text-xs font-medium transition-opacity hover:opacity-80 focus:outline-none"
        title="Manage sources"
        aria-label="Manage sources"
        @click="isSourceDrawerOpen = true"
      >
        <Settings class="sources-settings-icon" />
        <span>Manage sources</span>
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

    <!-- Unified Toolbar -->
    <div
      class="@container/toolbar ui-surface-toolbar ui-border-default flex items-center gap-1.5 border-b px-2.5 py-1.5 @[620px]/toolbar:gap-2 @[620px]/toolbar:px-3"
    >
      <span :id="editorToolbarId" class="contents"></span>
    </div>

    <!-- Main Content Area -->
    <div ref="splitContainerRef" class="flex-1 flex overflow-hidden min-h-0">
      <!-- Editor Pane -->
      <div
        ref="leftPaneRef"
        class="ui-border-default min-h-0 shrink-0 border-r"
        :style="{ width: `calc(${editorWidth}% - 2px)` }"
      >
        <SqlEditorPane
          v-model="sqlQuery"
          :dialect="currentDialect"
          :lsp-context="sqlLspContext"
          :is-executing="isExecuting"
          :format-state="formatState"
          :templates="queryTemplates"
          :history="queryHistory"
          :toolbar-target="`#${editorToolbarId}`"
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
        class="ui-border-default shrink-0 cursor-col-resize border-l border-r-0 bg-transparent transition-colors hover:border-[var(--ui-accent-soft-border)] px-[3px]"
        @mousedown="startResize"
      ></div>

      <!-- Results Pane -->
      <div class="shrink-0 min-h-0" :style="{ width: `calc(${100 - editorWidth}% - 2px)` }">
        <SqlResultsPane
          :columns="resultColumns"
          :rows="queryResults"
          :result-sets="resultSets"
          :error="queryError"
          :error-action-label="errorActionLabel"
          :has-executed="hasExecutedQuery"
          :stats="lastQueryStats"
          :current-page="currentPage"
          :page-size="pageSize"
          @update:current-page="currentPage = $event"
          @error-action="rewriteStarterQueryToFederated"
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
        :file-scope-warning="fileScopeWarning"
        @update:modelValue="handleUpdateSelectedConnections"
      />
    </SlideOverPanel>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { Settings } from 'lucide-vue-next'
import { useConnectionsStore } from '@/stores/connections'
import { useConfirmDialogStore } from '@/stores/confirmDialog'
import { usePaneTabsStore, createConsoleSessionId } from '@/stores/paneTabs'
import { SqlQueryTabs, SqlEditorPane, SqlResultsPane } from '@/components/database/sql-console'
import SlideOverPanel from '@/components/common/SlideOverPanel.vue'
import ConnectionAliasPanel from './ConnectionAliasPanel.vue'
import { useConsoleTab, type FormatMode, type QueryHistoryItem } from '@/composables/useConsoleTab'
import { useConsoleSources } from '@/composables/useConsoleSources'
import { useQueryExecution } from '@/composables/useQueryExecution'
import { useSqlConsoleTabName } from '@/composables/useSqlConsoleTabName'
import { useSqlSourcePresentation } from '@/composables/useSqlSourcePresentation'
import { useConsoleQueryHelpers } from '@/composables/useConsoleQueryHelpers'
import { useConsoleExecutionGuards } from '@/composables/useConsoleExecutionGuards'
import { useConsoleLspContext } from '@/composables/useConsoleLspContext'
import { useConsoleQueryTemplates } from '@/composables/useConsoleQueryTemplates'
import { useSourcePillsOverflow } from '@/composables/useSourcePillsOverflow'
import type { ConsoleMode, DatabaseScope, FileConnectionType } from './types'
import { getSqlDialectFromConnection } from '@/types/specs'

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
  initialFileScope?: string
}>()

const connectionsStore = useConnectionsStore()
const confirmDialogStore = useConfirmDialogStore()
const paneTabsStore = usePaneTabsStore()
const isSourceDrawerOpen = ref(false)
const editorToolbarId = `tb-${Math.random().toString(36).slice(2, 8)}`
const { pillsContainerRef, overflowCount, recomputePillOverflow, setupPillsObserver } =
  useSourcePillsOverflow()

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
  initializeDefaultSources,
  syncPrimarySource,
  restoreSelectedConnections
} = useConsoleSources({
  connectionId: connectionIdRef,
  mode: modeRef,
  database: databaseRef,
  initialFileScope: computed(() => props.initialFileScope),
  consoleKey
})

const { sourcePills, isDatabaseMapping } = useSqlSourcePresentation({
  selectedConnections,
  getConnectionById: (connectionId) => connectionsStore.connectionByID(connectionId)
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

const {
  getDirectSourceReadiness,
  fileScopeWarning,
  rewrittenFederatedStarterQuery,
  errorActionLabel
} = useConsoleQueryHelpers({
  mode: modeRef,
  connectionId: connectionIdRef,
  database: databaseRef,
  selectedConnections,
  useFederatedEngine,
  activeQueryTab,
  queryError,
  connection,
  getConnectionById: (connectionId) => connectionsStore.connectionByID(connectionId),
  isDatabaseMapping
})

const { rewriteStarterQueryToFederated, validateDatabaseTarget } = useConsoleExecutionGuards({
  sqlQuery,
  selectedConnections,
  rewrittenFederatedStarterQuery,
  getDirectSourceReadiness
})

// ========== Query Execution Composable ==========
const { isExecuting, executeQuery } = useQueryExecution({
  mode: modeRef,
  connectionId: connectionIdRef,
  database: databaseRef,
  selectedConnections,
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
  validateDatabaseTarget
})

const { sqlLspContext } = useConsoleLspContext({
  mode: modeRef,
  connectionId: connectionIdRef,
  runMode,
  selectedConnections,
  singleSourceMapping,
  activeQueryTab,
  getConnectionById: (connectionId) => connectionsStore.connectionByID(connectionId),
  getDirectSourceReadiness
})

const { queryTemplates } = useConsoleQueryTemplates({
  mode: modeRef,
  database: databaseRef,
  basePath: computed(() => props.basePath),
  connectionType: computed(() => props.connectionType),
  currentDialect,
  useFederatedEngine,
  selectedConnections,
  activeQueryTab,
  getConnectionById: (connectionId) => connectionsStore.connectionByID(connectionId)
})

// ========== UI Computed ==========
const { paneTabName } = useSqlConsoleTabName({
  mode: modeRef,
  runMode,
  selectedConnections,
  databaseSourceMappings,
  primaryConnectionId: connectionIdRef,
  isDatabaseMapping,
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

  try {
    if (connectionsStore.connections.length === 0) {
      await connectionsStore.refreshConnections()
    }
  } catch (err) {
    console.error('Failed to load connections:', err)
  }

  restoreSelectedConnections()
  initializeDefaultSources()
  syncPrimarySource()

  setupPillsObserver()
  await nextTick()
  recomputePillOverflow()
})

onUnmounted(() => {
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

watch(sourcePills, async () => {
  await nextTick()
  recomputePillOverflow()
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

.sources-inline-trigger {
  cursor: pointer;
  transition: transform 140ms ease;
}

.sources-settings-icon {
  width: 1rem;
  height: 1rem;
  transition: transform 140ms ease;
}

.sources-inline-trigger:hover .sources-settings-icon {
  transform: rotate(30deg);
}
</style>
