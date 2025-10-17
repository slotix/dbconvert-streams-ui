<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, provide } from 'vue'
import { ArrowPathIcon, CubeIcon } from '@heroicons/vue/24/outline'
import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useConnectionTreeLogic } from '@/composables/useConnectionTreeLogic'
import { useTreeContextMenu, type ContextTarget } from '@/composables/useTreeContextMenu'
import { useConnectionActions } from '@/composables/useConnectionActions'
import { useTreeSearch } from '@/composables/useTreeSearch'
import type { Connection } from '@/types/connections'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'
import ExplorerContextMenu from './ExplorerContextMenu.vue'
import ConnectionTreeItem from './tree/ConnectionTreeItem.vue'
import ExplorerTreeControls from '@/components/explorer/ExplorerTreeControls.vue'

type ObjectType = 'table' | 'view'

const props = defineProps<{
  initialExpandedConnectionId?: string
  selected?: {
    connectionId?: string
    database?: string
    schema?: string
    type?: ObjectType | null
    name?: string | null
  }
  searchQuery: string
  typeFilter: string
  focusConnectionId?: string
}>()

type DefaultTab = 'structure' | 'data'

const emit = defineEmits<{
  (
    e: 'open',
    payload: {
      connectionId: string
      database: string
      schema?: string
      type: ObjectType
      name: string
      meta: SQLTableMeta | SQLViewMeta
      mode: 'preview' | 'pinned'
      defaultTab?: DefaultTab
      openInRightSplit?: boolean
    }
  ): void
  (
    e: 'open-file',
    payload: {
      connectionId: string
      path: string
      entry: FileSystemEntry
      mode: 'preview' | 'pinned'
      defaultTab?: 'structure' | 'data'
      openInRightSplit?: boolean
    }
  ): void
  (e: 'expanded-connection', payload: { connectionId: string }): void
  (e: 'show-diagram', payload: { connectionId: string; database: string }): void
  (e: 'select-connection', payload: { connectionId: string }): void
  (e: 'select-database', payload: { connectionId: string; database: string }): void
  (e: 'select-file', payload: { connectionId: string; path: string }): void
  (e: 'request-file-entries', payload: { connectionId: string }): void
  (e: 'add-connection'): void
  (e: 'update:search-query', value: string): void
}>()

const connectionsStore = useConnectionsStore()
const navigationStore = useExplorerNavigationStore()
const treeLogic = useConnectionTreeLogic()

// Use composables for context menu and actions
const contextMenu = useTreeContextMenu()
const actions = useConnectionActions({
  open: (payload) => emit('open', payload),
  openFile: (payload) => emit('open-file', payload),
  showDiagram: (payload) => emit('show-diagram', payload)
})

const isLoadingConnections = ref(false)
const loadError = ref<string | null>(null)
const searchQuery = computed(() => props.searchQuery || '')
const treeControlsRef = ref<InstanceType<typeof ExplorerTreeControls> | null>(null)

// Provide search query, caret class, and selection info to child components (avoid prop drilling)
provide('treeSearchQuery', searchQuery)
provide('treeCaretClass', 'w-[16px] h-[16px] shrink-0 flex-none text-gray-400 mr-1.5')
provide(
  'treeSelection',
  computed(() => props.selected || {})
)

// Computed for context menu
const canCopyDDL = computed(() => {
  const mo = contextMenu.menuObj.value
  if (!mo) return false
  return actions.canCopyDDL(mo.connectionId, mo.database, mo.name, mo.kind, mo.schema)
})

// Use tree search composable (reactive to searchQuery)
const treeSearch = computed(() =>
  useTreeSearch(searchQuery.value, { typeFilter: props.typeFilter as 'database' | 'file' | null })
)

// Computed for filtered connections using composable
const filteredConnections = computed<Connection[]>(() => {
  return treeSearch.value.filterConnections(connectionsStore.connections)
})

async function loadConnections() {
  isLoadingConnections.value = true
  loadError.value = null
  try {
    await connectionsStore.refreshConnections()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to load connections'
    loadError.value = msg
  } finally {
    isLoadingConnections.value = false
  }
}

function toggleConnection(connId: string) {
  const wasExpanded = navigationStore.isConnectionExpanded(connId)
  navigationStore.toggleConnection(connId)
  const isExpanded = navigationStore.isConnectionExpanded(connId)

  if (isExpanded && !wasExpanded && !treeLogic.isFileConnection(connId)) {
    void navigationStore.ensureDatabases(connId)
  }

  if (isExpanded) {
    if (treeLogic.isFileConnection(connId)) {
      emit('request-file-entries', { connectionId: connId })
    }
    emit('expanded-connection', { connectionId: connId })
  }
}

function toggleDb(connId: string, db: string) {
  const key = `${connId}:${db}`
  navigationStore.toggleDatabase(key)
  if (navigationStore.isDatabaseExpanded(key)) {
    // Only fetch if not already loading or loaded (prevent duplicate requests)
    if (
      !navigationStore.isMetadataLoading(connId, db) &&
      !navigationStore.getMetadata(connId, db)
    ) {
      navigationStore.ensureMetadata(connId, db).catch(() => {})
    }
  }
}

function toggleSchema(connId: string, db: string, schema: string) {
  const key = `${connId}:${db}:${schema}`
  navigationStore.toggleSchema(key)
}

function onOpen(
  connId: string,
  db: string,
  type: ObjectType,
  name: string,
  mode: 'preview' | 'pinned',
  schema?: string,
  defaultTab?: DefaultTab,
  openInRightSplit?: boolean
) {
  let obj: SQLTableMeta | SQLViewMeta | undefined
  if (type === 'table') obj = navigationStore.findTableMeta(connId, db, name, schema)
  else obj = navigationStore.findViewMeta(connId, db, name, schema)

  if (!obj) {
    console.error('[ExplorerSidebarConnections] Metadata not found for', type, name, 'in', db)
    return
  }

  emit('open', {
    connectionId: connId,
    database: db,
    schema,
    type,
    name,
    meta: obj,
    mode,
    defaultTab,
    openInRightSplit
  })
}

// Simplified menu action handler using composables
function onMenuAction(payload: {
  action: string
  target: ContextTarget
  openInRightSplit?: boolean
}) {
  const t = payload.target
  switch (payload.action) {
    case 'test-connection':
      if (t.kind === 'connection') actions.testConnection(t.connectionId)
      break
    case 'refresh-databases':
      if (t.kind === 'connection') actions.refreshDatabases(t.connectionId)
      break
    case 'edit-connection':
      if (t.kind === 'connection') actions.editConnection(t.connectionId)
      break
    case 'clone-connection':
      if (t.kind === 'connection') actions.cloneConnection(t.connectionId)
      break
    case 'delete-connection':
      if (t.kind === 'connection') actions.deleteConnection(t.connectionId)
      break
    case 'refresh-metadata':
      if (t.kind === 'database' || t.kind === 'schema')
        actions.refreshDatabase(t.connectionId, t.database)
      break
    case 'show-diagram':
      if (t.kind === 'database') actions.showDiagram(t.connectionId, t.database)
      break
    case 'copy-database-name':
      if (t.kind === 'database') actions.copyToClipboard(t.database, 'Database name copied')
      break
    case 'copy-schema-name':
      if (t.kind === 'schema') actions.copyToClipboard(t.schema, 'Schema name copied')
      break
    case 'open-data':
      if (t.kind === 'table' || t.kind === 'view')
        actions.openTable(
          t.connectionId,
          t.database,
          t.kind,
          t.name,
          'preview',
          t.schema,
          'data',
          payload.openInRightSplit
        )
      else if (t.kind === 'file')
        actions.openFile(t.connectionId, t.path, 'preview', 'data', payload.openInRightSplit)
      break
    case 'open-structure':
      if (t.kind === 'table' || t.kind === 'view')
        actions.openTable(
          t.connectionId,
          t.database,
          t.kind,
          t.name,
          'preview',
          t.schema,
          'structure',
          payload.openInRightSplit
        )
      else if (t.kind === 'file')
        actions.openFile(t.connectionId, t.path, 'preview', 'structure', payload.openInRightSplit)
      break
    case 'copy-object-name':
      if (t.kind === 'table' || t.kind === 'view')
        actions.copyToClipboard(t.name, 'Object name copied')
      break
    case 'copy-ddl':
      if (t.kind === 'table' || t.kind === 'view')
        void actions.copyDDL(t.connectionId, t.database, t.name, t.kind, t.schema)
      break
    case 'copy-file-name':
      if (t.kind === 'file') actions.copyToClipboard(t.name, 'File name copied')
      break
    case 'copy-file-path':
      if (t.kind === 'file') actions.copyToClipboard(t.path, 'File path copied')
      break
  }
  contextMenu.close()
}

// Event handlers for ConnectionTreeItem
function handleToggleConnection(conn: Connection) {
  toggleConnection(conn.id)
}

function handleToggleDatabase(conn: Connection, dbName: string) {
  toggleDb(conn.id, dbName)
}

function handleToggleSchema(conn: Connection, payload: { dbName: string; schemaName: string }) {
  toggleSchema(conn.id, payload.dbName, payload.schemaName)
}

function handleOpenObject(
  conn: Connection,
  payload: {
    connectionId: string
    database: string
    type: ObjectType
    name: string
    schema?: string
    mode: 'preview' | 'pinned'
  }
) {
  onOpen(
    payload.connectionId,
    payload.database,
    payload.type,
    payload.name,
    payload.mode,
    payload.schema
  )
}

function handleContextMenuConnection(payload: { event: MouseEvent; connectionId: string }) {
  contextMenu.open(payload.event, { kind: 'connection', connectionId: payload.connectionId })
}

function handleContextMenuDatabase(payload: {
  event: MouseEvent
  connectionId: string
  database: string
}) {
  contextMenu.open(payload.event, {
    kind: 'database',
    connectionId: payload.connectionId,
    database: payload.database
  })
}

function handleContextMenuSchema(payload: {
  event: MouseEvent
  connectionId: string
  database: string
  schema: string
}) {
  contextMenu.open(payload.event, {
    kind: 'schema',
    connectionId: payload.connectionId,
    database: payload.database,
    schema: payload.schema
  })
}

function handleContextMenuObject(payload: {
  event: MouseEvent
  kind: ObjectType
  connectionId: string
  database: string
  schema?: string
  name: string
}) {
  contextMenu.open(payload.event, {
    kind: payload.kind,
    connectionId: payload.connectionId,
    database: payload.database,
    schema: payload.schema,
    name: payload.name
  })
}

function handleContextMenuFile(payload: {
  event: MouseEvent
  connectionId: string
  path: string
  name: string
}) {
  contextMenu.open(payload.event, {
    kind: 'file',
    connectionId: payload.connectionId,
    path: payload.path,
    name: payload.name
  })
}

onMounted(async () => {
  await loadConnections()
  // Only auto-expand and load databases if there's a specific connection ID in the URL
  // This happens when user navigates directly to /explorer/connection-id or clicks "Explore" from connection card
  if (props.initialExpandedConnectionId) {
    navigationStore.expandConnection(props.initialExpandedConnectionId)
    if (treeLogic.isFileConnection(props.initialExpandedConnectionId)) {
      emit('request-file-entries', { connectionId: props.initialExpandedConnectionId })
    } else {
      // Load databases for database connections when explicitly navigating to them
      navigationStore.ensureDatabases(props.initialExpandedConnectionId).catch(() => {})
    }
  }
})

// Auto-expand selection path
watch(
  () => props.selected,
  async (sel) => {
    if (!sel) return
    const connId = sel.connectionId
    if (!connId) return

    // Skip database operations for file connections
    if (treeLogic.isFileConnection(connId)) {
      navigationStore.expandConnection(connId)
      return
    }

    // Database connection operations
    navigationStore.expandConnection(connId)
    await navigationStore.ensureDatabases(connId)

    if (sel.database) {
      const dbKey = `${connId}:${sel.database}`
      // Only fetch metadata if we're expanding a previously collapsed database
      const wasExpanded = navigationStore.isDatabaseExpanded(dbKey)
      navigationStore.expandDatabase(dbKey)

      // If database was NOT already expanded, we need to fetch metadata
      // (toggleDb won't be called in this case since user clicked the DB name, not chevron)
      if (!wasExpanded) {
        const isLoading = navigationStore.isMetadataLoading(connId, sel.database)
        const hasMetadata = navigationStore.getMetadata(connId, sel.database) !== null
        if (!isLoading && !hasMetadata) {
          await navigationStore.ensureMetadata(connId, sel.database)
        }
      }
    }

    if (sel.database && sel.schema && treeLogic.hasSchemas(connId)) {
      const schemaKey = `${connId}:${sel.database}:${sel.schema}`
      navigationStore.expandSchema(schemaKey)
    }

    await nextTick()
    function focusSelector(selector: string) {
      const el = document.querySelector<HTMLElement>(selector)
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        el.classList.add('ring-1', 'ring-slate-300')
        setTimeout(() => el.classList.remove('ring-1', 'ring-slate-300'), 600)
      }
    }
    if (sel.database && sel.type && sel.name) {
      const objKey = `${connId}:${sel.database}:${sel.schema || ''}:${sel.type}:${sel.name}`
      focusSelector(`[data-explorer-obj="${objKey}"]`)
    } else if (sel.database && sel.schema) {
      const schemaKey = `${connId}:${sel.database}:${sel.schema}`
      focusSelector(`[data-explorer-schema="${schemaKey}"]`)
    } else if (sel.database) {
      const dbKey = `${connId}:${sel.database}`
      focusSelector(`[data-explorer-db="${dbKey}"]`)
    }
  },
  { immediate: false }
)

// When searching, auto-expand connections and databases
async function expandForSearch(query: string) {
  const trimmed = query.trim()
  if (!trimmed) return
  const conns = filteredConnections.value
  for (const c of conns) {
    if (!navigationStore.isConnectionExpanded(c.id)) {
      navigationStore.expandConnection(c.id)
    }
    if (treeLogic.isFileConnection(c.id)) {
      emit('request-file-entries', { connectionId: c.id })
    } else {
      await navigationStore.ensureDatabases(c.id)
      const dbs = navigationStore.databasesState[c.id] || []
      for (const d of dbs) {
        if (matchesDbFilter(c.id, d.name)) {
          navigationStore.expandDatabase(`${c.id}:${d.name}`)
          // Only fetch if not already loading or loaded (prevent duplicate requests)
          if (
            !navigationStore.isMetadataLoading(c.id, d.name) &&
            !navigationStore.getMetadata(c.id, d.name)
          ) {
            navigationStore.ensureMetadata(c.id, d.name).catch(() => {})
          }
        }
      }
    }
  }
}

function matchesDbFilter(connId: string, dbName: string): boolean {
  return treeSearch.value.matchesDatabaseFilter(connId, dbName)
}

watch(
  () => searchQuery.value,
  (q) => {
    void expandForSearch(q)
  },
  { immediate: false }
)

watch(
  () => props.typeFilter,
  (typeLabel) => {
    if (!typeLabel) return
    if (searchQuery.value.trim()) void expandForSearch(searchQuery.value)
  }
)

watch(
  () => props.focusConnectionId,
  async (id) => {
    if (!id) return
    navigationStore.expandedConnections.clear()
    navigationStore.expandedDatabases.clear()
    navigationStore.expandedSchemas.clear()
    navigationStore.expandConnection(id)
    await navigationStore.ensureDatabases(id).catch(() => {})
    await nextTick(() => {
      const el = document.querySelector<HTMLElement>(`[data-explorer-connection="${id}"]`)
      if (el) el.scrollIntoView({ block: 'nearest' })
    })
  }
)

// Expose the selected type for parent component
defineExpose({
  selectedDbTypeLabel: computed(() => treeControlsRef.value?.selectedDbTypeLabel || 'All')
})
</script>

<template>
  <!-- Responsive sidebar with viewport-relative height and modern styling -->
  <div
    class="bg-white shadow-lg rounded-xl overflow-hidden h-[calc(100vh-140px)] flex flex-col transition-shadow duration-200 hover:shadow-xl"
  >
    <!-- Fixed header section with sticky positioning -->
    <div class="sticky top-0 z-10 bg-white border-b border-gray-200">
      <ExplorerTreeControls
        ref="treeControlsRef"
        :connection-search="searchQuery"
        @update:connection-search="$emit('update:search-query', $event)"
        @add-connection="$emit('add-connection')"
      />
    </div>

    <!-- Scrollable tree content area with smooth scrolling and custom scrollbar -->
    <div class="flex-1 overflow-y-auto overscroll-contain p-2 scrollbar-thin">
      <!-- Loading state with centered spinner -->
      <div
        v-if="isLoadingConnections"
        class="flex flex-col items-center justify-center py-12 text-gray-500"
      >
        <ArrowPathIcon class="h-8 w-8 animate-spin mb-3 text-sky-500" />
        <p class="text-sm font-medium">Loading connections...</p>
      </div>

      <!-- Error state with improved styling -->
      <div v-else-if="loadError" class="flex flex-col items-center justify-center py-12 px-4">
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center max-w-md">
          <svg
            class="h-6 w-6 text-red-500 mx-auto mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p class="text-sm text-red-700 font-medium">{{ loadError }}</p>
        </div>
      </div>

      <!-- Main content area -->
      <div v-else>
        <!-- Empty state with better visual design -->
        <div
          v-if="!filteredConnections.length"
          class="flex flex-col items-center justify-center py-16 px-4"
        >
          <div class="bg-gray-50 rounded-full p-4 mb-4">
            <CubeIcon class="h-8 w-8 text-gray-400" />
          </div>
          <p class="text-sm font-medium text-gray-600 mb-1">No connections found</p>
          <p class="text-xs text-gray-500">
            {{ searchQuery ? 'Try adjusting your search' : 'Add a connection to get started' }}
          </p>
        </div>

        <!-- Connection tree with improved spacing -->
        <div v-else class="space-y-0.5">
          <ConnectionTreeItem
            v-for="conn in filteredConnections"
            :key="conn.id"
            :connection="conn"
            :is-expanded="navigationStore.isConnectionExpanded(conn.id)"
            :is-file-connection="treeLogic.isFileConnection(conn.id)"
            :is-focused="focusConnectionId === conn.id"
            :databases="
              (navigationStore.databasesState[conn.id] || []).filter((d) =>
                matchesDbFilter(conn.id, d.name)
              )
            "
            @toggle-connection="handleToggleConnection(conn)"
            @select-connection="$emit('select-connection', $event)"
            @toggle-database="(dbName) => handleToggleDatabase(conn, dbName)"
            @toggle-schema="(p) => handleToggleSchema(conn, p)"
            @select-database="$emit('select-database', $event)"
            @select-file="$emit('select-file', $event)"
            @open-object="(p) => handleOpenObject(conn, p)"
            @open-file="$emit('open-file', $event)"
            @contextmenu-connection="handleContextMenuConnection"
            @contextmenu-database="handleContextMenuDatabase"
            @contextmenu-schema="handleContextMenuSchema"
            @contextmenu-object="handleContextMenuObject"
            @contextmenu-file="handleContextMenuFile"
            @request-file-entries="$emit('request-file-entries', $event)"
          />
        </div>
      </div>

      <!-- Context menu overlay -->
      <ExplorerContextMenu
        :visible="contextMenu.hasContextMenu.value"
        :x="contextMenu.contextMenuX.value"
        :y="contextMenu.contextMenuY.value"
        :target="contextMenu.contextTarget.value"
        :canCopyDDL="canCopyDDL"
        @menu-action="onMenuAction"
        @close="contextMenu.close"
      />
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar styling for webkit browsers */
.scrollbar-thin::-webkit-scrollbar {
  width: 8px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: rgb(209, 213, 219);
  border-radius: 4px;
  transition: background-color 0.2s;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background-color: rgb(156, 163, 175);
}

/* For Firefox */
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: rgb(209, 213, 219) transparent;
}
</style>
