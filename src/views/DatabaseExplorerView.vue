<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PlusIcon } from '@heroicons/vue/24/outline'
import { useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import { useSchemaStore } from '@/stores/schema'
import { usePaneTabsStore } from '@/stores/paneTabs'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import ExplorerSidebarConnections from '@/components/database/ExplorerSidebarConnections.vue'
import ExplorerContentArea from '@/components/explorer/ExplorerContentArea.vue'
import ConnectionTypeFilter from '@/components/common/ConnectionTypeFilter.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'

// Use our composables and stores
import { useExplorerState } from '@/composables/useExplorerState'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useSplitPaneResize } from '@/composables/useSplitPaneResize'
import { useSidebar } from '@/composables/useSidebar'
import { usePersistedState } from '@/composables/usePersistedState'
import { useRecentConnections } from '@/composables/useRecentConnections'
import { useExplorerRouter } from '@/composables/useExplorerRouter'
import { useTreeSearch } from '@/composables/useTreeSearch'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import DisconnectedOverlay from '@/components/common/DisconnectedOverlay.vue'
import EmptyStateMessage from '@/components/explorer/EmptyStateMessage.vue'
import { useDatabaseExplorerController } from '@/composables/useDatabaseExplorerController'

const route = useRoute()
const router = useRouter()
const commonStore = useCommonStore()
const connectionsStore = useConnectionsStore()
const schemaStore = useSchemaStore()
const paneTabsStore = usePaneTabsStore()
const navigationStore = useExplorerNavigationStore()

// Use composables and stores for state management
const explorerState = useExplorerState()
const fileExplorerStore = useFileExplorerStore()
const splitPaneResize = useSplitPaneResize()
const sidebar = useSidebar()

// Connection search and filtering
const connectionSearch = ref('')
const selectedConnectionType = usePersistedState<string | null>('explorer.connectionType', null, {
  serializer: (value) => value || '',
  deserializer: (value) => value || null
})

const searchInputRef = ref<InstanceType<typeof SearchInput> | null>(null)

// Recent connections management
const recentConnectionsManager = useRecentConnections(explorerState.currentConnectionId)
const alwaysOpenNewTab = usePersistedState<boolean>('explorer.alwaysOpenNewTab', false, {
  serializer: (v) => String(v),
  deserializer: (v) => v === 'true'
})

// Computed properties
const connectionsCount = computed(() => connectionsStore.connections.length || 0)

// Use the same filtering logic as the sidebar tree
const treeSearch = computed(() =>
  useTreeSearch(connectionSearch.value, {
    typeFilter: selectedConnectionType.value as 'database' | 'file' | null
  })
)

const filteredConnectionsCount = computed(() => {
  const filtered = treeSearch.value.filterConnections(connectionsStore.connections)
  return filtered.length
})

const connectionCountLabel = computed(() => {
  const filtered = filteredConnectionsCount.value
  const total = connectionsCount.value
  if ((connectionSearch.value || selectedConnectionType.value) && filtered !== total) {
    return `${filtered} of ${total} connections`
  }
  return `${total} connection${total === 1 ? '' : 's'}`
})

const selectedDatabase = computed(() => explorerState.selectedDatabaseName.value)

const {
  showDeleteConfirm,
  deleteConnectionMessage,
  focusConnectionId,
  currentFileEntries,
  treeSelection,
  handleOpenFromTree,
  handleOpenFile,
  handleShowDiagram,
  handleRefreshMetadata,
  handleSelectConnection,
  handleSelectDatabase,
  handleFileSelect,
  handleRequestFileEntries,
  handlePickFromBreadcrumb,
  handleBreadcrumbNavigate,
  onAddConnection,
  onEditConnection,
  onDeleteConnection,
  confirmDeleteConnection,
  cancelDeleteConnection,
  onCloneConnection,
  setFocusConnectionId
} = useDatabaseExplorerController({
  route,
  router,
  explorerState,
  navigationStore,
  connectionsStore,
  schemaStore,
  paneTabsStore,
  fileExplorerStore,
  commonStore,
  sidebar,
  searchInputRef,
  recentConnectionsManager,
  alwaysOpenNewTab
})

useExplorerRouter({
  recentConnections: recentConnectionsManager.recentConnections,
  lastViewedConnectionId: recentConnectionsManager.lastViewedConnectionId,
  currentConnectionId: explorerState.currentConnectionId,
  currentFileEntries,
  onSelectConnection: handleSelectConnection,
  onFileSelect: handleFileSelect,
  setFocusConnectionId
})

// Tab change handlers - no-op for now (tabs handle their own state)
function onLeftTabChange(_tab: 'data' | 'structure') {
  // Tab state is managed by ObjectContainer internally
}

function onRightTabChange(_tab: 'data' | 'structure') {
  // Tab state is managed by ObjectContainer internally
}
</script>

<template>
  <div class="min-h-full overflow-x-hidden">
    <!-- Disconnected Overlay -->
    <DisconnectedOverlay />

    <!-- Enhanced Functional Toolbar with gradient background -->
    <header
      class="sticky top-0 z-10 bg-linear-to-r from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 border-b border-slate-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30"
    >
      <div class="px-6 py-4 flex items-center gap-4">
        <!-- Connection Type Filter -->
        <div class="shrink-0">
          <ConnectionTypeFilter
            :selected-type="selectedConnectionType"
            :persistent="true"
            @update:selected-type="selectedConnectionType = $event"
          />
        </div>

        <!-- Search Input with enhanced styling -->
        <div class="flex-1 max-w-xl">
          <SearchInput
            ref="searchInputRef"
            v-model="connectionSearch"
            placeholder="Filter connections... (Press / to focus)"
            size="sm"
          />
        </div>

        <!-- Right side group -->
        <div class="flex items-center gap-4 ml-auto">
          <!-- Elevated Badge showing count with icon -->
          <div
            class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-850 rounded-lg border border-slate-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30"
          >
            <svg
              class="h-4 w-4 text-slate-400 dark:text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 12h14M12 5l7 7-7 7"
              />
            </svg>
            <span class="text-sm font-semibold text-slate-700 dark:text-gray-300">{{
              connectionCountLabel
            }}</span>
          </div>

          <!-- Primary CTA Button with vibrant blue-green gradient -->
          <BaseButton variant="primary" @click="onAddConnection">
            <PlusIcon class="h-5 w-5" />
            <span>New Connection</span>
          </BaseButton>
        </div>
      </div>
    </header>

    <main class="mx-auto py-4 overflow-x-hidden">
      <!-- No connections at all -->
      <div
        v-if="connectionsStore.connections.length === 0"
        class="flex flex-col items-center justify-center py-16 px-4"
      >
        <div
          class="bg-linear-to-br from-blue-50 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 rounded-full p-6 mb-6"
        >
          <svg
            class="h-16 w-16 text-blue-500 dark:text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
            />
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No Connections Yet
        </h3>
        <p class="text-gray-500 dark:text-gray-400 mb-6 max-w-md text-center">
          Get started by creating your first database connection. You can connect to MySQL,
          PostgreSQL, and many other databases.
        </p>
        <RouterLink
          to="/explorer/add"
          class="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-linear-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 dark:from-blue-500 dark:to-teal-500 dark:hover:from-blue-600 dark:hover:to-teal-600 transition-all duration-200 hover:shadow-md hover:scale-105"
        >
          <PlusIcon class="h-5 w-5" />
          Create Your First Connection
        </RouterLink>
      </div>

      <!-- Explorer content -->
      <div v-else class="px-4 sm:px-6 lg:px-8">
        <div
          :ref="(el) => (sidebar.sidebarContainerRef.value = el as HTMLElement)"
          class="mt-6 flex flex-row items-stretch min-w-0 overflow-x-hidden"
        >
          <!-- Sidebar -->
          <div
            v-if="sidebar.sidebarVisible.value"
            :ref="(el) => (sidebar.sidebarRef.value = el as HTMLElement)"
            :style="{
              flexBasis: `calc(${sidebar.sidebarWidthPct.value}% - 8px)`,
              flexGrow: 0,
              flexShrink: 0
            }"
            class="min-w-[220px] pr-2"
          >
            <ExplorerSidebarConnections
              :initial-expanded-connection-id="explorerState.currentConnectionId.value || undefined"
              :search-query="connectionSearch"
              :type-filter="selectedConnectionType || 'All'"
              :focus-connection-id="focusConnectionId || undefined"
              :selected="treeSelection"
              @open="handleOpenFromTree"
              @show-diagram="handleShowDiagram"
              @select-connection="handleSelectConnection"
              @select-database="handleSelectDatabase"
              @select-file="handleFileSelect"
              @open-file="handleOpenFile"
              @request-file-entries="handleRequestFileEntries"
            />
          </div>

          <!-- Sidebar divider with handle -->
          <div
            v-if="sidebar.sidebarVisible.value"
            role="separator"
            aria-orientation="vertical"
            class="relative z-20 mx-1.5 w-3 shrink-0 cursor-col-resize select-none pointer-events-auto group"
            title="Drag to resize • Double-click to hide"
            @mousedown.prevent="sidebar.onSidebarDividerMouseDown"
            @dblclick="sidebar.onSidebarDividerDoubleClick"
          >
            <!-- Vertical divider line -->
            <div
              class="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] rounded bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300 dark:group-hover:bg-gray-600 transition-colors"
            />

            <!-- Centered handle with chevron indicator -->
            <div
              class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-12 bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300 dark:group-hover:bg-gray-600 rounded flex items-center justify-center transition-all cursor-pointer"
              @click.stop="sidebar.toggleSidebar"
            >
              <!-- Double chevron left icon -->
              <svg
                class="w-3 h-3 text-gray-500 dark:text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </div>
          </div>

          <!-- Show sidebar button (when hidden) - positioned at vertical center -->
          <div v-if="!sidebar.sidebarVisible.value" class="relative shrink-0 w-5 mr-2">
            <button
              type="button"
              class="absolute top-1/2 -translate-y-1/2 w-5 h-12 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded flex items-center justify-center transition-all shadow-sm dark:shadow-gray-900/30"
              title="Show Sidebar (Ctrl+B)"
              @click="sidebar.toggleSidebar"
            >
              <!-- Double chevron right icon -->
              <svg
                class="w-3 h-3 text-gray-500 dark:text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          <!-- Right panel -->
          <div
            :style="{ flexBasis: '0px' }"
            :class="[
              'grow',
              'min-w-0',
              'overflow-x-hidden',
              sidebar.sidebarVisible.value ? 'pl-2' : 'pl-0'
            ]"
          >
            <!-- Content area with dual pane tabs -->
            <ExplorerContentArea
              v-if="navigationStore.activeConnectionId"
              :connection-id="navigationStore.activeConnectionId"
              :show-diagram="explorerState.showDiagram.value"
              :selected-database="selectedDatabase || undefined"
              :tables="schemaStore.tables as any[]"
              :views="schemaStore.views as any[]"
              :relationships="schemaStore.relationships"
              :file-entries="currentFileEntries"
              :active-pane="paneTabsStore.activePane"
              :split-pane-resize="splitPaneResize"
              @edit-connection="onEditConnection"
              @clone-connection="onCloneConnection"
              @delete-connection="onDeleteConnection"
              @show-diagram="handleShowDiagram"
              @set-active-pane="(pane) => paneTabsStore.setActivePane(pane)"
              @left-tab-change="onLeftTabChange"
              @right-tab-change="onRightTabChange"
              @refresh-metadata="handleRefreshMetadata"
              @breadcrumb-navigate="handleBreadcrumbNavigate"
              @breadcrumb-pick-name="handlePickFromBreadcrumb"
            />

            <!-- Show empty state when no connection is selected -->
            <EmptyStateMessage v-else variant="no-connection" />
          </div>
        </div>
      </div>
    </main>
    <ConfirmDialog
      v-model:is-open="showDeleteConfirm"
      title="Delete connection?"
      :description="deleteConnectionMessage"
      confirm-label="Delete"
      cancel-label="Cancel"
      :danger="true"
      @confirm="confirmDeleteConnection"
      @cancel="cancelDeleteConnection"
    />
  </div>
</template>
