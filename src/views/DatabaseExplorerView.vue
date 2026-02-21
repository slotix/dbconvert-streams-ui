<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useLucideIcons } from '@/composables/useLucideIcons'
import { Database, Menu, Plus } from 'lucide-vue-next'
import { useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import { usePaneTabsStore, createConsoleSessionId } from '@/stores/paneTabs'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useExplorerViewStateStore } from '@/stores/explorerViewState'
import { useSqlConsoleStore } from '@/stores/sqlConsole'
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
import { useTreeSearch } from '@/composables/useTreeSearch'
import { useConnectionActions } from '@/composables/useConnectionActions'
import { useDesktopMode } from '@/composables/useDesktopMode'
import { getSqlDialectFromConnection } from '@/types/specs'
import DisconnectedOverlay from '@/components/common/DisconnectedOverlay.vue'
import EmptyStateMessage from '@/components/explorer/EmptyStateMessage.vue'
import { useDatabaseExplorerController } from '@/composables/useDatabaseExplorerController'

const { strokeWidth: iconStroke } = useLucideIcons()

const router = useRouter()
const commonStore = useCommonStore()
const connectionsStore = useConnectionsStore()
const paneTabsStore = usePaneTabsStore()
const navigationStore = useExplorerNavigationStore()
const viewStateStore = useExplorerViewStateStore()
const sqlConsoleStore = useSqlConsoleStore()
const { isDesktop } = useDesktopMode()
const sidebarWidthToggle = inject<{
  isSidebarExpanded: { value: boolean }
  toggleSidebarWidth: () => void
}>('sidebarWidthToggle')
const sidebarMenuToggle = inject<{ openSidebar: () => void }>('sidebarMenuToggle')

// Explorer state is persisted; the URL is intentionally kept minimal (/explorer).

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

// Single treeSearch instance for connection count (called once, reactive via getters)
const treeSearchForCount = useTreeSearch(() => connectionSearch.value, {
  typeFilters: () => selectedConnectionTypes.value
})

// Use the same filtering logic as the sidebar tree
const filteredConnectionsCount = computed(() => {
  const filtered = treeSearchForCount.filterConnections(connectionsStore.connections)
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
  handlePickFileFromBreadcrumb,
  onAddConnection,
  onEditConnection,
  onEditConnectionJson,
  onDeleteConnection,
  confirmDeleteConnection,
  cancelDeleteConnection,
  onCloneConnection
} = useDatabaseExplorerController({
  router,
  explorerState,
  navigationStore,
  connectionsStore,
  paneTabsStore,
  fileExplorerStore,
  commonStore,
  sidebar,
  searchInputRef,
  recentConnectionsManager,
  alwaysOpenNewTab
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

function handleCreateDatabase(payload: { connectionId: string; name: string }) {
  if (payload.connectionId) {
    connectionActions.createDatabase(payload.connectionId, payload.name)
  }
}

function handleCreateSchema(payload: { connectionId: string; name: string; database?: string }) {
  if (!payload.connectionId) return
  const connectionId = payload.connectionId
  const targetDatabase =
    payload.database ||
    selectedDatabase.value ||
    connectionsStore.connections.find((c) => c.id === connectionId)?.spec?.database?.database ||
    connectionsStore.connections.find((c) => c.id === connectionId)?.spec?.snowflake?.database

  if (targetDatabase) {
    connectionActions.createSchema(connectionId, targetDatabase, payload.name)
  }
}

function handleCreateBucket(payload: { connectionId: string; bucket: string; region?: string }) {
  if (payload.connectionId) {
    connectionActions.createBucket(payload.connectionId, payload.bucket, { region: payload.region })
  }
}

// SQL Console handler
function handleOpenSqlConsole(payload: {
  connectionId: string
  database?: string
  sqlScope: 'database' | 'connection'
}) {
  const connection = connectionsStore.connectionByID(payload.connectionId)
  const dialect = getSqlDialectFromConnection(connection?.spec, connection?.type)
  const targetPane = paneTabsStore.activePane || 'left'
  const consoleSessionId = createConsoleSessionId()
  const tabId = `sql-console:${consoleSessionId}`

  // Opening SQL console from a database item should start on a neutral default query.
  if (payload.sqlScope === 'database' && payload.database) {
    const listTablesQuery =
      dialect === 'pgsql'
        ? "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
        : 'SHOW TABLES;'
    sqlConsoleStore.addTabWithQuery(
      consoleSessionId,
      payload.database,
      listTablesQuery,
      'List tables'
    )
  }

  // Opening SQL console from a connection item should start on a neutral admin query.
  if (payload.sqlScope === 'connection') {
    const listDatabasesQuery =
      dialect === 'pgsql'
        ? 'SELECT datname FROM pg_database WHERE datistemplate = false;'
        : 'SHOW DATABASES;'
    sqlConsoleStore.addTabWithQuery(
      consoleSessionId,
      undefined,
      listDatabasesQuery,
      'List databases'
    )
  }

  const connName = connection?.name || 'SQL'
  const tabName = payload.database ? `${connName} → ${payload.database}` : `${connName} (Admin)`

  // Switch view to show pane tabs instead of connection details or database overview
  viewStateStore.setViewType('table-data')

  paneTabsStore.addTab(
    targetPane,
    {
      id: tabId,
      connectionId: payload.connectionId,
      database: payload.database,
      name: tabName,
      consoleSessionId,
      tabType: 'sql-console',
      sqlScope: payload.sqlScope,
      objectKey: tabId
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
  const consoleSessionId = createConsoleSessionId()
  const tabId = `file-console:${consoleSessionId}`

  // Switch view to show pane tabs instead of connection details
  viewStateStore.setViewType('table-data')

  paneTabsStore.addTab(
    paneTabsStore.activePane || 'left',
    {
      id: tabId,
      connectionId: payload.connectionId,
      name: tabName,
      consoleSessionId,
      tabType: 'file-console',
      fileConnectionType: payload.connectionType,
      basePath: payload.basePath,
      objectKey: tabId
    },
    'pinned'
  )
}
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <!-- Disconnected Overlay -->
    <DisconnectedOverlay />

    <!-- Enhanced Functional Toolbar with gradient background -->
    <header
      class="sticky top-0 z-30 bg-linear-to-r from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 border-b border-slate-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 lg:-ml-(--sidebar-width) lg:w-[calc(100%+var(--sidebar-width))]"
    >
      <div class="px-6 py-4 flex items-center gap-4">
        <div class="flex items-center gap-3">
          <button
            v-if="sidebarMenuToggle"
            type="button"
            class="group flex items-center justify-center p-2 -ml-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 lg:hidden"
            @click="sidebarMenuToggle.openSidebar"
          >
            <Menu class="h-5 w-5" :stroke-width="iconStroke" aria-hidden="true" />
            <span class="sr-only">Open sidebar</span>
          </button>
          <button
            v-if="sidebarWidthToggle"
            type="button"
            class="group hidden lg:flex items-center justify-center p-2 -ml-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
            @click="sidebarWidthToggle.toggleSidebarWidth"
          >
            <Menu class="h-5 w-5" :stroke-width="iconStroke" aria-hidden="true" />
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

        <div class="shrink-0">
          <ConnectionTypeFilter
            :selected-types="selectedConnectionTypes"
            :persistent="true"
            @update:selected-types="selectedConnectionTypes = $event"
          />
        </div>

        <!-- Search Input with enhanced styling -->
        <div class="flex-1 max-w-sm md:max-w-md">
          <SearchInput
            ref="searchInputRef"
            v-model="connectionSearch"
            placeholder="Filter connections... (Press / to focus)"
            size="xs"
          />
        </div>

        <!-- Right side group -->
        <div class="flex items-center gap-4 ml-auto">
          <!-- Primary CTA Button with vibrant blue-green gradient -->
          <BaseButton variant="primary" @click="onAddConnection">
            <Plus class="h-5 w-5" :stroke-width="iconStroke" />
            <span>New Connection</span>
          </BaseButton>
        </div>
      </div>
    </header>

    <main class="flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <!-- No connections at all -->
      <div
        v-if="connectionsStore.connections.length === 0"
        class="flex-1 flex flex-col items-center justify-center py-16 px-4"
      >
        <div
          class="bg-linear-to-br from-blue-50 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 rounded-full p-6 mb-6"
        >
          <Database class="h-16 w-16 text-blue-500 dark:text-blue-400" :stroke-width="1.5" />
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
          <Plus class="h-5 w-5" :stroke-width="iconStroke" />
          Create Your First Connection
        </RouterLink>
      </div>

      <!-- Explorer content -->
      <div v-else class="flex-1 flex flex-col min-h-0">
        <div
          :ref="(el) => (sidebar.sidebarContainerRef.value = el as HTMLElement)"
          class="flex-1 flex flex-row items-stretch min-w-0 overflow-x-hidden min-h-0"
        >
          <!-- Sidebar -->
          <div
            v-if="sidebar.sidebarVisible.value"
            :ref="(el) => (sidebar.sidebarRef.value = el as HTMLElement)"
            :style="{
              flexBasis: `${sidebar.sidebarWidthPct.value}%`,
              flexGrow: 0,
              flexShrink: 0
            }"
            class="min-w-[220px] min-h-0"
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

          <!-- Sidebar sash: drag to resize, double-click to collapse/restore -->
          <div
            v-if="sidebar.sidebarVisible.value"
            role="separator"
            aria-orientation="vertical"
            class="relative z-20 w-[8px] shrink-0 cursor-col-resize select-none group"
            title="Drag to resize • Double-click to collapse"
            @mousedown.prevent="sidebar.onSidebarDividerMouseDown"
            @dblclick="sidebar.toggleSidebar"
          >
            <div
              class="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px group-hover:w-[3px] bg-gray-200 dark:bg-gray-700 group-hover:bg-teal-400 dark:group-hover:bg-teal-500 transition-all duration-150"
            />
          </div>

          <!-- Collapsed sash edge — click or double-click to restore sidebar -->
          <div
            v-if="!sidebar.sidebarVisible.value"
            role="separator"
            aria-orientation="vertical"
            class="relative z-20 w-[8px] shrink-0 cursor-col-resize select-none group"
            title="Click to restore sidebar"
            @click="sidebar.toggleSidebar"
          >
            <div
              class="absolute inset-y-0 left-0 w-px group-hover:w-[3px] bg-gray-200 dark:bg-gray-700 group-hover:bg-teal-400 dark:group-hover:bg-teal-500 transition-all duration-150"
            />
          </div>

          <!-- Right panel -->
          <div
            :style="{ flexBasis: '0px' }"
            class="grow min-w-0 min-h-0 overflow-x-hidden flex flex-col"
          >
            <!-- Content area with dual pane tabs -->
            <ExplorerContentArea
              v-if="activeConnectionId"
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
              @breadcrumb-pick-name="handlePickFromBreadcrumb"
              @breadcrumb-pick-file="handlePickFileFromBreadcrumb"
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
