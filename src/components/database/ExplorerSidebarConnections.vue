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
import { useTreeContextMenu } from '@/composables/useTreeContextMenu'
import { useConnectionActions } from '@/composables/useConnectionActions'
import { useDatabaseCapabilities } from '@/composables/useDatabaseCapabilities'
import { useTreeSearch } from '@/composables/useTreeSearch'
import { useSqlConsoleActions } from '@/composables/useSqlConsoleActions'
import { useDesktopMode } from '@/composables/useDesktopMode'
import { useExplorerContextMenuActions } from '@/composables/useExplorerContextMenuActions'
import { useExplorerSearchExpansion } from '@/composables/useExplorerSearchExpansion'
import { useToast } from 'vue-toastification'
import type { Connection } from '@/types/connections'
import type { ShowDiagramPayload } from '@/types/diagram'
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

const { onMenuAction } = useExplorerContextMenuActions({
  closeContextMenu: () => contextMenu.close(),
  isDesktop,
  toast,
  actions,
  navigationStore,
  fileExplorerStore,
  isFileConnection: (connectionId) => treeLogic.isFileConnection(connectionId),
  getConnectionById: (connectionId) => connectionsStore.connectionByID(connectionId),
  listConnections: () => connectionsStore.connections,
  resolveSystemPath,
  emitOpenSqlConsole: (payload) => emit('open-sql-console', payload),
  emitOpenFileConsole: (payload) => emit('open-file-console', payload),
  openTableInSqlConsole,
  openFileInDuckDbConsole
})

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

const { isSearchExpanding } = useExplorerSearchExpansion({
  searchQuery,
  effectiveSearchQuery,
  typeFilters: computed(() => props.typeFilters),
  minSearchLength: MIN_SEARCH_LENGTH,
  connections: computed(() => connectionsStore.connections),
  matchesTypeFilters: (connection, filters) => treeLogic.matchesTypeFilters(connection, filters),
  isFileConnection: (connectionId) => treeLogic.isFileConnection(connectionId),
  hasSchemas: (connectionId) => treeLogic.hasSchemas(connectionId),
  requestFileEntries: (connectionId) => emit('request-file-entries', { connectionId }),
  matchesDatabaseFilter: (connectionId, database) =>
    effectiveSearchQuery.value.trim().length === 0
      ? true
      : treeSearch.matchesDatabaseFilter(connectionId, database),
  navigationStore,
  fileExplorerStore
})

function matchesDbFilter(connId: string, dbName: string): boolean {
  if (!effectiveSearchQuery.value.trim()) return true
  return treeSearch.matchesDatabaseFilter(connId, dbName)
}

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
        :title="hasExpandedTreeState ? 'Collapse all' : 'Expand first level'"
        :aria-label="hasExpandedTreeState ? 'Collapse all' : 'Expand first level'"
        :disabled="!hasExpandedTreeState && !canExpandFirstLevel"
        @click="hasExpandedTreeState ? collapseAllTreeNodes() : expandFirstLevel()"
      >
        <ChevronsUp v-if="hasExpandedTreeState" class="h-4 w-4" />
        <ChevronsDown v-else class="h-4 w-4" />
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
