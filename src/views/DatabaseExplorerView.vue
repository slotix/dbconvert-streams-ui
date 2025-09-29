<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import { useSchemaStore } from '@/stores/schema'
// Removed headlessui Tab components after moving Diagram to a context-menu action
// (Removed TrashIcon as Clear All control was removed)
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import ExplorerSidebarConnections from '@/components/database/ExplorerSidebarConnections.vue'
import ExplorerBreadcrumb from '@/components/database/ExplorerBreadcrumb.vue'
import DatabaseObjectContainer from '@/components/database/DatabaseObjectContainer.vue'
import DiagramView from '@/components/database/DiagramView.vue'
import ConnectionDetailsPanel from '@/components/database/ConnectionDetailsPanel.vue'
import DatabaseOverviewPanel from '@/components/database/DatabaseOverviewPanel.vue'
import connections from '@/api/connections'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'

const MAX_RECENT_CONNECTIONS = 5
const route = useRoute()
const router = useRouter()
const commonStore = useCommonStore()
const connectionsStore = useConnectionsStore()

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

// Editor tabs: preview and pinned (VS Code model)
type EditorTab = {
  connectionId: string
  database: string
  schema?: string
  type: ObjectType
  name: string
  meta: SQLTableMeta | SQLViewMeta
  pinned: boolean
  defaultTab?: 'structure' | 'data'
  viewTab?: 'structure' | 'data'
}

const pinnedTabs = ref<EditorTab[]>([])
const previewTab = ref<EditorTab | null>(null)
const activePinnedIndex = ref<number | null>(null)
const selectedDefaultTab = ref<'structure' | 'data' | null>(null)

// Right split selection (lightweight preview only)
const splitConnectionId = ref<string | null>(null)
const splitDatabaseName = ref<string | null>(null)
const splitSchemaName = ref<string | null>(null)
const splitObjectType = ref<ObjectType | null>(null)
const splitObjectName = ref<string | null>(null)
const splitMeta = ref<SQLTableMeta | SQLViewMeta | null>(null)
const splitDefaultTab = ref<'structure' | 'data' | null>(null)

// Diagram mode (database-level)
const showDiagram = ref(false)
const diagramConnectionId = ref<string | null>(null)
const diagramDatabaseName = ref<string | null>(null)

// Track which pane is active for breadcrumb/header context
const activePane = ref<'left' | 'right'>('left')

// Optional: link tabs across splits (Data/Structure)
const linkTabs = ref<boolean>(localStorage.getItem('explorer.linkTabs') === 'true')
watch(linkTabs, (val) => {
  try {
    localStorage.setItem('explorer.linkTabs', val ? 'true' : 'false')
  } catch {
    /* ignore */
  }
})

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
  // When right split closes, focus returns to left
  activePane.value = 'left'
}

function resetRightSplit() {
  // Ensure split becomes visible and centered if content pushed it
  splitGrow.value = 50
}

function settingAlwaysOpenNewTab(): boolean {
  return localStorage.getItem('explorer.alwaysOpenNewTab') === 'true'
}

function toKey(t: {
  connectionId: string
  database: string
  schema?: string
  type: ObjectType
  name: string
}) {
  return `${t.connectionId}:${t.database}:${t.schema || ''}:${t.type}:${t.name}`
}

function activateTabFromState(tab: EditorTab | null) {
  if (!tab) return
  selectedDatabaseName.value = tab.database
  selectedSchemaName.value = tab.schema || null
  selectedObjectType.value = tab.type
  selectedObjectName.value = tab.name
  selectedMeta.value = tab.meta
  selectedDefaultTab.value = (tab.viewTab || tab.defaultTab || 'data') as 'structure' | 'data'
  // keep schema store in sync
  schemaStore.setConnectionId(tab.connectionId)
  schemaStore.setDatabaseName(tab.database)
  schemaStore.fetchSchema(false)
  // update route
  router.replace({
    path: `/explorer/${tab.connectionId}`,
    query: {
      db: tab.database,
      schema: tab.schema || undefined,
      type: tab.type,
      name: tab.name
    }
  })
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
    const key = toKey(payload)
    const existingIndex = pinnedTabs.value.findIndex((t) => toKey(t) === key)
    if (existingIndex === -1) {
      const initialView = (payload.defaultTab ||
        (linkTabs.value ? selectedDefaultTab.value || 'data' : 'data')) as 'structure' | 'data'
      pinnedTabs.value.push({ ...payload, pinned: true, viewTab: initialView })
      activePinnedIndex.value = pinnedTabs.value.length - 1
    } else {
      activePinnedIndex.value = existingIndex
    }
    activateTabFromState(pinnedTabs.value[activePinnedIndex.value!])
  } else {
    const initialView = (payload.defaultTab ||
      (linkTabs.value ? selectedDefaultTab.value || 'data' : 'data')) as 'structure' | 'data'
    previewTab.value = { ...payload, pinned: false, viewTab: initialView }
    activePinnedIndex.value = null
    activateTabFromState(previewTab.value)
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
  // Show details for the clicked connection; keep its tabs state
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

function closePinned(index: number) {
  if (index < 0 || index >= pinnedTabs.value.length) return
  const wasActive = activePinnedIndex.value === index
  pinnedTabs.value.splice(index, 1)
  if (!pinnedTabs.value.length) {
    activePinnedIndex.value = null
    if (previewTab.value) activateTabFromState(previewTab.value)
    return
  }
  if (wasActive) {
    const newIndex = Math.min(index, pinnedTabs.value.length - 1)
    activePinnedIndex.value = newIndex
    activateTabFromState(pinnedTabs.value[newIndex])
  } else if ((activePinnedIndex.value || 0) > index) {
    activePinnedIndex.value = (activePinnedIndex.value || 0) - 1
  }
}

function activatePinned(index: number) {
  if (index < 0 || index >= pinnedTabs.value.length) return
  // Switching to a pinned object should exit details/overview/diagram modes
  detailsConnectionId.value = null
  overviewConnectionId.value = null
  overviewDatabaseName.value = null
  showDiagram.value = false
  selectedDefaultTab.value = (pinnedTabs.value[index].viewTab || 'data') as 'structure' | 'data'
  activePane.value = 'left'
  activePinnedIndex.value = index
  activateTabFromState(pinnedTabs.value[index])
}

const schemaStore = useSchemaStore()

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

// Active header connection (honor active pane and panels)
const activeConnectionId = computed<string | null>(() => {
  if (activePane.value === 'right' && splitMeta.value && splitConnectionId.value) {
    return splitConnectionId.value
  }
  if (detailsConnectionId.value) return detailsConnectionId.value
  if (overviewConnectionId.value) return overviewConnectionId.value
  if (showDiagram.value && diagramConnectionId.value) return diagramConnectionId.value
  return currentConnectionId.value as string
})
const activeConnection = computed(() =>
  connectionsStore.connections.find((c) => c.id === activeConnectionId.value)
)
const activeDisplayHostPort = computed(() => {
  const c = activeConnection.value
  const host = c?.host
  const port = c?.port && String(c?.port)
  if (!host || !port) return null
  return `${host}:${port}`
})
const activeDisplayType = computed(() => activeConnection.value?.type || '')
const activeDisplayCloudProvider = computed(() => activeConnection.value?.cloud_provider || '')

// Preview chip reflects the real current view (details/overview/diagram or object preview)
const currentPreview = computed<
  { kind: 'panel'; label: string } | { kind: 'object'; label: string } | null
>(() => {
  if (detailsConnectionId.value) return { kind: 'panel', label: 'Connection details' }
  if (overviewConnectionId.value && overviewDatabaseName.value)
    return { kind: 'panel', label: `${overviewDatabaseName.value} Overview` }
  if (showDiagram.value) return { kind: 'panel', label: 'Diagram' }
  if (previewTab.value) return { kind: 'object', label: `${previewTab.value.name} (Preview)` }
  return null
})

function activatePreview() {
  // If we have an object preview, switch to it; for panels, we're already on them
  if (previewTab.value) {
    detailsConnectionId.value = null
    overviewConnectionId.value = null
    overviewDatabaseName.value = null
    showDiagram.value = false
    selectedDefaultTab.value = (previewTab.value.viewTab || 'data') as 'structure' | 'data'
    activePane.value = 'left'
    activePinnedIndex.value = null
    activateTabFromState(previewTab.value)
  }
}
// Objects list for breadcrumb picker (tables + views)
const breadcrumbObjects = computed<
  Array<{ name: string; type: 'table' | 'view'; schema?: string }>
>(() => [
  ...schemaStore.tables.map((t) => ({ name: t.name, type: 'table' as const, schema: t.schema })),
  ...schemaStore.views.map((v) => ({ name: v.name, type: 'view' as const, schema: v.schema }))
])

// Active context for the global breadcrumb
const activeDatabaseName = computed(() =>
  activePane.value === 'right' && splitDatabaseName.value
    ? splitDatabaseName.value
    : selectedDatabaseName.value
)
const activeSchemaName = computed(() =>
  activePane.value === 'right' && splitSchemaName.value
    ? splitSchemaName.value
    : selectedSchemaName.value
)
const activeObjectType = computed(() =>
  activePane.value === 'right' && splitObjectType.value
    ? splitObjectType.value
    : selectedObjectType.value
)
const activeObjectName = computed(() =>
  activePane.value === 'right' && splitObjectName.value
    ? splitObjectName.value
    : selectedObjectName.value
)

// Open object chosen from breadcrumb picker (preview, Data tab)
async function handlePickFromBreadcrumb(o: {
  name: string
  type: 'table' | 'view'
  schema?: string
}) {
  // Resolve target pane context
  const isRight = activePane.value === 'right'
  const targetConnId = isRight
    ? splitConnectionId.value || currentConnectionId.value
    : currentConnectionId.value
  const targetDb = isRight ? splitDatabaseName.value : selectedDatabaseName.value
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
      openInRightSplit: isRight
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
  commonStore.setCurrentPage('Database Explorer')
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
  const { db, schema, type, name } = route.query as Record<string, string | undefined>
  if (db) {
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
})

function getConnectionTypeById(id: string | null): string {
  if (!id) return 'sql'
  const conn = connectionsStore.connections.find((c) => c.id === id)
  return conn?.type || 'sql'
}

// Tab link helpers
function onLeftTabChange(t: 'data' | 'structure') {
  // Persist selected view for the active left object tab
  selectedDefaultTab.value = t
  if (activePinnedIndex.value !== null && pinnedTabs.value[activePinnedIndex.value]) {
    pinnedTabs.value[activePinnedIndex.value].viewTab = t
  } else if (previewTab.value) {
    previewTab.value.viewTab = t
  }
  if (linkTabs.value && splitMeta.value) {
    splitDefaultTab.value = t
  }
}

function onRightTabChange(t: 'data' | 'structure') {
  if (!linkTabs.value) return
  // When linked, mirror selection to the left and persist
  selectedDefaultTab.value = t
  if (activePinnedIndex.value !== null && pinnedTabs.value[activePinnedIndex.value]) {
    pinnedTabs.value[activePinnedIndex.value].viewTab = t
  } else if (previewTab.value) {
    previewTab.value.viewTab = t
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
watch(currentConnectionId, (newId) => {
  if (newId && currentConnection.value) {
    addToRecentConnections()
    // Update last viewed connection
    lastViewedConnectionId.value = newId
    localStorage.setItem('lastViewedConnectionId', newId)
  }
})
</script>

<template>
  <div class="min-h-full overflow-x-hidden">
    <header class="bg-white shadow">
      <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
          <h1 class="text-3xl font-bold leading-tight tracking-tight text-gray-900">
            Database Explorer
          </h1>
          <div class="flex items-center gap-4">
            <RouterLink
              to="/connections"
              class="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              ← Back to Connections
            </RouterLink>
          </div>
        </div>
      </div>
    </header>

    <main class="mx-auto py-4 overflow-x-hidden">
      <!-- No recent connections -->
      <div v-if="recentConnections.length === 0" class="text-center py-12">
        <p class="text-gray-500">No recently explored connections.</p>
        <RouterLink
          to="/connections"
          class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Select a Connection
        </RouterLink>
      </div>

      <!-- Explorer content with simple connection selector -->
      <div v-else>
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
                  <ExplorerBreadcrumb
                    :database="activeDatabaseName"
                    :schema="activeSchemaName"
                    :type="activeObjectType"
                    :name="activeObjectName"
                    :objects="breadcrumbObjects"
                    @navigate="handleBreadcrumbNavigate"
                    @pick-name="(o) => handlePickFromBreadcrumb(o)"
                  />
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
                    v-if="splitMeta"
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
                <template v-for="(t, i) in pinnedTabs" :key="toKey(t)">
                  <button
                    class="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 flex items-center gap-1"
                    :class="{ 'ring-1 ring-slate-400': activePinnedIndex === i }"
                    @click="activatePinned(i)"
                  >
                    <span class="font-medium">{{ t.name }}</span>
                    <span class="text-gray-400">{{ t.type === 'table' ? 'T' : 'V' }}</span>
                    <span class="text-gray-300">|</span>
                    <span class="text-gray-500">{{ t.database }}</span>
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
              <ConnectionDetailsPanel :connection="detailsConnection" />
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
                  v-if="splitMeta"
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
                          :key="`left-${selectedObjectType}-${selectedObjectName}-${selectedDefaultTab}`"
                          :table-meta="selectedMeta"
                          :is-view="selectedObjectType === 'view'"
                          :connection-id="currentConnectionId || ''"
                          :connection-type="currentConnectionDetails?.type || 'sql'"
                          :database="selectedDatabaseName || ''"
                          :default-tab="selectedDefaultTab || 'data'"
                          @refresh-metadata="refreshSelectedMetadata(true)"
                          @tab-change="onLeftTabChange"
                        />
                      </div>
                      <div
                        v-else
                        class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-8 text-center"
                      >
                        <h3 class="text-sm font-medium text-gray-900">No object selected</h3>
                        <p class="mt-1 text-sm text-gray-500">
                          Select a table or view from the sidebar to view its structure
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
                  >
                    <div class="min-w-0">
                      <DatabaseObjectContainer
                        v-if="splitMeta"
                        :key="`split-${splitObjectType}-${splitObjectName}-${splitDefaultTab}`"
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
                    </div>
                  </div>
                </div>

                <div v-else>
                  <div v-if="selectedMeta">
                    <DatabaseObjectContainer
                      :key="`single-${selectedObjectType}-${selectedObjectName}-${selectedDefaultTab}`"
                      :table-meta="selectedMeta"
                      :is-view="selectedObjectType === 'view'"
                      :connection-id="currentConnectionId || ''"
                      :connection-type="currentConnectionDetails?.type || 'sql'"
                      :database="selectedDatabaseName || ''"
                      :default-tab="selectedDefaultTab || 'data'"
                      @refresh-metadata="refreshSelectedMetadata(true)"
                      @tab-change="onLeftTabChange"
                    />
                  </div>
                  <div
                    v-else
                    class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-8 text-center"
                  >
                    <h3 class="text-sm font-medium text-gray-900">No object selected</h3>
                    <p class="mt-1 text-sm text-gray-500">
                      Select a table or view from the sidebar to view its structure
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
