<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, provide } from 'vue'
import { useDebounceFn, useResizeObserver } from '@vueuse/core'
import { Boxes } from 'lucide-vue-next'
import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useConnectionTreeLogic } from '@/composables/useConnectionTreeLogic'
import { useTreeContextMenu, type ContextTarget } from '@/composables/useTreeContextMenu'
import { useConnectionActions } from '@/composables/useConnectionActions'
import { useDatabaseCapabilities } from '@/composables/useDatabaseCapabilities'
import { useTreeSearch } from '@/composables/useTreeSearch'
import { useSqlConsoleActions } from '@/composables/useSqlConsoleActions'
import type { Connection } from '@/types/connections'
import type { DiagramFocusTarget, ShowDiagramPayload } from '@/types/diagram'
import type { SQLRoutineMeta, SQLSequenceMeta, SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'
import { getConnectionKindFromSpec, getConnectionTypeLabel, isDatabaseKind } from '@/types/specs'
import { parseRoutineName } from '@/utils/routineUtils'
import ExplorerContextMenu from './ExplorerContextMenu.vue'
import ConnectionTreeItem from './tree/ConnectionTreeItem.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

type ObjectType = 'table' | 'view' | 'function' | 'procedure' | 'sequence'

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
  typeFilters?: string[]
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
  (
    e: 'open-sql-console',
    payload: {
      connectionId: string
      database?: string
      sqlScope: 'database' | 'connection'
    }
  ): void
  (
    e: 'open-file-console',
    payload: {
      connectionId: string
      connectionType: 'files' | 's3'
      basePath?: string
    }
  ): void
  (e: 'expanded-connection', payload: { connectionId: string }): void
  (e: 'show-diagram', payload: ShowDiagramPayload): void
  (e: 'select-connection', payload: { connectionId: string; mode?: 'preview' | 'pinned' }): void
  (
    e: 'select-database',
    payload: {
      connectionId: string
      database: string
      mode?: 'preview' | 'pinned'
    }
  ): void
  (e: 'select-file', payload: { connectionId: string; path: string; entry?: FileSystemEntry }): void
  (e: 'request-file-entries', payload: { connectionId: string }): void
}>()

const MIN_SEARCH_LENGTH = 2

const connectionsStore = useConnectionsStore()
const navigationStore = useExplorerNavigationStore()
const fileExplorerStore = useFileExplorerStore()
const { openTableInSqlConsole, openFileInDuckDbConsole } = useSqlConsoleActions()
const treeLogic = useConnectionTreeLogic()

// Use composables for context menu and actions
const contextMenu = useTreeContextMenu()
const actions = useConnectionActions({
  open: (payload) => emit('open', payload),
  openFile: (payload) => emit('open-file', payload),
  showDiagram: (payload) => emit('show-diagram', payload)
})

const showConnectionDeleteDialog = computed({
  get: () => actions.showDeleteConfirm.value,
  set: (value: boolean) => {
    actions.showDeleteConfirm.value = value
  }
})
const pendingDeleteConnectionName = actions.pendingDeleteName
const confirmConnectionDelete = actions.confirmDeleteConnection
const cancelConnectionDelete = actions.cancelDeleteConnection

const deleteConfirmMessage = computed(() => {
  const name = pendingDeleteConnectionName.value || 'this connection'
  return `Delete ${name}? This cannot be undone.`
})

const isLoadingConnections = ref(false)

// Hide table size labels when the sidebar is narrow so table names stay readable.
// Measured on the outer sidebar card element (includes padding).
const sidebarCardRef = ref<HTMLElement | null>(null)
const sidebarCardWidth = ref(0)

useResizeObserver(sidebarCardRef, (entries) => {
  const entry = entries[0]
  if (!entry) return
  sidebarCardWidth.value = entry.contentRect.width
})

const MIN_WIDTH_FOR_TABLE_SIZES = 260

const treeShowTableSizes = computed(() => {
  // If not measured yet, default to showing sizes.
  if (!sidebarCardWidth.value) return true
  return sidebarCardWidth.value >= MIN_WIDTH_FOR_TABLE_SIZES
})

provide('treeShowTableSizes', treeShowTableSizes)
const loadError = ref<string | null>(null)
const searchQuery = computed(() => props.searchQuery || '')

// Only apply filtering/highlighting when query meets minimum length.
// Keeps UX consistent with the "Type at least N characters" hint.
const effectiveSearchQuery = computed(() => {
  const trimmed = searchQuery.value.trim()
  return trimmed.length >= MIN_SEARCH_LENGTH ? searchQuery.value : ''
})

// Provide search query, caret class, and selection info to child components (avoid prop drilling)
provide('treeSearchQuery', effectiveSearchQuery)
provide('treeCaretClass', 'w-[16px] h-[16px] shrink-0 flex-none text-gray-400 mr-1.5')
provide(
  'treeSelection',
  computed(() => props.selected || {})
)

// Single source of truth for tree search - used by ExplorerSidebarConnections
// and provided to children (ConnectionTreeItem) via inject
const treeSearch = useTreeSearch(() => effectiveSearchQuery.value, {
  typeFilters: () => props.typeFilters
})
provide('treeSearch', treeSearch)

// Computed for context menu
const canCopyDDL = computed(() => {
  const mo = contextMenu.menuObj.value
  if (!mo) return false
  return actions.canCopyDDL(mo.connectionId, mo.database, mo.name, mo.kind, mo.schema)
})

// Database creation capabilities based on context menu target
const canCreateDatabase = computed(() => {
  const target = contextMenu.contextTarget.value
  if (!target || target.kind !== 'connection') return false
  const conn = connectionsStore.connections.find((c) => c.id === target.connectionId)
  if (!conn) return false
  const kind = getConnectionKindFromSpec(conn.spec)
  if (!isDatabaseKind(kind)) return false
  const dbType = getConnectionTypeLabel(conn.spec, conn.type)
  if (!dbType) return false
  const capabilities = useDatabaseCapabilities(dbType)
  return capabilities.canCreateDatabase.value
})

const canCreateSchema = computed(() => {
  const target = contextMenu.contextTarget.value
  if (!target || target.kind !== 'database') return false
  const conn = connectionsStore.connections.find((c) => c.id === target.connectionId)
  if (!conn) return false
  const kind = getConnectionKindFromSpec(conn.spec)
  if (!isDatabaseKind(kind)) return false
  const dbType = getConnectionTypeLabel(conn.spec, conn.type)
  if (!dbType) return false
  const capabilities = useDatabaseCapabilities(dbType)
  return capabilities.canCreateSchema.value
})

// Check if the context menu target is a file connection
const isFileConnection = computed(() => {
  const target = contextMenu.contextTarget.value
  if (!target || target.kind !== 'connection') return false
  return treeLogic.isFileConnection(target.connectionId)
})

const searchTooShort = computed(() => {
  const len = searchQuery.value.trim().length
  return len > 0 && len < MIN_SEARCH_LENGTH
})

// Load file entries for all file-type connections when search is active
// This ensures S3/file connections are searchable
const loadFileEntriesForSearch = useDebounceFn(async () => {
  const query = searchQuery.value.trim()
  if (query.length < MIN_SEARCH_LENGTH) return

  // Get all file-type connections
  const fileConnections = connectionsStore.connections.filter((conn) =>
    treeLogic.isFileConnection(conn.id)
  )

  // Load entries for each file connection that hasn't been loaded yet
  for (const conn of fileConnections) {
    const entries = fileExplorerStore.getEntries(conn.id)
    if (entries.length === 0 && !fileExplorerStore.isLoading(conn.id)) {
      void fileExplorerStore.loadEntries(conn.id)
    }
  }
}, 300)

// Trigger file entry loading when search query changes
watch(searchQuery, () => {
  void loadFileEntriesForSearch()
})

// Sort connections by creation date (newest first), with name as tiebreaker
const sortConnections = (connections: Connection[]): Connection[] => {
  return [...connections].sort((a, b) => {
    const ac = Number(a.created || 0)
    const bc = Number(b.created || 0)
    if (bc !== ac) return bc - ac
    return (a.name || '').localeCompare(b.name || '')
  })
}

// Computed for filtered connections using composable
const filteredConnections = computed<Connection[]>(() => {
  const base = connectionsStore.connections
  const typeFiltered =
    props.typeFilters && props.typeFilters.length
      ? base.filter((conn) => treeLogic.matchesTypeFilters(conn, props.typeFilters!))
      : base

  // If query is below minimum length, treat as "no search" but still sort
  if (!effectiveSearchQuery.value.trim()) return sortConnections(typeFiltered)

  return treeSearch.filterConnections(typeFiltered)
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
  let obj: SQLTableMeta | SQLViewMeta | SQLRoutineMeta | SQLSequenceMeta | undefined
  if (type === 'table') obj = navigationStore.findTableMeta(connId, db, name, schema)
  else if (type === 'view') obj = navigationStore.findViewMeta(connId, db, name, schema)
  else if (type === 'sequence') obj = navigationStore.findSequenceMeta(connId, db, name, schema)
  else {
    const { routineName, signature } = parseRoutineName(name)
    obj = navigationStore.findRoutineMeta(
      connId,
      db,
      routineName,
      type === 'function' ? 'function' : 'procedure',
      schema,
      signature
    )
  }

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
  contextMenu.close()
  switch (payload.action) {
    case 'sql-console':
      // Open SQL console for connection or database scope
      if (t.kind === 'connection') {
        emit('open-sql-console', {
          connectionId: t.connectionId,
          sqlScope: 'connection'
        })
      } else if (t.kind === 'database') {
        emit('open-sql-console', {
          connectionId: t.connectionId,
          database: t.database,
          sqlScope: 'database'
        })
      }
      break
    case 'file-console':
      // Open DuckDB console for file/S3 connections
      if (t.kind === 'connection') {
        const conn = connectionsStore.connectionByID(t.connectionId)
        const kind = getConnectionKindFromSpec(conn?.spec)
        if (kind !== 'files' && kind !== 's3') {
          return
        }
        const isS3 = kind === 's3'
        const basePath = isS3 ? conn?.spec?.s3?.scope?.bucket : conn?.spec?.files?.basePath
        emit('open-file-console', {
          connectionId: t.connectionId,
          connectionType: isS3 ? 's3' : 'files',
          basePath: basePath
        })
      }
      break
    case 'test-connection':
      if (t.kind === 'connection') actions.testConnection(t.connectionId)
      break
    case 'refresh-databases':
      if (t.kind === 'connection') actions.refreshDatabases(t.connectionId)
      break
    case 'toggle-system-databases':
      if (t.kind === 'connection') {
        navigationStore.toggleShowSystemDatabasesFor(t.connectionId)
        // Connection-level toggle should affect database-level system objects too.
        // Refresh metadata for any expanded databases under this connection.
        const prefix = `${t.connectionId}:`
        for (const dbKey of navigationStore.expandedDatabases) {
          if (!dbKey.startsWith(prefix)) continue
          const dbName = dbKey.slice(prefix.length)
          if (!dbName) continue
          navigationStore.invalidateMetadata(t.connectionId, dbName)
          navigationStore.ensureMetadata(t.connectionId, dbName).catch(() => {})
        }
      }
      break
    case 'create-database':
      if (t.kind === 'connection') actions.createDatabase(t.connectionId)
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
    case 'toggle-system-objects':
      if (t.kind === 'database') {
        navigationStore.toggleShowSystemObjectsFor(t.connectionId, t.database)
        navigationStore.invalidateMetadata(t.connectionId, t.database)
        const dbKey = `${t.connectionId}:${t.database}`
        if (navigationStore.isDatabaseExpanded(dbKey)) {
          navigationStore.ensureMetadata(t.connectionId, t.database).catch(() => {})
        }
      }
      break
    case 'create-schema':
      if (t.kind === 'database') actions.createSchema(t.connectionId, t.database)
      break
    case 'show-diagram':
      if (t.kind === 'database') actions.showDiagram(t.connectionId, t.database)
      else if (t.kind === 'table' || t.kind === 'view') {
        const focus: DiagramFocusTarget = { type: t.kind, name: t.name, schema: t.schema }
        actions.showDiagram(t.connectionId, t.database, focus)
      }
      break
    case 'copy-database-name':
      if (t.kind === 'database') actions.copyToClipboard(t.database, 'Database name copied')
      break
    case 'copy-schema-name':
      if (t.kind === 'schema') actions.copyToClipboard(t.schema, 'Schema name copied')
      break
    case 'open':
      if (
        t.kind === 'table' ||
        t.kind === 'view' ||
        t.kind === 'function' ||
        t.kind === 'procedure'
      )
        actions.openObject(
          t.connectionId,
          t.database,
          t.kind,
          t.name,
          'preview',
          t.schema,
          undefined,
          payload.openInRightSplit
        )
      else if (t.kind === 'file')
        actions.openFile(t.connectionId, t.path, 'preview', undefined, payload.openInRightSplit)
      break
    case 'copy-object-name':
      if (
        t.kind === 'table' ||
        t.kind === 'view' ||
        t.kind === 'function' ||
        t.kind === 'procedure'
      )
        actions.copyToClipboard(t.name, 'Object name copied')
      break
    case 'copy-ddl':
      if (
        t.kind === 'table' ||
        t.kind === 'view' ||
        t.kind === 'function' ||
        t.kind === 'procedure'
      )
        void actions.copyDDL(t.connectionId, t.database, t.name, t.kind, t.schema)
      break
    case 'copy-file-name':
      if (t.kind === 'file') actions.copyToClipboard(t.name, 'File name copied')
      break
    case 'copy-file-path':
      if (t.kind === 'file') actions.copyToClipboard(t.path, 'File path copied')
      break
    case 'open-in-sql-console':
      if (t.kind === 'table' || t.kind === 'view') {
        openTableInSqlConsole({
          connectionId: t.connectionId,
          database: t.database,
          tableName: t.name,
          schema: t.schema
        })
      }
      break
    case 'insert-into-console':
      if (t.kind === 'file') {
        openFileInDuckDbConsole({
          connectionId: t.connectionId,
          filePath: t.path,
          fileName: t.name,
          isDir: t.isDir,
          format: t.format
        })
      }
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
  isDir?: boolean
  isTable?: boolean
  format?: string
}) {
  contextMenu.open(payload.event, {
    kind: 'file',
    connectionId: payload.connectionId,
    path: payload.path,
    name: payload.name,
    isDir: payload.isDir,
    isTable: payload.isTable,
    format: payload.format
  })
}

onMounted(async () => {
  await loadConnections()
  // Only auto-expand and load databases when an initial connection is provided (focus restore).
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
const searchRunId = ref(0)
const isSearchExpanding = ref(false)

async function expandForSearch(query: string, runId: number) {
  const trimmed = query.trim()
  if (!trimmed) {
    if (runId === searchRunId.value) {
      isSearchExpanding.value = false
    }
    return
  }
  const conns =
    props.typeFilters && props.typeFilters.length
      ? connectionsStore.connections.filter((conn) =>
          treeLogic.matchesTypeFilters(conn, props.typeFilters!)
        )
      : connectionsStore.connections
  for (const c of conns) {
    if (runId !== searchRunId.value) return
    if (!navigationStore.isConnectionExpanded(c.id)) {
      navigationStore.expandConnection(c.id)
    }
    if (treeLogic.isFileConnection(c.id)) {
      emit('request-file-entries', { connectionId: c.id })
    } else {
      await navigationStore.ensureDatabases(c.id)
      if (runId !== searchRunId.value) return
      const dbs = navigationStore.databasesState[c.id] || []
      for (const d of dbs) {
        if (runId !== searchRunId.value) return

        // IMPORTANT: Make search complete for DB objects.
        // If metadata isn't loaded yet, table/view name searches cannot match.
        // We load metadata best-effort for each database during an active search run.
        if (
          !navigationStore.isMetadataLoading(c.id, d.name) &&
          !navigationStore.getMetadata(c.id, d.name)
        ) {
          try {
            await navigationStore.ensureMetadata(c.id, d.name)
          } catch {
            // ignore; best-effort preloading for search
          }
        }
        if (runId !== searchRunId.value) return

        if (matchesDbFilter(c.id, d.name)) {
          navigationStore.expandDatabase(`${c.id}:${d.name}`)

          // For schema-based DBs (Postgres/Snowflake), expand schemas that contain matches
          if (runId !== searchRunId.value) return
          if (treeLogic.hasSchemas(c.id)) {
            const meta = navigationStore.getMetadata(c.id, d.name)
            const q = effectiveSearchQuery.value.trim().toLowerCase()
            if (meta && q) {
              const schemasToExpand = new Set<string>()

              for (const table of Object.values(meta.tables || {})) {
                if (
                  (table.name || '').toLowerCase().includes(q) ||
                  (table.schema || '').toLowerCase().includes(q)
                ) {
                  if (table.schema) schemasToExpand.add(table.schema)
                }
              }

              for (const view of Object.values(meta.views || {})) {
                if (
                  (view.name || '').toLowerCase().includes(q) ||
                  (view.schema || '').toLowerCase().includes(q)
                ) {
                  if (view.schema) schemasToExpand.add(view.schema)
                }
              }

              for (const fn of Object.values(meta.functions || {})) {
                const signature = fn.signature ? `(${fn.signature})` : ''
                const label = `${fn.name || ''}${signature}`.toLowerCase()
                if (label.includes(q) || (fn.schema || '').toLowerCase().includes(q)) {
                  if (fn.schema) schemasToExpand.add(fn.schema)
                }
              }

              for (const proc of Object.values(meta.procedures || {})) {
                const signature = proc.signature ? `(${proc.signature})` : ''
                const label = `${proc.name || ''}${signature}`.toLowerCase()
                if (label.includes(q) || (proc.schema || '').toLowerCase().includes(q)) {
                  if (proc.schema) schemasToExpand.add(proc.schema)
                }
              }

              const schemasUnknown = (meta as { schemas?: unknown }).schemas
              if (Array.isArray(schemasUnknown)) {
                for (const s of schemasUnknown) {
                  if (typeof s === 'string' && (s || '').toLowerCase().includes(q)) {
                    schemasToExpand.add(s)
                  }
                }
              }

              for (const schema of schemasToExpand) {
                if (runId !== searchRunId.value) return
                navigationStore.expandSchema(`${c.id}:${d.name}:${schema}`)
              }
            }
          }
        }
      }
    }
  }
  if (runId === searchRunId.value) {
    isSearchExpanding.value = false
  }
}

const scheduleSearchExpansion = (query: string) => {
  const runId = ++searchRunId.value
  if (!shouldExpandSearch(query)) {
    isSearchExpanding.value = false
    return
  }
  isSearchExpanding.value = true
  void expandForSearch(query, runId)
}

const debouncedExpandForSearch = useDebounceFn((query: string) => {
  scheduleSearchExpansion(query)
}, 250)

function shouldExpandSearch(query: string): boolean {
  return query.trim().length >= MIN_SEARCH_LENGTH
}

function matchesDbFilter(connId: string, dbName: string): boolean {
  if (!effectiveSearchQuery.value.trim()) return true
  return treeSearch.matchesDatabaseFilter(connId, dbName)
}

watch(
  () => searchQuery.value,
  (q) => {
    if (shouldExpandSearch(q)) {
      debouncedExpandForSearch(q)
    } else {
      searchRunId.value++
      isSearchExpanding.value = false
    }
  },
  { immediate: false }
)

// Track previous filter state to avoid unnecessary re-runs
let previousTypeFilters: string[] = []

watch(
  () => props.typeFilters,
  (filters, _oldFilters) => {
    // Skip if filters haven't actually changed
    if (
      JSON.stringify(filters?.slice().sort()) ===
      JSON.stringify(previousTypeFilters?.slice().sort())
    ) {
      return
    }

    previousTypeFilters = filters ? [...filters] : []

    // Only expand if query meets minimum length
    if (shouldExpandSearch(searchQuery.value)) {
      debouncedExpandForSearch(searchQuery.value)
    } else {
      searchRunId.value++
      isSearchExpanding.value = false
    }
  }
)
</script>

<template>
  <!-- Enhanced sidebar with gradient background and floating effect -->
  <div
    ref="sidebarCardRef"
    class="bg-linear-to-br from-white via-slate-50/50 to-white dark:from-gray-850 dark:via-gray-850 dark:to-gray-900 shadow-xl dark:shadow-gray-900/50 rounded-2xl overflow-hidden h-[calc(100vh-140px)] flex flex-col transition-all duration-300 hover:shadow-2xl dark:hover:shadow-gray-900/70 border border-slate-200/50 dark:border-gray-700"
  >
    <!-- Scrollable tree content area with smooth scrolling and custom scrollbar -->
    <div class="flex-1 overflow-y-auto overscroll-contain p-3 scrollbar-thin">
      <!-- Loading state with centered spinner and blue-green gradient -->
      <div
        v-if="isLoadingConnections"
        class="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400"
      >
        <div
          class="relative w-16 h-16 mb-4 animate-spin rounded-full bg-linear-to-tr from-blue-500 to-teal-500 p-1"
        >
          <div class="bg-white dark:bg-gray-850 rounded-full w-full h-full"></div>
        </div>
        <p class="text-sm font-medium text-slate-700 dark:text-slate-300">Loading connections...</p>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Please wait</p>
      </div>

      <!-- Main content area (show connections even if there was a load error) -->
      <div v-else>
        <!-- Empty/searching state -->
        <template v-if="!filteredConnections.length">
          <div
            v-if="isSearchExpanding"
            class="flex flex-col items-center justify-center py-20 px-6 text-slate-500 dark:text-slate-400"
          >
            <svg class="animate-spin h-8 w-8 text-slate-400 mb-3" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
                fill="none"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            <p class="text-sm font-medium">Searching connections…</p>
            <p class="text-xs mt-1 text-center">
              Loading metadata that matches "{{ searchQuery }}"
            </p>
          </div>
          <div v-else class="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div
              class="bg-linear-to-br from-slate-100 to-slate-50 dark:from-gray-800 dark:to-gray-700 rounded-full p-6 mb-5 shadow-inner border border-slate-200 dark:border-gray-700"
            >
              <Boxes class="h-10 w-10 text-slate-400 dark:text-gray-500" />
            </div>
            <p class="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">
              No connections found
            </p>
            <p class="text-sm text-slate-500 dark:text-slate-400 text-center">
              <template v-if="searchTooShort">
                Type at least {{ MIN_SEARCH_LENGTH }} characters to search across all connections.
              </template>
              <template v-else>
                {{ searchQuery ? 'Try adjusting your search' : 'Add a connection to get started' }}
              </template>
            </p>
          </div>
        </template>

        <!-- Connection tree with improved spacing and animations -->
        <div v-else class="space-y-1">
          <ConnectionTreeItem
            v-for="conn in filteredConnections"
            :key="conn.id"
            :connection="conn"
            :is-expanded="navigationStore.isConnectionExpanded(conn.id)"
            :is-file-connection="treeLogic.isFileConnection(conn.id)"
            :databases="
              (navigationStore.getDatabases(conn.id) || []).filter((d) =>
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
        :canCreateDatabase="canCreateDatabase"
        :canCreateSchema="canCreateSchema"
        :isFileConnection="isFileConnection"
        @menu-action="onMenuAction"
        @close="contextMenu.close"
      />
    </div>
    <ConfirmDialog
      v-model:is-open="showConnectionDeleteDialog"
      title="Delete connection?"
      :description="deleteConfirmMessage"
      confirm-label="Delete"
      cancel-label="Cancel"
      :danger="true"
      @confirm="confirmConnectionDelete"
      @cancel="cancelConnectionDelete"
    />
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

.dark .scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: rgb(75, 85, 99);
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background-color: rgb(156, 163, 175);
}

.dark .scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background-color: rgb(107, 114, 128);
}

/* For Firefox */
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: rgb(209, 213, 219) transparent;
}

.dark .scrollbar-thin {
  scrollbar-color: rgb(75, 85, 99) transparent;
}
</style>
