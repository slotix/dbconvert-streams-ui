<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import { useSchemaStore } from '@/stores/schema'
import { useTabsStore } from '@/stores/tabs'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import ExplorerSidebarConnections from '@/components/database/ExplorerSidebarConnections.vue'
import ExplorerBreadcrumb from '@/components/database/ExplorerBreadcrumb.vue'
import ExplorerHeader from '@/components/explorer/ExplorerHeader.vue'
import ExplorerTabs from '@/components/explorer/ExplorerTabs.vue'
import ExplorerContentArea from '@/components/explorer/ExplorerContentArea.vue'
import connections from '@/api/connections'
import { getFileMetadata } from '@/api/files'
import { getFileFormat } from '@/utils/fileFormat'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'

// Use our new composables and stores
import { useExplorerState } from '@/composables/useExplorerState'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useSplitPane } from '@/composables/useSplitPane'
import { useSidebar } from '@/composables/useSidebar'
import { usePersistedState } from '@/composables/usePersistedState'
import { useRecentConnections } from '@/composables/useRecentConnections'
import { useExplorerRouter } from '@/composables/useExplorerRouter'
import { useConnectionActions } from '@/composables/useConnectionActions'

const route = useRoute()
const router = useRouter()
const commonStore = useCommonStore()
const connectionsStore = useConnectionsStore()
const schemaStore = useSchemaStore()
const tabsStore = useTabsStore()
const navigationStore = useExplorerNavigationStore()

// Use composables and stores for state management
const explorerState = useExplorerState()
const fileExplorerStore = useFileExplorerStore()
const splitPane = useSplitPane()
const sidebar = useSidebar()

// Connection search and filtering
const connectionSearch = ref('')
const focusConnectionId = ref<string | null>(null)
const explorerHeaderRef = ref<InstanceType<typeof ExplorerHeader> | null>(null)

// Recent connections management
const recentConnectionsManager = useRecentConnections(explorerState.currentConnectionId)
const alwaysOpenNewTab = usePersistedState<boolean>('explorer.alwaysOpenNewTab', false, {
  serializer: (v) => String(v),
  deserializer: (v) => v === 'true'
})

// Computed properties
const selectedDbTypeFilter = computed(() => {
  return explorerHeaderRef.value?.selectedDbTypeLabel || 'All'
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

// Event handlers
function onPromoteRightSplit() {
  // Move the right split content to the left pane
  if (splitPane.splitMeta.value) {
    explorerState.setDatabaseSelection({
      database: splitPane.splitDatabaseName.value || '',
      schema: splitPane.splitSchemaName.value || undefined,
      type: splitPane.splitObjectType.value as 'table' | 'view',
      name: splitPane.splitObjectName.value || '',
      meta: splitPane.splitMeta.value
    })
    const defaultTab = splitPane.splitDefaultTab.value
    if (defaultTab) {
      tabsStore.defaultActiveView = defaultTab
    }
  } else if (splitPane.splitFileEntry.value) {
    explorerState.setFileSelection(splitPane.splitFileEntry.value)
    explorerState.selectedFileMetadata.value = splitPane.splitFileMetadata.value
    const defaultTab = splitPane.splitDefaultTab.value
    if (defaultTab) {
      tabsStore.defaultActiveView = defaultTab
    }
  }
  splitPane.closeRightSplit()
}

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

  // Clear other modes
  explorerState.clearPanelStates()
  explorerState.clearFileSelection()

  // Clear file explorer selection when switching connections
  if (payload.connectionId !== previousConnectionId && previousConnectionId) {
    fileExplorerStore.clearSelection(previousConnectionId)
  }

  // Set database selection
  explorerState.setDatabaseSelection({
    database: payload.database,
    schema: payload.schema,
    type: payload.type,
    name: payload.name,
    meta: payload.meta
  })

  // Update schema store
  if (payload.database) {
    schemaStore.setConnectionId(payload.connectionId)
    schemaStore.setDatabaseName(payload.database)
    schemaStore.fetchSchema(false)
  }

  // Route is auto-updated by watcher based on state changes

  if (payload.openInRightSplit) {
    splitPane.setSplitDatabaseContent(payload)
    explorerState.activePane.value = 'right'
    return
  }

  explorerState.activePane.value = 'left'
  const splitTab = splitPane.splitDefaultTab.value
  if (tabsStore.linkTabs && splitPane.splitMeta.value && splitTab) {
    tabsStore.defaultActiveView = splitTab
  }

  const desiredPinned = payload.mode === 'pinned' || settingAlwaysOpenNewTab()
  if (desiredPinned) {
    const initialView = (payload.defaultTab ||
      (tabsStore.linkTabs ? tabsStore.defaultActiveView || 'data' : 'data')) as 'structure' | 'data'

    tabsStore.addDatabaseTab({
      connectionId: payload.connectionId,
      database: payload.database,
      schema: payload.schema,
      name: payload.name,
      type: payload.type,
      meta: payload.meta,
      viewTab: initialView
    })

    const activeTab =
      tabsStore.activePinnedIndex !== null
        ? tabsStore.pinnedTabs[tabsStore.activePinnedIndex]
        : null
    if (activeTab) {
      activateTabFromState(activeTab)
    }
  } else {
    const initialView = (payload.defaultTab ||
      (tabsStore.linkTabs ? tabsStore.defaultActiveView || 'data' : 'data')) as 'structure' | 'data'

    const previewTab = {
      id: `preview:${payload.connectionId}:${payload.database || ''}:${payload.schema || ''}:${payload.name}:${payload.type || ''}`,
      connectionId: payload.connectionId,
      database: payload.database,
      schema: payload.schema,
      name: payload.name,
      type: payload.type,
      meta: payload.meta,
      tabType: 'database' as const,
      pinned: false,
      viewTab: initialView
    }

    tabsStore.setPreviewTab(previewTab)
    tabsStore.activePinnedIndex = null
    tabsStore.defaultActiveView = initialView
  }
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

  // Clear other modes
  explorerState.clearPanelStates()
  explorerState.clearDatabaseSelection()

  // Set file selection immediately so breadcrumb updates
  explorerState.setFileSelection(payload.entry)
  fileExplorerStore.setSelectedPath(payload.connectionId, payload.path)

  // Route is auto-updated by watcher based on state changes

  if (payload.openInRightSplit) {
    splitPane.setSplitFileContent({
      connectionId: payload.connectionId,
      entry: payload.entry,
      defaultTab: tabsStore.linkTabs
        ? (tabsStore.defaultActiveView as 'structure' | 'data') || 'data'
        : payload.defaultTab || 'data'
    })
    explorerState.activePane.value = 'right'
    return
  }

  explorerState.activePane.value = 'left'
  const desiredPinned = payload.mode === 'pinned' || settingAlwaysOpenNewTab()

  if (desiredPinned) {
    tabsStore.addFileTab({
      connectionId: payload.connectionId,
      filePath: payload.path,
      name: payload.entry.name,
      fileType: payload.entry.type
    })

    const activeTab =
      tabsStore.activePinnedIndex !== null
        ? tabsStore.pinnedTabs[tabsStore.activePinnedIndex]
        : null
    if (activeTab) {
      activateTabFromState(activeTab)
    }
  } else {
    const fileTab = {
      id: `preview:file:${payload.path}`,
      connectionId: payload.connectionId,
      name: payload.entry.name,
      filePath: payload.path,
      fileEntry: payload.entry,
      tabType: 'file' as const,
      pinned: false,
      defaultTab: payload.defaultTab,
      viewTab: (payload.defaultTab ||
        (tabsStore.linkTabs ? tabsStore.defaultActiveView || 'data' : 'data')) as
        | 'structure'
        | 'data'
    }

    tabsStore.setPreviewTab(fileTab)
    tabsStore.activePinnedIndex = null
    activateTabFromState(fileTab)
  }
}

function handleShowDiagram(payload: { connectionId: string; database: string }) {
  // Set active connection ID FIRST (synchronous store update)
  navigationStore.setActiveConnectionId(payload.connectionId)

  explorerState.clearPanelStates()
  explorerState.setDatabaseSelection({ database: payload.database })
  explorerState.showDiagram.value = true

  schemaStore.setConnectionId(payload.connectionId)
  schemaStore.setDatabaseName(payload.database)
  schemaStore.fetchSchema(false)

  // Route is auto-updated by watcher based on state changes
}

function handleSelectConnection(payload: { connectionId: string }) {
  // Set active connection ID FIRST (synchronous store update)
  navigationStore.setActiveConnectionId(payload.connectionId)

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

  splitPane.closeRightSplit()
  fileExplorerStore.clearSelection(payload.connectionId)

  if (fileExplorerStore.isFilesConnectionType(payload.connectionId)) {
    void fileExplorerStore.loadEntries(payload.connectionId, false)
  }
}

function handleSelectDatabase(payload: { connectionId: string; database: string }) {
  // Set active connection ID FIRST (synchronous store update)
  navigationStore.setActiveConnectionId(payload.connectionId)

  explorerState.clearPanelStates()
  explorerState.setDatabaseSelection({ database: payload.database })
  splitPane.closeRightSplit()
  explorerState.activePane.value = 'left'

  schemaStore.setConnectionId(payload.connectionId)
  schemaStore.setDatabaseName(payload.database)
  schemaStore.fetchSchema(false)

  // Route is auto-updated by watcher based on state changes
}

function handleFileSelect(payload: { connectionId: string; path: string }) {
  // Set active connection ID FIRST (synchronous store update)
  navigationStore.setActiveConnectionId(payload.connectionId)

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

function settingAlwaysOpenNewTab(): boolean {
  return alwaysOpenNewTab.value
}

function activateTabFromState(tab: {
  tabType?: string
  viewTab?: string
  defaultTab?: string
  fileEntry?: FileSystemEntry
  filePath?: string
  connectionId: string
  database?: string
  schema?: string
  type?: string
  name?: string
  meta?: SQLTableMeta | SQLViewMeta
}) {
  if (!tab) return

  if (tab.tabType === 'file') {
    explorerState.clearDatabaseSelection()
    explorerState.clearPanelStates()

    tabsStore.defaultActiveView = (tab.viewTab || tab.defaultTab || 'data') as 'structure' | 'data'

    if (tab.fileEntry) {
      explorerState.setFileSelection(tab.fileEntry)
    }

    if (tab.filePath) {
      fileExplorerStore.setSelectedPath(tab.connectionId, tab.filePath)
    }

    if (explorerState.selectedFileEntry.value) {
      void refreshSelectedFileMetadata()
    }

    router.replace({
      path: `/explorer/${tab.connectionId}`,
      query: {
        file: tab.filePath,
        db: undefined,
        schema: undefined,
        type: undefined,
        name: undefined,
        details: undefined,
        diagram: undefined
      }
    })
  } else {
    explorerState.clearFileSelection()
    explorerState.clearPanelStates()

    explorerState.setDatabaseSelection({
      database: tab.database || '',
      schema: tab.schema,
      type: tab.type as 'table' | 'view',
      name: tab.name,
      meta: tab.meta
    })
    tabsStore.defaultActiveView = (tab.viewTab || tab.defaultTab || 'data') as 'structure' | 'data'

    if (tab.database) {
      schemaStore.setConnectionId(tab.connectionId)
      schemaStore.setDatabaseName(tab.database)
      schemaStore.fetchSchema(false)
    }

    router.replace({
      path: `/explorer/${tab.connectionId}`,
      query: {
        db: tab.database || undefined,
        schema: tab.schema || undefined,
        type: tab.type || undefined,
        name: tab.name || undefined,
        file: undefined,
        details: undefined,
        diagram: undefined
      }
    })
  }
}

function closePinned(index: number) {
  const wasActive = tabsStore.activePinnedIndex === index
  tabsStore.closeTab(index)

  if (!tabsStore.pinnedTabs.length) {
    if (tabsStore.previewTab) activateTabFromState(tabsStore.previewTab)
    return
  }

  if (wasActive) {
    const activeTab =
      tabsStore.activePinnedIndex !== null
        ? tabsStore.pinnedTabs[tabsStore.activePinnedIndex]
        : null
    if (activeTab) {
      activateTabFromState(activeTab)
    }
  }
}

function activatePinned(index: number) {
  if (index < 0 || index >= tabsStore.pinnedTabs.length) return
  explorerState.clearPanelStates()
  tabsStore.defaultActiveView = (tabsStore.pinnedTabs[index].viewTab || 'data') as
    | 'structure'
    | 'data'
  explorerState.activePane.value = 'left'
  tabsStore.activateTab(index)
  activateTabFromState(tabsStore.pinnedTabs[index])
}

function activatePreview() {
  if (tabsStore.previewTab) {
    explorerState.clearPanelStates()
    tabsStore.defaultActiveView = (tabsStore.previewTab.viewTab || 'data') as 'structure' | 'data'
    explorerState.activePane.value = 'left'
    tabsStore.activePinnedIndex = null
    activateTabFromState(tabsStore.previewTab)
  }
}

// Header event handlers
async function onRefreshConnections() {
  try {
    await connectionsStore.refreshConnections()
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to refresh connections'
    commonStore.showNotification(message, 'error')
  }
}

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

// Breadcrumb handlers
async function handlePickFromBreadcrumb(o: {
  name: string
  type: 'table' | 'view'
  schema?: string
}) {
  const targetConnId = explorerState.currentConnectionId.value
  const targetDb = explorerState.selectedDatabaseName.value
  if (!targetConnId || !targetDb) return
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
      openInRightSplit: false
    })
  } catch {
    // ignore open errors
  }
}

function handleBreadcrumbNavigate(payload: { level: 'database' | 'schema' | 'type' | 'name' }) {
  if (
    explorerState.activePane.value === 'right' &&
    (splitPane.splitMeta.value || splitPane.splitDatabaseName.value)
  ) {
    if (payload.level === 'database') {
      splitPane.splitSchemaName.value = null
      splitPane.splitObjectType.value = null
      splitPane.splitObjectName.value = null
      splitPane.splitMeta.value = null
    } else if (payload.level === 'schema') {
      splitPane.splitObjectType.value = null
      splitPane.splitObjectName.value = null
      splitPane.splitMeta.value = null
    } else if (payload.level === 'type') {
      splitPane.splitObjectName.value = null
      splitPane.splitMeta.value = null
    }
    return
  }

  if (payload.level === 'database') {
    explorerState.showDiagram.value = false
    explorerState.selectedSchemaName.value = null
    explorerState.selectedObjectType.value = null
    explorerState.selectedObjectName.value = null
    explorerState.selectedMeta.value = null
  } else if (payload.level === 'schema') {
    explorerState.selectedObjectType.value = null
    explorerState.selectedObjectName.value = null
    explorerState.selectedMeta.value = null
  } else if (payload.level === 'type') {
    explorerState.selectedObjectName.value = null
    explorerState.selectedMeta.value = null
  }

  router.replace({
    path: `/explorer/${explorerState.currentConnectionId.value}`,
    query: {
      db: explorerState.selectedDatabaseName.value || undefined,
      schema: explorerState.selectedSchemaName.value || undefined,
      type: explorerState.selectedObjectType.value || undefined,
      name: explorerState.selectedObjectName.value || undefined,
      file: undefined,
      details: undefined,
      diagram: undefined
    }
  })
}

// Tab change handlers
function onLeftTabChange(t: 'data' | 'structure') {
  tabsStore.syncedDefaultView = t
  if (tabsStore.linkTabs && splitPane.splitMeta.value) {
    splitPane.splitDefaultTab.value = t
  }
}

function onRightTabChange(t: 'data' | 'structure') {
  if (!tabsStore.linkTabs) return
  tabsStore.syncedDefaultView = t
}

// Helper functions
async function refreshSelectedFileMetadata() {
  if (!explorerState.selectedFileEntry.value) return

  try {
    const fileFormat = getFileFormat(explorerState.selectedFileEntry.value.name)
    if (!fileFormat) {
      console.warn(
        'Unable to determine file format for:',
        explorerState.selectedFileEntry.value.name
      )
      return
    }

    const metadata = await getFileMetadata(explorerState.selectedFileEntry.value.path, fileFormat)
    explorerState.selectedFileMetadata.value = metadata
  } catch (error) {
    console.error('Failed to load file metadata:', error)
    explorerState.selectedFileMetadata.value = null
  }
}

function initializeCurrentConnection() {
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
}

function showDiagramForActiveDatabase() {
  const isRight = explorerState.activePane.value === 'right'
  const connId = isRight
    ? splitPane.splitConnectionId.value || explorerState.currentConnectionId.value
    : explorerState.currentConnectionId.value
  const db = isRight ? splitPane.splitDatabaseName.value : explorerState.selectedDatabaseName.value
  if (!connId || !db) return
  handleShowDiagram({ connectionId: connId, database: db })
}

// Watchers
// Route watching is now handled by useExplorerRouter

// Watch store's activeConnectionId and sync route automatically
// This is the ONLY place that updates the route - handlers only update store state
watch(
  () =>
    [
      navigationStore.activeConnectionId,
      explorerState.selectedDatabaseName.value,
      explorerState.selectedSchemaName.value,
      explorerState.selectedObjectType.value,
      explorerState.selectedObjectName.value,
      explorerState.selectedFileEntry.value?.path,
      explorerState.showDiagram.value,
      route.query.details // This comes from handlers setting it
    ] as const,
  ([connId, db, schema, type, name, file, diagram, details]) => {
    if (!connId) return

    const currentPath = route.path
    const newPath = `/explorer/${connId}`

    // Build query params from state
    const query: Record<string, string | undefined> = {}

    if (details === 'true') {
      query.details = 'true'
    } else if (file) {
      query.file = file
    } else if (db) {
      query.db = db
      if (schema) query.schema = schema
      if (type) query.type = type
      if (name) query.name = name
      if (diagram) query.diagram = 'true'
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

watch(explorerState.currentConnectionId, async (newId) => {
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

// Lifecycle
onMounted(() => {
  commonStore.setCurrentPage('Data Explorer')
  sidebar.initializeSidebar()
  initializeCurrentConnection()

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
        .getMetadata(explorerState.currentConnectionId.value, db)
        .then((m) => {
          const obj =
            type === 'table'
              ? Object.values(m.tables).find((t) => t.name === name)
              : Object.values(m.views).find((v) => v.name === name)
          if (obj) explorerState.selectedMeta.value = obj
        })
        .catch(() => void 0)
    }

    schemaStore.setConnectionId(explorerState.currentConnectionId.value)
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
    <ExplorerHeader
      ref="explorerHeaderRef"
      v-model:connection-search="connectionSearch"
      @refresh="onRefreshConnections"
      @add-connection="onAddConnection"
    />

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
          ref="sidebarContainerRef"
          class="mt-6 flex flex-row items-stretch min-w-0 overflow-x-hidden"
        >
          <!-- Sidebar -->
          <div
            v-if="sidebar.sidebarVisible.value"
            ref="sidebarRef"
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
              :type-filter="selectedDbTypeFilter"
              :focus-connection-id="focusConnectionId || undefined"
              :selected="{
                database: explorerState.selectedDatabaseName.value || undefined,
                schema: explorerState.selectedSchemaName.value || undefined,
                type: explorerState.selectedObjectType.value || undefined,
                name: explorerState.selectedObjectName.value || undefined
              }"
              @open="handleOpenFromTree"
              @show-diagram="handleShowDiagram"
              @select-connection="handleSelectConnection"
              @select-database="handleSelectDatabase"
              @select-file="handleFileSelect"
              @open-file="handleOpenFile"
              @request-file-entries="handleRequestFileEntries"
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
                <div class="flex items-center gap-2 text-sm text-gray-500">
                  <span
                    v-if="explorerState.activeDisplayHostPort.value"
                    class="font-medium text-gray-700"
                  >
                    {{ explorerState.activeDisplayHostPort.value }}
                  </span>
                  <span v-if="explorerState.activeDisplayHostPort.value" class="text-gray-400"
                    >•</span
                  >
                  <!-- Database breadcrumb -->
                  <ExplorerBreadcrumb
                    v-if="explorerState.activeDatabaseName.value"
                    :database="explorerState.activeDatabaseName.value"
                    :schema="explorerState.activeSchemaName.value"
                    :type="explorerState.activeObjectType.value"
                    :name="explorerState.activeObjectName.value"
                    :objects="explorerState.breadcrumbObjects.value"
                    @navigate="handleBreadcrumbNavigate"
                    @pick-name="handlePickFromBreadcrumb"
                  />
                  <!-- File breadcrumb -->
                  <div
                    v-else-if="explorerState.selectedFileEntry.value"
                    class="flex items-center gap-1 text-sm"
                  >
                    <span class="text-gray-600">File:</span>
                    <span class="font-medium text-gray-900">{{
                      explorerState.selectedFileEntry.value.name
                    }}</span>
                    <span class="text-gray-400">•</span>
                    <span class="text-gray-500 text-xs">{{
                      explorerState.selectedFileEntry.value.path
                    }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <label class="flex items-center gap-1 text-xs text-gray-600 select-none">
                    <input v-model="tabsStore.linkTabs" type="checkbox" />
                    Link tabs
                  </label>
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
                    v-if="splitPane.splitMeta.value || splitPane.splitFileEntry.value"
                    type="button"
                    class="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                    title="Center split"
                    @click="splitPane.resetRightSplit"
                  >
                    Center split
                  </button>
                  <CloudProviderBadge
                    v-if="explorerState.activeDisplayType.value"
                    :cloud-provider="explorerState.activeDisplayCloudProvider.value"
                    :db-type="explorerState.activeDisplayType.value"
                  />
                </div>
              </div>
            </div>

            <!-- Tabs -->
            <ExplorerTabs
              @activate-preview="activatePreview"
              @activate-pinned="activatePinned"
              @close-pinned="closePinned"
            />

            <!-- Content area -->
            <ExplorerContentArea
              v-if="navigationStore.activeConnectionId"
              :connection-id="navigationStore.activeConnectionId"
              :show-diagram="explorerState.showDiagram.value"
              :tables="schemaStore.tables as any[]"
              :views="schemaStore.views as any[]"
              :relationships="schemaStore.relationships"
              :selected-meta="explorerState.selectedMeta.value"
              :selected-file-entry="explorerState.selectedFileEntry.value"
              :selected-file-metadata="explorerState.selectedFileMetadata.value"
              :selected-default-tab="tabsStore.defaultActiveView"
              :link-tabs="tabsStore.linkTabs"
              :split-connection-id="splitPane.splitConnectionId.value"
              :split-meta="splitPane.splitMeta.value"
              :split-file-entry="splitPane.splitFileEntry.value"
              :split-file-metadata="splitPane.splitFileMetadata.value"
              :split-default-tab="splitPane.splitDefaultTab.value"
              :file-entries="currentFileEntries"
              @edit-connection="onEditConnection"
              @clone-connection="onCloneConnection"
              @delete-connection="onDeleteConnection"
              @show-diagram="handleShowDiagram"
              @set-active-pane="(pane) => (explorerState.activePane.value = pane)"
              @promote-right-split="onPromoteRightSplit"
              @left-tab-change="onLeftTabChange"
              @right-tab-change="onRightTabChange"
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
