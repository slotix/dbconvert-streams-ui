<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronRightIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  CubeIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'
import ObjectIcon from '@/components/common/ObjectIcon.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import { useConnectionsStore } from '@/stores/connections'
import connectionsApi from '@/api/connections'
import type { Connection, DbType } from '@/types/connections'
import type { DatabaseMetadata, SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import { useToast } from 'vue-toastification'
import { highlightParts as splitHighlight } from '@/utils/highlight'
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/vue'

type ObjectType = 'table' | 'view'

const props = defineProps<{
  initialExpandedConnectionId?: string
  selected?: {
    database?: string
    schema?: string
    type?: ObjectType | null
    name?: string | null
  }
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
  (e: 'expanded-connection', payload: { connectionId: string }): void
  (e: 'show-diagram', payload: { connectionId: string; database: string }): void
  (e: 'select-connection', payload: { connectionId: string }): void
  (e: 'select-database', payload: { connectionId: string; database: string }): void
}>()

const connectionsStore = useConnectionsStore()
const router = useRouter()
const isLoadingConnections = ref(false)
const loadError = ref<string | null>(null)
const expandedConnections = ref(new Set<string>())
const expandedDatabases = ref(new Set<string>())
const expandedSchemas = ref(new Set<string>())

// per-connection database list and metadata caches
const databasesByConn = ref<Record<string, Array<{ name: string }>>>({})
const metadataByConnDb = ref<Record<string, Record<string, DatabaseMetadata>>>({})

const searchQuery = ref('')

const TYPE_FILTER_STORAGE_KEY = 'explorer.connectionType'
const dbTypeOptions = computed<DbType[]>(() => connectionsStore.dbTypes)
const selectedType = ref<DbType | null>(null)
let hasRestoredTypeFilter = false

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
    if (!hasRestoredTypeFilter) {
      const storedType = loadStoredType()
      const initial = storedType
        ? options.find((opt) => opt.type === storedType) || options[0]
        : options[0]
      selectedType.value = initial
      hasRestoredTypeFilter = true
      return
    }

    if (selectedType.value) {
      const match = options.find((opt) => opt.type === selectedType.value?.type)
      selectedType.value = match || options[0]
    } else {
      selectedType.value = options[0]
    }
  },
  { immediate: true }
)

watch(
  () => selectedType.value?.type,
  (val) => {
    if (!hasRestoredTypeFilter) return
    storeType(val || null)
  }
)

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

function openContextMenu(e: MouseEvent, target: ContextTarget) {
  e.preventDefault()
  contextTarget.value = target
  // Use client coordinates; position with small offset
  contextMenuX.value = e.clientX + 2
  contextMenuY.value = e.clientY + 2
  contextMenuVisible.value = true
  // Close on outside click or Escape
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

// Global toast
const toast = useToast()

// Fixed, consistent caret icon class across all tree levels
const caretClass = 'w-[16px] h-[16px] shrink-0 flex-none text-gray-400 mr-1.5'

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

async function ensureDatabases(connectionId: string) {
  if (databasesByConn.value[connectionId]) return
  try {
    const dbs = await connectionsApi.getDatabases(connectionId)
    databasesByConn.value[connectionId] = dbs.map((d) => ({ name: d.name }))
  } catch {
    // store empty to avoid loops; UI will show empty state
    databasesByConn.value[connectionId] = []
  }
}

async function ensureMetadata(connectionId: string, db: string) {
  if (!metadataByConnDb.value[connectionId]) metadataByConnDb.value[connectionId] = {}
  if (metadataByConnDb.value[connectionId][db]) return
  try {
    const meta = await connectionsApi.getMetadata(connectionId, db)
    metadataByConnDb.value[connectionId][db] = meta
  } catch {
    // leave undefined; UI can handle missing meta
  }
}

function toggleConnection(connId: string) {
  if (expandedConnections.value.has(connId)) {
    expandedConnections.value.delete(connId)
  } else {
    expandedConnections.value.add(connId)
    ensureDatabases(connId).catch(() => {})
    emit('expanded-connection', { connectionId: connId })
  }
}

function toggleDb(connId: string, db: string) {
  const key = `${connId}:${db}`
  if (expandedDatabases.value.has(key)) {
    expandedDatabases.value.delete(key)
  } else {
    expandedDatabases.value.add(key)
    ensureMetadata(connId, db).catch(() => {})
  }
}

function toggleSchema(connId: string, db: string, schema: string) {
  const key = `${connId}:${db}:${schema}`
  if (expandedSchemas.value.has(key)) expandedSchemas.value.delete(key)
  else expandedSchemas.value.add(key)
}

const normalized = (s: string) => s.toLowerCase()

const highlightParts = (text: string) => splitHighlight(text, searchQuery.value)

function isConnExpanded(connId: string) {
  return expandedConnections.value.has(connId)
}
function isDbExpanded(connId: string, db: string) {
  return expandedDatabases.value.has(`${connId}:${db}`)
}
function isSchemaExpanded(connId: string, db: string, schema: string) {
  return expandedSchemas.value.has(`${connId}:${db}:${schema}`)
}

function matchesTypeFilter(conn: Connection): boolean {
  const filterLabel = selectedType.value?.type || 'All'
  const filter = filterLabel.toLowerCase()
  if (!filter || filter === 'all') return true
  const connType = (conn.type || '').toLowerCase()
  if (!connType) return false
  if (filter === 'postgresql') return connType.includes('postgres')
  if (filter === 'files') return connType.includes('file')
  return connType.includes(filter)
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
  const meta = metadataByConnDb.value[connId]?.[db]
  if (!meta) return
  let obj: SQLTableMeta | SQLViewMeta | undefined
  if (type === 'table') obj = Object.values(meta.tables || {}).find((t) => t.name === name)
  else obj = Object.values(meta.views || {}).find((v) => v.name === name)
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
  // Clear cached dbs so ensureDatabases refetches
  delete databasesByConn.value[id]
  await ensureDatabases(id)
  toast.success('Databases refreshed')
}

async function actionRefreshMetadata(connId: string, db: string) {
  try {
    const meta = await connectionsApi.getMetadata(connId, db, true)
    if (!metadataByConnDb.value[connId]) metadataByConnDb.value[connId] = {}
    metadataByConnDb.value[connId][db] = meta
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

// Reuse existing pages/actions
function actionAddConnection() {
  router.push('/connections/add')
}
function actionEditConnection(id: string) {
  router.push(`/connections/edit/${id}`)
}
async function actionDeleteConnection(id: string) {
  const conn = connectionsStore.connections.find((c) => c.id === id)
  const name = conn?.name || conn?.host || 'connection'
  if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return
  try {
    await connectionsStore.deleteConnection(id)
    // remove cached data
    delete databasesByConn.value[id]
    delete metadataByConnDb.value[id]
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
    if (newId) router.push(`/connections/edit/${newId}`)
    toast.success('Connection cloned')
  } catch (e) {
    toast.error('Failed to clone connection')
    console.error(e)
  }
}

// Context menu helpers to keep template expressions simple
function onContextTestConnection() {
  const t = menuTarget.value
  if (t && t.kind === 'connection') {
    actionTestConnection(t.connectionId)
  }
  closeContextMenuOnce()
}

function onContextRefreshDatabases() {
  const t = menuTarget.value
  if (t && t.kind === 'connection') {
    actionRefreshDatabases(t.connectionId)
  }
  closeContextMenuOnce()
}

function onContextRefreshMetadata() {
  const t = menuTarget.value
  if (t && (t.kind === 'database' || t.kind === 'schema')) {
    actionRefreshMetadata(t.connectionId, t.database)
  }
  closeContextMenuOnce()
}

function onContextShowDiagram() {
  const t = menuTarget.value
  if (t && t.kind === 'database') {
    emit('show-diagram', { connectionId: t.connectionId, database: t.database })
  }
  closeContextMenuOnce()
}

function onContextCopyDatabaseName() {
  const t = menuTarget.value
  if (t && t.kind === 'database') {
    actionCopy(t.database, 'Database name copied')
  }
  closeContextMenuOnce()
}

function onContextCopySchemaName() {
  const t = menuTarget.value
  if (t && t.kind === 'schema') {
    actionCopy(t.schema, 'Schema name copied')
  }
  closeContextMenuOnce()
}

function onContextCopyObjectName() {
  const mo = menuObj.value
  if (mo) actionCopy(mo.name, 'Object name copied')
  closeContextMenuOnce()
}

function onContextOpenStructure(openInRightSplit = false) {
  const mo = menuObj.value
  if (!mo) return
  onOpen(
    mo.connectionId,
    mo.database,
    mo.kind,
    mo.name,
    'preview',
    mo.schema,
    'structure',
    openInRightSplit
  )
  closeContextMenuOnce()
}

function onContextOpenData(openInRightSplit = false) {
  const mo = menuObj.value
  if (!mo) return
  onOpen(
    mo.connectionId,
    mo.database,
    mo.kind,
    mo.name,
    'preview',
    mo.schema,
    'data',
    openInRightSplit
  )
  closeContextMenuOnce()
}

function findTableMeta(connId: string, db: string, name: string, schema?: string) {
  const meta = metadataByConnDb.value[connId]?.[db]
  if (!meta) return null
  const obj = Object.values(meta.tables || {}).find(
    (t) => t.name === name && (schema ? t.schema === schema : true)
  )
  return obj || null
}

function findViewMeta(connId: string, db: string, name: string, schema?: string) {
  const meta = metadataByConnDb.value[connId]?.[db]
  if (!meta) return null
  const obj = Object.values(meta.views || {}).find(
    (v) => v.name === name && (schema ? v.schema === schema : true)
  )
  return obj || null
}

// Build schema list and items for a given connection/database
function getSchemas(
  connId: string,
  db: string
): Array<{ name: string; tables: string[]; views: string[] }> {
  const meta = metadataByConnDb.value[connId]?.[db]
  if (!meta) return []
  const buckets = new Map<string, { tables: string[]; views: string[] }>()
  Object.values(meta.tables || {}).forEach((t) => {
    const s = t.schema || ''
    if (!buckets.has(s)) buckets.set(s, { tables: [], views: [] })
    buckets.get(s)!.tables.push(t.name)
  })
  Object.values(meta.views || {}).forEach((v) => {
    const s = v.schema || ''
    if (!buckets.has(s)) buckets.set(s, { tables: [], views: [] })
    buckets.get(s)!.views.push(v.name)
  })
  const arr = Array.from(buckets.entries()).map(([name, bucket]) => ({
    name,
    tables: bucket.tables.sort((a, b) => a.localeCompare(b)),
    views: bucket.views.sort((a, b) => a.localeCompare(b))
  }))
  // Filter out MySQL default/system schemas
  const mysqlSystemSchemas = new Set(['information_schema', 'mysql', 'performance_schema', 'sys'])
  const filtered = isMySQL(connId)
    ? arr.filter((s) => !mysqlSystemSchemas.has((s.name || '').toLowerCase()))
    : arr
  return filtered.sort((a, b) => {
    const an = a.name
    const bn = b.name
    if (!an) return -1
    if (!bn) return 1
    if (an === 'public') return -1
    if (bn === 'public') return 1
    return an.localeCompare(bn)
  })
}

onMounted(async () => {
  await loadConnections()
  if (props.initialExpandedConnectionId) {
    expandedConnections.value.add(props.initialExpandedConnectionId)
    ensureDatabases(props.initialExpandedConnectionId).catch(() => {})
  }
})

// auto-expand selection path if provided
watch(
  () => props.selected,
  async (sel) => {
    if (!sel) return
    const connId = props.initialExpandedConnectionId
    if (!connId) return
    // Expand connection and databases
    expandedConnections.value.add(connId)
    await ensureDatabases(connId)

    if (sel.database) {
      const dbKey = `${connId}:${sel.database}`
      expandedDatabases.value.add(dbKey)
      await ensureMetadata(connId, sel.database)
    }

    if (sel.database && sel.schema && hasSchemas(connId)) {
      const schemaKey = `${connId}:${sel.database}:${sel.schema}`
      expandedSchemas.value.add(schemaKey)
    }

    // After DOM updates, try to focus the most specific node
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

// When searching, auto-expand connections and databases that match
async function expandForSearch(query: string) {
  const trimmed = query.trim()
  if (!trimmed) return
  const conns = filteredConnections.value
  for (const c of conns) {
    if (!expandedConnections.value.has(c.id)) {
      expandedConnections.value.add(c.id)
    }
    await ensureDatabases(c.id)
    const dbs = databasesByConn.value[c.id] || []
    for (const d of dbs) {
      if (matchesDbFilter(c.id, d.name)) {
        expandedDatabases.value.add(`${c.id}:${d.name}`)
        ensureMetadata(c.id, d.name).catch(() => {})
      }
    }
  }
}

watch(
  () => searchQuery.value,
  (q) => {
    void expandForSearch(q)
  },
  { immediate: false }
)

watch(
  () => selectedType.value?.type,
  (typeLabel) => {
    if (!typeLabel) return
    if (searchQuery.value.trim()) void expandForSearch(searchQuery.value)
  }
)

const filteredConnections = computed<Connection[]>(() => {
  const q = searchQuery.value.trim()
  // Use a stable, predictable order: newest first, tie-break by name
  const base = [...connectionsStore.connections]
    .filter((conn) => matchesTypeFilter(conn))
    .sort((a, b) => {
      const ac = Number(a.created || 0)
      const bc = Number(b.created || 0)
      if (bc !== ac) return bc - ac
      return (a.name || '').localeCompare(b.name || '')
    })
  if (!q) return base
  const qn = normalized(q)
  return base.filter((c) => {
    // match by connection label
    const label = `${c.name || ''} ${c.host || ''} ${c.type || ''}`
    if (normalized(label).includes(qn)) return true
    // match by database name if loaded
    const dbs = databasesByConn.value[c.id] || []
    if (dbs.some((d) => normalized(d.name).includes(qn))) return true
    // match by schema/table/view if metadata loaded
    const metaByDb = metadataByConnDb.value[c.id] || {}
    for (const dbName in metaByDb) {
      const meta = metaByDb[dbName]
      // schemas (if present)
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

function matchesDbFilter(connId: string, dbName: string): boolean {
  const q = searchQuery.value.trim()
  if (!q) return true
  const qn = normalized(q)
  if (normalized(dbName).includes(qn)) return true
  const meta = metadataByConnDb.value[connId]?.[dbName]
  if (!meta) return false
  // check schemas, tables, views
  const tableHit = Object.values(meta.tables || {}).some(
    (t) => normalized(t.name).includes(qn) || (t.schema && normalized(t.schema).includes(qn))
  )
  if (tableHit) return true
  const viewHit = Object.values(meta.views || {}).some(
    (v) => normalized(v.name).includes(qn) || (v.schema && normalized(v.schema).includes(qn))
  )
  return viewHit
}

function getDbLogoForType(dbType?: string): string {
  const t = (dbType || '').toString().toLowerCase()
  const found = connectionsStore.dbTypes.find((d) => d.type.toLowerCase() === t)
  return found?.logo || '/images/db-logos/all.svg'
}

function isMySQL(connId: string): boolean {
  const conn = connectionsStore.connections.find((c) => c.id === connId)
  return (conn?.type || '').toLowerCase() === 'mysql'
}

function isPostgres(connId: string): boolean {
  const conn = connectionsStore.connections.find((c) => c.id === connId)
  return (conn?.type || '').toLowerCase() === 'postgresql'
}

function isSnowflake(connId: string): boolean {
  const conn = connectionsStore.connections.find((c) => c.id === connId)
  return (conn?.type || '').toLowerCase() === 'snowflake'
}

function hasSchemas(connId: string): boolean {
  // Show schemas for PostgreSQL and Snowflake; hide for others
  return isPostgres(connId) || isSnowflake(connId)
}

function getFlatTables(connId: string, db: string): string[] {
  const meta = metadataByConnDb.value[connId]?.[db]
  if (!meta) return []
  return Object.values(meta.tables || {})
    .map((t) => t.name)
    .sort((a, b) => a.localeCompare(b))
}

function getFlatViews(connId: string, db: string): string[] {
  const meta = metadataByConnDb.value[connId]?.[db]
  if (!meta) return []
  return Object.values(meta.views || {})
    .map((v) => v.name)
    .sort((a, b) => a.localeCompare(b))
}

// Copy DDL for the current context menu object (table/view)
async function actionCopyDDLFromContext() {
  const mo = menuObj.value
  if (!mo) return
  if (mo.kind === 'table') {
    const m = findTableMeta(mo.connectionId, mo.database, mo.name, mo.schema)
    const ddl = m?.ddl?.createTable || ''
    if (ddl) await actionCopy(ddl, 'Table DDL copied')
    else toast.info('DDL not available')
  } else {
    const m = findViewMeta(mo.connectionId, mo.database, mo.name, mo.schema)
    const ddl = m?.definition || ''
    if (ddl) await actionCopy(ddl, 'View DDL copied')
    else toast.info('Definition not available')
  }
  closeContextMenuOnce()
}
</script>

<template>
  <div
    class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg divide-y divide-gray-200 overflow-hidden"
  >
    <div class="px-3 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <h3 class="text-base font-semibold leading-6 text-gray-900">Connections</h3>
      <div class="flex items-center gap-2 w-full md:w-auto min-w-0">
        <Listbox v-if="selectedType" v-model="selectedType" as="div" class="relative shrink-0">
          <ListboxButton
            class="inline-flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-slate-400 whitespace-nowrap"
          >
            <img :src="selectedType.logo" :alt="selectedType.type" class="h-4 w-4" />
            <span class="truncate max-w-[100px]">{{ selectedType.type }}</span>
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
                :value="option"
                v-slot="{ active, selected }"
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
        <div class="flex-1 min-w-0">
          <SearchInput v-model="searchQuery" placeholder="Filter..." size="sm" />
        </div>
        <button
          class="inline-flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 whitespace-nowrap"
          :disabled="isLoadingConnections"
          @click="loadConnections"
        >
          <ArrowPathIcon :class="['h-4 w-4', isLoadingConnections ? 'animate-spin' : '']" />
          Refresh
        </button>
        <button
          class="inline-flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-white bg-gray-600 border border-gray-600 rounded hover:bg-gray-500 whitespace-nowrap"
          @click="actionAddConnection"
        >
          New
        </button>
      </div>
    </div>

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
          <div v-for="conn in filteredConnections" :key="conn.id">
            <div
              class="flex items-center px-2 py-1.5 text-sm text-gray-700 rounded-md hover:bg-gray-100 cursor-pointer"
              @click="emit('select-connection', { connectionId: conn.id })"
              @contextmenu.stop.prevent="
                openContextMenu($event, { kind: 'connection', connectionId: conn.id })
              "
            >
              <component
                :is="isConnExpanded(conn.id) ? ChevronDownIcon : ChevronRightIcon"
                :class="caretClass"
                @click.stop="toggleConnection(conn.id)"
              />
              <img
                :src="getDbLogoForType(conn.type)"
                :alt="conn.type || 'db'"
                class="h-5 w-5 mr-1.5 object-contain"
              />
              <span class="font-medium">
                <template
                  v-for="(p, i) in highlightParts(conn.name || conn.host || 'Connection')"
                  :key="i"
                >
                  <span
                    v-if="p.match"
                    class="bg-yellow-200/60 rounded px-0.5"
                    v-text="p.text"
                  ></span>
                  <span v-else v-text="p.text"></span>
                </template>
              </span>
              <span v-if="conn.host && conn.port" class="ml-2 text-xs text-gray-500">
                {{ conn.host }}:{{ conn.port }}
              </span>
            </div>

            <!-- Databases under connection -->
            <div
              v-if="isConnExpanded(conn.id)"
              class="ml-4 border-l border-gray-200 pl-2 space-y-1"
            >
              <div v-if="!databasesByConn[conn.id]?.length" class="text-xs text-gray-500 px-2 py-1">
                No databases
              </div>
              <div
                v-for="db in (databasesByConn[conn.id] || []).filter((d) =>
                  matchesDbFilter(conn.id, d.name)
                )"
                :key="db.name"
              >
                <div
                  class="flex items-center px-2 py-1.5 text-sm text-gray-700 rounded-md hover:bg-gray-100 cursor-pointer"
                  :data-explorer-db="`${conn.id}:${db.name}`"
                  @click="emit('select-database', { connectionId: conn.id, database: db.name })"
                  @contextmenu.stop.prevent="
                    openContextMenu($event, {
                      kind: 'database',
                      connectionId: conn.id,
                      database: db.name
                    })
                  "
                >
                  <component
                    :is="isDbExpanded(conn.id, db.name) ? ChevronDownIcon : ChevronRightIcon"
                    :class="caretClass"
                    @click.stop="toggleDb(conn.id, db.name)"
                  />
                  <span class="font-medium">
                    <template v-for="(p, i) in highlightParts(db.name)" :key="i">
                      <span
                        v-if="p.match"
                        class="bg-yellow-200/60 rounded px-0.5"
                        v-text="p.text"
                      ></span>
                      <span v-else v-text="p.text"></span>
                    </template>
                  </span>
                </div>

                <div
                  v-if="isDbExpanded(conn.id, db.name)"
                  class="ml-4 border-l border-gray-200 pl-2 space-y-1"
                >
                  <template v-if="metadataByConnDb[conn.id]?.[db.name]">
                    <!-- Show schemas only for PostgreSQL -->
                    <template v-if="hasSchemas(conn.id)">
                      <template
                        v-for="schema in getSchemas(conn.id, db.name)"
                        :key="schema.name || 'default'"
                      >
                        <div
                          class="flex items-center px-2 py-1 text-sm text-gray-700 rounded-md hover:bg-gray-100 cursor-pointer"
                          :data-explorer-schema="`${conn.id}:${db.name}:${schema.name}`"
                          @click="toggleSchema(conn.id, db.name, schema.name)"
                          @contextmenu.stop.prevent="
                            openContextMenu($event, {
                              kind: 'schema',
                              connectionId: conn.id,
                              database: db.name,
                              schema: schema.name || ''
                            })
                          "
                        >
                          <component
                            :is="
                              isSchemaExpanded(conn.id, db.name, schema.name)
                                ? ChevronDownIcon
                                : ChevronRightIcon
                            "
                            :class="caretClass"
                          />
                          <span class="font-medium">
                            <template
                              v-for="(p, i) in highlightParts(schema.name || 'default')"
                              :key="i"
                            >
                              <span
                                v-if="p.match"
                                class="bg-yellow-200/60 rounded px-0.5"
                                v-text="p.text"
                              ></span>
                              <span v-else v-text="p.text"></span>
                            </template>
                          </span>
                        </div>
                        <div
                          v-if="isSchemaExpanded(conn.id, db.name, schema.name)"
                          class="ml-4 border-l border-gray-200 pl-2"
                        >
                          <div
                            class="text-xs uppercase tracking-wide text-gray-400 px-2 mt-1 flex items-center justify-between"
                          >
                            <span>Tables</span>
                            <span class="text-[11px] font-medium text-gray-500 normal-case">
                              {{ schema.tables.length }}
                            </span>
                          </div>
                          <div
                            v-for="t in schema.tables.filter(
                              (n) =>
                                !searchQuery || n.toLowerCase().includes(searchQuery.toLowerCase())
                            )"
                            :key="t"
                            class="flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 cursor-pointer"
                            :data-explorer-obj="`${conn.id}:${db.name}:${schema.name || ''}:table:${t}`"
                            @click.stop="
                              onOpen(conn.id, db.name, 'table', t, 'preview', schema.name)
                            "
                            @dblclick.stop="
                              onOpen(conn.id, db.name, 'table', t, 'pinned', schema.name)
                            "
                            @click.middle.stop="
                              onOpen(conn.id, db.name, 'table', t, 'pinned', schema.name)
                            "
                            @contextmenu.stop.prevent="
                              openContextMenu($event, {
                                kind: 'table',
                                connectionId: conn.id,
                                database: db.name,
                                schema: schema.name || undefined,
                                name: t
                              })
                            "
                          >
                            <ObjectIcon object-type="table" class="mr-1.5" />
                            <span>
                              <template v-for="(p, i) in highlightParts(t)" :key="i">
                                <span
                                  v-if="p.match"
                                  class="bg-yellow-200/60 rounded px-0.5"
                                  v-text="p.text"
                                ></span>
                                <span v-else v-text="p.text"></span>
                              </template>
                            </span>
                          </div>
                          <div
                            class="text-xs uppercase tracking-wide text-gray-400 px-2 mt-2 flex items-center justify-between"
                          >
                            <span>Views</span>
                            <span class="text-[11px] font-medium text-gray-500 normal-case">
                              {{ schema.views.length }}
                            </span>
                          </div>
                          <div
                            v-for="v in schema.views.filter(
                              (n) =>
                                !searchQuery || n.toLowerCase().includes(searchQuery.toLowerCase())
                            )"
                            :key="v"
                            class="flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 cursor-pointer"
                            :data-explorer-obj="`${conn.id}:${db.name}:${schema.name || ''}:view:${v}`"
                            @click.stop="
                              onOpen(conn.id, db.name, 'view', v, 'preview', schema.name)
                            "
                            @dblclick.stop="
                              onOpen(conn.id, db.name, 'view', v, 'pinned', schema.name)
                            "
                            @click.middle.stop="
                              onOpen(conn.id, db.name, 'view', v, 'pinned', schema.name)
                            "
                            @contextmenu.stop.prevent="
                              openContextMenu($event, {
                                kind: 'view',
                                connectionId: conn.id,
                                database: db.name,
                                schema: schema.name || undefined,
                                name: v
                              })
                            "
                          >
                            <ObjectIcon object-type="view" class="mr-1.5" />
                            <span>
                              <template v-for="(p, i) in highlightParts(v)" :key="i">
                                <span
                                  v-if="p.match"
                                  class="bg-yellow-200/60 rounded px-0.5"
                                  v-text="p.text"
                                ></span>
                                <span v-else v-text="p.text"></span>
                              </template>
                            </span>
                          </div>
                        </div>
                      </template>
                    </template>
                    <!-- Flat lists for DBs without schemas (e.g., MySQL) -->
                    <template v-else>
                      <div
                        class="text-xs uppercase tracking-wide text-gray-400 px-2 mt-1 flex items-center justify-between"
                      >
                        <span>Tables</span>
                        <span class="text-[11px] font-medium text-gray-500 normal-case">
                          {{ getFlatTables(conn.id, db.name).length }}
                        </span>
                      </div>
                      <div
                        v-for="t in getFlatTables(conn.id, db.name).filter(
                          (n) => !searchQuery || n.toLowerCase().includes(searchQuery.toLowerCase())
                        )"
                        :key="t"
                        class="flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 cursor-pointer"
                        :data-explorer-obj="`${conn.id}:${db.name}::table:${t}`"
                        @click.stop="onOpen(conn.id, db.name, 'table', t, 'preview')"
                        @dblclick.stop="onOpen(conn.id, db.name, 'table', t, 'pinned')"
                        @click.middle.stop="onOpen(conn.id, db.name, 'table', t, 'pinned')"
                        @contextmenu.stop.prevent="
                          openContextMenu($event, {
                            kind: 'table',
                            connectionId: conn.id,
                            database: db.name,
                            name: t
                          })
                        "
                      >
                        <ObjectIcon object-type="table" class="mr-1.5" />
                        <span>
                          <template v-for="(p, i) in highlightParts(t)" :key="i">
                            <span
                              v-if="p.match"
                              class="bg-yellow-200/60 rounded px-0.5"
                              v-text="p.text"
                            ></span>
                            <span v-else v-text="p.text"></span>
                          </template>
                        </span>
                      </div>
                      <div
                        class="text-xs uppercase tracking-wide text-gray-400 px-2 mt-2 flex items-center justify-between"
                      >
                        <span>Views</span>
                        <span class="text-[11px] font-medium text-gray-500 normal-case">
                          {{ getFlatViews(conn.id, db.name).length }}
                        </span>
                      </div>
                      <div
                        v-for="v in getFlatViews(conn.id, db.name).filter(
                          (n) => !searchQuery || n.toLowerCase().includes(searchQuery.toLowerCase())
                        )"
                        :key="v"
                        class="flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 cursor-pointer"
                        :data-explorer-obj="`${conn.id}:${db.name}::view:${v}`"
                        @click.stop="onOpen(conn.id, db.name, 'view', v, 'preview')"
                        @dblclick.stop="onOpen(conn.id, db.name, 'view', v, 'pinned')"
                        @click.middle.stop="onOpen(conn.id, db.name, 'view', v, 'pinned')"
                        @contextmenu.stop.prevent="
                          openContextMenu($event, {
                            kind: 'view',
                            connectionId: conn.id,
                            database: db.name,
                            name: v
                          })
                        "
                      >
                        <ObjectIcon object-type="view" class="mr-1.5" />
                        <span>
                          <template v-for="(p, i) in highlightParts(v)" :key="i">
                            <span
                              v-if="p.match"
                              class="bg-yellow-200/60 rounded px-0.5"
                              v-text="p.text"
                            ></span>
                            <span v-else v-text="p.text"></span>
                          </template>
                        </span>
                      </div>
                    </template>
                  </template>
                  <div v-else class="text-xs text-gray-500 px-2 py-1">Loading metadata…</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <teleport to="body">
      <div v-if="hasContextMenu">
        <div class="fixed inset-0 z-40" @click="closeContextMenuOnce"></div>
        <div
          class="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 text-sm"
          :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px', minWidth: '200px' }"
        >
          <!-- Connection menu -->
          <template v-if="menuTarget.kind === 'connection'">
            <button
              class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
              @click="onContextTestConnection"
            >
              Test connection
            </button>
            <button
              class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
              @click="onContextRefreshDatabases"
            >
              Refresh
            </button>
            <div class="my-1 border-t border-gray-100"></div>
            <button
              class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
              @click="
                menuTarget.kind === 'connection'
                  ? actionEditConnection(menuTarget.connectionId)
                  : undefined
              "
            >
              Edit
            </button>
            <button
              class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
              @click="
                menuTarget.kind === 'connection'
                  ? actionCloneConnection(menuTarget.connectionId)
                  : undefined
              "
            >
              Clone
            </button>
            <button
              class="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-red-600"
              @click="
                menuTarget.kind === 'connection'
                  ? actionDeleteConnection(menuTarget.connectionId)
                  : undefined
              "
            >
              Delete
            </button>
          </template>
          <!-- Database menu -->
          <template v-else-if="menuTarget.kind === 'database'">
            <button
              class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
              @click="onContextRefreshMetadata"
            >
              Refresh metadata
            </button>
            <button
              class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
              @click="onContextShowDiagram"
            >
              Show diagram
            </button>
            <button
              class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
              @click="onContextCopyDatabaseName"
            >
              Copy name
            </button>
          </template>
          <!-- Schema menu -->
          <template v-else-if="menuTarget.kind === 'schema'">
            <button
              class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
              @click="onContextRefreshMetadata"
            >
              Refresh metadata
            </button>
            <button
              class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
              @click="onContextCopySchemaName"
            >
              Copy name
            </button>
          </template>
          <!-- Table/View menu -->
          <template v-else-if="menuTarget.kind === 'table' || menuTarget.kind === 'view'">
            <button
              v-if="menuObj"
              class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
              @click="onContextOpenData(false)"
            >
              Open Data
            </button>
            <button
              v-if="menuObj"
              class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
              @click="onContextOpenStructure(false)"
            >
              Open Structure
            </button>
            <div class="my-1 border-t border-gray-100"></div>
            <button
              v-if="menuObj"
              class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
              @click="onContextOpenData(true)"
            >
              Open Data in Right Split
            </button>
            <button
              v-if="menuObj"
              class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
              @click="onContextOpenStructure(true)"
            >
              Open Structure in Right Split
            </button>
            <button
              v-if="menuObj"
              class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
              @click="onContextCopyObjectName"
            >
              Copy name
            </button>
            <button
              v-if="menuObj"
              class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
              :disabled="
                menuObj.kind === 'table'
                  ? !findTableMeta(
                      menuObj.connectionId,
                      menuObj.database,
                      menuObj.name,
                      menuObj.schema
                    )?.ddl?.createTable
                  : !findViewMeta(
                      menuObj.connectionId,
                      menuObj.database,
                      menuObj.name,
                      menuObj.schema
                    )?.definition
              "
              @click="actionCopyDDLFromContext()"
            >
              Copy DDL
            </button>
          </template>
        </div>
      </div>
    </teleport>
  </div>
</template>
