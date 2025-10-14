<template>
  <div
    v-if="showConnectionDetails && currentConnection"
    class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg"
  >
    <ConnectionDetailsPanel
      :connection="currentConnection"
      :file-entries="fileEntries"
      @edit="$emit('edit-connection')"
      @clone="$emit('clone-connection')"
      @delete="$emit('delete-connection')"
    />
  </div>
  <div
    v-else-if="showDatabaseOverview && databaseFromQuery"
    class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg"
  >
    <DatabaseOverviewPanel
      :connection-id="connectionId"
      :database="databaseFromQuery"
      @show-diagram="$emit('show-diagram', $event)"
    />
  </div>
  <div v-else-if="showDiagram" class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
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
          <div v-if="leftActiveTab">
            <ObjectContainer
              v-if="leftActiveTab.tabType === 'database'"
              :key="`left-${leftActiveTab.database}.${leftActiveTab.schema || 'default'}.${leftActiveTab.name}`"
              object-type="database"
              pane-id="left"
              :connection-id="leftActiveTab.connectionId"
              :table-meta="leftActiveTab.meta!"
              :is-view="leftActiveTab.type === 'view'"
              :connection-type="currentConnection?.type || 'sql'"
              :database="leftActiveTab.database!"
              @tab-change="$emit('left-tab-change', $event)"
              @refresh-metadata="$emit('refresh-metadata')"
            />
            <ObjectContainer
              v-else-if="leftActiveTab.tabType === 'file'"
              :key="`left-${leftActiveTab.filePath}`"
              object-type="file"
              pane-id="left"
              :file-entry="leftActiveTab.fileEntry!"
              :file-metadata="null"
              :connection-id="leftActiveTab.connectionId"
              @tab-change="$emit('left-tab-change', $event)"
              @refresh-metadata="$emit('refresh-metadata')"
            />
          </div>
          <div
            v-else
            class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-8 text-center m-2"
          >
            <p class="text-gray-500">Select an object from the sidebar to view its details.</p>
          </div>
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
          <div v-if="rightActiveTab">
            <ObjectContainer
              v-if="rightActiveTab.tabType === 'database'"
              :key="`right-${rightActiveTab.database}.${rightActiveTab.schema || 'default'}.${rightActiveTab.name}`"
              object-type="database"
              pane-id="right"
              :connection-id="rightActiveTab.connectionId"
              :table-meta="rightActiveTab.meta!"
              :is-view="rightActiveTab.type === 'view'"
              :connection-type="currentConnection?.type || 'sql'"
              :database="rightActiveTab.database!"
              @tab-change="$emit('right-tab-change', $event)"
              @refresh-metadata="$emit('refresh-metadata')"
            />
            <ObjectContainer
              v-else-if="rightActiveTab.tabType === 'file'"
              :key="`right-${rightActiveTab.filePath}`"
              object-type="file"
              pane-id="right"
              :file-entry="rightActiveTab.fileEntry!"
              :file-metadata="null"
              :connection-id="rightActiveTab.connectionId"
              @tab-change="$emit('right-tab-change', $event)"
              @refresh-metadata="$emit('refresh-metadata')"
            />
          </div>
        </template>

        <!-- Single pane content (same as left content when no right pane) -->
        <template #single-content>
          <div v-if="leftActiveTab">
            <ObjectContainer
              v-if="leftActiveTab.tabType === 'database'"
              :key="`single-${leftActiveTab.database}.${leftActiveTab.schema || 'default'}.${leftActiveTab.name}`"
              object-type="database"
              pane-id="left"
              :connection-id="leftActiveTab.connectionId"
              :table-meta="leftActiveTab.meta!"
              :is-view="leftActiveTab.type === 'view'"
              :connection-type="currentConnection?.type || 'sql'"
              :database="leftActiveTab.database!"
              @tab-change="$emit('left-tab-change', $event)"
              @refresh-metadata="$emit('refresh-metadata')"
            />
            <ObjectContainer
              v-else-if="leftActiveTab.tabType === 'file'"
              :key="`single-${leftActiveTab.filePath}`"
              object-type="file"
              pane-id="left"
              :file-entry="leftActiveTab.fileEntry!"
              :file-metadata="null"
              :connection-id="leftActiveTab.connectionId"
              @tab-change="$emit('left-tab-change', $event)"
              @refresh-metadata="$emit('refresh-metadata')"
            />
          </div>
          <div
            v-else
            class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-8 text-center m-2"
          >
            <p class="text-gray-500">Select an object from the sidebar to view its details.</p>
          </div>
        </template>
      </ExplorerSplitPane>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { usePaneTabsStore, type PaneId } from '@/stores/paneTabs'
import ConnectionDetailsPanel from '@/components/database/ConnectionDetailsPanel.vue'
import DatabaseOverviewPanel from '@/components/database/DatabaseOverviewPanel.vue'
import DiagramView from '@/components/database/DiagramView.vue'
import ExplorerSplitPane from './ExplorerSplitPane.vue'
import type { SplitPaneResizeController } from '@/composables/useSplitPaneResize'
import PaneNavigationTabs from './PaneNavigationTabs.vue'
import PaneBreadcrumb from './PaneBreadcrumb.vue'
import ObjectContainer from '@/components/common/ObjectContainer.vue'
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
  'edit-connection': []
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

const route = useRoute()
const connectionsStore = useConnectionsStore()
const navigationStore = useExplorerNavigationStore()
const paneTabsStore = usePaneTabsStore()

// Computed properties - derive view mode from route
const databaseFromQuery = computed(() => route.query.db as string | undefined)
const showConnectionDetails = computed(
  () => route.query.details === 'true' && currentConnection.value !== null
)
const showDatabaseOverview = computed(
  () =>
    !showConnectionDetails.value &&
    !props.showDiagram &&
    !leftActiveTab.value &&
    !!databaseFromQuery.value
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
