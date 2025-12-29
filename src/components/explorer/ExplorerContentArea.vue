<template>
  <div v-if="showConnectionDetails && currentConnection" class="rounded-2xl">
    <ConnectionDetailsPanel
      :connection="currentConnection"
      :file-entries="fileEntries"
      @edit-wizard="$emit('edit-connection-wizard')"
      @edit-json="$emit('edit-connection-json')"
      @clone="$emit('clone-connection')"
      @delete="$emit('delete-connection')"
      @create-database="$emit('create-database', $event)"
      @create-schema="$emit('create-schema', $event)"
      @create-bucket="$emit('create-bucket', $event)"
      @open-sql-console="handleOpenConnectionSqlConsole"
      @open-file-console="handleOpenFileConsole"
    />
  </div>
  <div
    v-else-if="showDatabaseOverview && selectedDatabase"
    class="rounded-2xl bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-900/40"
  >
    <DatabaseOverviewPanel
      :key="`overview-${connectionId}-${selectedDatabase}`"
      :connection-id="connectionId"
      :database="selectedDatabase"
      @show-diagram="$emit('show-diagram', $event)"
      @open-sql-console="handleOpenSqlConsole"
      @create-schema="handleCreateSchema"
    />
  </div>
  <div v-else>
    <div class="min-h-[480px] min-w-0 overflow-x-hidden">
      <ExplorerSplitPane
        :active-pane="activePane"
        :split-pane-resize="props.splitPaneResize"
        @set-active-pane="handleSetActivePane"
        @close-right-pane="handleCloseRightPane"
      >
        <!-- Left pane tabs -->
        <template #left-tabs>
          <PaneNavigationTabs
            pane-id="left"
            :is-active="activePane === 'left'"
            @activate-preview="handleActivatePreview('left')"
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
          />
        </template>

        <!-- Left pane content -->
        <template #left-content>
          <PaneContent
            pane-id="left"
            :active-tab="leftActiveTab"
            :connection-type="connectionType"
            @tab-change="$emit('left-tab-change', $event)"
            @refresh-metadata="$emit('refresh-metadata')"
          />
        </template>

        <!-- Right pane tabs -->
        <template #right-tabs>
          <PaneNavigationTabs
            pane-id="right"
            :is-active="activePane === 'right'"
            @activate-preview="handleActivatePreview('right')"
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
          />
        </template>

        <!-- Right pane content -->
        <template #right-content>
          <PaneContent
            pane-id="right"
            :active-tab="rightActiveTab"
            :connection-type="connectionType"
            :show-empty-state="false"
            @tab-change="$emit('right-tab-change', $event)"
            @refresh-metadata="$emit('refresh-metadata')"
          />
        </template>
      </ExplorerSplitPane>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { usePaneTabsStore, type PaneId } from '@/stores/paneTabs'
import { useExplorerViewStateStore } from '@/stores/explorerViewState'
import ConnectionDetailsPanel from '@/components/database/ConnectionDetailsPanel.vue'
import DatabaseOverviewPanel from '@/components/database/DatabaseOverviewPanel.vue'
import ExplorerSplitPane from './ExplorerSplitPane.vue'
import type { SplitPaneResizeController } from '@/composables/useSplitPaneResize'
import PaneNavigationTabs from './PaneNavigationTabs.vue'
import PaneBreadcrumb from './PaneBreadcrumb.vue'
import PaneContent from './PaneContent.vue'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { ShowDiagramPayload } from '@/types/diagram'
import { getConnectionKindFromSpec, getConnectionTypeLabel } from '@/types/specs'

interface Props {
  connectionId: string
  fileEntries?: FileSystemEntry[]
  activePane: 'left' | 'right'
  splitPaneResize?: SplitPaneResizeController
  selectedDatabase?: string
}

const props = withDefaults(defineProps<Props>(), {
  fileEntries: () => [],
  activePane: 'left'
})

// Define emits
const emit = defineEmits<{
  'edit-connection-wizard': []
  'edit-connection-json': []
  'clone-connection': []
  'delete-connection': []
  'create-database': [databaseName: string]
  'create-schema': [schemaName: string]
  'create-bucket': [payload: { bucket: string; region?: string }]
  'show-diagram': [payload: ShowDiagramPayload]
  'set-active-pane': [pane: 'left' | 'right']
  'left-tab-change': [tab: 'data' | 'structure']
  'right-tab-change': [tab: 'data' | 'structure']
  'refresh-metadata': []
  'breadcrumb-pick-name': [
    paneId: PaneId,
    payload: { name: string; type: 'table' | 'view'; schema?: string }
  ]
}>()

const connectionsStore = useConnectionsStore()
const navigationStore = useExplorerNavigationStore()
const paneTabsStore = usePaneTabsStore()
const viewStateStore = useExplorerViewStateStore()

// Computed properties - derive view mode from store (single source of truth)
const selectedDatabase = computed(() => props.selectedDatabase)
const showConnectionDetails = computed(
  () => viewStateStore.showConnectionDetails && currentConnection.value !== null
)
// Use store's showDatabaseOverview which checks viewType === 'database-overview'
// This ensures table-data view type shows tabs, not the overview panel
const showDatabaseOverview = computed(
  () => viewStateStore.showDatabaseOverview && !!selectedDatabase.value
)

const currentConnection = computed(
  () => connectionsStore.connections.find((c) => c.id === props.connectionId) || null
)
const connectionType = computed(
  () => getConnectionTypeLabel(currentConnection.value?.spec, currentConnection.value?.type) || ''
)

// Get metadata for breadcrumb
const metadata = computed(() => {
  const activeTab = leftActiveTab.value || rightActiveTab.value
  if (!activeTab || activeTab.tabType !== 'database' || !activeTab.database) return null

  return navigationStore.getMetadata(activeTab.connectionId, activeTab.database)
})

// Get active tabs for each pane
const leftActiveTab = computed(() => paneTabsStore.getActiveTab('left'))
const rightActiveTab = computed(() => paneTabsStore.getActiveTab('right'))

// Event handlers
function handleSetActivePane(pane: 'left' | 'right') {
  paneTabsStore.setActivePane(pane)
  emit('set-active-pane', pane)
}

function handleCloseRightPane() {
  paneTabsStore.clearPane('right')
}

function handleActivatePreview(paneId: PaneId) {
  paneTabsStore.activatePreviewTab(paneId)
}

function handleActivateTab(paneId: PaneId, index: number) {
  paneTabsStore.activateTab(paneId, index)
}

function handleCloseTab(paneId: PaneId, index: number) {
  paneTabsStore.closeTab(paneId, index)
}

function handleCloseOtherTabs(paneId: PaneId, keepIndex: number) {
  paneTabsStore.closeOtherTabs(paneId, keepIndex)
}

function handleCloseAllTabs(paneId: PaneId) {
  paneTabsStore.closeAllTabs(paneId)
}

/**
 * Handle opening SQL Console from Database Overview panel
 * Opens a database-scoped SQL console as a pinned tab in the left pane
 */
function handleOpenSqlConsole(payload: { connectionId: string; database: string }) {
  const tabId = `sql::${payload.connectionId}::${payload.database}`

  paneTabsStore.addTab(
    'left',
    {
      id: tabId,
      connectionId: payload.connectionId,
      database: payload.database,
      name: `SQL: ${payload.database}`,
      tabType: 'sql-console',
      sqlScope: 'database',
      objectKey: tabId
    },
    'pinned'
  )

  // Switch view state to show tabs instead of database overview
  // Set viewType directly since there's no dedicated action for sql-console
  viewStateStore.viewType = 'table-data'
}

/**
 * Handle creating a schema from Database Overview panel
 * Emits the create-schema event with the database context
 */
function handleCreateSchema(schemaName: string) {
  emit('create-schema', schemaName)
}

/**
 * Handle opening SQL Console from Connection Details panel
 * Opens a connection-scoped SQL console (no USE database; prefix)
 */
function handleOpenConnectionSqlConsole() {
  if (!props.connectionId) return

  // Switch view state FIRST to show tabs instead of connection details
  viewStateStore.setViewType('table-data')

  const tabId = `sql-console:${props.connectionId}:*`

  paneTabsStore.addTab(
    'left',
    {
      id: tabId,
      connectionId: props.connectionId,
      database: '',
      name: `${currentConnection.value?.name || 'SQL'} (Admin)`,
      tabType: 'sql-console',
      sqlScope: 'connection',
      objectKey: tabId
    },
    'pinned'
  )
}

/**
 * Handle opening DuckDB Console from Connection Details panel (for file/S3 connections)
 */
function handleOpenFileConsole() {
  if (!props.connectionId) return

  // Switch view state FIRST to show tabs instead of connection details
  viewStateStore.setViewType('table-data')

  const conn = currentConnection.value
  const kind = getConnectionKindFromSpec(conn?.spec)
  if (kind !== 'files' && kind !== 's3') {
    return
  }
  const isS3 = kind === 's3'
  const basePath = isS3 ? conn?.spec?.s3?.scope?.bucket : conn?.spec?.files?.basePath

  const tabId = `file-console:${props.connectionId}`

  paneTabsStore.addTab(
    'left',
    {
      id: tabId,
      connectionId: props.connectionId,
      name: `${conn?.name || 'Files'} (DuckDB)`,
      tabType: 'file-console',
      fileConnectionType: isS3 ? 's3' : 'files',
      basePath: basePath,
      objectKey: tabId
    },
    'pinned'
  )
}
</script>
