import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type ViewType =
  | 'connection-details' // Showing connection info panel
  | 'database-overview' // Showing database stats/tables list
  | 'table-data' // Showing table data in pane tabs
  | 'file-browser' // Showing file explorer
  | null

const STORAGE_KEY = 'explorer.viewState'

interface PersistedState {
  viewType: ViewType
  connectionId: string | null
  databaseName: string | null
  schemaName: string | null
  objectType: 'table' | 'view' | null
  objectName: string | null
  filePath: string | null
}

function hasBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function loadPersistedState(): PersistedState | null {
  if (!hasBrowserStorage()) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedState
  } catch (error) {
    console.warn('Failed to load explorer view state from localStorage:', error)
    return null
  }
}

function persistState(state: PersistedState) {
  if (!hasBrowserStorage()) {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to persist explorer view state to localStorage:', error)
  }
}

/**
 * Explorer View State Store
 *
 * Single source of truth for what view is currently shown in the database explorer.
 * This store persists to localStorage and drives the URL (not vice versa).
 *
 * Data Flow:
 * User Action → Store Action → localStorage → URL Sync Watcher → URL Update
 */
export const useExplorerViewStateStore = defineStore('explorerViewState', () => {
  // Core navigation state
  const viewType = ref<ViewType>(null)
  const connectionId = ref<string | null>(null)
  const databaseName = ref<string | null>(null)
  const schemaName = ref<string | null>(null)
  const objectType = ref<'table' | 'view' | null>(null)
  const objectName = ref<string | null>(null)
  const filePath = ref<string | null>(null)

  // Load persisted state on initialization
  const persisted = loadPersistedState()
  if (persisted) {
    viewType.value = persisted.viewType
    connectionId.value = persisted.connectionId
    databaseName.value = persisted.databaseName
    schemaName.value = persisted.schemaName
    objectType.value = persisted.objectType
    objectName.value = persisted.objectName
    filePath.value = persisted.filePath
  }

  // Helper to persist current state
  function saveState() {
    persistState({
      viewType: viewType.value,
      connectionId: connectionId.value,
      databaseName: databaseName.value,
      schemaName: schemaName.value,
      objectType: objectType.value,
      objectName: objectName.value,
      filePath: filePath.value
    })
  }

  // Computed tree selection (for sidebar highlighting)
  const treeSelection = computed(() => {
    if (!connectionId.value) return null

    switch (viewType.value) {
      case 'connection-details':
        return {
          connectionId: connectionId.value,
          database: undefined,
          schema: undefined,
          type: undefined,
          name: undefined,
          filePath: undefined
        }

      case 'database-overview':
        return {
          connectionId: connectionId.value,
          database: databaseName.value || undefined,
          schema: undefined,
          type: undefined,
          name: undefined,
          filePath: undefined
        }

      case 'table-data':
        return {
          connectionId: connectionId.value,
          database: databaseName.value || undefined,
          schema: schemaName.value || undefined,
          type: objectType.value || undefined,
          name: objectName.value || undefined,
          filePath: undefined
        }

      case 'file-browser':
        return {
          connectionId: connectionId.value,
          database: undefined,
          schema: undefined,
          type: undefined,
          name: undefined,
          filePath: filePath.value || undefined
        }

      default:
        return {
          connectionId: connectionId.value,
          database: undefined,
          schema: undefined,
          type: undefined,
          name: undefined,
          filePath: undefined
        }
    }
  })

  // Computed: is showing connection details?
  const showConnectionDetails = computed(() => viewType.value === 'connection-details')

  // Computed: is showing database overview?
  const showDatabaseOverview = computed(() => viewType.value === 'database-overview')

  // Actions: These are called by user interactions

  /**
   * Select a connection to show its details panel
   */
  function selectConnection(connId: string) {
    viewType.value = 'connection-details'
    connectionId.value = connId
    databaseName.value = null
    schemaName.value = null
    objectType.value = null
    objectName.value = null
    filePath.value = null
    saveState()
  }

  /**
   * Select a database to show its overview (stats, tables list)
   */
  function selectDatabase(connId: string, database: string) {
    viewType.value = 'database-overview'
    connectionId.value = connId
    databaseName.value = database
    schemaName.value = null
    objectType.value = null
    objectName.value = null
    filePath.value = null
    saveState()
  }

  /**
   * Select a table/view to show its data in pane tabs
   */
  function selectTable(
    connId: string,
    database: string,
    type: 'table' | 'view',
    name: string,
    schema?: string
  ) {
    viewType.value = 'table-data'
    connectionId.value = connId
    databaseName.value = database
    schemaName.value = schema || null
    objectType.value = type
    objectName.value = name
    filePath.value = null
    saveState()
  }

  /**
   * Select a file to browse in file explorer
   */
  function selectFile(connId: string, path: string) {
    viewType.value = 'file-browser'
    connectionId.value = connId
    filePath.value = path
    databaseName.value = null
    schemaName.value = null
    objectType.value = null
    objectName.value = null
    saveState()
  }

  /**
   * Reset to empty state
   */
  function reset() {
    viewType.value = null
    connectionId.value = null
    databaseName.value = null
    schemaName.value = null
    objectType.value = null
    objectName.value = null
    filePath.value = null
    saveState()
  }

  /**
   * Update from URL params (called by URL sync watcher)
   * This is internal - should only be called by useExplorerUrlSync
   */
  function _updateFromUrl(params: {
    connId: string
    details?: boolean
    database?: string
    schema?: string
    type?: 'table' | 'view'
    name?: string
    file?: string
  }) {
    if (params.details) {
      selectConnection(params.connId)
    } else if (params.file) {
      selectFile(params.connId, params.file)
    } else if (params.database && params.type && params.name) {
      selectTable(params.connId, params.database, params.type, params.name, params.schema)
    } else if (params.database) {
      selectDatabase(params.connId, params.database)
    } else {
      // No query params - default to connection details
      selectConnection(params.connId)
    }
  }

  return {
    // State
    viewType,
    connectionId,
    databaseName,
    schemaName,
    objectType,
    objectName,
    filePath,

    // Computed
    treeSelection,
    showConnectionDetails,
    showDatabaseOverview,

    // Actions
    selectConnection,
    selectDatabase,
    selectTable,
    selectFile,
    reset,

    // Internal (for URL sync only)
    _updateFromUrl
  }
})
