import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConnectionsStore } from '@/stores/connections'
import { useSchemaStore } from '@/stores/schema'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { FileMetadata } from '@/types/files'

type ObjectType = 'table' | 'view'

export function useExplorerState() {
  const route = useRoute()
  const router = useRouter()
  const connectionsStore = useConnectionsStore()
  const schemaStore = useSchemaStore()
  const navigationStore = useExplorerNavigationStore()

  // Current connection
  const currentConnectionId = computed(() => route.params.id as string)
  const currentConnection = computed(() =>
    connectionsStore.connections.find((conn) => conn.id === currentConnectionId.value)
  )

  // Selection state (database as root)
  const selectedDatabaseName = ref<string | null>(null)
  const selectedSchemaName = ref<string | null>(null)
  const selectedObjectType = ref<ObjectType | null>(null)
  const selectedObjectName = ref<string | null>(null)
  const selectedMeta = ref<SQLTableMeta | SQLViewMeta | null>(null)

  // File selection
  const selectedFileEntry = ref<FileSystemEntry | null>(null)
  const selectedFileMetadata = ref<FileMetadata | null>(null)

  // Panel states
  const showDiagram = ref(false)

  // Active pane tracking
  const activePane = ref<'left' | 'right'>('left')

  // Update URL when selection changes
  watch(
    [
      selectedFileEntry,
      selectedMeta,
      currentConnectionId,
      selectedDatabaseName,
      selectedSchemaName,
      selectedObjectType,
      selectedObjectName
    ],
    () => {
      if (!currentConnectionId.value) return

      if (selectedFileEntry.value) {
        router.replace({
          path: `/explorer/${currentConnectionId.value}`,
          query: { file: selectedFileEntry.value.path }
        })
      } else if (selectedMeta.value) {
        router.replace({
          path: `/explorer/${currentConnectionId.value}`,
          query: {
            db: selectedDatabaseName.value || undefined,
            schema: selectedSchemaName.value || undefined,
            type: selectedObjectType.value || undefined,
            name: selectedObjectName.value || undefined
          }
        })
      }
    }
  )

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
    if (c.type === 'localfiles' || c.type === 'files') {
      return c.name
    }

    // For database connections, show host:port
    const host = c?.host
    const port = c?.port && String(c?.port)
    if (!host || !port) return c.name // fallback to name if no host/port
    return `${host}:${port}`
  })

  const activeDisplayType = computed(() => activeConnection.value?.type || '')
  const activeDisplayCloudProvider = computed(() => activeConnection.value?.cloud_provider || '')

  // Breadcrumb objects
  const breadcrumbObjects = computed<
    Array<{ name: string; type: 'table' | 'view'; schema?: string }>
  >(() => [
    ...schemaStore.tables.map((t) => ({ name: t.name, type: 'table' as const, schema: t.schema })),
    ...schemaStore.views.map((v) => ({ name: v.name, type: 'view' as const, schema: v.schema }))
  ])

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

  function clearPanelStates() {
    showDiagram.value = false
  }

  function setDatabaseSelection(payload: {
    database: string
    schema?: string
    type?: ObjectType
    name?: string
    meta?: SQLTableMeta | SQLViewMeta
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
    showDiagram,
    activePane,

    // Computed properties
    activeConnectionId,
    activeConnection,
    activeDisplayHostPort,
    activeDisplayType,
    activeDisplayCloudProvider,
    breadcrumbObjects,
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
