<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowPathIcon, CubeIcon } from '@heroicons/vue/24/outline'
import { useConnectionsStore } from '@/stores/connections'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useConnectionTreeLogic } from '@/composables/useConnectionTreeLogic'
import connectionsApi from '@/api/connections'
import type { Connection } from '@/types/connections'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'
import { useToast } from 'vue-toastification'
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
const fileExplorerStore = useFileExplorerStore()
const navigationStore = useExplorerNavigationStore()
const treeLogic = useConnectionTreeLogic()
const router = useRouter()
const toast = useToast()

const isLoadingConnections = ref(false)
const loadError = ref<string | null>(null)
const searchQuery = computed(() => props.searchQuery || '')

// Context menu state
type ContextTarget =
  | { kind: 'connection'; connectionId: string }
  | { kind: 'database'; connectionId: string; database: string }
  | { kind: 'schema'; connectionId: string; database: string; schema: string }
  | {
      kind: 'table' | 'view'
      connectionId: string
      database: string
      schema?: string
      name: string
    }
  | {
      kind: 'file'
      connectionId: string
      path: string
      name: string
    }

const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextTarget = ref<ContextTarget | null>(null)
const hasContextMenu = computed(() => contextMenuVisible.value && !!contextTarget.value)
const menuTarget = computed<ContextTarget>(() => contextTarget.value as ContextTarget)
type TableOrViewTarget = Extract<ContextTarget, { kind: 'table' | 'view' }>
const menuObj = computed<TableOrViewTarget | null>(() =>
  menuTarget.value && (menuTarget.value.kind === 'table' || menuTarget.value.kind === 'view')
    ? (menuTarget.value as TableOrViewTarget)
    : null
)

const canCopyDDL = computed(() => {
  const mo = menuObj.value
  if (!mo) return false
  if (mo.kind === 'table')
    return !!navigationStore.findTableMeta(mo.connectionId, mo.database, mo.name, mo.schema)?.ddl
      ?.createTable
  return !!navigationStore.findViewMeta(mo.connectionId, mo.database, mo.name, mo.schema)
    ?.definition
})

// Fixed, consistent caret icon class
const caretClass = 'w-[16px] h-[16px] shrink-0 flex-none text-gray-400 mr-1.5'

const normalized = (s: string) => s.toLowerCase()

const filteredConnections = computed<Connection[]>(() => {
  const q = searchQuery.value.trim()
  const base = [...connectionsStore.connections]
    .filter((conn) => treeLogic.matchesTypeFilter(conn, props.typeFilter))
    .sort((a, b) => {
      const ac = Number(a.created || 0)
      const bc = Number(b.created || 0)
      if (bc !== ac) return bc - ac
      return (a.name || '').localeCompare(b.name || '')
    })
  if (!q) return base
  const qn = normalized(q)
  return base.filter((c) => {
    const label = `${c.name || ''} ${c.host || ''} ${c.type || ''}`
    if (normalized(label).includes(qn)) return true
    const dbs = navigationStore.databasesCache[c.id] || []
    if (dbs.some((d) => normalized(d.name).includes(qn))) return true
    const metaByDb = navigationStore.metadataCache[c.id] || {}
    for (const dbName in metaByDb) {
      const meta = metaByDb[dbName]
      const hasSchemaHit = Object.values(meta.tables || {}).some(
        (t) => (t.schema && normalized(t.schema).includes(qn)) || normalized(t.name).includes(qn)
      )
      if (hasSchemaHit) return true
      const hasViewHit = Object.values(meta.views || {}).some(
        (v) => (v.schema && normalized(v.schema).includes(qn)) || normalized(v.name).includes(qn)
      )
      if (hasViewHit) return true
    }
    return false
  })
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
    } else {
      navigationStore.ensureDatabases(connId).catch(() => {})
    }
    emit('expanded-connection', { connectionId: connId })
  }
}

function toggleDb(connId: string, db: string) {
  const key = `${connId}:${db}`
  navigationStore.toggleDatabase(key)
  if (navigationStore.isDatabaseExpanded(key)) {
    navigationStore.ensureMetadata(connId, db).catch(() => {})
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
  if (!obj) return
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

function openContextMenu(e: MouseEvent, target: ContextTarget) {
  e.preventDefault()
  contextTarget.value = target
  contextMenuX.value = e.clientX + 2
  contextMenuY.value = e.clientY + 2
  contextMenuVisible.value = true
  window.addEventListener('click', closeContextMenuOnce, { once: true })
  window.addEventListener('keydown', onContextKeydown)
}

function closeContextMenuOnce() {
  contextMenuVisible.value = false
  contextTarget.value = null
  window.removeEventListener('keydown', onContextKeydown)
}

function onContextKeydown(ev: KeyboardEvent) {
  if (ev.key === 'Escape') closeContextMenuOnce()
}

// Context actions
async function actionTestConnection(id: string) {
  try {
    const res = await connectionsApi.pingConnectionById(id)
    if (res.includes('Passed')) toast.success(res)
    else toast.error(res)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Connection test failed'
    toast.error(msg)
  }
}

async function actionRefreshDatabases(id: string) {
  navigationStore.invalidateDatabases(id)
  await navigationStore.ensureDatabases(id, true)
  toast.success('Databases refreshed')
}

async function actionRefreshMetadata(connId: string, db: string) {
  try {
    await navigationStore.ensureMetadata(connId, db, true)
    toast.success('Metadata refreshed')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to refresh metadata'
    toast.error(msg)
  }
}

async function actionCopy(text: string, label = 'Copied') {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(label)
  } catch {
    toast.error('Failed to copy')
  }
}

function actionEditConnection(id: string) {
  router.push(`/explorer/edit/${id}`)
}

async function actionDeleteConnection(id: string) {
  const conn = connectionsStore.connections.find((c) => c.id === id)
  const name = conn?.name || conn?.host || 'connection'
  if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return
  try {
    await connectionsStore.deleteConnection(id)
    navigationStore.invalidateConnection(id)
    toast.success('Connection deleted')
  } catch (e) {
    toast.error('Failed to delete connection')
    console.error(e)
  }
}

async function actionCloneConnection(id: string) {
  try {
    connectionsStore.setCurrentConnection(id)
    await connectionsStore.cloneConnection(id)
    const newId = connectionsStore.currentConnection?.id
    await connectionsStore.refreshConnections()
    if (newId) router.push(`/explorer/edit/${newId}`)
    toast.success('Connection cloned')
  } catch (e) {
    toast.error('Failed to clone connection')
    console.error(e)
  }
}

async function actionCopyDDLFromContext() {
  const mo = menuObj.value
  if (!mo) return
  if (mo.kind === 'table') {
    const m = navigationStore.findTableMeta(mo.connectionId, mo.database, mo.name, mo.schema)
    const ddl = m?.ddl?.createTable || ''
    if (ddl) await actionCopy(ddl, 'Table DDL copied')
    else toast.info('DDL not available')
  } else {
    const m = navigationStore.findViewMeta(mo.connectionId, mo.database, mo.name, mo.schema)
    const ddl = m?.definition || ''
    if (ddl) await actionCopy(ddl, 'View DDL copied')
    else toast.info('Definition not available')
  }
  closeContextMenuOnce()
}

function findFileEntry(connectionId: string, path: string): FileSystemEntry | undefined {
  const entries = fileExplorerStore.getEntries(connectionId)
  if (!entries) return undefined
  return entries.find((entry) => entry.path === path)
}

function onMenuAction(payload: {
  action: string
  target: ContextTarget
  openInRightSplit?: boolean
}) {
  const t = payload.target
  switch (payload.action) {
    case 'test-connection':
      if (t.kind === 'connection') actionTestConnection(t.connectionId)
      break
    case 'refresh-databases':
      if (t.kind === 'connection') actionRefreshDatabases(t.connectionId)
      break
    case 'edit-connection':
      if (t.kind === 'connection') actionEditConnection(t.connectionId)
      break
    case 'clone-connection':
      if (t.kind === 'connection') actionCloneConnection(t.connectionId)
      break
    case 'delete-connection':
      if (t.kind === 'connection') actionDeleteConnection(t.connectionId)
      break
    case 'refresh-metadata':
      if (t.kind === 'database' || t.kind === 'schema')
        actionRefreshMetadata(t.connectionId, t.database)
      break
    case 'show-diagram':
      if (t.kind === 'database')
        emit('show-diagram', { connectionId: t.connectionId, database: t.database })
      break
    case 'copy-database-name':
      if (t.kind === 'database') actionCopy(t.database, 'Database name copied')
      break
    case 'copy-schema-name':
      if (t.kind === 'schema') actionCopy(t.schema, 'Schema name copied')
      break
    case 'open-data':
      if (t.kind === 'table' || t.kind === 'view')
        onOpen(
          t.connectionId,
          t.database,
          t.kind,
          t.name,
          'preview',
          t.schema,
          'data',
          payload.openInRightSplit
        )
      else if (t.kind === 'file') {
        const entry = findFileEntry(t.connectionId, t.path)
        if (entry) {
          emit('open-file', {
            connectionId: t.connectionId,
            path: t.path,
            entry,
            mode: 'preview',
            defaultTab: 'data',
            openInRightSplit: payload.openInRightSplit
          })
        }
      }
      break
    case 'open-structure':
      if (t.kind === 'table' || t.kind === 'view')
        onOpen(
          t.connectionId,
          t.database,
          t.kind,
          t.name,
          'preview',
          t.schema,
          'structure',
          payload.openInRightSplit
        )
      else if (t.kind === 'file') {
        const entry = findFileEntry(t.connectionId, t.path)
        if (entry) {
          emit('open-file', {
            connectionId: t.connectionId,
            path: t.path,
            entry,
            mode: 'preview',
            defaultTab: 'structure',
            openInRightSplit: payload.openInRightSplit
          })
        }
      }
      break
    case 'copy-object-name':
      if (t.kind === 'table' || t.kind === 'view') actionCopy(t.name, 'Object name copied')
      break
    case 'copy-ddl':
      void actionCopyDDLFromContext()
      break
    case 'copy-file-name':
      if (t.kind === 'file') actionCopy(t.name, 'File name copied')
      break
    case 'copy-file-path':
      if (t.kind === 'file') actionCopy(t.path, 'File path copied')
      break
  }
  closeContextMenuOnce()
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
  openContextMenu(payload.event, { kind: 'connection', connectionId: payload.connectionId })
}

function handleContextMenuDatabase(payload: {
  event: MouseEvent
  connectionId: string
  database: string
}) {
  openContextMenu(payload.event, {
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
  openContextMenu(payload.event, {
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
  openContextMenu(payload.event, {
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
  openContextMenu(payload.event, {
    kind: 'file',
    connectionId: payload.connectionId,
    path: payload.path,
    name: payload.name
  })
}

onMounted(async () => {
  await loadConnections()
  if (props.initialExpandedConnectionId) {
    navigationStore.expandConnection(props.initialExpandedConnectionId)
    if (treeLogic.isFileConnection(props.initialExpandedConnectionId)) {
      emit('request-file-entries', { connectionId: props.initialExpandedConnectionId })
    } else {
      navigationStore.ensureDatabases(props.initialExpandedConnectionId).catch(() => {})
    }
  }
})

// Auto-expand selection path
watch(
  () => props.selected,
  async (sel) => {
    if (!sel) return
    const connId = props.initialExpandedConnectionId
    if (!connId) return
    navigationStore.expandConnection(connId)
    await navigationStore.ensureDatabases(connId)

    if (sel.database) {
      const dbKey = `${connId}:${sel.database}`
      navigationStore.expandDatabase(dbKey)
      await navigationStore.ensureMetadata(connId, sel.database)
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
          navigationStore.ensureMetadata(c.id, d.name).catch(() => {})
        }
      }
    }
  }
}

function matchesDbFilter(connId: string, dbName: string): boolean {
  const q = searchQuery.value.trim()
  if (!q) return true
  const qn = normalized(q)
  if (normalized(dbName).includes(qn)) return true
  const meta = navigationStore.metadataCache[connId]?.[dbName]
  if (!meta) return false
  const tableHit = Object.values(meta.tables || {}).some(
    (t) => normalized(t.name).includes(qn) || (t.schema && normalized(t.schema).includes(qn))
  )
  if (tableHit) return true
  const viewHit = Object.values(meta.views || {}).some(
    (v) => normalized(v.name).includes(qn) || (v.schema && normalized(v.schema).includes(qn))
  )
  return viewHit
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
            :search-query="searchQuery"
            :caret-class="caretClass"
            :expanded-databases="navigationStore.expandedDatabases"
            :expanded-schemas="navigationStore.expandedSchemas"
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
        :visible="hasContextMenu"
        :x="contextMenuX"
        :y="contextMenuY"
        :target="contextTarget"
        :canCopyDDL="canCopyDDL"
        @menu-action="onMenuAction"
        @close="closeContextMenuOnce"
      />
    </div>
  </div>
</template>
