<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import { useSchemaStore } from '@/stores/schema'
import { Tab, TabGroup, TabList, TabPanels, TabPanel } from '@headlessui/vue'
// (Removed TrashIcon as Clear All control was removed)
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import ExplorerSidebarConnections from '@/components/database/ExplorerSidebarConnections.vue'
import ExplorerBreadcrumb from '@/components/database/ExplorerBreadcrumb.vue'
import DatabaseObjectContainer from '@/components/database/DatabaseObjectContainer.vue'
import DiagramView from '@/components/database/DiagramView.vue'
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

function closeRightSplit() {
  splitConnectionId.value = null
  splitDatabaseName.value = null
  splitSchemaName.value = null
  splitObjectType.value = null
  splitObjectName.value = null
  splitMeta.value = null
  splitDefaultTab.value = null
}

function settingAlwaysOpenNewTab(): boolean {
  return localStorage.getItem('explorer.alwaysOpenNewTab') === 'true'
}

function toKey(t: { database: string; schema?: string; type: ObjectType; name: string }) {
  return `${t.database}:${t.schema || ''}:${t.type}:${t.name}`
}

function activateTabFromState(tab: EditorTab | null) {
  if (!tab) return
  selectedDatabaseName.value = tab.database
  selectedSchemaName.value = tab.schema || null
  selectedObjectType.value = tab.type
  selectedObjectName.value = tab.name
  selectedMeta.value = tab.meta
  selectedDefaultTab.value = tab.defaultTab || null
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
  // If request is to open in right split, update split-only state and return
  if (payload.openInRightSplit) {
    splitConnectionId.value = payload.connectionId
    splitDatabaseName.value = payload.database
    splitSchemaName.value = payload.schema || null
    splitObjectType.value = payload.type
    splitObjectName.value = payload.name
    splitMeta.value = payload.meta
    splitDefaultTab.value = payload.defaultTab || null
    return
  }
  const desiredPinned = payload.mode === 'pinned' || settingAlwaysOpenNewTab()
  if (desiredPinned) {
    const key = toKey(payload)
    const existingIndex = pinnedTabs.value.findIndex((t) => toKey(t) === key)
    if (existingIndex === -1) {
      pinnedTabs.value.push({ ...payload, pinned: true })
      activePinnedIndex.value = pinnedTabs.value.length - 1
    } else {
      activePinnedIndex.value = existingIndex
    }
    activateTabFromState(pinnedTabs.value[activePinnedIndex.value!])
  } else {
    previewTab.value = { ...payload, pinned: false }
    activePinnedIndex.value = null
    activateTabFromState(previewTab.value)
  }
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

// Fallbacks from recent connections so header shows host/port on hard refresh
const recentCurrent = computed(() =>
  recentConnections.value.find((c) => c.id === (currentConnectionId.value as string))
)

const displayHostPort = computed(() => {
  const host = currentConnection.value?.host || recentCurrent.value?.host
  const port =
    (currentConnection.value?.port && String(currentConnection.value?.port)) ||
    recentCurrent.value?.port
  if (!host || !port) return null
  return `${host}:${port}`
})

const displayCloudProvider = computed(
  () => currentConnection.value?.cloud_provider || recentCurrent.value?.cloud_provider || ''
)

const displayType = computed(() => currentConnection.value?.type || recentCurrent.value?.type || '')

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
  // Clicking a breadcrumb level clears deeper selections and updates the query
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
  } else if (payload.level === 'name') {
    // no-op, leaf
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
  <div class="min-h-full">
    <header class="bg-white shadow">
      <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
          <h1 class="text-3xl font-bold leading-tight tracking-tight text-gray-900">
            Database Explorer
          </h1>
          <div class="flex items-center gap-4">
            <RouterLink to="/connections" class="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
              ← Back to Connections
            </RouterLink>
          </div>
        </div>
      </div>
    </header>

    <main class="mx-auto py-4">
      <!-- No recent connections -->
      <div v-if="recentConnections.length === 0" class="text-center py-12">
        <p class="text-gray-500">No recently explored connections.</p>
        <RouterLink to="/connections"
          class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
          Select a Connection
        </RouterLink>
      </div>

      <!-- Explorer content with simple connection selector -->
      <div v-else>
        <div ref="sidebarContainerRef" class="mt-6 flex flex-row items-stretch">
          <!-- Sidebar -->
          <div v-if="sidebarVisible" ref="sidebarRef"
            :style="{ flexBasis: `calc(${sidebarWidthPct}% - 8px)`, flexGrow: 0, flexShrink: 0 }"
            class="min-w-[220px] pr-2">
            <ExplorerSidebarConnections :initial-expanded-connection-id="currentConnectionId || undefined" :selected="{
              database: selectedDatabaseName || undefined,
              schema: selectedSchemaName || undefined,
              type: selectedObjectType || undefined,
              name: selectedObjectName || undefined
            }" @open="handleOpenFromTree" />
          </div>

          <!-- Divider between sidebar and right panel -->
          <div v-if="sidebarVisible" role="separator" aria-orientation="vertical"
            class="w-1.5 mx-1.5 bg-gray-200 hover:bg-gray-300 cursor-col-resize rounded hidden sm:block"
            @mousedown.prevent="onSidebarDividerMouseDown"></div>

          <!-- Right panel -->
          <div :style="{ flexBasis: '0px' }" :class="['grow', sidebarVisible ? 'pl-2' : 'pl-0']">
            <div class="mb-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-sm text-gray-500">
                  <span v-if="displayHostPort" class="font-medium text-gray-700">
                    {{ displayHostPort }}
                  </span>
                  <span v-if="displayHostPort" class="text-gray-400">•</span>
                  <ExplorerBreadcrumb :database="selectedDatabaseName" :schema="selectedSchemaName"
                    :type="selectedObjectType" :name="selectedObjectName" @navigate="handleBreadcrumbNavigate" />
                </div>
                <div class="flex items-center gap-2">
                  <button type="button"
                    class="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                    :title="sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar'" @click="toggleSidebar">
                    {{ sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar' }}
                  </button>
                  <CloudProviderBadge v-if="displayType" :cloud-provider="displayCloudProvider"
                    :db-type="displayType" />
                </div>
              </div>
            </div>

            <!-- Object tabs (pinned + preview) -->
            <div class="mb-2">
              <div class="flex items-center gap-1">
                <template v-for="(t, i) in pinnedTabs" :key="toKey(t)">
                  <button
                    class="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 flex items-center gap-1"
                    :class="{ 'ring-1 ring-slate-400': activePinnedIndex === i }" @click="activatePinned(i)">
                    <span class="font-medium">{{ t.name }}</span>
                    <span class="text-gray-400">{{ t.type === 'table' ? 'T' : 'V' }}</span>
                    <span class="text-gray-300">|</span>
                    <span class="text-gray-500">{{ t.database }}</span>
                    <span role="button" aria-label="Close tab"
                      class="ml-1 text-gray-400 hover:text-gray-700 cursor-pointer" @click.stop="closePinned(i)">
                      <span aria-hidden="true">×</span>
                    </span>
                  </button>
                </template>
                <button v-if="previewTab"
                  class="px-2 py-1 text-xs rounded border border-dashed border-gray-300 bg-white text-gray-600 italic"
                  @click="activatePinned(-1)">
                  {{ previewTab.name }} (Preview)
                </button>
              </div>
            </div>

            <TabGroup>
              <TabList class="flex space-x-2 mb-4 border-b border-gray-200">
                <Tab v-slot="{ selected }" as="template">
                  <button :class="[
                    'px-5 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-200',
                    'focus:outline-none relative',
                    selected
                      ? 'bg-white text-slate-800 border-t border-l border-r border-gray-200 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  ]">
                    Structure & Data
                    <span v-if="selected" class="absolute bottom-0 left-0 w-full h-0.5 bg-slate-600"></span>
                  </button>
                </Tab>
                <Tab v-slot="{ selected }" as="template">
                  <button :class="[
                    'px-5 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-200',
                    'focus:outline-none relative',
                    selected
                      ? 'bg-white text-slate-800 border-t border-l border-r border-gray-200 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  ]">
                    Diagram
                    <span v-if="selected" class="absolute bottom-0 left-0 w-full h-0.5 bg-slate-600"></span>
                  </button>
                </Tab>
              </TabList>

              <TabPanels>
                <TabPanel>
                  <div class="min-h-[480px]">
                    <div v-if="splitMeta" ref="splitContainerRef" class="flex flex-row items-stretch">
                      <!-- Left (primary) -->
                      <div ref="leftPaneRef" :style="{ flexGrow: splitGrow, flexBasis: '0px' }"
                        class="min-w-[240px] pr-2">
                        <div v-if="selectedMeta">
                          <DatabaseObjectContainer :table-meta="selectedMeta" :is-view="selectedObjectType === 'view'"
                            :connection-id="currentConnectionId || ''"
                            :connection-type="currentConnectionDetails?.type || 'sql'"
                            :database="selectedDatabaseName || ''" :default-tab="selectedDefaultTab || 'structure'"
                            @refresh-metadata="refreshSelectedMetadata(true)" />
                        </div>
                        <div v-else class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-8 text-center">
                          <h3 class="text-sm font-medium text-gray-900">No object selected</h3>
                          <p class="mt-1 text-sm text-gray-500">
                            Select a table or view from the sidebar to view its structure
                          </p>
                        </div>
                      </div>

                      <!-- Divider -->
                      <div role="separator" aria-orientation="vertical"
                        class="w-1.5 mx-1.5 bg-gray-200 hover:bg-gray-300 cursor-col-resize rounded"
                        @mousedown.prevent="onDividerMouseDown"></div>

                      <!-- Right split -->
                      <div :style="{ flexGrow: 100 - splitGrow, flexBasis: '0px' }" class="min-w-[240px] pl-2">
                        <DatabaseObjectContainer v-if="splitMeta" :table-meta="splitMeta"
                          :is-view="splitObjectType === 'view'"
                          :connection-id="splitConnectionId || currentConnectionId || ''"
                          :connection-type="getConnectionTypeById(splitConnectionId)"
                          :database="splitDatabaseName || ''" :default-tab="splitDefaultTab || 'structure'"
                          :closable="true" @close="closeRightSplit" />
                      </div>
                    </div>

                    <div v-else>
                      <div v-if="selectedMeta">
                        <DatabaseObjectContainer :table-meta="selectedMeta" :is-view="selectedObjectType === 'view'"
                          :connection-id="currentConnectionId || ''"
                          :connection-type="currentConnectionDetails?.type || 'sql'"
                          :database="selectedDatabaseName || ''" :default-tab="selectedDefaultTab || 'structure'"
                          @refresh-metadata="refreshSelectedMetadata(true)" />
                      </div>
                      <div v-else class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-8 text-center">
                        <h3 class="text-sm font-medium text-gray-900">No object selected</h3>
                        <p class="mt-1 text-sm text-gray-500">
                          Select a table or view from the sidebar to view its structure
                        </p>
                      </div>
                    </div>
                  </div>
                </TabPanel>
                <TabPanel>
                  <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
                    <DiagramView :tables="schemaStore.tables" :views="schemaStore.views"
                      :relationships="schemaStore.relationships" />
                  </div>
                </TabPanel>
              </TabPanels>
            </TabGroup>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
