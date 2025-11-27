<template>
  <div v-if="showConnectionDetails && currentConnection" class="rounded-2xl">
    <ConnectionDetailsPanel
      :connection="currentConnection"
      :file-entries="fileEntries"
      @edit-wizard="$emit('edit-connection-wizard')"
      @edit-json="$emit('edit-connection-json')"
      @clone="$emit('clone-connection')"
      @delete="$emit('delete-connection')"
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
    />
  </div>
  <div
    v-else-if="showDiagram"
    class="rounded-2xl bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-900/40"
  >
    <DiagramView :tables="tables" :views="views" :relationships="relationships" />
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
            @navigate="(payload) => $emit('breadcrumb-navigate', 'left', payload)"
            @pick-name="(payload) => $emit('breadcrumb-pick-name', 'left', payload)"
          />
        </template>

        <!-- Left pane content -->
        <template #left-content>
          <PaneContent
            pane-id="left"
            :active-tab="leftActiveTab"
            :connection-type="currentConnection?.type || 'sql'"
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
            @navigate="(payload) => $emit('breadcrumb-navigate', 'right', payload)"
            @pick-name="(payload) => $emit('breadcrumb-pick-name', 'right', payload)"
          />
        </template>

        <!-- Right pane content -->
        <template #right-content>
          <PaneContent
            pane-id="right"
            :active-tab="rightActiveTab"
            :connection-type="currentConnection?.type || 'sql'"
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
import { computed, defineAsyncComponent } from 'vue'
import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { usePaneTabsStore, type PaneId } from '@/stores/paneTabs'
import { useExplorerViewStateStore } from '@/stores/explorerViewState'
import ConnectionDetailsPanel from '@/components/database/ConnectionDetailsPanel.vue'
import DatabaseOverviewPanel from '@/components/database/DatabaseOverviewPanel.vue'
// Lazy load DiagramView since it includes heavy D3.js and export libraries
const DiagramView = defineAsyncComponent(() => import('@/components/database/DiagramView.vue'))
import ExplorerSplitPane from './ExplorerSplitPane.vue'
import type { SplitPaneResizeController } from '@/composables/useSplitPaneResize'
import PaneNavigationTabs from './PaneNavigationTabs.vue'
import PaneBreadcrumb from './PaneBreadcrumb.vue'
import PaneContent from './PaneContent.vue'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { Table, Relationship } from '@/types/schema'

interface Props {
  connectionId: string
  showDiagram?: boolean
  tables?: Table[]
  views?: Table[]
  relationships?: Relationship[]
  fileEntries?: FileSystemEntry[]
  activePane: 'left' | 'right'
  splitPaneResize?: SplitPaneResizeController
  selectedDatabase?: string
}

const props = withDefaults(defineProps<Props>(), {
  showDiagram: false,
  tables: () => [],
  views: () => [],
  relationships: () => [],
  fileEntries: () => [],
  activePane: 'left'
})

// Define emits
const emit = defineEmits<{
  'edit-connection-wizard': []
  'edit-connection-json': []
  'clone-connection': []
  'delete-connection': []
  'show-diagram': [payload: { connectionId: string; database: string }]
  'set-active-pane': [pane: 'left' | 'right']
  'left-tab-change': [tab: 'data' | 'structure']
  'right-tab-change': [tab: 'data' | 'structure']
  'refresh-metadata': []
  'breadcrumb-navigate': [
    paneId: PaneId,
    payload: { level: 'database' | 'schema' | 'type' | 'name' }
  ]
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
const showDatabaseOverview = computed(
  () => !showConnectionDetails.value && !props.showDiagram && !!selectedDatabase.value
)

const currentConnection = computed(
  () => connectionsStore.connections.find((c) => c.id === props.connectionId) || null
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
</script>
