import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { getConnectionHost, getConnectionPort } from '@/utils/specBuilder'
import type {
  SQLRoutineMeta,
  SQLTableMeta,
  SQLTriggerMeta,
  SQLViewMeta
} from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { FileMetadata } from '@/types/files'
import { getConnectionKindFromSpec, getConnectionTypeLabel, isFileBasedKind } from '@/types/specs'

type ObjectType = 'table' | 'view' | 'trigger' | 'function' | 'procedure'

export function useExplorerState() {
  const route = useRoute()
  const connectionsStore = useConnectionsStore()
  const navigationStore = useExplorerNavigationStore()

  // Current connection
  const currentConnectionId = computed(() => {
    const id = route.params.id as string
    return id && id !== 'undefined' ? id : null
  })
  const currentConnection = computed(() =>
    currentConnectionId.value
      ? connectionsStore.connections.find((conn) => conn.id === currentConnectionId.value)
      : null
  )

  const selectedDatabaseName = ref<string | null>(null)
  const selectedSchemaName = ref<string | null>(null)
  const selectedObjectType = ref<ObjectType | null>(null)
  const selectedObjectName = ref<string | null>(null)
  const selectedMeta = ref<SQLTableMeta | SQLViewMeta | SQLTriggerMeta | SQLRoutineMeta | null>(
    null
  )

  // File selection
  const selectedFileEntry = ref<FileSystemEntry | null>(null)
  const selectedFileMetadata = ref<FileMetadata | null>(null)

  // REMOVED: URL update watcher - URL is now set directly by action handlers in controller

  // Computed properties for active connection details
  // Pinia store is the SYNCHRONOUS source of truth for connection ID
  // Route is kept in sync for URL persistence only
  const activeConnectionId = computed<string | null>(
    () => navigationStore.activeConnectionId || currentConnectionId.value || null
  )

  const activeConnection = computed(() =>
    connectionsStore.connections.find((c) => c.id === activeConnectionId.value)
  )

  const activeDisplayHostPort = computed(() => {
    const c = activeConnection.value
    if (!c) return null

    // For file connections, show connection name instead of host:port
    const kind = getConnectionKindFromSpec(c.spec)
    if (isFileBasedKind(kind)) {
      return c.name
    }

    // For database connections, show host:port using spec utilities
    const host = getConnectionHost(c)
    const port = getConnectionPort(c)
    if (!host || !port) return c.name // fallback to name if no host/port
    return `${host}:${port}`
  })

  const activeDisplayType = computed(
    () => getConnectionTypeLabel(activeConnection.value?.spec, activeConnection.value?.type) || ''
  )
  const activeDisplayCloudProvider = computed(() => activeConnection.value?.cloud_provider || '')

  // Active context for breadcrumb
  const activeDatabaseName = computed(() => selectedDatabaseName.value)
  const activeSchemaName = computed(() => selectedSchemaName.value)
  const activeObjectType = computed(() => selectedObjectType.value)
  const activeObjectName = computed(() => selectedObjectName.value)

  function clearDatabaseSelection() {
    selectedDatabaseName.value = null
    selectedSchemaName.value = null
    selectedObjectType.value = null
    selectedObjectName.value = null
    selectedMeta.value = null
  }

  function clearFileSelection() {
    selectedFileEntry.value = null
    selectedFileMetadata.value = null
  }

  // No-op - kept for backward compatibility with callers
  // Previously cleared showDiagram state, but diagram is now handled via tabs
  function clearPanelStates() {
    // No-op
  }

  function setDatabaseSelection(payload: {
    database: string
    schema?: string
    type?: ObjectType
    name?: string
    meta?: SQLTableMeta | SQLViewMeta | SQLTriggerMeta | SQLRoutineMeta
  }) {
    selectedDatabaseName.value = payload.database
    selectedSchemaName.value = payload.schema || null
    selectedObjectType.value = payload.type || null
    selectedObjectName.value = payload.name || null
    selectedMeta.value = payload.meta || null
  }

  function setFileSelection(entry: FileSystemEntry, metadata?: FileMetadata) {
    selectedFileEntry.value = entry
    selectedFileMetadata.value = metadata || null
  }

  return {
    // Reactive state
    currentConnectionId,
    currentConnection,
    selectedDatabaseName,
    selectedSchemaName,
    selectedObjectType,
    selectedObjectName,
    selectedMeta,
    selectedFileEntry,
    selectedFileMetadata,

    // Computed properties
    activeConnectionId,
    activeConnection,
    activeDisplayHostPort,
    activeDisplayType,
    activeDisplayCloudProvider,
    activeDatabaseName,
    activeSchemaName,
    activeObjectType,
    activeObjectName,

    // Methods
    clearDatabaseSelection,
    clearFileSelection,
    clearPanelStates,
    setDatabaseSelection,
    setFileSelection
  }
}
