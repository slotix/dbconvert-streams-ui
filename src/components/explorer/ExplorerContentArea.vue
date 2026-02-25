<template>
  <div class="flex flex-col flex-1 min-h-0 min-w-0 overflow-x-hidden">
    <ExplorerSplitPane
      :active-pane="activePane"
      :split-pane-resize="props.splitPaneResize"
      @set-active-pane="handleSetActivePane"
    >
      <!-- Left pane tabs -->
      <template #left-tabs>
        <PaneNavigationTabs
          pane-id="left"
          :is-active="activePane === 'left'"
          @activate-preview="handleActivatePreview('left')"
          @pin-preview="handlePinPreview('left')"
          @activate-tab="(index) => handleActivateTab('left', index)"
          @close-tab="(index) => handleCloseTab('left', index)"
          @close-other-tabs="(index) => handleCloseOtherTabs('left', index)"
          @close-all-tabs="handleCloseAllTabs('left')"
        />
      </template>

      <!-- Left pane breadcrumb -->
      <template #left-breadcrumb>
        <PaneBreadcrumb
          pane-id="left"
          :metadata="metadata"
          @pick-name="(payload) => $emit('breadcrumb-pick-name', 'left', payload)"
          @pick-file="(payload) => $emit('breadcrumb-pick-file', 'left', payload)"
        />
      </template>

      <!-- Left pane content -->
      <template #left-content>
        <PaneContent
          pane-id="left"
          :active-tab="leftActiveTab"
          :connection-type="leftConnectionType"
          @tab-change="$emit('left-tab-change', $event)"
          @refresh-metadata="$emit('refresh-metadata')"
          @open-sql-console="openTableInSqlConsole"
          @open-file-console="openFileInDuckDbConsole"
          @open-connection-sql-console="handleOpenConnectionSqlConsole"
          @open-connection-file-console="handleOpenFileConsole"
          @open-database-sql-console="handleOpenSqlConsole"
          @show-diagram="$emit('show-diagram', $event)"
          @edit-connection-wizard="$emit('edit-connection-wizard', $event)"
          @clone-connection="$emit('clone-connection', $event)"
          @delete-connection="$emit('delete-connection', $event)"
          @create-database="$emit('create-database', $event)"
          @create-schema="$emit('create-schema', $event)"
          @create-bucket="$emit('create-bucket', $event)"
        />
      </template>

      <!-- Right pane tabs -->
      <template #right-tabs>
        <PaneNavigationTabs
          pane-id="right"
          :is-active="activePane === 'right'"
          @activate-preview="handleActivatePreview('right')"
          @pin-preview="handlePinPreview('right')"
          @activate-tab="(index) => handleActivateTab('right', index)"
          @close-tab="(index) => handleCloseTab('right', index)"
          @close-other-tabs="(index) => handleCloseOtherTabs('right', index)"
          @close-all-tabs="handleCloseAllTabs('right')"
        />
      </template>

      <!-- Right pane breadcrumb -->
      <template #right-breadcrumb>
        <PaneBreadcrumb
          pane-id="right"
          :metadata="metadata"
          @pick-name="(payload) => $emit('breadcrumb-pick-name', 'right', payload)"
          @pick-file="(payload) => $emit('breadcrumb-pick-file', 'right', payload)"
        />
      </template>

      <!-- Right pane content -->
      <template #right-content>
        <PaneContent
          pane-id="right"
          :active-tab="rightActiveTab"
          :connection-type="rightConnectionType"
          :show-empty-state="false"
          @tab-change="$emit('right-tab-change', $event)"
          @refresh-metadata="$emit('refresh-metadata')"
          @open-sql-console="openTableInSqlConsole"
          @open-file-console="openFileInDuckDbConsole"
          @open-connection-sql-console="handleOpenConnectionSqlConsole"
          @open-connection-file-console="handleOpenFileConsole"
          @open-database-sql-console="handleOpenSqlConsole"
          @show-diagram="$emit('show-diagram', $event)"
          @edit-connection-wizard="$emit('edit-connection-wizard', $event)"
          @clone-connection="$emit('clone-connection', $event)"
          @delete-connection="$emit('delete-connection', $event)"
          @create-database="$emit('create-database', $event)"
          @create-schema="$emit('create-schema', $event)"
          @create-bucket="$emit('create-bucket', $event)"
        />
      </template>
    </ExplorerSplitPane>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { usePaneTabsStore, type PaneId, createConsoleSessionId } from '@/stores/paneTabs'
import { useExplorerViewStateStore } from '@/stores/explorerViewState'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import ExplorerSplitPane from './ExplorerSplitPane.vue'
import type { SplitPaneResizeController } from '@/composables/useSplitPaneResize'
import PaneNavigationTabs from './PaneNavigationTabs.vue'
import PaneBreadcrumb from './PaneBreadcrumb.vue'
import PaneContent from './PaneContent.vue'
import type { ShowDiagramPayload } from '@/types/diagram'
import { getConnectionKindFromSpec, getConnectionTypeLabel } from '@/types/specs'
import { useSqlConsoleActions } from '@/composables/useSqlConsoleActions'

interface Props {
  activePane: 'left' | 'right'
  splitPaneResize?: SplitPaneResizeController
}

const props = withDefaults(defineProps<Props>(), {
  activePane: 'left'
})

// Define emits
const emit = defineEmits<{
  'edit-connection-wizard': [connectionId: string]
  'clone-connection': [connectionId: string]
  'delete-connection': [connectionId: string]
  'create-database': [payload: { connectionId: string; name: string }]
  'create-schema': [payload: { connectionId: string; name: string; database?: string }]
  'create-bucket': [payload: { connectionId: string; bucket: string; region?: string }]
  'show-diagram': [payload: ShowDiagramPayload]
  'set-active-pane': [pane: 'left' | 'right']
  'left-tab-change': [tab: 'data' | 'structure']
  'right-tab-change': [tab: 'data' | 'structure']
  'refresh-metadata': []
  'breadcrumb-pick-name': [
    paneId: PaneId,
    payload: {
      name: string
      type: 'table' | 'view' | 'function' | 'procedure' | 'sequence'
      schema?: string
    }
  ]
  'breadcrumb-pick-file': [paneId: PaneId, payload: { name: string; path: string }]
}>()

const connectionsStore = useConnectionsStore()
const navigationStore = useExplorerNavigationStore()
const paneTabsStore = usePaneTabsStore()
const viewStateStore = useExplorerViewStateStore()
const { openTableInSqlConsole, openFileInDuckDbConsole } = useSqlConsoleActions()
const { confirmLeavePaneIfDirty, confirmCloseTabIfDirty, confirmCloseManyTabsIfAnyDirty } =
  useUnsavedChangesGuard()

// Get metadata for breadcrumb
const metadata = computed(() => {
  const activeTab = leftActiveTab.value || rightActiveTab.value
  if (!activeTab || activeTab.tabType !== 'database' || !activeTab.database) return null

  return navigationStore.getMetadata(activeTab.connectionId, activeTab.database)
})

// Get active tabs for each pane
const leftActiveTab = computed(() => paneTabsStore.getActiveTab('left'))
const rightActiveTab = computed(() => paneTabsStore.getActiveTab('right'))
const leftConnectionType = computed(() => {
  const connectionId = leftActiveTab.value?.connectionId
  if (!connectionId) return ''
  const connection = connectionsStore.connectionByID(connectionId)
  return getConnectionTypeLabel(connection?.spec, connection?.type) || ''
})
const rightConnectionType = computed(() => {
  const connectionId = rightActiveTab.value?.connectionId
  if (!connectionId) return ''
  const connection = connectionsStore.connectionByID(connectionId)
  return getConnectionTypeLabel(connection?.spec, connection?.type) || ''
})

// Event handlers
function handleSetActivePane(pane: 'left' | 'right') {
  paneTabsStore.setActivePane(pane)
  emit('set-active-pane', pane)
}

function handleActivatePreview(paneId: PaneId) {
  ;(async () => {
    const state = paneTabsStore.getPaneState(paneId)
    const ok = await confirmLeavePaneIfDirty(paneId, state.previewIndex)
    if (!ok) return
    paneTabsStore.activatePreviewTab(paneId)
  })().catch(console.error)
}

function handlePinPreview(paneId: PaneId) {
  paneTabsStore.pinPreviewTab(paneId)
}

function handleActivateTab(paneId: PaneId, index: number) {
  ;(async () => {
    const ok = await confirmLeavePaneIfDirty(paneId, index)
    if (!ok) return
    paneTabsStore.activateTab(paneId, index)
  })().catch(console.error)
}

function handleCloseTab(paneId: PaneId, index: number) {
  ;(async () => {
    const ok = await confirmCloseTabIfDirty(paneId, index)
    if (!ok) return
    paneTabsStore.closeTab(paneId, index)
  })().catch(console.error)
}

function handleCloseOtherTabs(paneId: PaneId, keepIndex: number) {
  ;(async () => {
    const state = paneTabsStore.getPaneState(paneId)
    const tabsToClose = state.tabs.filter((_, idx) => idx !== keepIndex)
    const ok = await confirmCloseManyTabsIfAnyDirty(tabsToClose)
    if (!ok) return
    paneTabsStore.closeOtherTabs(paneId, keepIndex)
  })().catch(console.error)
}

function handleCloseAllTabs(paneId: PaneId) {
  ;(async () => {
    const state = paneTabsStore.getPaneState(paneId)
    const ok = await confirmCloseManyTabsIfAnyDirty(state.tabs)
    if (!ok) return
    paneTabsStore.closeAllTabs(paneId)
  })().catch(console.error)
}

/**
 * Handle opening SQL Console from Database Overview panel
 * Opens a database-scoped SQL console as a pinned tab in the left pane
 */
function handleOpenSqlConsole(payload: { connectionId: string; database: string }) {
  ;(async () => {
    const ok = await confirmLeavePaneIfDirty('left')
    if (!ok) return

    const consoleSessionId = createConsoleSessionId()
    const tabId = `sql-console:${consoleSessionId}`

    paneTabsStore.addTab(
      'left',
      {
        id: tabId,
        connectionId: payload.connectionId,
        database: payload.database,
        name: `SQL: ${payload.database}`,
        consoleSessionId,
        tabType: 'sql-console',
        sqlScope: 'database',
        objectKey: tabId
      },
      'pinned'
    )

    // Switch view state to show tabs instead of database overview
    // Set viewType directly since there's no dedicated action for sql-console
    viewStateStore.viewType = 'table-data'
  })().catch(console.error)
}

/**
 * Handle opening SQL Console from Connection Details panel
 * Opens a connection-scoped SQL console (no USE database; prefix)
 */
function handleOpenConnectionSqlConsole(connectionId: string) {
  if (!connectionId) return
  ;(async () => {
    const ok = await confirmLeavePaneIfDirty('left')
    if (!ok) return

    // Switch view state to show tabs instead of connection details
    viewStateStore.setViewType('table-data')

    const consoleSessionId = createConsoleSessionId()
    const tabId = `sql-console:${consoleSessionId}`

    paneTabsStore.addTab(
      'left',
      {
        id: tabId,
        connectionId: connectionId,
        database: '',
        name: `${connectionsStore.connectionByID(connectionId)?.name || 'SQL'} (Admin)`,
        consoleSessionId,
        tabType: 'sql-console',
        sqlScope: 'connection',
        objectKey: tabId
      },
      'pinned'
    )
  })().catch(console.error)
}

/**
 * Handle opening DuckDB Console from Connection Details panel (for file/S3 connections)
 */
function handleOpenFileConsole(connectionId: string) {
  if (!connectionId) return
  ;(async () => {
    const ok = await confirmLeavePaneIfDirty('left')
    if (!ok) return

    // Switch view state to show tabs instead of connection details
    viewStateStore.setViewType('table-data')

    const conn = connectionsStore.connectionByID(connectionId)
    const kind = getConnectionKindFromSpec(conn?.spec)
    if (kind !== 'files' && kind !== 's3') {
      return
    }
    const isS3 = kind === 's3'
    const basePath = isS3 ? conn?.spec?.s3?.scope?.bucket : conn?.spec?.files?.basePath

    const consoleSessionId = createConsoleSessionId()
    const tabId = `file-console:${consoleSessionId}`

    paneTabsStore.addTab(
      'left',
      {
        id: tabId,
        connectionId: connectionId,
        name: `${conn?.name || 'Files'} (DuckDB)`,
        consoleSessionId,
        tabType: 'file-console',
        fileConnectionType: isS3 ? 's3' : 'files',
        basePath: basePath,
        objectKey: tabId
      },
      'pinned'
    )
  })().catch(console.error)
}

// Keyboard shortcut: Ctrl+Shift+T to reopen closed tab
function handleKeyDown(event: KeyboardEvent) {
  if (event.ctrlKey && event.shiftKey && event.key === 'T') {
    event.preventDefault()
    paneTabsStore.reopenClosedTab()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>
