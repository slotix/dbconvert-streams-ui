<script setup lang="ts">
import { ref, computed, inject, watch, onMounted, onUnmounted, nextTick, provide } from 'vue'
import { useDebounceFn, useResizeObserver } from '@vueuse/core'
import { Boxes, ChevronsDown, ChevronsUp, Loader2, Menu, Plus } from 'lucide-vue-next'
import { useConnectionsStore } from '@/stores/connections'
import ConnectionTypeFilter from '@/components/common/ConnectionTypeFilter.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import { useExplorerNavigationStore, type ObjectType } from '@/stores/explorerNavigation'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useConnectionTreeLogic } from '@/composables/useConnectionTreeLogic'
import { useTreeContextMenu, type ContextTarget } from '@/composables/useTreeContextMenu'
import { useConnectionActions } from '@/composables/useConnectionActions'
import { useDatabaseCapabilities } from '@/composables/useDatabaseCapabilities'
import { useTreeSearch } from '@/composables/useTreeSearch'
import { useSqlConsoleActions } from '@/composables/useSqlConsoleActions'
import { useDesktopMode } from '@/composables/useDesktopMode'
import { useToast } from 'vue-toastification'
import type { Connection } from '@/types/connections'
import type { DiagramFocusTarget, ShowDiagramPayload } from '@/types/diagram'
import type { SQLRoutineMeta, SQLSequenceMeta, SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'
import { getConnectionKindFromSpec, getConnectionTypeLabel, isDatabaseKind } from '@/types/specs'
import { parseRoutineName } from '@/utils/routineUtils'
import { getTreeKeyboardIntent, type TreeKeyboardNodeState } from '@/utils/treeKeyboardNavigation'
import ExplorerContextMenu from './ExplorerContextMenu.vue'
import ConnectionTreeItem from './tree/ConnectionTreeItem.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const props = defineProps<{
  initialExpandedConnectionId?: string
  selected?: {
    connectionId?: string
    database?: string
    schema?: string
    type?: ObjectType | null
    name?: string | null
    filePath?: string
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
  (e: 'update:searchQuery', value: string): void
  (e: 'update:typeFilters', value: string[]): void
  (e: 'add-connection'): void
}>()

const MIN_SEARCH_LENGTH = 2
const MAX_FILE_SUBTREE_EXPAND_FOLDERS = 250
const FILE_SUBTREE_PROGRESS_STEP = 100

const sidebarMenuToggle = inject<{ openSidebar: () => void }>('sidebarMenuToggle')
const connectionsStore = useConnectionsStore()
const navigationStore = useExplorerNavigationStore()
const fileExplorerStore = useFileExplorerStore()
const { openTableInSqlConsole, openFileInDuckDbConsole } = useSqlConsoleActions()
const treeLogic = useConnectionTreeLogic()
const { isDesktop } = useDesktopMode()
const toast = useToast()

const WINDOWS_ABSOLUTE_PATH = /^[a-zA-Z]:[\\/]|^\\\\/

function isAbsolutePath(path: string): boolean {
  return path.startsWith('/') || WINDOWS_ABSOLUTE_PATH.test(path)
}

function joinSystemPath(basePath: string, relativePath: string): string {
  if (!basePath) return relativePath
  const separator = basePath.includes('\\') ? '\\' : '/'
  const normalizedRel =
    separator === '\\' ? relativePath.replace(/\//g, '\\') : relativePath.replace(/\\/g, '/')
  const trimmedBase = basePath.endsWith(separator) ? basePath.slice(0, -1) : basePath
  const trimmedRel = normalizedRel.startsWith(separator) ? normalizedRel.slice(1) : normalizedRel
  return `${trimmedBase}${separator}${trimmedRel}`
}

function resolveSystemPath(path: string, basePath: string): string {
  if (!path) return basePath || ''
  if (isAbsolutePath(path) || (basePath && path.startsWith(basePath))) return path
  return joinSystemPath(basePath, path)
}

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
const treeScrollRef = ref<HTMLElement | null>(null)
const sidebarCardWidth = ref(0)
const focusedTreeNode = ref<HTMLElement | null>(null)

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

// Check if the context menu target belongs to a file connection
const isFileConnection = computed(() => {
  const target = contextMenu.contextTarget.value
  if (!target) return false
  return treeLogic.isFileConnection(target.connectionId)
})

// Check if the context menu target belongs to a LOCAL file connection (not S3/cloud)
const isLocalFileConnection = computed(() => {
  const target = contextMenu.contextTarget.value
  if (!target) return false
  const conn = connectionsStore.connections.find((c) => c.id === target.connectionId)
  if (!conn) return false
  // Local files have spec.files.basePath, cloud connections have spec.s3/gcs/azure
  return !!conn.spec?.files?.basePath
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

const hasExpandedFileFolders = computed(() =>
  Object.values(fileExplorerStore.expandedFoldersByConnection).some((expanded) => expanded.size > 0)
)

const hasExpandedTreeState = computed(
  () =>
    navigationStore.expandedConnections.size > 0 ||
    navigationStore.expandedDatabases.size > 0 ||
    navigationStore.expandedSchemas.size > 0 ||
    hasExpandedFileFolders.value
)

const canExpandFirstLevel = computed(() => filteredConnections.value.length > 0)

function collapseAllTreeNodes() {
  navigationStore.collapseAllExpansions()
  fileExplorerStore.collapseAllFolders()
}

function expandFirstLevel() {
  const connectionIds = filteredConnections.value.map((conn) => conn.id)
  navigationStore.expandConnectionsOnly(connectionIds)
  fileExplorerStore.collapseAllFolders()

  for (const connectionId of connectionIds) {
    if (treeLogic.isFileConnection(connectionId)) {
      emit('request-file-entries', { connectionId })
    } else {
      navigationStore.ensureDatabases(connectionId).catch(() => {})
    }
  }
}

const TREE_NAV_KEYS = new Set([
  'Home',
  'End',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Enter',
  'Escape',
  'Esc',
  '*',
  'Multiply'
])

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.isContentEditable ||
    el.closest('.cm-editor') !== null
  )
}

function selectorEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }
  return value.replace(/["\\]/g, '\\$&')
}

function getVisibleTreeNodes(): HTMLElement[] {
  if (!sidebarCardRef.value) return []
  return Array.from(sidebarCardRef.value.querySelectorAll<HTMLElement>('[data-tree-node="true"]'))
}

function syncTreeTabStop(preferredNode?: HTMLElement | null) {
  const nodes = getVisibleTreeNodes()
  if (!nodes.length) {
    if (focusedTreeNode.value) {
      delete focusedTreeNode.value.dataset.treeFocused
      focusedTreeNode.value = null
    }
    return
  }

  const fallback = nodes[0]
  const focusCandidate =
    (preferredNode && nodes.includes(preferredNode) ? preferredNode : null) ||
    (focusedTreeNode.value && nodes.includes(focusedTreeNode.value)
      ? focusedTreeNode.value
      : null) ||
    findSelectedNodeElement() ||
    fallback

  for (const node of nodes) {
    node.tabIndex = node === focusCandidate ? 0 : -1
  }
}

function handleTreeContainerFocus(event: FocusEvent) {
  if (event.target !== treeScrollRef.value) return

  const nodes = getVisibleTreeNodes()
  if (!nodes.length) return

  const currentTabStop = nodes.find((node) => node.tabIndex === 0)
  focusTreeNode(currentTabStop || findSelectedNodeElement() || nodes[0])
}

function findSelectedNodeElement(): HTMLElement | null {
  if (!sidebarCardRef.value || !props.selected?.connectionId) return null

  const connectionId = selectorEscape(props.selected.connectionId)

  if (props.selected.filePath) {
    const filePath = selectorEscape(props.selected.filePath)
    return (
      sidebarCardRef.value.querySelector<HTMLElement>(
        `[data-tree-node="true"][data-connection-id="${connectionId}"][data-file-path="${filePath}"]`
      ) || null
    )
  }

  if (props.selected.database && props.selected.type && props.selected.name) {
    const database = selectorEscape(props.selected.database)
    const schema = selectorEscape(props.selected.schema || '')
    const objectType = selectorEscape(props.selected.type)
    const objectName = selectorEscape(props.selected.name)
    return (
      sidebarCardRef.value.querySelector<HTMLElement>(
        `[data-node-kind="object"][data-connection-id="${connectionId}"][data-database="${database}"][data-schema="${schema}"][data-object-type="${objectType}"][data-object-name="${objectName}"]`
      ) || null
    )
  }

  if (props.selected.database && props.selected.schema) {
    const database = selectorEscape(props.selected.database)
    const schema = selectorEscape(props.selected.schema)
    return (
      sidebarCardRef.value.querySelector<HTMLElement>(
        `[data-node-kind="schema"][data-connection-id="${connectionId}"][data-database="${database}"][data-schema="${schema}"]`
      ) || null
    )
  }

  if (props.selected.database) {
    const database = selectorEscape(props.selected.database)
    return (
      sidebarCardRef.value.querySelector<HTMLElement>(
        `[data-node-kind="database"][data-connection-id="${connectionId}"][data-database="${database}"]`
      ) || null
    )
  }

  return (
    sidebarCardRef.value.querySelector<HTMLElement>(
      `[data-node-kind="connection"][data-connection-id="${connectionId}"]`
    ) || null
  )
}

function getCurrentTreeNode(nodes: HTMLElement[]): HTMLElement | null {
  const active = document.activeElement as HTMLElement | null
  if (active?.dataset?.treeNode === 'true' && nodes.includes(active)) {
    return active
  }
  return findSelectedNodeElement() || nodes[0] || null
}

function focusTreeNode(node: HTMLElement | null) {
  if (!node) return

  if (focusedTreeNode.value && focusedTreeNode.value !== node) {
    delete focusedTreeNode.value.dataset.treeFocused
  }
  focusedTreeNode.value = node
  focusedTreeNode.value.dataset.treeFocused = 'true'
  syncTreeTabStop(node)

  node.focus({ preventScroll: true })

  const container = treeScrollRef.value
  if (!container) {
    node.scrollIntoView({ block: 'nearest' })
    return
  }

  const containerRect = container.getBoundingClientRect()
  const nodeRect = node.getBoundingClientRect()
  const margin = 12

  if (nodeRect.top < containerRect.top + margin) {
    container.scrollTop -= containerRect.top + margin - nodeRect.top
  } else if (nodeRect.bottom > containerRect.bottom - margin) {
    container.scrollTop += nodeRect.bottom - (containerRect.bottom - margin)
  }
}

function focusTreeNodeFromEvent(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (!target) return
  const node = target.closest<HTMLElement>('[data-tree-node="true"]')
  if (!node) return
  focusTreeNode(node)
}

function isTreeNodeExpandable(node: HTMLElement): boolean {
  const kind = node.dataset.nodeKind
  return kind === 'connection' || kind === 'database' || kind === 'schema' || kind === 'file-folder'
}

function isTreeNodeExpanded(node: HTMLElement): boolean {
  const kind = node.dataset.nodeKind
  const connectionId = node.dataset.connectionId || ''

  if (kind === 'connection') {
    return connectionId ? navigationStore.isConnectionExpanded(connectionId) : false
  }

  if (kind === 'database') {
    const database = node.dataset.database || ''
    return connectionId && database
      ? navigationStore.isDatabaseExpanded(`${connectionId}:${database}`)
      : false
  }

  if (kind === 'schema') {
    const database = node.dataset.database || ''
    const schema = node.dataset.schema || ''
    return connectionId && database && schema
      ? navigationStore.isSchemaExpanded(`${connectionId}:${database}:${schema}`)
      : false
  }

  if (kind === 'file-folder') {
    const folderPath = node.dataset.filePath || ''
    return connectionId && folderPath
      ? fileExplorerStore.isFolderExpanded(connectionId, folderPath)
      : false
  }

  return false
}

function buildTreeNodeState(node: HTMLElement): TreeKeyboardNodeState {
  const rawDepth = Number(node.dataset.treeDepth ?? 0)
  return {
    depth: Number.isFinite(rawDepth) ? rawDepth : 0,
    expandable: isTreeNodeExpandable(node),
    expanded: isTreeNodeExpanded(node)
  }
}

function expandTreeNode(node: HTMLElement): boolean {
  const kind = node.dataset.nodeKind
  const connectionId = node.dataset.connectionId || ''

  if (kind === 'connection' && connectionId) {
    if (navigationStore.isConnectionExpanded(connectionId)) return false
    navigationStore.expandConnection(connectionId)
    if (treeLogic.isFileConnection(connectionId)) {
      emit('request-file-entries', { connectionId })
    } else {
      navigationStore.ensureDatabases(connectionId).catch(() => {})
    }
    return true
  }

  if (kind === 'database' && connectionId) {
    const database = node.dataset.database || ''
    if (!database) return false
    const dbKey = `${connectionId}:${database}`
    if (navigationStore.isDatabaseExpanded(dbKey)) return false
    navigationStore.expandDatabase(dbKey)

    const isLoading = navigationStore.isMetadataLoading(connectionId, database)
    const hasMetadata = navigationStore.getMetadata(connectionId, database) !== null
    if (!isLoading && !hasMetadata) {
      navigationStore.ensureMetadata(connectionId, database).catch(() => {})
    }
    return true
  }

  if (kind === 'schema' && connectionId) {
    const database = node.dataset.database || ''
    const schema = node.dataset.schema || ''
    if (!database || !schema) return false
    const schemaKey = `${connectionId}:${database}:${schema}`
    if (navigationStore.isSchemaExpanded(schemaKey)) return false
    navigationStore.expandSchema(schemaKey)
    return true
  }

  if (kind === 'file-folder' && connectionId) {
    const folderPath = node.dataset.filePath || ''
    if (!folderPath) return false
    if (fileExplorerStore.isFolderExpanded(connectionId, folderPath)) return false
    fileExplorerStore.expandFolder(connectionId, folderPath)
    return true
  }

  return false
}

function collapseTreeNode(node: HTMLElement): boolean {
  const kind = node.dataset.nodeKind
  const connectionId = node.dataset.connectionId || ''

  if (kind === 'connection' && connectionId) {
    if (!navigationStore.isConnectionExpanded(connectionId)) return false
    navigationStore.collapseConnection(connectionId)
    return true
  }

  if (kind === 'database' && connectionId) {
    const database = node.dataset.database || ''
    if (!database) return false
    const dbKey = `${connectionId}:${database}`
    if (!navigationStore.isDatabaseExpanded(dbKey)) return false
    navigationStore.collapseDatabase(dbKey)
    return true
  }

  if (kind === 'schema' && connectionId) {
    const database = node.dataset.database || ''
    const schema = node.dataset.schema || ''
    if (!database || !schema) return false
    const schemaKey = `${connectionId}:${database}:${schema}`
    if (!navigationStore.isSchemaExpanded(schemaKey)) return false
    navigationStore.collapseSchema(schemaKey)
    return true
  }

  if (kind === 'file-folder' && connectionId) {
    const folderPath = node.dataset.filePath || ''
    if (!folderPath) return false
    if (!fileExplorerStore.isFolderExpanded(connectionId, folderPath)) return false
    fileExplorerStore.collapseFolder(connectionId, folderPath)
    return true
  }

  return false
}

function handleTreeKeyboardNavigation(e: KeyboardEvent) {
  if (!TREE_NAV_KEYS.has(e.key)) return
  if (e.metaKey || e.ctrlKey || e.altKey) return
  if (contextMenu.hasContextMenu.value) return
  if (isTypingTarget(e.target)) return

  const active = document.activeElement as HTMLElement | null
  if (active?.dataset?.treeNode !== 'true') return

  const nodes = getVisibleTreeNodes()
  if (!nodes.length) return

  const current = getCurrentTreeNode(nodes)
  if (!current) return

  const currentIndex = nodes.indexOf(current)
  if (currentIndex < 0) return
  const nodeState = nodes.map(buildTreeNodeState)
  const intent = getTreeKeyboardIntent(e.key, currentIndex, nodeState)

  switch (intent.type) {
    case 'focus':
      e.preventDefault()
      focusTreeNode(nodes[intent.index])
      break
    case 'expand':
      e.preventDefault()
      if (expandTreeNode(nodes[intent.index])) {
        focusTreeNode(nodes[intent.index])
      }
      break
    case 'expand-many':
      e.preventDefault()
      for (const index of intent.indexes) {
        expandTreeNode(nodes[index])
      }
      focusTreeNode(nodes[currentIndex])
      break
    case 'collapse':
      e.preventDefault()
      if (collapseTreeNode(nodes[intent.index])) {
        focusTreeNode(nodes[intent.index])
      }
      break
    case 'activate':
      e.preventDefault()
      nodes[intent.index].click()
      break
    case 'none':
      break
  }
}

async function hydrateExpandedDatabasesForConnection(connectionId: string) {
  await navigationStore.ensureDatabases(connectionId)

  const dbPrefix = `${connectionId}:`
  for (const dbKey of navigationStore.expandedDatabases) {
    if (!dbKey.startsWith(dbPrefix)) continue
    const dbName = dbKey.slice(dbPrefix.length)
    if (!dbName) continue

    const isLoading = navigationStore.isMetadataLoading(connectionId, dbName)
    const hasMetadata = navigationStore.getMetadata(connectionId, dbName) !== null
    if (!isLoading && !hasMetadata) {
      await navigationStore.ensureMetadata(connectionId, dbName)
    }
  }
}

async function hydrateExpandedConnections() {
  const expandedConnectionIds = new Set(navigationStore.expandedConnections)

  for (const connection of connectionsStore.connections) {
    if (!expandedConnectionIds.has(connection.id)) continue

    if (treeLogic.isFileConnection(connection.id)) {
      emit('request-file-entries', { connectionId: connection.id })
      continue
    }

    await hydrateExpandedDatabasesForConnection(connection.id)
  }
}

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

  if (isExpanded) {
    if (treeLogic.isFileConnection(connId)) {
      emit('request-file-entries', { connectionId: connId })
    } else if (!wasExpanded) {
      void hydrateExpandedDatabasesForConnection(connId)
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

async function expandContextSubtree(target: ContextTarget) {
  async function expandFileSubtreeWithGuard(
    run: (options: {
      maxFolders: number
      progressEvery: number
      onProgress: (expandedFolders: number, maxFolders: number) => void
    }) => Promise<{ expandedFolders: number; truncated: boolean; maxFolders: number }>,
    label: string
  ) {
    let lastProgressToast = 0
    toast.info(`Expanding ${label}...`)

    try {
      const result = await run({
        maxFolders: MAX_FILE_SUBTREE_EXPAND_FOLDERS,
        progressEvery: FILE_SUBTREE_PROGRESS_STEP,
        onProgress: (expandedFolders, maxFolders) => {
          if (
            expandedFolders >= FILE_SUBTREE_PROGRESS_STEP &&
            expandedFolders - lastProgressToast >= FILE_SUBTREE_PROGRESS_STEP &&
            expandedFolders < maxFolders
          ) {
            lastProgressToast = expandedFolders
            toast.info(`Expanding... ${expandedFolders}/${maxFolders} folders`)
          }
        }
      })

      if (result.truncated) {
        toast.warning(
          `Stopped after ${result.expandedFolders} folders (limit ${result.maxFolders}). Expand a deeper branch to continue.`
        )
      } else {
        toast.success(`Expanded ${result.expandedFolders} folders`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to expand subtree'
      toast.error(message)
    }
  }

  if (target.kind === 'connection') {
    if (treeLogic.isFileConnection(target.connectionId)) {
      await expandFileSubtreeWithGuard(
        (options) => fileExplorerStore.expandConnectionSubtree(target.connectionId, options),
        'connection subtree'
      )
    } else {
      await navigationStore.expandConnectionSubtree(target.connectionId)
    }
    return
  }

  if (target.kind === 'database') {
    await navigationStore.expandDatabaseSubtree(target.connectionId, target.database)
    return
  }

  if (target.kind === 'schema') {
    await navigationStore.expandSchemaSubtree(target.connectionId, target.database, target.schema)
    return
  }

  if (target.kind === 'file' && target.isDir) {
    await expandFileSubtreeWithGuard(
      (options) => fileExplorerStore.expandFolderSubtree(target.connectionId, target.path, options),
      `folder "${target.name}"`
    )
  }
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
    case 'copy-base-path':
      if (t.kind === 'connection') {
        const conn = connectionsStore.connections.find((c) => c.id === t.connectionId)
        const basePath = conn?.spec?.files?.basePath || ''
        if (basePath) {
          actions.copyToClipboard(basePath, 'Path copied')
        }
      }
      break
    case 'open-base-folder':
      if (t.kind === 'connection' && isDesktop.value) {
        const conn = connectionsStore.connections.find((c) => c.id === t.connectionId)
        const basePath = conn?.spec?.files?.basePath || ''
        if (basePath) {
          const wailsGo = (
            window as unknown as {
              go?: { main?: { App?: { OpenContainingFolder?: (path: string) => Promise<void> } } }
            }
          ).go
          if (wailsGo?.main?.App?.OpenContainingFolder) {
            wailsGo.main.App.OpenContainingFolder(basePath).catch((err: unknown) =>
              toast.error(`Failed to open folder: ${err}`)
            )
          }
        }
      }
      break
    case 'refresh-metadata':
      if (t.kind === 'database' || t.kind === 'schema')
        actions.refreshDatabase(t.connectionId, t.database)
      break
    case 'expand-subtree':
      void expandContextSubtree(t)
      break
    case 'collapse-subtree':
      if (t.kind === 'connection') {
        navigationStore.collapseConnectionSubtree(t.connectionId)
        if (treeLogic.isFileConnection(t.connectionId)) {
          fileExplorerStore.collapseAllFolders(t.connectionId)
        }
      } else if (t.kind === 'database') {
        navigationStore.collapseDatabaseSubtree(t.connectionId, t.database)
      } else if (t.kind === 'schema') {
        navigationStore.collapseSchemaSubtree(t.connectionId, t.database, t.schema)
      } else if (t.kind === 'file' && t.isDir) {
        fileExplorerStore.collapseFolderSubtree(t.connectionId, t.path)
      }
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
      if (t.kind === 'file') actions.copyToClipboard(t.path, 'Path copied')
      break
    case 'copy-system-path':
      if (t.kind === 'file') {
        const conn = connectionsStore.connections.find((c) => c.id === t.connectionId)
        const basePath = conn?.spec?.files?.basePath || ''
        const systemPath = resolveSystemPath(t.path, basePath)
        actions.copyToClipboard(systemPath, 'Path copied')
      }
      break
    case 'open-in-explorer':
      if (t.kind === 'file' && isDesktop.value) {
        const conn = connectionsStore.connections.find((c) => c.id === t.connectionId)
        const basePath = conn?.spec?.files?.basePath || ''
        const systemPath = resolveSystemPath(t.path, basePath)
        // Call Wails binding directly via window.go (available in desktop mode)
        const wailsGo = (
          window as unknown as {
            go?: { main?: { App?: { OpenContainingFolder?: (path: string) => Promise<void> } } }
          }
        ).go
        if (wailsGo?.main?.App?.OpenContainingFolder) {
          wailsGo.main.App.OpenContainingFolder(systemPath).catch((err: unknown) =>
            toast.error(`Failed to open folder: ${err}`)
          )
        }
      }
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
  window.addEventListener('keydown', handleTreeKeyboardNavigation)
  await loadConnections()
  // Ensure explicitly restored focus is expanded.
  if (props.initialExpandedConnectionId) {
    navigationStore.expandConnection(props.initialExpandedConnectionId)
  }

  // Restored expansion state is persisted, but tree payloads are lazy-loaded.
  // Hydrate all currently expanded connections so they don't render as empty after app restart.
  await hydrateExpandedConnections()
  await nextTick()
  syncTreeTabStop(findSelectedNodeElement())
})

onUnmounted(() => {
  if (focusedTreeNode.value) {
    delete focusedTreeNode.value.dataset.treeFocused
  }
  window.removeEventListener('keydown', handleTreeKeyboardNavigation)
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
    syncTreeTabStop(findSelectedNodeElement())
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

  // Yield to the event loop before collapsing so drag/resize handlers are not blocked
  await Promise.resolve()
  if (runId !== searchRunId.value) return

  // Collapse non-matching branches; expandForSearch will re-open matching ones below
  navigationStore.collapseAllExpansions()
  fileExplorerStore.collapseAllFolders()

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

watch(
  () => filteredConnections.value.map((conn) => conn.id).join('|'),
  async () => {
    await nextTick()
    syncTreeTabStop(findSelectedNodeElement())
  }
)

// Search input ref for keyboard shortcut focus (exposed to parent)
const internalSearchInputRef = ref<InstanceType<typeof SearchInput> | null>(null)

// Count label for sidebar toolbar
const connectionCountLabel = computed(() => {
  const filtered = filteredConnections.value.length
  const total = connectionsStore.connections.length
  if (
    (props.searchQuery || (props.typeFilters && props.typeFilters.length > 0)) &&
    filtered !== total
  ) {
    return `${filtered} of ${total}`
  }
  return `${total} connection${total === 1 ? '' : 's'}`
})

defineExpose({ focus: () => internalSearchInputRef.value?.focus() })
</script>

<template>
  <div ref="sidebarCardRef" class="overflow-hidden h-full flex flex-col">
    <!-- Toolbar row 1: count + New Connection -->
    <div class="px-3 pt-2.5 pb-1 flex items-center gap-2">
      <button
        type="button"
        class="lg:hidden flex items-center justify-center p-1.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
        @click="sidebarMenuToggle?.openSidebar()"
      >
        <Menu class="h-4 w-4" aria-hidden="true" />
        <span class="sr-only">Open sidebar</span>
      </button>
      <span class="text-xs font-medium text-gray-500 dark:text-gray-400 truncate flex-1">
        {{ connectionCountLabel }}
      </span>
      <BaseButton variant="primary" size="sm" @click="$emit('add-connection')">
        <Plus class="h-3.5 w-3.5" />
        <span>New Connection</span>
      </BaseButton>
    </div>

    <!-- Toolbar row 2: type filter + search + expand/collapse -->
    <div
      class="px-2 pb-2 border-b border-slate-200/70 dark:border-gray-700/80 flex items-center gap-1"
    >
      <ConnectionTypeFilter
        :selected-types="typeFilters ?? []"
        :persistent="false"
        @update:selected-types="$emit('update:typeFilters', $event)"
      />
      <SearchInput
        ref="internalSearchInputRef"
        :model-value="searchQuery"
        placeholder="Filter..."
        size="xs"
        class="flex-1 min-w-0"
        @update:model-value="$emit('update:searchQuery', $event as string)"
      />
      <!-- Match count (shown while searching) -->
      <Loader2
        v-if="isSearchExpanding"
        class="h-3 w-3 text-gray-400 dark:text-gray-500 animate-spin shrink-0"
      />
      <span
        v-else-if="effectiveSearchQuery"
        class="text-[10px] tabular-nums text-gray-400 dark:text-gray-500 shrink-0 select-none"
        :title="`${filteredConnections.length} matching connection${filteredConnections.length === 1 ? '' : 's'}`"
        >{{ filteredConnections.length }}</span
      >
      <button
        type="button"
        class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 hover:text-slate-700 dark:hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="Expand first level"
        aria-label="Expand first level"
        :disabled="!canExpandFirstLevel"
        @click="expandFirstLevel"
      >
        <ChevronsDown class="h-4 w-4" />
      </button>
      <button
        type="button"
        class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 hover:text-slate-700 dark:hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="Collapse all"
        aria-label="Collapse all"
        :disabled="!hasExpandedTreeState"
        @click="collapseAllTreeNodes"
      >
        <ChevronsUp class="h-4 w-4" />
      </button>
    </div>
    <!-- Scrollable tree content area with smooth scrolling and custom scrollbar -->
    <div
      ref="treeScrollRef"
      class="flex-1 overflow-y-auto overscroll-contain p-3 scrollbar-thin"
      role="tree"
      aria-label="Connections explorer"
      :aria-busy="isLoadingConnections ? 'true' : 'false'"
      tabindex="0"
      @focus="handleTreeContainerFocus"
      @click.capture="focusTreeNodeFromEvent"
    >
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
            <Loader2 class="animate-spin h-8 w-8 text-slate-400 mb-3" />
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
        :isLocalFileConnection="isLocalFileConnection"
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

:deep([data-tree-node='true']:focus) {
  outline: none;
  box-shadow: 0 0 0 2px rgb(20 184 166 / 0.55);
}

:deep(.dark [data-tree-node='true']:focus) {
  box-shadow: 0 0 0 2px rgb(45 212 191 / 0.55);
}

:deep([data-tree-node='true'][data-tree-focused='true']) {
  background: rgb(15 118 110 / 0.12);
  box-shadow: 0 0 0 2px rgb(20 184 166 / 0.7);
}

:deep(.dark [data-tree-node='true'][data-tree-focused='true']) {
  background: rgb(20 184 166 / 0.16);
  box-shadow: 0 0 0 2px rgb(45 212 191 / 0.8);
}
</style>
