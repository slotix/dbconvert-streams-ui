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

type ObjectType = 'table' | 'view'

const props = defineProps<{
  initialExpandedConnectionId?: string
  selected?: {
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
  navigationStore.toggleConnection(connId)
  if (navigationStore.isConnectionExpanded(connId)) {
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
    // Use the active connection ID from the store (synchronous, always up-to-date)
    const connId = navigationStore.activeConnectionId
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
      const dbs = navigationStore.databasesCache[c.id] || []
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
</script>

<template>
  <div
    class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg divide-y divide-gray-200 overflow-hidden"
  >
    <div class="p-2">
      <div v-if="isLoadingConnections" class="text-center py-6 text-gray-500">
        <ArrowPathIcon class="h-6 w-6 animate-spin inline-block" />
      </div>
      <div v-else-if="loadError" class="text-center py-6 text-red-600">{{ loadError }}</div>
      <div v-else>
        <div v-if="!filteredConnections.length" class="text-center py-6 text-gray-500">
          <CubeIcon class="h-6 w-6 inline-block mr-2" /> No connections
        </div>
        <div v-else class="space-y-1">
          <ConnectionTreeItem
            v-for="conn in filteredConnections"
            :key="conn.id"
            :connection="conn"
            :is-expanded="navigationStore.isConnectionExpanded(conn.id)"
            :is-file-connection="treeLogic.isFileConnection(conn.id)"
            :is-focused="focusConnectionId === conn.id"
            :databases="
              (navigationStore.databasesCache[conn.id] || []).filter((d) =>
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
