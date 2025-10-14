<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import { useSchemaStore } from '@/stores/schema'
import { usePaneTabsStore, type PaneId, type PaneTab } from '@/stores/paneTabs'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import ExplorerSidebarConnections from '@/components/database/ExplorerSidebarConnections.vue'
import ExplorerHeader from '@/components/explorer/ExplorerHeader.vue'
import ExplorerContentArea from '@/components/explorer/ExplorerContentArea.vue'
import connections from '@/api/connections'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'

// Use our composables and stores
import { useExplorerState } from '@/composables/useExplorerState'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useSplitPaneResize } from '@/composables/useSplitPaneResize'
import { useSidebar } from '@/composables/useSidebar'
import { usePersistedState } from '@/composables/usePersistedState'
import { useRecentConnections } from '@/composables/useRecentConnections'
import { useExplorerRouter } from '@/composables/useExplorerRouter'

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
const focusConnectionId = ref<string | null>(null)
const showConnectionDetails = ref(route.query.details === 'true')

const explorerHeaderRef = ref<InstanceType<typeof ExplorerHeader> | null>(null)
const sidebarConnectionsRef = ref<InstanceType<typeof ExplorerSidebarConnections> | null>(null)

// Recent connections management
const recentConnectionsManager = useRecentConnections(explorerState.currentConnectionId)
const alwaysOpenNewTab = usePersistedState<boolean>('explorer.alwaysOpenNewTab', false, {
  serializer: (v) => String(v),
  deserializer: (v) => v === 'true'
})

// Computed properties
const selectedDbTypeFilter = computed(() => {
  return sidebarConnectionsRef.value?.selectedDbTypeLabel || 'All'
})

const currentFileEntries = computed<FileSystemEntry[]>(() => {
  const id = explorerState.currentConnectionId.value
  if (!id) return []
  return fileExplorerStore.getEntries(id)
})

// Router navigation (after computed dependencies are defined)
// The composable sets up watchers automatically and returns navigation helpers
useExplorerRouter({
  recentConnections: recentConnectionsManager.recentConnections,
  lastViewedConnectionId: recentConnectionsManager.lastViewedConnectionId,
  currentConnectionId: explorerState.currentConnectionId,
  currentFileEntries,
  onSelectConnection: handleSelectConnection,
  onFileSelect: handleFileSelect,
  setFocusConnectionId: (id) => (focusConnectionId.value = id)
})

// Computed: drive tree highlight from the active pane tab (fallback to explicit explorer selection)
const treeSelection = computed(() => {
  const activePane = paneTabsStore.activePane
  const activeState = paneTabsStore.getPaneState(activePane)
  const activePinnedIndex = activeState.activePinnedIndex
  const activePinnedTab =
    activePinnedIndex !== null ? activeState.pinnedTabs[activePinnedIndex] : null
  const activePreviewTab = activeState.previewTab
  const activeTab = activePinnedTab || activePreviewTab

  if (activeTab && activeTab.tabType === 'database' && activeTab.database) {
    return {
      connectionId: activeTab.connectionId,
      database: activeTab.database,
      schema: activeTab.schema || undefined,
      type: activeTab.type || undefined,
      name: activeTab.name || undefined
    }
  }

  return {
    connectionId: explorerState.activeConnectionId.value || undefined,
    database: explorerState.selectedDatabaseName.value || undefined,
    schema: explorerState.selectedSchemaName.value || undefined,
    type: explorerState.selectedObjectType.value || undefined,
    name: explorerState.selectedObjectName.value || undefined
  }
})

// Common computed helpers for watcher dependencies
const activeConnectionId = computed(() => navigationStore.activeConnectionId)
const selectedDatabase = computed(() => explorerState.selectedDatabaseName.value)
const selectedSchema = computed(() => explorerState.selectedSchemaName.value)
const selectedObjectType = computed(() => explorerState.selectedObjectType.value)
const selectedObjectName = computed(() => explorerState.selectedObjectName.value)
const selectedFilePath = computed(() => explorerState.selectedFileEntry.value?.path || null)
const leftActiveTab = computed<PaneTab | null>(() => paneTabsStore.getActiveTab('left'))
const rightActiveTab = computed<PaneTab | null>(() => paneTabsStore.getActiveTab('right'))

function clearRightPaneQueryParams() {
  const nextQuery = { ...route.query }
  delete nextQuery.rightDb
  delete nextQuery.rightType
  delete nextQuery.rightName
  delete nextQuery.rightSchema
  if (nextQuery.pane === 'right') {
    delete nextQuery.pane
  }

  router.replace({ path: route.path, query: nextQuery })
}

// Event handlers
function handleOpenFromTree(payload: {
  connectionId: string
  database: string
  schema?: string
  type: 'table' | 'view'
  name: string
  meta: SQLTableMeta | SQLViewMeta
  mode: 'preview' | 'pinned'
  defaultTab?: 'structure' | 'data'
  openInRightSplit?: boolean
}) {
  // Capture current connection before any route changes
  const previousConnectionId = explorerState.currentConnectionId.value

  // Set active connection ID FIRST (synchronous store update - SINGLE SOURCE OF TRUTH)
  navigationStore.setActiveConnectionId(payload.connectionId)
  connectionsStore.setCurrentConnection(payload.connectionId)

  showConnectionDetails.value = false

  // Clear old state
  explorerState.clearPanelStates()
  explorerState.clearFileSelection()

  // Clear file explorer selection when switching connections
  if (payload.connectionId !== previousConnectionId && previousConnectionId) {
    fileExplorerStore.clearSelection(previousConnectionId)
  }

  // Update schema store
  if (payload.database) {
    schemaStore.setConnectionId(payload.connectionId)
    schemaStore.setDatabaseName(payload.database)
    schemaStore.fetchSchema(false)
  }

  // Determine target pane - use active pane if openInRightSplit is not explicitly specified
  const targetPane: PaneId = payload.openInRightSplit ? 'right' : paneTabsStore.activePane || 'left'

  // Add tab to the appropriate pane
  paneTabsStore.addTab(
    targetPane,
    {
      id: `${payload.connectionId}:${payload.database || ''}:${payload.schema || ''}:${payload.name}:${payload.type || ''}`,
      connectionId: payload.connectionId,
      database: payload.database,
      schema: payload.schema,
      name: payload.name,
      type: payload.type,
      meta: payload.meta,
      tabType: 'database'
    },
    alwaysOpenNewTab.value ? 'pinned' : payload.mode
  )

  // Route is auto-updated by watcher based on state changes
}

function handleOpenFile(payload: {
  connectionId: string
  path: string
  entry: FileSystemEntry
  mode: 'preview' | 'pinned'
  defaultTab?: 'structure' | 'data'
  openInRightSplit?: boolean
}) {
  // Set active connection ID FIRST (synchronous store update)
  navigationStore.setActiveConnectionId(payload.connectionId)
  connectionsStore.setCurrentConnection(payload.connectionId)

  showConnectionDetails.value = false

  // Clear old state
  explorerState.clearPanelStates()
  explorerState.clearDatabaseSelection()

  // Determine target pane - use active pane if openInRightSplit is not explicitly specified
  const targetPane: PaneId = payload.openInRightSplit ? 'right' : paneTabsStore.activePane || 'left'

  // Set file selection
  if (!payload.openInRightSplit) {
    explorerState.setFileSelection(payload.entry)
    fileExplorerStore.setSelectedPath(payload.connectionId, payload.path)
  }

  // Add tab to the appropriate pane
  paneTabsStore.addTab(
    targetPane,
    {
      id: `file:${payload.path}`,
      connectionId: payload.connectionId,
      name: payload.entry.name,
      filePath: payload.path,
      fileEntry: payload.entry,
      fileType: payload.entry.type,
      tabType: 'file'
    },
    alwaysOpenNewTab.value ? 'pinned' : payload.mode
  )

  // Route is auto-updated by watcher based on state changes
}

function handleShowDiagram(payload: { connectionId: string; database: string }) {
  // Set active connection ID FIRST (synchronous store update)
  navigationStore.setActiveConnectionId(payload.connectionId)

  showConnectionDetails.value = false

  explorerState.clearPanelStates()
  explorerState.setDatabaseSelection({ database: payload.database })
  explorerState.showDiagram.value = true

  schemaStore.setConnectionId(payload.connectionId)
  schemaStore.setDatabaseName(payload.database)
  schemaStore.fetchSchema(false)

  // Route is auto-updated by watcher based on state changes
}

function handleRefreshMetadata() {
  // Force refresh the schema metadata from the backend
  schemaStore.fetchSchema(true)
}

function handleSelectConnection(payload: { connectionId: string }) {
  // Set active connection ID FIRST (synchronous store update)
  navigationStore.setActiveConnectionId(payload.connectionId)

  connectionsStore.setCurrentConnection(payload.connectionId)
  showConnectionDetails.value = true

  // Update route query params (path is auto-updated by watcher)
  router.replace({
    query: {
      details: 'true',
      file: undefined,
      db: undefined,
      schema: undefined,
      type: undefined,
      name: undefined,
      diagram: undefined
    }
  })

  focusConnectionId.value = payload.connectionId
  explorerState.clearPanelStates()
  explorerState.clearDatabaseSelection()

  fileExplorerStore.clearSelection(payload.connectionId)

  if (fileExplorerStore.isFilesConnectionType(payload.connectionId)) {
    void fileExplorerStore.loadEntries(payload.connectionId, false)
  }
}

function handleSelectDatabase(payload: { connectionId: string; database: string }) {
  // Set active connection ID FIRST (synchronous store update)
  navigationStore.setActiveConnectionId(payload.connectionId)

  connectionsStore.setCurrentConnection(payload.connectionId)
  showConnectionDetails.value = false

  explorerState.clearPanelStates()
  explorerState.setDatabaseSelection({ database: payload.database })
  paneTabsStore.closePreviewTab('left')
  explorerState.activePane.value = 'left'

  explorerState.showDiagram.value = false

  schemaStore.setConnectionId(payload.connectionId)
  schemaStore.setDatabaseName(payload.database)
  schemaStore.fetchSchema(false)

  // Route is auto-updated by watcher based on state changes
}

function handleFileSelect(payload: { connectionId: string; path: string }) {
  // Set active connection ID FIRST (synchronous store update)
  navigationStore.setActiveConnectionId(payload.connectionId)

  showConnectionDetails.value = false

  const entries = currentFileEntries.value
  const entry = entries.find((e) => e.path === payload.path)
  if (!entry) {
    fileExplorerStore.setSelectedPath(payload.connectionId, payload.path)
    focusConnectionId.value = null
    // Route is auto-updated by watcher based on state changes
    return
  }

  handleOpenFile({
    connectionId: payload.connectionId,
    path: payload.path,
    entry: entry,
    mode: 'preview',
    defaultTab: 'data'
  })
}

function handleRequestFileEntries(payload: { connectionId: string }) {
  void fileExplorerStore.loadEntries(payload.connectionId, true)
}

// Breadcrumb handlers
async function handlePickFromBreadcrumb(
  paneId: PaneId,
  o: {
    name: string
    type: 'table' | 'view'
    schema?: string
  }
) {
  const activeTab = paneTabsStore.getActiveTab(paneId)
  if (!activeTab || activeTab.tabType !== 'database' || !activeTab.database) return

  const targetConnId = activeTab.connectionId
  const targetDb = activeTab.database

  try {
    const meta = await connections.getMetadata(targetConnId, targetDb)
    let obj: SQLTableMeta | SQLViewMeta | undefined
    if (o.type === 'table') {
      obj = Object.values(meta.tables || {}).find(
        (t) => t.name === o.name && (o.schema ? t.schema === o.schema : true)
      )
    } else {
      obj = Object.values(meta.views || {}).find(
        (v) => v.name === o.name && (o.schema ? v.schema === o.schema : true)
      )
    }
    if (!obj) return

    handleOpenFromTree({
      connectionId: targetConnId,
      database: targetDb,
      schema: o.schema,
      type: o.type,
      name: o.name,
      meta: obj,
      mode: 'preview',
      defaultTab: 'data',
      openInRightSplit: paneId === 'right'
    })
  } catch {
    // ignore open errors
  }
}

function handleBreadcrumbNavigate(
  paneId: PaneId,
  payload: { level: 'database' | 'schema' | 'type' | 'name' }
) {
  // For breadcrumb navigation, close the current tab in the pane
  const paneState = paneTabsStore.getPaneState(paneId)

  if (payload.level === 'database') {
    // Close all tabs in this pane
    paneTabsStore.closeAllTabs(paneId)
    if (paneState.previewTab) {
      paneTabsStore.closePreviewTab(paneId)
    }
  } else if (payload.level === 'schema' || payload.level === 'type') {
    // Close current tab (user wants to navigate back)
    if (paneState.activePinnedIndex !== null) {
      paneTabsStore.closeTab(paneId, paneState.activePinnedIndex)
    } else if (paneState.previewTab) {
      paneTabsStore.closePreviewTab(paneId)
    }
  }

  // Route is auto-updated by watcher based on state changes
}

// Tab change handlers - no-op for now (tabs handle their own state)
function onLeftTabChange(_tab: 'data' | 'structure') {
  // Tab state is managed by ObjectContainer internally
}

function onRightTabChange(_tab: 'data' | 'structure') {
  // Tab state is managed by ObjectContainer internally
}

// Header event handlers
function onAddConnection() {
  router.push('/explorer/add')
}

function onEditConnection() {
  if (!explorerState.activeConnectionId.value) return
  router.push(`/explorer/edit/${explorerState.activeConnectionId.value}`)
}

async function onDeleteConnection() {
  const id = explorerState.activeConnectionId.value
  if (!id) return
  const conn = connectionsStore.connections.find((c) => c.id === id)
  const name = conn?.name || conn?.host || 'connection'
  if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return
  try {
    await connectionsStore.deleteConnection(id)
    recentConnectionsManager.removeFromRecent(id)
    router.push('/explorer')
  } catch (e) {
    console.error('Failed to delete connection from Explorer:', e)
  }
}

async function onCloneConnection() {
  const id = explorerState.activeConnectionId.value
  if (!id) return
  try {
    connectionsStore.setCurrentConnection(id)
    await connectionsStore.cloneConnection(id)
    const newId = connectionsStore.currentConnection?.id
    await connectionsStore.refreshConnections()
    if (newId) router.push(`/explorer/edit/${newId}`)
  } catch (e) {
    console.error('Failed to clone connection from Explorer:', e)
  }
}

function showDiagramForActiveDatabase() {
  const activeTab = paneTabsStore.getActiveTab(paneTabsStore.activePane)
  if (!activeTab || activeTab.tabType !== 'database' || !activeTab.database) return

  handleShowDiagram({ connectionId: activeTab.connectionId, database: activeTab.database })
}

// Watchers
// Watch store's activeConnectionId and sync route automatically
// Also watch pane tabs to include table/view selections for both panes
watch(
  [
    activeConnectionId,
    selectedDatabase,
    selectedSchema,
    selectedObjectType,
    selectedObjectName,
    selectedFilePath,
    () => explorerState.showDiagram.value,
    () => showConnectionDetails.value,
    leftActiveTab,
    rightActiveTab,
    () => paneTabsStore.activePane
  ],
  ([
    connId,
    db,
    schema,
    type,
    name,
    file,
    diagram,
    connectionDetails,
    leftTab,
    rightTab,
    activePane
  ]) => {
    if (!connId) return

    const currentPath = route.path
    const newPath = `/explorer/${connId}`

    // Build query params from state
    const query: Record<string, string | undefined> = {}
    const hasFile = Boolean(file)
    const hasDatabaseSelection = Boolean(db)
    const hasDiagram = Boolean(diagram) && hasDatabaseSelection
    const shouldShowDetails =
      Boolean(connectionDetails) && !hasFile && !hasDatabaseSelection && !hasDiagram

    if (hasFile) {
      if (file != null) query.file = file
    } else if (hasDatabaseSelection) {
      if (db != null) query.db = db
      if (schema) query.schema = schema
      if (type) query.type = type
      if (name) query.name = name
      if (hasDiagram) query.diagram = 'true'
    } else if (shouldShowDetails) {
      query.details = 'true'
    }

    // Add left pane table/view info
    if (
      leftTab &&
      leftTab.tabType === 'database' &&
      leftTab.type &&
      leftTab.name &&
      leftTab.database &&
      leftTab.connectionId === connId
    ) {
      query.db = leftTab.database
      query.type = leftTab.type
      query.name = leftTab.name
      if (leftTab.schema) query.schema = leftTab.schema
    }

    // Add right pane table/view info
    if (
      rightTab &&
      rightTab.tabType === 'database' &&
      rightTab.type &&
      rightTab.name &&
      rightTab.database &&
      rightTab.connectionId === connId
    ) {
      query.rightDb = rightTab.database
      query.rightType = rightTab.type
      query.rightName = rightTab.name
      if (rightTab.schema) query.rightSchema = rightTab.schema
    }

    // Add active pane indicator
    if (activePane === 'right' && rightTab && rightTab.connectionId === connId) {
      query.pane = 'right'
    } else if (activePane === 'left' && leftTab && leftTab.connectionId === connId) {
      query.pane = 'left'
    }

    // Only update if something changed
    const pathChanged = newPath !== currentPath
    const queryChanged = JSON.stringify(query) !== JSON.stringify(route.query)

    if (pathChanged || queryChanged) {
      router.replace({ path: newPath, query })
    }
  },
  { flush: 'post' }
)

watch(
  () => route.query.details,
  (val) => {
    const wantsDetails = val === 'true'
    if (wantsDetails !== showConnectionDetails.value) {
      showConnectionDetails.value = wantsDetails
    }
  }
)

watch(explorerState.currentConnectionId, async (newId) => {
  navigationStore.setActiveConnectionId(newId)

  if (newId && explorerState.currentConnection.value) {
    recentConnectionsManager.addToRecent({
      id: explorerState.currentConnection.value.id,
      name: explorerState.currentConnection.value.name,
      type: explorerState.currentConnection.value.type,
      host: explorerState.currentConnection.value.host,
      port: explorerState.currentConnection.value.port?.toString(),
      database: explorerState.currentConnection.value.database,
      cloud_provider: explorerState.currentConnection.value.cloud_provider || ''
    })
    if (fileExplorerStore.isFilesConnectionType(newId)) {
      await fileExplorerStore.loadEntries(newId)
      const fileParam = route.query.file as string
      if (fileParam && currentFileEntries.value.length > 0) {
        handleFileSelect({ connectionId: newId, path: fileParam })
      }
    }
  }
})

// Watch for URL query parameter changes to restore pane state from URL
watch(
  () =>
    [route.query.rightDb, route.query.rightType, route.query.rightName, route.query.pane] as const,
  async ([rightDb, rightType, rightName, activePane]) => {
    // Restore right pane tab from URL if present
    if (
      rightDb &&
      rightType &&
      rightName &&
      explorerState.currentConnectionId.value &&
      (rightType === 'table' || rightType === 'view')
    ) {
      const rightSchema = route.query.rightSchema as string | undefined

      const rightState = paneTabsStore.getPaneState('right')
      const matchesSelection = (tab: PaneTab | null | undefined) =>
        Boolean(
          tab &&
            tab.tabType === 'database' &&
            tab.connectionId === explorerState.currentConnectionId.value &&
            tab.database === rightDb &&
            tab.type === rightType &&
            tab.name === rightName &&
            (tab.schema || undefined) === (rightSchema || undefined)
        )

      const hasMatchingTab =
        matchesSelection(rightState.previewTab) ||
        rightState.pinnedTabs.some((tab) => matchesSelection(tab))

      if (hasMatchingTab) {
        return
      }

      let obj: SQLTableMeta | SQLViewMeta | undefined
      try {
        const meta = await connections.getMetadata(
          explorerState.currentConnectionId.value,
          rightDb as string
        )
        if (rightType === 'table') {
          obj = Object.values(meta.tables || {}).find(
            (t) => t.name === rightName && (!rightSchema || t.schema === rightSchema)
          )
        } else {
          obj = Object.values(meta.views || {}).find(
            (v) => v.name === rightName && (!rightSchema || v.schema === rightSchema)
          )
        }
      } catch (error) {
        console.warn('Failed to restore right pane tab from URL:', error)
        clearRightPaneQueryParams()
        return
      }

      if (obj) {
        // Open in right pane
        handleOpenFromTree({
          connectionId: explorerState.currentConnectionId.value,
          database: rightDb as string,
          schema: rightSchema,
          type: rightType as 'table' | 'view',
          name: rightName as string,
          meta: obj,
          mode: 'preview',
          openInRightSplit: true
        })
      } else {
        clearRightPaneQueryParams()
      }
    }

    // Restore active pane from URL
    if (activePane === 'right' || activePane === 'left') {
      paneTabsStore.setActivePane(activePane)
    }
  },
  { immediate: false }
)

// Lifecycle
onMounted(() => {
  commonStore.setCurrentPage('Data Explorer')
  sidebar.initializeSidebar()

  if (
    explorerState.currentConnection.value &&
    !recentConnectionsManager.recentConnections.value.find(
      (c) => c.id === explorerState.currentConnectionId.value
    )
  ) {
    recentConnectionsManager.addToRecent({
      id: explorerState.currentConnection.value.id,
      name: explorerState.currentConnection.value.name,
      type: explorerState.currentConnection.value.type,
      host: explorerState.currentConnection.value.host,
      port: explorerState.currentConnection.value.port?.toString(),
      database: explorerState.currentConnection.value.database,
      cloud_provider: explorerState.currentConnection.value.cloud_provider || ''
    })
  }

  // Seed selection from query if present
  const { db, schema, type, name, file } = route.query as Record<string, string | undefined>
  if (file && fileExplorerStore.isFilesConnectionType(explorerState.currentConnectionId.value)) {
    explorerState.clearDatabaseSelection()
  } else if (db) {
    explorerState.clearFileSelection()
    fileExplorerStore.clearSelection(explorerState.currentConnectionId.value || '')

    explorerState.setDatabaseSelection({
      database: db,
      schema,
      type: type as 'table' | 'view',
      name
    })

    if (type && name) {
      connections
        .getMetadata(explorerState.currentConnectionId.value || '', db)
        .then((m) => {
          const obj =
            type === 'table'
              ? Object.values(m.tables).find((t) => t.name === name)
              : Object.values(m.views).find((v) => v.name === name)
          if (obj) explorerState.selectedMeta.value = obj
        })
        .catch(() => void 0)
    }

    schemaStore.setConnectionId(explorerState.currentConnectionId.value || '')
    schemaStore.setDatabaseName(db)
    schemaStore.fetchSchema(false)
  }

  if (fileExplorerStore.isFilesConnectionType(explorerState.currentConnectionId.value)) {
    void fileExplorerStore
      .loadEntries(explorerState.currentConnectionId.value as string)
      .then(() => {
        if (file) {
          fileExplorerStore.setSelectedPath(explorerState.currentConnectionId.value || '', file)
          focusConnectionId.value = null
        }
      })
  }
})
</script>

<template>
  <div class="min-h-full overflow-x-hidden">
    <ExplorerHeader ref="explorerHeaderRef" />

    <main class="mx-auto py-4 overflow-x-hidden">
      <!-- No recent connections -->
      <div
        v-if="recentConnectionsManager.recentConnections.value.length === 0"
        class="text-center py-12"
      >
        <p class="text-gray-500">No recently explored connections.</p>
        <RouterLink
          to="/explorer/add"
          class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Create a Connection
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
              ref="sidebarConnectionsRef"
              :initial-expanded-connection-id="explorerState.currentConnectionId.value || undefined"
              :search-query="connectionSearch"
              :type-filter="selectedDbTypeFilter"
              :focus-connection-id="focusConnectionId || undefined"
              :selected="treeSelection"
              @open="handleOpenFromTree"
              @show-diagram="handleShowDiagram"
              @select-connection="handleSelectConnection"
              @select-database="handleSelectDatabase"
              @select-file="handleFileSelect"
              @open-file="handleOpenFile"
              @request-file-entries="handleRequestFileEntries"
              @update:search-query="connectionSearch = $event"
              @add-connection="onAddConnection"
            />
          </div>

          <!-- Sidebar divider -->
          <div
            v-if="sidebar.sidebarVisible.value"
            role="separator"
            aria-orientation="vertical"
            class="relative z-20 mx-1.5 w-3 shrink-0 cursor-col-resize select-none pointer-events-auto"
            @mousedown.prevent="sidebar.onSidebarDividerMouseDown"
            @dblclick="sidebar.onSidebarDividerDoubleClick"
          >
            <div
              class="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] rounded bg-gray-200 hover:bg-gray-300"
            />
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
            <div class="mb-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-sm text-gray-500"></div>
                <div class="flex items-center gap-2">
                  <button
                    v-if="
                      explorerState.activeDatabaseName.value && !explorerState.showDiagram.value
                    "
                    type="button"
                    class="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                    title="Show database diagram"
                    @click="showDiagramForActiveDatabase"
                  >
                    Show diagram
                  </button>
                  <button
                    type="button"
                    class="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                    :title="sidebar.sidebarVisible.value ? 'Hide Sidebar' : 'Show Sidebar'"
                    @click="sidebar.toggleSidebar"
                  >
                    {{ sidebar.sidebarVisible.value ? 'Hide Sidebar' : 'Show Sidebar' }}
                  </button>
                  <button
                    v-if="paneTabsStore.hasRightPaneContent"
                    type="button"
                    class="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                    title="Reset pane sizes to 50/50"
                    @click="splitPaneResize.resetSplitSize"
                  >
                    Even Split
                  </button>
                  <CloudProviderBadge
                    v-if="explorerState.activeDisplayType.value"
                    :cloud-provider="explorerState.activeDisplayCloudProvider.value"
                    :db-type="explorerState.activeDisplayType.value"
                  />
                </div>
              </div>
            </div>

            <!-- Content area with dual pane tabs -->
            <ExplorerContentArea
              v-if="navigationStore.activeConnectionId"
              :connection-id="navigationStore.activeConnectionId"
              :show-diagram="explorerState.showDiagram.value"
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

            <!-- Show loading or empty state when no connection is selected -->
            <div v-else class="flex items-center justify-center h-64 text-gray-500">
              <div class="text-center">
                <div class="text-lg font-medium mb-2">Select a connection</div>
                <div class="text-sm">
                  Choose a connection from the sidebar to start exploring data
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
