import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useConnectionsStore } from '@/stores/connections'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import connectionsApi from '@/api/connections'
import { createS3Bucket } from '@/api/files'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { DiagramFocusTarget, ShowDiagramPayload } from '@/types/diagram'

type DefaultTab = 'structure' | 'data'
type ObjectType = 'table' | 'view'

export interface OpenObjectParams {
  connectionId: string
  database: string
  schema?: string
  type: ObjectType
  name: string
  mode: 'preview' | 'pinned'
  defaultTab?: DefaultTab
  openInRightSplit?: boolean
}

export interface OpenFileParams {
  connectionId: string
  path: string
  entry: FileSystemEntry
  mode: 'preview' | 'pinned'
  defaultTab?: DefaultTab
  openInRightSplit?: boolean
}

function findFileEntryByPath(
  entries: FileSystemEntry[],
  targetPath: string
): FileSystemEntry | undefined {
  for (const entry of entries) {
    if (entry.path === targetPath) {
      return entry
    }
    if (entry.children?.length) {
      const found = findFileEntryByPath(entry.children, targetPath)
      if (found) {
        return found
      }
    }
  }
  return undefined
}

/**
 * Composable for connection-related actions (test, refresh, edit, delete, etc.)
 */
export function useConnectionActions(emits?: {
  open?: (payload: OpenObjectParams) => void
  openFile?: (payload: OpenFileParams) => void
  showDiagram?: (payload: ShowDiagramPayload) => void
}) {
  const router = useRouter()
  const toast = useToast()
  const connectionsStore = useConnectionsStore()
  const fileExplorerStore = useFileExplorerStore()
  const navigationStore = useExplorerNavigationStore()
  const showDeleteConfirm = ref(false)
  const pendingDeleteId = ref<string | null>(null)
  const pendingDeleteName = ref<string>('')

  async function testConnection(id: string) {
    try {
      const res = await connectionsApi.pingConnectionById(id)
      if (res.includes('Passed')) toast.success(res)
      else toast.error(res)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Connection test failed'
      toast.error(msg)
    }
  }

  async function refreshDatabases(id: string) {
    navigationStore.invalidateDatabases(id)
    await navigationStore.ensureDatabases(id, true)
    toast.success('Connections refreshed')
  }

  function editConnection(id: string) {
    router.push(`/explorer/edit/${id}`)
  }

  async function deleteConnection(id: string) {
    const conn = connectionsStore.connections.find((c) => c.id === id)
    pendingDeleteId.value = id
    pendingDeleteName.value = conn?.name || conn?.host || 'this connection'
    showDeleteConfirm.value = true
  }

  function cancelDeleteConnection() {
    showDeleteConfirm.value = false
    pendingDeleteId.value = null
    pendingDeleteName.value = ''
  }

  async function confirmDeleteConnection() {
    if (!pendingDeleteId.value) return
    const id = pendingDeleteId.value
    try {
      await connectionsStore.deleteConnection(id)
      navigationStore.invalidateConnection(id)
      toast.success('Connection deleted')
    } catch (e) {
      toast.error('Failed to delete connection')
      console.error(e)
    } finally {
      cancelDeleteConnection()
    }
  }

  async function cloneConnection(id: string) {
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

  async function refreshDatabase(connId: string, dbName: string) {
    try {
      await navigationStore.ensureMetadata(connId, dbName, true)
      toast.success('Metadata refreshed')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to refresh metadata'
      toast.error(msg)
    }
  }

  async function createDatabase(connectionId: string, databaseName?: string) {
    // Prompt for database name if not provided
    const dbName = databaseName || window.prompt('Enter database name:')
    if (!dbName || !dbName.trim()) {
      return
    }

    try {
      await connectionsApi.createDatabase(dbName.trim(), connectionId)
      toast.success(`Database "${dbName}" created successfully`)
      // Refresh databases to show the new one
      await refreshDatabases(connectionId)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create database'
      toast.error(msg)
    }
  }

  async function createSchema(connectionId: string, database: string, schemaName?: string) {
    if (!database) {
      toast.error('Database name is required to create a schema')
      return
    }

    // Prompt for schema name if not provided
    const sName = schemaName || window.prompt(`Enter schema name (for database "${database}"):`)
    if (!sName || !sName.trim()) {
      return
    }

    try {
      await connectionsApi.createSchema(sName.trim(), connectionId, database)
      toast.success(`Schema "${sName}" created successfully in database "${database}"`)
      // Refresh metadata to show the new schema
      await refreshDatabase(connectionId, database)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create schema'
      toast.error(msg)
    }
  }

  async function createBucket(
    connectionId: string,
    bucketName?: string,
    options?: { region?: string }
  ) {
    const bucket = bucketName || window.prompt('Enter bucket name:')
    if (!bucket || !bucket.trim()) {
      return
    }

    try {
      await createS3Bucket({
        bucket: bucket.trim(),
        region: options?.region?.trim() || undefined,
        connectionId
      })
      toast.success(`Bucket "${bucket}" created successfully`)
      await fileExplorerStore.loadEntries(connectionId, true)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create bucket'
      toast.error(msg)
    }
  }

  async function copyToClipboard(text: string, label = 'Copied') {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(label)
    } catch {
      toast.error('Failed to copy')
    }
  }

  async function copyDDL(
    connectionId: string,
    database: string,
    name: string,
    kind: 'table' | 'view',
    schema?: string
  ) {
    if (kind === 'table') {
      const m = navigationStore.findTableMeta(connectionId, database, name, schema)
      const ddl = m?.ddl?.createTable || ''
      if (ddl) await copyToClipboard(ddl, 'Table DDL copied')
      else toast.info('DDL not available')
    } else {
      const m = navigationStore.findViewMeta(connectionId, database, name, schema)
      const ddl = m?.definition || ''
      if (ddl) await copyToClipboard(ddl, 'View DDL copied')
      else toast.info('Definition not available')
    }
  }

  function openTable(
    connId: string,
    db: string,
    type: ObjectType,
    name: string,
    mode: 'preview' | 'pinned',
    schema?: string,
    defaultTab?: DefaultTab,
    openInRightSplit?: boolean
  ) {
    // Only open if metadata is available in the navigation store.
    // Tabs resolve meta from this store (single source of truth).
    const exists =
      type === 'table'
        ? !!navigationStore.findTableMeta(connId, db, name, schema)
        : !!navigationStore.findViewMeta(connId, db, name, schema)
    if (!exists) return

    if (emits?.open) {
      emits.open({
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
  }

  function openFile(
    connectionId: string,
    path: string,
    mode: 'preview' | 'pinned',
    defaultTab?: DefaultTab,
    openInRightSplit?: boolean
  ) {
    const entries = fileExplorerStore.getEntries(connectionId)
    const entry = findFileEntryByPath(entries, path)
    if (!entry) return

    if (emits?.openFile) {
      emits.openFile({
        connectionId,
        path,
        entry,
        mode,
        defaultTab,
        openInRightSplit
      })
    }
  }

  function showDiagram(connectionId: string, database: string, focus?: DiagramFocusTarget) {
    if (emits?.showDiagram) {
      emits.showDiagram({ connectionId, database, focus })
    }
  }

  function canCopyDDL(
    connectionId: string,
    database: string,
    name: string,
    kind: 'table' | 'view',
    schema?: string
  ): boolean {
    if (kind === 'table') {
      return !!navigationStore.findTableMeta(connectionId, database, name, schema)?.ddl?.createTable
    }
    return !!navigationStore.findViewMeta(connectionId, database, name, schema)?.definition
  }

  return {
    // Connection actions
    testConnection,
    refreshDatabases,
    editConnection,
    deleteConnection,
    cancelDeleteConnection,
    confirmDeleteConnection,
    showDeleteConfirm,
    pendingDeleteName,
    cloneConnection,

    // Database/object actions
    refreshDatabase,
    createDatabase,
    createSchema,
    createBucket,
    openTable,
    openFile,
    showDiagram,

    // Copy actions
    copyToClipboard,
    copyDDL,
    canCopyDDL
  }
}
