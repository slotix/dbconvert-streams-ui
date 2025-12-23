<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Bars3Icon, PlusIcon } from '@heroicons/vue/24/solid'
import { useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import { useSchemaStore } from '@/stores/schema'
import { usePaneTabsStore } from '@/stores/paneTabs'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useExplorerViewStateStore } from '@/stores/explorerViewState'
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
import { useExplorerUrlSync } from '@/composables/useExplorerUrlSync'
import { useConnectionActions } from '@/composables/useConnectionActions'
import { useDesktopMode } from '@/composables/useDesktopMode'
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
const viewStateStore = useExplorerViewStateStore()
const { isDesktop } = useDesktopMode()
const sidebarWidthToggle = inject<{
  isSidebarExpanded: { value: boolean }
  toggleSidebarWidth: () => void
}>('sidebarWidthToggle')
const sidebarMenuToggle = inject<{ openSidebar: () => void }>('sidebarMenuToggle')

// Set up two-way URL sync (Store ↔ URL)
useExplorerUrlSync()

// Use composables and stores for state management
const explorerState = useExplorerState()
const fileExplorerStore = useFileExplorerStore()
const splitPaneResize = useSplitPaneResize()
const sidebar = useSidebar()

// Connection search and filtering
const connectionSearch = ref('')
const selectedConnectionTypes = usePersistedState<string[]>('explorer.connectionTypes', [], {
  serializer: (value) => JSON.stringify(value),
  deserializer: (value) => {
    try {
      return value ? JSON.parse(value) : []
    } catch {
      return []
    }
  }
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
const filteredConnectionsCount = computed(() => {
  const treeSearch = useTreeSearch(connectionSearch.value, {
    typeFilters: selectedConnectionTypes.value
  })
  const filtered = treeSearch.filterConnections(connectionsStore.connections)
  return filtered.length
})

const connectionCountLabel = computed(() => {
  const filtered = filteredConnectionsCount.value
  const total = connectionsCount.value
  if ((connectionSearch.value || selectedConnectionTypes.value.length > 0) && filtered !== total) {
    return `${filtered} of ${total} connections`
  }
  return `${total} connection${total === 1 ? '' : 's'}`
})

const selectedDatabase = computed(() => explorerState.selectedDatabaseName.value)

const activeConnectionId = computed(
  () =>
    navigationStore.activeConnectionId ||
    viewStateStore.connectionId ||
    explorerState.currentConnectionId.value
)

onMounted(() => {
  if (!navigationStore.activeConnectionId && viewStateStore.connectionId) {
    navigationStore.setActiveConnectionId(viewStateStore.connectionId)
    connectionsStore.setCurrentConnection(viewStateStore.connectionId)
  }
})

const {
  showDeleteConfirm,
  deleteConnectionMessage,
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
  onEditConnectionJson,
  onDeleteConnection,
  confirmDeleteConnection,
  cancelDeleteConnection,
  onCloneConnection
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
  onFileSelect: handleFileSelect
})

// Tab change handlers - no-op for now (tabs handle their own state)
function onLeftTabChange(_tab: 'data' | 'structure') {
  // Tab state is managed by ObjectContainer internally
}

function onRightTabChange(_tab: 'data' | 'structure') {
  // Tab state is managed by ObjectContainer internally
}

// Database/Schema creation handlers
const connectionActions = useConnectionActions()

function handleCreateDatabase(databaseName: string) {
  const connectionId = explorerState.currentConnectionId.value
  if (connectionId) {
    connectionActions.createDatabase(connectionId, databaseName)
  }
}

function handleCreateSchema(schemaName: string) {
  const connectionId = explorerState.currentConnectionId.value
  // Use the selected database from explorer (database-level schema creation)
  // or fall back to the default database from connection spec (connection-level schema creation)
  const targetDatabase =
    selectedDatabase.value ||
    connectionsStore.connections.find((c) => c.id === connectionId)?.spec?.database?.database ||
    connectionsStore.connections.find((c) => c.id === connectionId)?.spec?.snowflake?.database

  if (connectionId && targetDatabase) {
    connectionActions.createSchema(connectionId, targetDatabase, schemaName)
  }
}

function handleCreateBucket(payload: { bucket: string; region?: string }) {
  const connectionId = explorerState.currentConnectionId.value
  if (connectionId) {
    connectionActions.createBucket(connectionId, payload.bucket, { region: payload.region })
  }
}

// SQL Console handler
function handleOpenSqlConsole(payload: {
  connectionId: string
  database?: string
  sqlScope: 'database' | 'connection'
}) {
  const connection = connectionsStore.connectionByID(payload.connectionId)
  const connName = connection?.name || 'SQL'
  const tabName = payload.database ? `${connName} → ${payload.database}` : `${connName} (Admin)`

  // Switch view to show pane tabs instead of connection details or database overview
  viewStateStore.setViewType('table-data')

  paneTabsStore.addTab(
    paneTabsStore.activePane || 'left',
    {
      id: `sql-console:${payload.connectionId}:${payload.database || '*'}`,
      connectionId: payload.connectionId,
      database: payload.database,
      name: tabName,
      tabType: 'sql-console',
      sqlScope: payload.sqlScope
    },
    'pinned'
  )
}

// File Console handler (DuckDB console for file/S3 connections)
function handleOpenFileConsole(payload: {
  connectionId: string
  connectionType: 'files' | 's3'
  basePath?: string
}) {
  const connection = connectionsStore.connectionByID(payload.connectionId)
  const connName = connection?.name || 'Files'
  const tabName = `${connName} (DuckDB)`

  // Switch view to show pane tabs instead of connection details
  viewStateStore.setViewType('table-data')

  paneTabsStore.addTab(
    paneTabsStore.activePane || 'left',
    {
      id: `file-console:${payload.connectionId}`,
      connectionId: payload.connectionId,
      name: tabName,
      tabType: 'file-console',
      fileConnectionType: payload.connectionType,
      basePath: payload.basePath
    },
    'pinned'
  )
}
</script>

<template>
  <div class="min-h-full">
    <!-- Disconnected Overlay -->
    <DisconnectedOverlay />

    <!-- Enhanced Functional Toolbar with gradient background -->
    <header
      class="sticky top-0 z-30 bg-linear-to-r from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 border-b border-slate-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 lg:-ml-[var(--sidebar-width)] lg:w-[calc(100%+var(--sidebar-width))]"
    >
      <div class="px-6 py-4 flex items-center gap-4">
        <div class="flex items-center gap-3">
          <button
            v-if="sidebarMenuToggle"
            type="button"
            class="group flex items-center justify-center p-2 -ml-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 lg:hidden"
            @click="sidebarMenuToggle.openSidebar"
          >
            <Bars3Icon class="h-5 w-5" aria-hidden="true" />
            <span class="sr-only">Open sidebar</span>
          </button>
          <button
            v-if="sidebarWidthToggle"
            type="button"
            class="group hidden lg:flex items-center justify-center p-2 -ml-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
            @click="sidebarWidthToggle.toggleSidebarWidth"
          >
            <Bars3Icon class="h-5 w-5" aria-hidden="true" />
            <span class="sr-only">Toggle sidebar width</span>
          </button>
          <img
            v-if="!isDesktop"
            class="h-5 w-5 shrink-0"
            src="/images/logo.svg"
            alt="DBConvert Streams"
          />
          <!-- Connections Count Header -->
          <h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {{ connectionCountLabel }}
          </h1>
        </div>

        <!-- Connection Type Filter -->
        <div class="shrink-0">
          <ConnectionTypeFilter
            :selected-types="selectedConnectionTypes"
            :persistent="true"
            @update:selected-types="selectedConnectionTypes = $event"
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
              :type-filters="selectedConnectionTypes"
              :selected="treeSelection || undefined"
              @open="handleOpenFromTree"
              @show-diagram="handleShowDiagram"
              @select-connection="handleSelectConnection"
              @select-database="handleSelectDatabase"
              @select-file="handleFileSelect"
              @open-file="handleOpenFile"
              @open-sql-console="handleOpenSqlConsole"
              @open-file-console="handleOpenFileConsole"
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
              v-if="activeConnectionId"
              :connection-id="activeConnectionId"
              :selected-database="selectedDatabase || undefined"
              :file-entries="currentFileEntries"
              :active-pane="paneTabsStore.activePane"
              :split-pane-resize="splitPaneResize"
              @edit-connection-wizard="onEditConnection"
              @edit-connection-json="onEditConnectionJson"
              @clone-connection="onCloneConnection"
              @delete-connection="onDeleteConnection"
              @create-database="handleCreateDatabase"
              @create-schema="handleCreateSchema"
              @create-bucket="handleCreateBucket"
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
