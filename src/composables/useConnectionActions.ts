import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useConnectionsStore } from '@/stores/connections'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import connectionsApi from '@/api/connections'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'

type DefaultTab = 'structure' | 'data'
type ObjectType = 'table' | 'view'

export interface OpenObjectParams {
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

export interface OpenFileParams {
  connectionId: string
  path: string
  entry: FileSystemEntry
  mode: 'preview' | 'pinned'
  defaultTab?: DefaultTab
  openInRightSplit?: boolean
}

/**
 * Composable for connection-related actions (test, refresh, edit, delete, etc.)
 */
export function useConnectionActions(emits?: {
  open?: (payload: OpenObjectParams) => void
  openFile?: (payload: OpenFileParams) => void
  showDiagram?: (payload: { connectionId: string; database: string }) => void
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
    let obj: SQLTableMeta | SQLViewMeta | undefined
    if (type === 'table') obj = navigationStore.findTableMeta(connId, db, name, schema)
    else obj = navigationStore.findViewMeta(connId, db, name, schema)
    if (!obj) return

    if (emits?.open) {
      emits.open({
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
  }

  function openFile(
    connectionId: string,
    path: string,
    mode: 'preview' | 'pinned',
    defaultTab?: DefaultTab,
    openInRightSplit?: boolean
  ) {
    const entries = fileExplorerStore.getEntries(connectionId)
    const entry = entries.find((e) => e.path === path)
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

  function showDiagram(connectionId: string, database: string) {
    if (emits?.showDiagram) {
      emits.showDiagram({ connectionId, database })
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
    openTable,
    openFile,
    showDiagram,

    // Copy actions
    copyToClipboard,
    copyDDL,
    canCopyDDL
  }
}
