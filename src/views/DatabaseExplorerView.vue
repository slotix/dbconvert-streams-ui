<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import { useSchemaStore } from '@/stores/schema'
import { useTabsStore } from '@/stores/tabs'
// Removed headlessui Tab components after moving Diagram to a context-menu action
// (Removed TrashIcon as Clear All control was removed)
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import ExplorerSidebarConnections from '@/components/database/ExplorerSidebarConnections.vue'
import ExplorerBreadcrumb from '@/components/database/ExplorerBreadcrumb.vue'
import DatabaseObjectContainer from '@/components/database/DatabaseObjectContainer.vue'
import DiagramView from '@/components/database/DiagramView.vue'
import ConnectionDetailsPanel from '@/components/database/ConnectionDetailsPanel.vue'
import DatabaseOverviewPanel from '@/components/database/DatabaseOverviewPanel.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import connections from '@/api/connections'
import { listDirectory, type FileSystemEntry } from '@/api/fileSystem'
import { getFileMetadata } from '@/api/files'
import { getFileFormat } from '@/utils/fileFormat'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import type { FileMetadata } from '@/types/files'
import type { DbType } from '@/types/connections'
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/vue'
import { ChevronDownIcon, CheckIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'

const MAX_RECENT_CONNECTIONS = 5
const route = useRoute()
const router = useRouter()
const commonStore = useCommonStore()
const connectionsStore = useConnectionsStore()
const schemaStore = useSchemaStore()
const tabsStore = useTabsStore()
const connectionsCount = computed(() => connectionsStore.connections.length || 0)
const connectionsCountLabel = computed(
  () => `(${connectionsCount.value} connection${connectionsCount.value === 1 ? '' : 's'})`
)
const TYPE_FILTER_STORAGE_KEY = 'explorer.connectionType'
const connectionSearch = ref('')
const dbTypeOptions = computed<DbType[]>(() => connectionsStore.dbTypes)
const selectedDbType = ref<DbType | null>(null)
const selectedDbTypeLabel = computed(() => selectedDbType.value?.type || 'All')
let hasInitializedTypeFilter = false
const focusConnectionId = ref<string | null>(null)

function loadStoredType(): string | null {
  try {
    return localStorage.getItem(TYPE_FILTER_STORAGE_KEY)
  } catch {
    return null
  }
}

function storeType(value: string | null) {
  try {
    if (value) localStorage.setItem(TYPE_FILTER_STORAGE_KEY, value)
    else localStorage.removeItem(TYPE_FILTER_STORAGE_KEY)
  } catch {
    /* ignore persistence errors */
  }
}

watch(
  dbTypeOptions,
  (options) => {
    if (!options.length) return
    if (!hasInitializedTypeFilter) {
      const stored = loadStoredType()
      selectedDbType.value = stored
        ? options.find((opt) => opt.type === stored) || options[0]
        : options[0]
      hasInitializedTypeFilter = true
      return
    }
    if (selectedDbType.value) {
      const match = options.find((opt) => opt.type === selectedDbType.value?.type)
      selectedDbType.value = match || options[0]
    } else {
      selectedDbType.value = options[0]
    }
  },
  { immediate: true }
)

watch(
  () => selectedDbType.value?.type,
  (val) => {
    if (!hasInitializedTypeFilter) return
    storeType(val || null)
  }
)

// Get recent connections from localStorage or initialize empty
const recentConnections = ref<
  Array<{
    id: string
    name: string
    type?: string
    host?: string
    port?: string
    database?: string
    cloud_provider?: string
  }>
>(JSON.parse(localStorage.getItem('recentConnections') || '[]'))

// Track last viewed connection
const lastViewedConnectionId = ref<string>(localStorage.getItem('lastViewedConnectionId') || '')

// Current active connection ID
const currentConnectionId = computed(() => route.params.id as string)

// Selection state (database as root)
type ObjectType = 'table' | 'view'
const selectedDatabaseName = ref<string | null>(null)
const selectedSchemaName = ref<string | null>(null)
const selectedObjectType = ref<ObjectType | null>(null)
const selectedObjectName = ref<string | null>(null)
const selectedMeta = ref<SQLTableMeta | SQLViewMeta | null>(null)

// File selection
const selectedFileEntry = ref<FileSystemEntry | null>(null)
const selectedFileMetadata = ref<FileMetadata | null>(null)

// Editor tabs: using local type for compatibility during migration
type EditorTab = {
  id: string
  connectionId: string
  // For database objects
  database?: string
  schema?: string
  type?: ObjectType
  name: string
  meta?: SQLTableMeta | SQLViewMeta
  // For file objects
  filePath?: string
  fileEntry?: FileSystemEntry
  // Common properties
  tabType: 'database' | 'file'
  pinned: boolean
  defaultTab?: 'structure' | 'data'
  viewTab?: 'structure' | 'data'
}

// Editor tabs state - now using store for clean architecture
// Local state replaced with store: tabsStore.pinnedTabs, tabsStore.previewTab, tabsStore.activePinnedIndex
const selectedDefaultTab = ref<'structure' | 'data' | null>(null)

// Right split selection (lightweight preview only)
const splitConnectionId = ref<string | null>(null)
const splitDatabaseName = ref<string | null>(null)
const splitSchemaName = ref<string | null>(null)
const splitObjectType = ref<ObjectType | null>(null)
const splitObjectName = ref<string | null>(null)
const splitMeta = ref<SQLTableMeta | SQLViewMeta | null>(null)
const splitDefaultTab = ref<'structure' | 'data' | null>(null)
// File split state
const splitFileEntry = ref<FileSystemEntry | null>(null)
const splitFileMetadata = ref<FileMetadata | null>(null)

// Diagram mode (database-level)
const showDiagram = ref(false)
const diagramConnectionId = ref<string | null>(null)
const diagramDatabaseName = ref<string | null>(null)

// File connections state
const fileEntriesByConnection = ref<Record<string, FileSystemEntry[]>>({})
const fileDirectoryPathsByConnection = ref<Record<string, string>>({})
const fileEntryErrorsByConnection = ref<Record<string, string>>({})
const selectedFilePathsByConnection = ref<Record<string, string | null>>({})

// Track which pane is active for breadcrumb/header context
const activePane = ref<'left' | 'right'>('left')
// Component refresh - REMOVED (no longer needed with proper reactive connection IDs)

// Optional: link tabs across splits (Data/Structure)
const linkTabs = ref<boolean>(localStorage.getItem('explorer.linkTabs') === 'true')
watch(linkTabs, (val) => {
  try {
    localStorage.setItem('explorer.linkTabs', val ? 'true' : 'false')
  } catch {
    /* ignore */
  }
})

// Update URL when left pane content changes (only left pane controls URL)
watch(
  [
    selectedFileEntry,
    selectedMeta,
    currentConnectionId,
    selectedDatabaseName,
    selectedSchemaName,
    selectedObjectType,
    selectedObjectName
  ],
  () => {
    if (!currentConnectionId.value) return

    if (selectedFileEntry.value) {
      router.replace({
        path: `/explorer/${currentConnectionId.value}`,
        query: { file: selectedFileEntry.value.path }
      })
    } else if (selectedMeta.value) {
      router.replace({
        path: `/explorer/${currentConnectionId.value}`,
        query: {
          db: selectedDatabaseName.value || undefined,
          schema: selectedSchemaName.value || undefined,
          type: selectedObjectType.value || undefined,
          name: selectedObjectName.value || undefined
        }
      })
    }
  }
)

// Connection details panel (when clicking a connection in the tree)
const detailsConnectionId = ref<string | null>(null)
// Database overview (when clicking a database in the tree)
const overviewConnectionId = ref<string | null>(null)
const overviewDatabaseName = ref<string | null>(null)
const detailsConnection = computed(() =>
  detailsConnectionId.value
    ? connectionsStore.connections.find((c) => c.id === detailsConnectionId.value) || null
    : null
)

// Split sizing/resizer state
const splitGrow = ref(50) // percentage width for left pane (0..100)
const isResizing = ref(false)
const splitContainerRef = ref<HTMLElement | null>(null)
const leftPaneRef = ref<HTMLElement | null>(null)

let startX = 0
let startLeftWidth = 0
let containerWidth = 0
let prevUserSelect: string | null = null

function onDividerMouseDown(e: MouseEvent) {
  if (!splitContainerRef.value || !leftPaneRef.value) return
  isResizing.value = true
  startX = e.clientX
  const leftRect = leftPaneRef.value.getBoundingClientRect()
  const contRect = splitContainerRef.value.getBoundingClientRect()
  startLeftWidth = leftRect.width
  containerWidth = contRect.width
  window.addEventListener('mousemove', onDividerMouseMove)
  window.addEventListener('mouseup', onDividerMouseUp, { once: true })
  // Prevent text selection during resize; remember previous value
  prevUserSelect = document.body.style.userSelect
  document.body.style.userSelect = 'none'
}

function onDividerMouseMove(e: MouseEvent) {
  if (!isResizing.value || !containerWidth) return
  const dx = e.clientX - startX
  const newLeft = startLeftWidth + dx
  const pct = Math.max(20, Math.min(80, (newLeft / containerWidth) * 100))
  splitGrow.value = pct
}

function onDividerMouseUp() {
  isResizing.value = false
  document.body.style.userSelect = prevUserSelect || ''
  window.removeEventListener('mousemove', onDividerMouseMove)
}

onUnmounted(() => {
  window.removeEventListener('mousemove', onDividerMouseMove)
})

// Sidebar visibility + resizer state
const sidebarVisible = ref<boolean>(true)
const sidebarWidthPct = ref(25) // percentage width for left sidebar
const lastSidebarWidthPct = ref<number>(25)
const isSidebarResizing = ref(false)
const sidebarContainerRef = ref<HTMLElement | null>(null)
const sidebarRef = ref<HTMLElement | null>(null)

let sbStartX = 0
let sbStartLeftWidth = 0
let sbContainerWidth = 0
let prevBodySelect: string | null = null

function onSidebarDividerDoubleClick() {
  // Reset sidebar width to default 25%
  sidebarWidthPct.value = 25
  try {
    localStorage.setItem('explorer.sidebarWidthPct', '25')
    localStorage.setItem('explorer.lastSidebarWidthPct', '25')
  } catch {
    /* ignore */
  }
}

function onSidebarDividerMouseDown(e: MouseEvent) {
  if (!sidebarContainerRef.value || !sidebarRef.value) return
  isSidebarResizing.value = true
  sbStartX = e.clientX
  const leftRect = sidebarRef.value.getBoundingClientRect()
  const contRect = sidebarContainerRef.value.getBoundingClientRect()
  sbStartLeftWidth = leftRect.width
  sbContainerWidth = contRect.width
  window.addEventListener('mousemove', onSidebarDividerMouseMove)
  window.addEventListener('mouseup', onSidebarDividerMouseUp, { once: true })
  prevBodySelect = document.body.style.userSelect
  document.body.style.userSelect = 'none'
}

function onSidebarDividerMouseMove(e: MouseEvent) {
  if (!isSidebarResizing.value || !sbContainerWidth) return
  const dx = e.clientX - sbStartX
  const newLeft = sbStartLeftWidth + dx
  const pct = Math.max(15, Math.min(50, (newLeft / sbContainerWidth) * 100))
  sidebarWidthPct.value = pct
}

function onSidebarDividerMouseUp() {
  isSidebarResizing.value = false
  document.body.style.userSelect = prevBodySelect || ''
  window.removeEventListener('mousemove', onSidebarDividerMouseMove)
  // persist current width
  try {
    localStorage.setItem('explorer.sidebarWidthPct', String(Math.round(sidebarWidthPct.value)))
  } catch {
    /* ignore persistence errors */
  }
  lastSidebarWidthPct.value = sidebarWidthPct.value
}

onUnmounted(() => {
  window.removeEventListener('mousemove', onSidebarDividerMouseMove)
})

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function toggleSidebar() {
  if (sidebarVisible.value) {
    // hide and remember width
    lastSidebarWidthPct.value = sidebarWidthPct.value
    sidebarVisible.value = false
    try {
      localStorage.setItem('explorer.sidebarVisible', 'false')
      localStorage.setItem(
        'explorer.lastSidebarWidthPct',
        String(Math.round(lastSidebarWidthPct.value))
      )
      localStorage.setItem('explorer.sidebarWidthPct', String(Math.round(sidebarWidthPct.value)))
    } catch {
      /* ignore persistence errors */
    }
  } else {
    // show and restore last width
    sidebarVisible.value = true
    try {
      const stored = Number(
        localStorage.getItem('explorer.lastSidebarWidthPct') || lastSidebarWidthPct.value
      )
      sidebarWidthPct.value = clamp(isNaN(stored) ? 25 : stored, 15, 50)
      localStorage.setItem('explorer.sidebarVisible', 'true')
    } catch {
      /* ignore persistence errors */
    }
  }
}

function onDividerDoubleClick() {
  // Reset split widths to 50/50
  splitGrow.value = 50
}

function closeRightSplit() {
  splitConnectionId.value = null
  splitDatabaseName.value = null
  splitSchemaName.value = null
  splitObjectType.value = null
  splitObjectName.value = null
  splitMeta.value = null
  splitDefaultTab.value = null
  // Clear file split state
  splitFileEntry.value = null
  splitFileMetadata.value = null
  // When right split closes, focus returns to left
  activePane.value = 'left'
}

function promoteRightSplitToMain() {
  // Move right split content to main area and close right split
  if (splitMeta.value && splitConnectionId.value) {
    // Promote database object to main
    const payload = {
      connectionId: splitConnectionId.value,
      database: splitDatabaseName.value || '',
      schema: splitSchemaName.value || undefined,
      type: splitObjectType.value as ObjectType,
      name: splitObjectName.value || '',
      meta: splitMeta.value,
      mode: 'preview' as const,
      defaultTab: splitDefaultTab.value || undefined
    }

    // Clear current file state
    selectedFileEntry.value = null
    selectedFileMetadata.value = null

    // Handle as regular object opening (will set main area state)
    handleOpenFromTree({
      ...payload,
      openInRightSplit: false
    })

    // Close right split
    closeRightSplit()
  } else if (splitFileEntry.value && splitConnectionId.value) {
    // Promote file to main
    const payload = {
      connectionId: splitConnectionId.value,
      path: splitFileEntry.value.path,
      entry: splitFileEntry.value,
      mode: 'preview' as const,
      defaultTab: splitDefaultTab.value || undefined
    }

    // Handle as regular file opening (will set main area state)
    handleOpenFile({
      ...payload,
      openInRightSplit: false
    })

    // Close right split
    closeRightSplit()
  }
}

function showRightSplitContextMenu(event: MouseEvent) {
  // Simple context menu for right split - just "Make Primary" option
  event.preventDefault()

  // Create a simple context menu
  const menu = document.createElement('div')
  menu.className =
    'fixed z-50 bg-white shadow-lg border border-gray-200 rounded-md py-1 min-w-[120px]'
  menu.style.left = `${event.clientX}px`
  menu.style.top = `${event.clientY}px`

  const menuItem = document.createElement('button')
  menuItem.className =
    'w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2'
  menuItem.innerHTML = '<span>Make Primary</span>'
  menuItem.onclick = () => {
    promoteRightSplitToMain()
    document.body.removeChild(menu)
  }

  menu.appendChild(menuItem)
  document.body.appendChild(menu)

  // Remove menu when clicking elsewhere
  const removeMenu = () => {
    if (document.body.contains(menu)) {
      document.body.removeChild(menu)
    }
    document.removeEventListener('click', removeMenu)
  }

  setTimeout(() => {
    document.addEventListener('click', removeMenu)
  }, 0)
}

function resetRightSplit() {
  // Ensure split becomes visible and centered if content pushed it
  splitGrow.value = 50
}

function settingAlwaysOpenNewTab(): boolean {
  return localStorage.getItem('explorer.alwaysOpenNewTab') === 'true'
}

function activateTabFromState(tab: EditorTab | null) {
  if (!tab) return

  // Clear details panel when activating a tab to ensure unified tab system takes precedence
  detailsConnectionId.value = null

  // Note: Removed componentRefreshKey - reactive connection IDs handle updates properly

  if (tab.tabType === 'file') {
    // Handle file tab - clear all database state
    selectedDatabaseName.value = null
    selectedSchemaName.value = null
    selectedObjectType.value = null
    selectedObjectName.value = null
    selectedMeta.value = null

    // Clear other panel states
    overviewConnectionId.value = null
    overviewDatabaseName.value = null
    showDiagram.value = false

    selectedDefaultTab.value = (tab.viewTab || tab.defaultTab || 'data') as 'structure' | 'data'

    // Set file selection
    selectedFileEntry.value = tab.fileEntry || null
    selectedFileMetadata.value = null // Will be loaded below

    if (tab.filePath) {
      selectedFilePathsByConnection.value = {
        [tab.connectionId]: tab.filePath
      }
    }

    // Load file metadata
    if (selectedFileEntry.value) {
      void refreshSelectedFileMetadata()
    }

    // Update route for file
    router.replace({
      path: `/explorer/${tab.connectionId}`,
      query: {
        file: tab.filePath,
        // Explicitly remove database parameters when switching to file tab
        db: undefined,
        schema: undefined,
        type: undefined,
        name: undefined
      }
    })
  } else {
    // Handle database tab - clear all file state
    selectedFileEntry.value = null
    selectedFileMetadata.value = null
    selectedFilePathsByConnection.value = {}

    // Clear other panel states
    overviewConnectionId.value = null
    overviewDatabaseName.value = null
    showDiagram.value = false

    selectedDatabaseName.value = tab.database || null
    selectedSchemaName.value = tab.schema || null
    selectedObjectType.value = tab.type || null
    selectedObjectName.value = tab.name
    selectedMeta.value = tab.meta || null
    selectedDefaultTab.value = (tab.viewTab || tab.defaultTab || 'data') as 'structure' | 'data'

    // keep schema store in sync
    if (tab.database) {
      schemaStore.setConnectionId(tab.connectionId)
      schemaStore.setDatabaseName(tab.database)
      schemaStore.fetchSchema(false)
    }

    // update route for database
    router.replace({
      path: `/explorer/${tab.connectionId}`,
      query: {
        db: tab.database || undefined,
        schema: tab.schema || undefined,
        type: tab.type || undefined,
        name: tab.name || undefined,
        file: undefined // Explicitly remove file parameter when switching to database tab
      }
    })
  }
}

function handleOpenFromTree(payload: {
  connectionId: string
  database: string
  schema?: string
  type: ObjectType
  name: string
  meta: SQLTableMeta | SQLViewMeta
  mode: 'preview' | 'pinned'
  defaultTab?: 'structure' | 'data'
  openInRightSplit?: boolean
}) {
  // Opening an object should leave diagram mode
  showDiagram.value = false
  // Hide overview panel when an object is opened
  overviewConnectionId.value = null
  overviewDatabaseName.value = null
  // Hide connection details panel when an object is opened
  detailsConnectionId.value = null

  // Clear file selection state when opening database object
  selectedFileEntry.value = null
  selectedFileMetadata.value = null
  selectedFilePathsByConnection.value = {}
  // If opening into the main area and the target connection differs, swap state
  // With global tabs, no per-connection state swap is needed when switching connections
  // If request is to open in right split, update split-only state and return
  if (payload.openInRightSplit) {
    splitConnectionId.value = payload.connectionId
    splitDatabaseName.value = payload.database
    splitSchemaName.value = payload.schema || null
    splitObjectType.value = payload.type
    splitObjectName.value = payload.name
    splitMeta.value = payload.meta
    // If tabs are linked, mirror the left pane's current tab; otherwise honor requested default
    splitDefaultTab.value = linkTabs.value
      ? selectedDefaultTab.value || 'data'
      : payload.defaultTab || null
    activePane.value = 'right'
    return
  }
  // Opening in main area focuses left pane
  activePane.value = 'left'
  if (linkTabs.value && splitMeta.value && splitDefaultTab.value) {
    // If tabs are linked and right split is present, mirror its current tab into the left
    selectedDefaultTab.value = splitDefaultTab.value
  }
  const desiredPinned = payload.mode === 'pinned' || settingAlwaysOpenNewTab()
  if (desiredPinned) {
    // Use store method for pinned tabs
    const initialView = (payload.defaultTab ||
      (linkTabs.value ? selectedDefaultTab.value || 'data' : 'data')) as 'structure' | 'data'

    tabsStore.addDatabaseTab({
      connectionId: payload.connectionId,
      database: payload.database,
      schema: payload.schema,
      name: payload.name,
      type: payload.type,
      meta: payload.meta,
      viewTab: initialView
    })

    // Activate the tab that was just added/found
    const activeTab =
      tabsStore.activePinnedIndex !== null
        ? tabsStore.pinnedTabs[tabsStore.activePinnedIndex]
        : null
    if (activeTab) {
      activateTabFromState(activeTab)
    }
  } else {
    // Use store method for preview tab
    const initialView = (payload.defaultTab ||
      (linkTabs.value ? selectedDefaultTab.value || 'data' : 'data')) as 'structure' | 'data'

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
    activateTabFromState(previewTab)
  }
}

function handleShowDiagram(payload: { connectionId: string; database: string }) {
  // Set database context and diagram mode
  // Hide connection details panel when switching to diagram mode
  detailsConnectionId.value = null
  // Hide overview panel when switching to diagram mode
  overviewConnectionId.value = null
  overviewDatabaseName.value = null
  selectedDatabaseName.value = payload.database
  selectedSchemaName.value = null
  selectedObjectType.value = null
  selectedObjectName.value = null
  selectedMeta.value = null
  diagramConnectionId.value = payload.connectionId
  diagramDatabaseName.value = payload.database
  showDiagram.value = true
  // Keep schema store in sync
  schemaStore.setConnectionId(payload.connectionId)
  schemaStore.setDatabaseName(payload.database)
  schemaStore.fetchSchema(false)
  // Update route if switching connections or db context
  router.replace({
    path: `/explorer/${payload.connectionId}`,
    query: { db: payload.database }
  })
}

function handleSelectConnection(payload: { connectionId: string }) {
  // Navigate to the connection to update currentConnectionId
  router.replace({ path: `/explorer/${payload.connectionId}` })

  // Show details for the clicked connection; keep its tabs state
  focusConnectionId.value = payload.connectionId
  // Always set detailsConnectionId to show standard connection details panel
  detailsConnectionId.value = payload.connectionId
  showDiagram.value = false
  overviewConnectionId.value = null
  overviewDatabaseName.value = null
  // Clear current object selection (content area will show details panel)
  selectedDatabaseName.value = null
  selectedSchemaName.value = null
  selectedObjectType.value = null
  selectedObjectName.value = null
  selectedMeta.value = null
  // Right split is connection-bound; clear it when switching context
  splitConnectionId.value = null
  splitDatabaseName.value = null
  splitSchemaName.value = null
  splitObjectType.value = null
  splitObjectName.value = null
  splitMeta.value = null
  splitDefaultTab.value = null

  // Clear ALL file selections when switching connections to prevent multiple selections
  selectedFilePathsByConnection.value = {}

  if (isFilesConnectionType(payload.connectionId)) {
    void loadFileEntries(payload.connectionId, false)
  }
}

function handleSelectDatabase(payload: { connectionId: string; database: string }) {
  // Show database overview panel and clear other modes
  detailsConnectionId.value = null
  showDiagram.value = false
  // keep tabs/preview intact for this connection
  selectedDatabaseName.value = payload.database
  selectedSchemaName.value = null
  selectedObjectType.value = null
  selectedObjectName.value = null
  selectedMeta.value = null
  splitConnectionId.value = null
  splitDatabaseName.value = null
  splitSchemaName.value = null
  splitObjectType.value = null
  splitObjectName.value = null
  splitMeta.value = null
  splitDefaultTab.value = null
  // Database overview shows in the main (left) context
  activePane.value = 'left'
  overviewConnectionId.value = payload.connectionId
  overviewDatabaseName.value = payload.database
  // Keep schema store in sync (for potential future actions)
  schemaStore.setConnectionId(payload.connectionId)
  schemaStore.setDatabaseName(payload.database)
  schemaStore.fetchSchema(false)
  // Update route
  router.replace({ path: `/explorer/${payload.connectionId}`, query: { db: payload.database } })
}

watch(
  () => route.query.focus || route.query.new,
  async (flag) => {
    if (!flag) return
    const id = currentConnectionId.value
    if (!id) return
    handleSelectConnection({ connectionId: id })
    await nextTick()
    const clearedQuery = { ...route.query }
    delete clearedQuery.new
    delete clearedQuery.focus
    focusConnectionId.value = id
    router.replace({ path: `/explorer/${id}`, query: clearedQuery })
  },
  { immediate: true }
)

function closePinned(index: number) {
  const wasActive = tabsStore.activePinnedIndex === index
  tabsStore.closeTab(index)

  // Handle activation after close
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
  // Switching to a pinned object should exit details/overview/diagram modes
  detailsConnectionId.value = null
  overviewConnectionId.value = null
  overviewDatabaseName.value = null
  showDiagram.value = false
  selectedDefaultTab.value = (tabsStore.pinnedTabs[index].viewTab || 'data') as 'structure' | 'data'
  activePane.value = 'left'
  tabsStore.activateTab(index)
  activateTabFromState(tabsStore.pinnedTabs[index])
}

// (Removed dropdown change handler with the control)

// Get connection details for the current connection
const currentConnection = computed(() =>
  connectionsStore.connections.find((conn) => conn.id === currentConnectionId.value)
)

// Get connection details for the current connection (no fallbacks)
const currentConnectionDetails = computed(() => {
  const conn = currentConnection.value
  if (!conn) return null
  const dbType = connectionsStore.dbTypes.find(
    (f) => f.type.toLowerCase() === String(conn.type || '').toLowerCase()
  )
  return {
    ...conn,
    logo: dbType?.logo || ''
  }
})

// Active header connection (always follows left pane - primary content)
const activeConnectionId = computed<string | null>(() => {
  if (detailsConnectionId.value) return detailsConnectionId.value
  if (overviewConnectionId.value) return overviewConnectionId.value
  if (showDiagram.value && diagramConnectionId.value) return diagramConnectionId.value

  // Use store's reactive connection ID - clean and simple!
  if (tabsStore.activeConnectionId) {
    return tabsStore.activeConnectionId
  }

  // Fallback to route parameter
  return (currentConnectionId.value as string) || null
})
const activeConnection = computed(() =>
  connectionsStore.connections.find((c) => c.id === activeConnectionId.value)
)

// Note: Simplified activeConnectionId logic - database components get clean connection IDs

const activeDisplayHostPort = computed(() => {
  const c = activeConnection.value
  if (!c) return null

  // For file connections, show connection name instead of host:port
  if (c.type === 'localfiles' || c.type === 'files') {
    return c.name
  }

  // For database connections, show host:port
  const host = c?.host
  const port = c?.port && String(c?.port)
  if (!host || !port) return c.name // fallback to name if no host/port
  return `${host}:${port}`
})
const activeDisplayType = computed(() => activeConnection.value?.type || '')
const activeDisplayCloudProvider = computed(() => activeConnection.value?.cloud_provider || '')

// Preview chip reflects the real current view (details/overview/diagram or object preview)
const currentPreview = computed<
  { kind: 'panel'; label: string } | { kind: 'object'; label: string } | null
>(() => {
  if (detailsConnectionId.value) {
    const name = connectionsStore.connections.find((c) => c.id === detailsConnectionId.value)?.name
    return { kind: 'panel', label: name || 'Connection' }
  }
  if (overviewConnectionId.value && overviewDatabaseName.value)
    return { kind: 'panel', label: `${overviewDatabaseName.value} Overview` }
  if (showDiagram.value) return { kind: 'panel', label: 'Diagram' }
  if (tabsStore.previewTab)
    return { kind: 'object', label: `${tabsStore.previewTab.name} (Preview)` }
  return null
})

function activatePreview() {
  // If we have an object preview, switch to it; for panels, we're already on them
  if (tabsStore.previewTab) {
    detailsConnectionId.value = null
    overviewConnectionId.value = null
    overviewDatabaseName.value = null
    showDiagram.value = false
    selectedDefaultTab.value = (tabsStore.previewTab.viewTab || 'data') as 'structure' | 'data'
    activePane.value = 'left'
    tabsStore.activePinnedIndex = null
    activateTabFromState(tabsStore.previewTab)
  }
}

// Connection actions (reuse existing Connections pages)

function onAddConnection() {
  router.push('/explorer/add')
}

async function refreshConnectionsToolbar() {
  try {
    await connectionsStore.refreshConnections()
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to refresh connections'
    commonStore.showNotification(message, 'error')
  }
}

function onEditConnection() {
  if (!activeConnectionId.value) return
  router.push(`/explorer/edit/${activeConnectionId.value}`)
}

async function onDeleteConnection() {
  const id = activeConnectionId.value
  if (!id) return
  const conn = connectionsStore.connections.find((c) => c.id === id)
  const name = conn?.name || conn?.host || 'connection'
  if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return
  try {
    await connectionsStore.deleteConnection(id)
    // Remove from local recent lists
    const idx = recentConnections.value.findIndex((c) => c.id === id)
    if (idx !== -1) {
      recentConnections.value.splice(idx, 1)
      localStorage.setItem('recentConnections', JSON.stringify(recentConnections.value))
    }
    if (lastViewedConnectionId.value === id) {
      localStorage.removeItem('lastViewedConnectionId')
      lastViewedConnectionId.value = ''
    }
    // Navigate away to Connections list after deletion
    router.push('/explorer')
  } catch (e) {
    console.error('Failed to delete connection from Explorer:', e)
  }
}

async function onCloneConnection() {
  const id = activeConnectionId.value
  if (!id) return
  try {
    // Ensure currentConnection is set for API that uses it
    connectionsStore.setCurrentConnection(id)
    await connectionsStore.cloneConnection(id)
    // After clone, store.currentConnection contains new id
    const newId = connectionsStore.currentConnection?.id
    await connectionsStore.refreshConnections()
    if (newId) router.push(`/explorer/edit/${newId}`)
  } catch (e) {
    console.error('Failed to clone connection from Explorer:', e)
  }
}
// Objects list for breadcrumb picker (tables + views)
const breadcrumbObjects = computed<
  Array<{ name: string; type: 'table' | 'view'; schema?: string }>
>(() => [
  ...schemaStore.tables.map((t) => ({ name: t.name, type: 'table' as const, schema: t.schema })),
  ...schemaStore.views.map((v) => ({ name: v.name, type: 'view' as const, schema: v.schema }))
])

// Active context for the global breadcrumb (always follows left pane)
const activeDatabaseName = computed(() => selectedDatabaseName.value)
const activeSchemaName = computed(() => selectedSchemaName.value)
const activeObjectType = computed(() => selectedObjectType.value)
const activeObjectName = computed(() => selectedObjectName.value)

// Open object chosen from breadcrumb picker (preview, Data tab)
async function handlePickFromBreadcrumb(o: {
  name: string
  type: 'table' | 'view'
  schema?: string
}) {
  // Breadcrumb always operates on left pane (main content)
  const targetConnId = currentConnectionId.value
  const targetDb = selectedDatabaseName.value
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
      openInRightSplit: false // Always open in main area (left pane)
    })
  } catch {
    // ignore open errors
  }
}

// Add current connection to recent list if it exists
function addToRecentConnections() {
  if (!currentConnection.value) return

  const connection = {
    id: currentConnection.value.id,
    name: currentConnection.value.name,
    type: currentConnection.value.type,
    host: currentConnection.value.host,
    port: currentConnection.value.port?.toString(),
    database: currentConnection.value.database,
    cloud_provider: currentConnection.value.cloud_provider || ''
  }

  // Only add if it doesn't exist
  const existingIndex = recentConnections.value.findIndex((c) => c.id === connection.id)
  if (existingIndex === -1) {
    // Add to end of array instead of front
    recentConnections.value.push(connection)

    // Keep only MAX_RECENT_CONNECTIONS from the end
    if (recentConnections.value.length > MAX_RECENT_CONNECTIONS) {
      recentConnections.value = recentConnections.value.slice(-MAX_RECENT_CONNECTIONS)
    }

    // Save to localStorage
    localStorage.setItem('recentConnections', JSON.stringify(recentConnections.value))
  }
}

// Note: per UX simplification, individual close/remove for a single recent connection
// was part of the tabs UI and is removed with tabs. "Clear All" remains available.

// (Removed switchConnection with the control)

// removed old handleSidebarSelect (tree now opens via @open with preview/pin semantics)

async function refreshSelectedMetadata(force = true) {
  if (
    !currentConnectionId.value ||
    !selectedDatabaseName.value ||
    !selectedObjectType.value ||
    !selectedObjectName.value
  )
    return
  const meta = await connections.getMetadata(
    currentConnectionId.value,
    selectedDatabaseName.value,
    force
  )
  let obj: SQLTableMeta | SQLViewMeta | undefined
  if (selectedObjectType.value === 'table') {
    obj = Object.values(meta.tables).find((t) => t.name === selectedObjectName.value!)
  } else {
    obj = Object.values(meta.views).find((v) => v.name === selectedObjectName.value!)
  }
  if (obj) selectedMeta.value = obj
}

async function refreshSelectedFileMetadata() {
  if (!selectedFileEntry.value) return

  try {
    const fileFormat = getFileFormat(selectedFileEntry.value.name)
    if (!fileFormat) {
      console.warn('Unable to determine file format for:', selectedFileEntry.value.name)
      return
    }

    const metadata = await getFileMetadata(selectedFileEntry.value.path, fileFormat)
    selectedFileMetadata.value = metadata
  } catch (error) {
    console.error('Failed to load file metadata:', error)
    selectedFileMetadata.value = null
  }
}

function handleBreadcrumbNavigate(payload: { level: 'database' | 'schema' | 'type' | 'name' }) {
  // Act on the active pane. For the right split, update local split state only.
  if (activePane.value === 'right' && (splitMeta.value || splitDatabaseName.value)) {
    if (payload.level === 'database') {
      splitSchemaName.value = null
      splitObjectType.value = null
      splitObjectName.value = null
      splitMeta.value = null
    } else if (payload.level === 'schema') {
      splitObjectType.value = null
      splitObjectName.value = null
      splitMeta.value = null
    } else if (payload.level === 'type') {
      splitObjectName.value = null
      splitMeta.value = null
    }
    return
  }

  // Left pane (primary) updates route
  if (payload.level === 'database') {
    // Switch to database overview panel for the current database
    detailsConnectionId.value = null
    showDiagram.value = false
    overviewConnectionId.value = currentConnectionId.value
    overviewDatabaseName.value = selectedDatabaseName.value
    selectedSchemaName.value = null
    selectedObjectType.value = null
    selectedObjectName.value = null
    selectedMeta.value = null
  } else if (payload.level === 'schema') {
    selectedObjectType.value = null
    selectedObjectName.value = null
    selectedMeta.value = null
  } else if (payload.level === 'type') {
    selectedObjectName.value = null
    selectedMeta.value = null
  }

  router.replace({
    path: `/explorer/${currentConnectionId.value}`,
    query: {
      db: selectedDatabaseName.value || undefined,
      schema: selectedSchemaName.value || undefined,
      type: selectedObjectType.value || undefined,
      name: selectedObjectName.value || undefined
    }
  })
}

// (Removed Clear All recent connections control)

// (Removed helpers used only by the old tabs UI)

// If we have a current connection ID but it's not in recent connections, add it
function initializeCurrentConnection() {
  if (
    currentConnection.value &&
    !recentConnections.value.find((c) => c.id === currentConnectionId.value)
  ) {
    addToRecentConnections()
  }
}

// Watch for route changes to handle navigation to /explorer without an ID
watch(
  () => route.path,
  (newPath) => {
    if (newPath === '/explorer' && recentConnections.value.length > 0) {
      // Use the last viewed connection if available and still in recent connections
      const existsInRecent =
        !!lastViewedConnectionId.value &&
        recentConnections.value.some((c) => c.id === lastViewedConnectionId.value)
      const connectionToUse = existsInRecent
        ? lastViewedConnectionId.value
        : recentConnections.value[recentConnections.value.length - 1].id

      router.replace(`/explorer/${connectionToUse}`)
    }
  },
  { immediate: true }
)

onMounted(() => {
  commonStore.setCurrentPage('Data Explorer')
  // Initialize sidebar persisted state
  try {
    const storedVisible = localStorage.getItem('explorer.sidebarVisible')
    if (storedVisible !== null) sidebarVisible.value = storedVisible === 'true'
    const storedPct = Number(localStorage.getItem('explorer.sidebarWidthPct') || '')
    if (!isNaN(storedPct)) sidebarWidthPct.value = clamp(storedPct, 15, 50)
    const storedLast = Number(localStorage.getItem('explorer.lastSidebarWidthPct') || '')
    if (!isNaN(storedLast)) lastSidebarWidthPct.value = clamp(storedLast, 15, 50)
  } catch {
    /* ignore persistence errors */
  }
  initializeCurrentConnection()
  // Seed selection from query if present
  const { db, schema, type, name, file } = route.query as Record<string, string | undefined>
  if (file && isFilesConnectionType(currentConnectionId.value)) {
    // Clear database state when loading file from URL
    selectedDatabaseName.value = null
    selectedSchemaName.value = null
    selectedObjectType.value = null
    selectedObjectName.value = null
    selectedMeta.value = null
  } else if (db) {
    // Clear file state when loading database object from URL
    selectedFileEntry.value = null
    selectedFileMetadata.value = null
    selectedFilePathsByConnection.value = {}

    selectedDatabaseName.value = db
    selectedSchemaName.value = schema || null
    selectedObjectType.value = (type as ObjectType) || null
    selectedObjectName.value = name || null
    // Load meta if object specified
    if (type && name) {
      connections
        .getMetadata(currentConnectionId.value, db)
        .then((m) => {
          const obj =
            type === 'table'
              ? Object.values(m.tables).find((t) => t.name === name)
              : Object.values(m.views).find((v) => v.name === name)
          if (obj) selectedMeta.value = obj
        })
        .catch(() => void 0)
    }
    // Prepare diagram store
    schemaStore.setConnectionId(currentConnectionId.value)
    schemaStore.setDatabaseName(db)
    schemaStore.fetchSchema(false)
  }
  if (isFilesConnectionType(currentConnectionId.value)) {
    void loadFileEntries(currentConnectionId.value as string).then(() => {
      // If a file parameter is present, select that file
      if (file) {
        selectedFilePathsByConnection.value = {
          [currentConnectionId.value]: file
        }
        // Clear connection details to show file content
        detailsConnectionId.value = null
        focusConnectionId.value = null
      }
    })
  }
})

function getConnectionTypeById(id: string | null): string {
  if (!id) return 'sql'
  const conn = connectionsStore.connections.find((c) => c.id === id)
  return conn?.type || 'sql'
}

function isFilesConnectionType(connId: string | null | undefined): boolean {
  if (!connId) return false
  const conn = connectionsStore.connections.find((c) => c.id === connId)
  return (conn?.type || '').toLowerCase().includes('file')
}

async function loadFileEntries(connectionId: string, force = false) {
  if (!connectionId) return
  if (!force && fileEntriesByConnection.value[connectionId]) return
  if (!isFilesConnectionType(connectionId)) return

  const connection = connectionsStore.connections.find((c) => c.id === connectionId)
  if (!connection) return

  if (!connection.path) {
    fileEntriesByConnection.value = {
      ...fileEntriesByConnection.value,
      [connectionId]: []
    }
    fileDirectoryPathsByConnection.value = {
      ...fileDirectoryPathsByConnection.value,
      [connectionId]: ''
    }
    fileEntryErrorsByConnection.value = {
      ...fileEntryErrorsByConnection.value,
      [connectionId]: 'Connection has no folder path configured.'
    }
    selectedFilePathsByConnection.value = {
      ...selectedFilePathsByConnection.value,
      [connectionId]: null
    }
    return
  }

  try {
    const response = await listDirectory(connection.path)
    const files = response.entries.filter((entry) => entry.type === 'file')

    fileEntriesByConnection.value = {
      ...fileEntriesByConnection.value,
      [connectionId]: files
    }
    fileDirectoryPathsByConnection.value = {
      ...fileDirectoryPathsByConnection.value,
      [connectionId]: response.path
    }
    fileEntryErrorsByConnection.value = {
      ...fileEntryErrorsByConnection.value,
      [connectionId]: ''
    }

    // Don't auto-select any files - let user explicitly select
  } catch (error: unknown) {
    fileEntriesByConnection.value = {
      ...fileEntriesByConnection.value,
      [connectionId]: []
    }
    fileDirectoryPathsByConnection.value = {
      ...fileDirectoryPathsByConnection.value,
      [connectionId]: connection.path || ''
    }
    fileEntryErrorsByConnection.value = {
      ...fileEntryErrorsByConnection.value,
      [connectionId]: (error as Error).message || 'Failed to load files'
    }
    selectedFilePathsByConnection.value = {
      ...selectedFilePathsByConnection.value,
      [connectionId]: null
    }
  }
}

function handleRequestFileEntries(payload: { connectionId: string }) {
  void loadFileEntries(payload.connectionId, true)
}

function handleOpenFile(payload: {
  connectionId: string
  path: string
  entry: FileSystemEntry
  mode: 'preview' | 'pinned'
  defaultTab?: 'structure' | 'data'
  openInRightSplit?: boolean
}) {
  // Opening a file should leave diagram mode
  showDiagram.value = false
  // Hide overview panel when a file is opened
  overviewConnectionId.value = null
  overviewDatabaseName.value = null
  // Hide connection details panel when a file is opened
  detailsConnectionId.value = null

  // Clear database selection state when opening file
  selectedDatabaseName.value = null
  selectedSchemaName.value = null
  selectedObjectType.value = null
  selectedObjectName.value = null
  selectedMeta.value = null

  // If request is to open in right split, update split-only state and return
  if (payload.openInRightSplit) {
    splitConnectionId.value = payload.connectionId
    splitDatabaseName.value = null
    splitSchemaName.value = null
    splitObjectType.value = null
    splitObjectName.value = null
    splitMeta.value = null
    // Set file split state
    splitFileEntry.value = payload.entry
    splitFileMetadata.value = null // Will be loaded by the component
    splitDefaultTab.value = linkTabs.value
      ? selectedDefaultTab.value || 'data'
      : payload.defaultTab || null
    activePane.value = 'right'
    return
  }

  // Opening in main area focuses left pane
  activePane.value = 'left'
  if (linkTabs.value && splitMeta.value && splitDefaultTab.value) {
    // If tabs are linked and right split is present, mirror its current tab into the left
    selectedDefaultTab.value = splitDefaultTab.value
  }

  const desiredPinned = payload.mode === 'pinned' || settingAlwaysOpenNewTab()

  if (desiredPinned) {
    // Use store method for file tabs
    tabsStore.addFileTab({
      connectionId: payload.connectionId,
      filePath: payload.path,
      name: payload.entry.name,
      fileType: payload.entry.type
    })

    // The tab is now added, get the active tab and activate it
    const activeTab =
      tabsStore.activePinnedIndex !== null
        ? tabsStore.pinnedTabs[tabsStore.activePinnedIndex]
        : null
    if (activeTab) {
      activateTabFromState(activeTab)
    }
  } else {
    // Create preview tab
    const fileTab: EditorTab = {
      id: `preview:file:${payload.path}`,
      connectionId: payload.connectionId,
      name: payload.entry.name,
      filePath: payload.path,
      fileEntry: payload.entry,
      tabType: 'file',
      pinned: false,
      defaultTab: payload.defaultTab,
      viewTab: (payload.defaultTab ||
        (linkTabs.value ? selectedDefaultTab.value || 'data' : 'data')) as 'structure' | 'data'
    }

    tabsStore.setPreviewTab(fileTab)
    tabsStore.activePinnedIndex = null
    activateTabFromState(fileTab)
  }
}

function handleFileSelect(payload: { connectionId: string; path: string }) {
  // Find the file entry
  const entries = currentFileEntries.value
  const entry = entries.find((e) => e.path === payload.path)
  if (!entry) {
    // Fallback to old behavior if entry not found
    selectedFilePathsByConnection.value = {
      [payload.connectionId]: payload.path
    }
    focusConnectionId.value = null
    if (detailsConnectionId.value === payload.connectionId) {
      detailsConnectionId.value = null
    }
    router.replace({
      path: `/explorer/${payload.connectionId}`,
      query: { file: payload.path }
    })
    return
  }

  // Use the new tab system
  handleOpenFile({
    connectionId: payload.connectionId,
    path: payload.path,
    entry: entry,
    mode: 'preview',
    defaultTab: 'data'
  })
}

const currentFileEntries = computed<FileSystemEntry[]>(() => {
  const id = currentConnectionId.value
  if (!id) return []
  return fileEntriesByConnection.value[id] || []
})

// Tab link helpers
function onLeftTabChange(t: 'data' | 'structure') {
  // Persist selected view for the active left object tab
  selectedDefaultTab.value = t
  if (tabsStore.activePinnedIndex !== null && tabsStore.pinnedTabs[tabsStore.activePinnedIndex]) {
    tabsStore.updateActiveTabView(t)
  } else if (tabsStore.previewTab) {
    tabsStore.previewTab.viewTab = t
  }
  if (linkTabs.value && splitMeta.value) {
    splitDefaultTab.value = t
  }
}

function onRightTabChange(t: 'data' | 'structure') {
  if (!linkTabs.value) return
  // When linked, mirror selection to the left and persist
  selectedDefaultTab.value = t
  if (tabsStore.activePinnedIndex !== null && tabsStore.pinnedTabs[tabsStore.activePinnedIndex]) {
    tabsStore.updateActiveTabView(t)
  } else if (tabsStore.previewTab) {
    tabsStore.previewTab.viewTab = t
  }
}

// Convenience: trigger diagram mode for the currently selected database
// Show diagram for the active pane database
function showDiagramForActiveDatabase() {
  const isRight = activePane.value === 'right'
  const connId = isRight
    ? splitConnectionId.value || currentConnectionId.value
    : currentConnectionId.value
  const db = isRight ? splitDatabaseName.value : selectedDatabaseName.value
  if (!connId || !db) return
  handleShowDiagram({ connectionId: connId, database: db })
}

// Watch for route changes to update recent connections and last viewed connection
watch(currentConnectionId, async (newId) => {
  if (newId && currentConnection.value) {
    addToRecentConnections()
    // Update last viewed connection
    lastViewedConnectionId.value = newId
    localStorage.setItem('lastViewedConnectionId', newId)
    if (isFilesConnectionType(newId)) {
      await loadFileEntries(newId)
      // Check if there's a file parameter in the URL
      const fileParam = route.query.file as string
      if (fileParam && currentFileEntries.value.length > 0) {
        handleFileSelect({ connectionId: newId, path: fileParam })
      }
    }
  }
})

// Also watch for route query changes to handle direct navigation to files
watch(
  () => route.query.file,
  (filePath) => {
    if (
      filePath &&
      isFilesConnectionType(currentConnectionId.value) &&
      currentFileEntries.value.length > 0
    ) {
      handleFileSelect({ connectionId: currentConnectionId.value, path: filePath as string })
    }
  }
)
</script>

<template>
  <div class="min-h-full overflow-x-hidden">
    <header class="bg-white shadow">
      <div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-baseline gap-2">
            <h1 class="text-3xl font-bold leading-tight tracking-tight text-gray-900">
              Data Explorer
            </h1>
            <span class="text-lg font-normal text-gray-500">{{ connectionsCountLabel }}</span>
          </div>
          <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Listbox v-if="selectedDbType" v-model="selectedDbType" as="div" class="relative">
              <ListboxButton
                class="inline-flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-slate-400 whitespace-nowrap"
              >
                <img :src="selectedDbType.logo" :alt="selectedDbType.type" class="h-4 w-4" />
                <span class="truncate max-w-[120px]">{{ selectedDbType.type }}</span>
                <ChevronDownIcon class="h-4 w-4 text-gray-400" />
              </ListboxButton>
              <transition
                leave-active-class="transition ease-in duration-100"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
              >
                <ListboxOptions
                  class="absolute right-0 z-30 mt-1 max-h-60 w-48 overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                >
                  <ListboxOption
                    v-for="option in dbTypeOptions"
                    :key="option.id"
                    v-slot="{ active, selected }"
                    :value="option"
                  >
                    <li
                      :class="[
                        'flex items-center gap-2 px-3 py-1.5 cursor-pointer',
                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                      ]"
                    >
                      <img :src="option.logo" :alt="option.type" class="h-4 w-4" />
                      <span class="truncate">{{ option.type }}</span>
                      <CheckIcon v-if="selected" class="ml-auto h-4 w-4 text-gray-500" />
                    </li>
                  </ListboxOption>
                </ListboxOptions>
              </transition>
            </Listbox>
            <div class="flex-1 min-w-[180px] sm:min-w-[220px]">
              <SearchInput v-model="connectionSearch" placeholder="Filter..." size="sm" />
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="connectionsStore.isLoadingConnections"
              @click="refreshConnectionsToolbar"
            >
              <ArrowPathIcon
                :class="['h-4 w-4', connectionsStore.isLoadingConnections ? 'animate-spin' : '']"
              />
              Refresh
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-white bg-gray-600 border border-gray-600 rounded hover:bg-gray-500"
              @click="onAddConnection"
            >
              New
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="mx-auto py-4 overflow-x-hidden">
      <!-- No recent connections -->
      <div v-if="recentConnections.length === 0" class="text-center py-12">
        <p class="text-gray-500">No recently explored connections.</p>
        <RouterLink
          to="/explorer/add"
          class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Create a Connection
        </RouterLink>
      </div>

      <!-- Explorer content with simple connection selector -->
      <div v-else class="px-4 sm:px-6 lg:px-8">
        <div
          ref="sidebarContainerRef"
          class="mt-6 flex flex-row items-stretch min-w-0 overflow-x-hidden"
        >
          <!-- Sidebar -->
          <div
            v-if="sidebarVisible"
            ref="sidebarRef"
            :style="{ flexBasis: `calc(${sidebarWidthPct}% - 8px)`, flexGrow: 0, flexShrink: 0 }"
            class="min-w-[220px] pr-2"
          >
            <ExplorerSidebarConnections
              :initial-expanded-connection-id="currentConnectionId || undefined"
              :search-query="connectionSearch"
              :type-filter="selectedDbTypeLabel"
              :focus-connection-id="focusConnectionId || undefined"
              :file-entries="fileEntriesByConnection"
              :selected-file-paths="selectedFilePathsByConnection"
              :selected="{
                database: selectedDatabaseName || undefined,
                schema: selectedSchemaName || undefined,
                type: selectedObjectType || undefined,
                name: selectedObjectName || undefined
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

          <!-- Divider between sidebar and right panel (wider hit area, always on top) -->
          <div
            v-if="sidebarVisible"
            role="separator"
            aria-orientation="vertical"
            class="relative z-20 mx-1.5 w-3 shrink-0 cursor-col-resize select-none pointer-events-auto"
            @mousedown.prevent="onSidebarDividerMouseDown"
            @dblclick="onSidebarDividerDoubleClick"
          >
            <div
              class="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] rounded bg-gray-200 hover:bg-gray-300"
            />
          </div>

          <!-- Right panel -->
          <div
            :style="{ flexBasis: '0px' }"
            :class="['grow', 'min-w-0', 'overflow-x-hidden', sidebarVisible ? 'pl-2' : 'pl-0']"
          >
            <div class="mb-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-sm text-gray-500">
                  <span v-if="activeDisplayHostPort" class="font-medium text-gray-700">
                    {{ activeDisplayHostPort }}
                  </span>
                  <span v-if="activeDisplayHostPort" class="text-gray-400">•</span>
                  <!-- Database breadcrumb -->
                  <ExplorerBreadcrumb
                    v-if="
                      !selectedFileEntry &&
                      (activeDatabaseName ||
                        activeSchemaName ||
                        activeObjectType ||
                        activeObjectName)
                    "
                    :database="activeDatabaseName"
                    :schema="activeSchemaName"
                    :type="activeObjectType"
                    :name="activeObjectName"
                    :objects="breadcrumbObjects"
                    @navigate="handleBreadcrumbNavigate"
                    @pick-name="(o) => handlePickFromBreadcrumb(o)"
                  />
                  <!-- File breadcrumb -->
                  <div v-else-if="selectedFileEntry" class="flex items-center gap-1 text-sm">
                    <span class="text-gray-600">File:</span>
                    <span class="font-medium text-gray-900">{{ selectedFileEntry.name }}</span>
                    <span class="text-gray-400">•</span>
                    <span class="text-gray-500 text-xs">{{ selectedFileEntry.path }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <label class="flex items-center gap-1 text-xs text-gray-600 select-none">
                    <input v-model="linkTabs" type="checkbox" />
                    Link tabs
                  </label>
                  <button
                    v-if="activeDatabaseName && !showDiagram"
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
                    :title="sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar'"
                    @click="toggleSidebar"
                  >
                    {{ sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar' }}
                  </button>
                  <button
                    v-if="splitMeta || splitFileEntry"
                    type="button"
                    class="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                    title="Center split"
                    @click="resetRightSplit"
                  >
                    Center split
                  </button>
                  <CloudProviderBadge
                    v-if="activeDisplayType"
                    :cloud-provider="activeDisplayCloudProvider"
                    :db-type="activeDisplayType"
                  />
                </div>
              </div>
            </div>
            <!-- Object tabs (pinned + preview) -->
            <div class="mb-2">
              <div class="flex items-center gap-1">
                <button
                  v-if="currentPreview"
                  class="px-2 py-1 text-xs rounded border border-dashed border-gray-300 bg-white text-gray-600 italic"
                  @click="activatePreview"
                >
                  {{ currentPreview.label }}
                </button>
                <template v-for="(t, i) in tabsStore.pinnedTabs" :key="tabsStore.generateTabKey(t)">
                  <button
                    class="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 flex items-center gap-1"
                    :class="{ 'ring-1 ring-slate-400': tabsStore.activePinnedIndex === i }"
                    @click="activatePinned(i)"
                  >
                    <span class="font-medium">{{ t.name }}</span>
                    <span v-if="t.tabType === 'database'" class="text-gray-400">{{
                      t.type === 'table' ? 'T' : 'V'
                    }}</span>
                    <span v-else class="text-gray-400">F</span>
                    <span class="text-gray-300">|</span>
                    <span v-if="t.tabType === 'database'" class="text-gray-500">{{
                      t.database
                    }}</span>
                    <span v-else class="text-gray-500">{{ t.connectionId }}</span>
                    <span
                      role="button"
                      aria-label="Close tab"
                      class="ml-1 text-gray-400 hover:text-gray-700 cursor-pointer"
                      @click.stop="closePinned(i)"
                    >
                      <span aria-hidden="true">×</span>
                    </span>
                  </button>
                </template>
              </div>
            </div>

            <!-- Content area priority: connection details > database overview > diagram mode > object structure/data -->
            <div
              v-if="detailsConnection"
              class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg"
            >
              <ConnectionDetailsPanel
                :connection="detailsConnection"
                :file-entries="fileEntriesByConnection[detailsConnection.id] || []"
                @edit="onEditConnection"
                @clone="onCloneConnection"
                @delete="onDeleteConnection"
              />
            </div>
            <div
              v-else-if="overviewConnectionId && overviewDatabaseName"
              class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg"
            >
              <DatabaseOverviewPanel
                :connection-id="overviewConnectionId"
                :database="overviewDatabaseName"
                @show-diagram="handleShowDiagram"
              />
            </div>
            <div
              v-else-if="showDiagram"
              class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg"
            >
              <DiagramView
                :tables="schemaStore.tables"
                :views="schemaStore.views"
                :relationships="schemaStore.relationships"
              />
            </div>
            <div v-else>
              <div class="min-h-[480px] min-w-0 overflow-x-hidden">
                <div
                  v-if="splitMeta || splitFileEntry"
                  ref="splitContainerRef"
                  class="flex flex-row items-stretch min-w-0"
                >
                  <!-- Left (primary) -->
                  <div
                    ref="leftPaneRef"
                    :style="{ flexGrow: splitGrow, flexBasis: '0px' }"
                    :class="[
                      'min-w-[240px] pr-2 overflow-hidden',
                      activePane === 'left'
                        ? 'ring-2 ring-blue-400 rounded-md'
                        : 'ring-1 ring-transparent'
                    ]"
                    @mousedown="activePane = 'left'"
                  >
                    <div class="min-w-0">
                      <div v-if="selectedMeta">
                        <DatabaseObjectContainer
                          :key="`left-db-${tabsStore.activePinnedIndex}-${selectedObjectType}-${selectedObjectName}-${selectedDefaultTab}-${activeConnectionId}`"
                          :table-meta="selectedMeta"
                          :is-view="selectedObjectType === 'view'"
                          :connection-id="activeConnectionId || ''"
                          :connection-type="currentConnectionDetails?.type || 'sql'"
                          :database="selectedDatabaseName || ''"
                          :default-tab="selectedDefaultTab || 'data'"
                          @refresh-metadata="refreshSelectedMetadata(true)"
                          @tab-change="onLeftTabChange"
                        />
                      </div>
                      <div v-else-if="selectedFileEntry">
                        <DatabaseObjectContainer
                          :key="`left-file-${tabsStore.activePinnedIndex}-${selectedFileEntry.path}-${selectedDefaultTab}-${activeConnectionId}`"
                          :file-entry="selectedFileEntry"
                          :file-metadata="selectedFileMetadata"
                          :connection-id="activeConnectionId || ''"
                          :object-type="'file'"
                          :default-tab="selectedDefaultTab || 'data'"
                          @refresh-metadata="refreshSelectedFileMetadata"
                          @tab-change="onLeftTabChange"
                        />
                      </div>
                      <div
                        v-else
                        class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-8 text-center"
                      >
                        <h3 class="text-sm font-medium text-gray-900">No object selected</h3>
                        <p class="mt-1 text-sm text-gray-500">
                          Select a table, view, or file from the sidebar to view its content
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- Divider between primary and right split (wider hit area, always on top) -->
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    class="relative z-20 mx-1.5 w-3 shrink-0 cursor-col-resize select-none pointer-events-auto"
                    @mousedown.prevent="onDividerMouseDown"
                    @dblclick="onDividerDoubleClick"
                  >
                    <div
                      class="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] rounded bg-gray-200 hover:bg-gray-300"
                    />
                  </div>

                  <!-- Right split -->
                  <div
                    :style="{ flexGrow: 100 - splitGrow, flexBasis: '0px' }"
                    :class="[
                      'min-w-[240px] pl-2 overflow-hidden',
                      activePane === 'right'
                        ? 'ring-2 ring-blue-400 rounded-md'
                        : 'ring-1 ring-transparent'
                    ]"
                    @mousedown="activePane = 'right'"
                    @dblclick="promoteRightSplitToMain"
                    @contextmenu.prevent="showRightSplitContextMenu"
                  >
                    <div class="min-w-0">
                      <DatabaseObjectContainer
                        v-if="splitMeta"
                        :key="`split-db-${splitConnectionId}-${splitObjectType}-${splitObjectName}-${splitDefaultTab}`"
                        :table-meta="splitMeta"
                        :is-view="splitObjectType === 'view'"
                        :connection-id="splitConnectionId || currentConnectionId || ''"
                        :connection-type="getConnectionTypeById(splitConnectionId)"
                        :database="splitDatabaseName || ''"
                        :default-tab="splitDefaultTab || 'data'"
                        :closable="true"
                        @close="closeRightSplit"
                        @tab-change="onRightTabChange"
                      />
                      <DatabaseObjectContainer
                        v-else-if="splitFileEntry"
                        :key="`split-file-${splitConnectionId}-${splitFileEntry.path}-${splitDefaultTab}`"
                        :file-entry="splitFileEntry"
                        :file-metadata="splitFileMetadata"
                        :connection-id="splitConnectionId || currentConnectionId || ''"
                        :object-type="'file'"
                        :default-tab="splitDefaultTab || 'data'"
                        :closable="true"
                        @close="closeRightSplit"
                        @tab-change="onRightTabChange"
                      />
                    </div>
                  </div>
                </div>

                <div v-else>
                  <div v-if="selectedMeta">
                    <DatabaseObjectContainer
                      :key="`single-${selectedObjectType}-${selectedObjectName}-${selectedDefaultTab}`"
                      :table-meta="selectedMeta"
                      :is-view="selectedObjectType === 'view'"
                      :connection-id="activeConnectionId || ''"
                      :connection-type="currentConnectionDetails?.type || 'sql'"
                      :database="selectedDatabaseName || ''"
                      :default-tab="selectedDefaultTab || 'data'"
                      @refresh-metadata="refreshSelectedMetadata(true)"
                      @tab-change="onLeftTabChange"
                    />
                  </div>
                  <div v-else-if="selectedFileEntry">
                    <DatabaseObjectContainer
                      :key="`single-file-${selectedFileEntry.path}-${selectedDefaultTab}`"
                      :file-entry="selectedFileEntry"
                      :file-metadata="selectedFileMetadata"
                      :connection-id="currentConnectionId || ''"
                      :object-type="'file'"
                      :default-tab="selectedDefaultTab || 'data'"
                      @refresh-metadata="refreshSelectedFileMetadata"
                      @tab-change="onLeftTabChange"
                    />
                  </div>
                  <div
                    v-else
                    class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-8 text-center"
                  >
                    <h3 class="text-sm font-medium text-gray-900">No object selected</h3>
                    <p class="mt-1 text-sm text-gray-500">
                      Select a table, view, or file from the sidebar to view its content
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
