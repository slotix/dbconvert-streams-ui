import { defineStore } from 'pinia'
import type {
  DatabaseMetadata,
  SQLRoutineMeta,
  SQLTableMeta,
  SQLTriggerMeta,
  SQLViewMeta
} from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { DatabaseInfo } from '@/types/connections'
import connectionsApi from '@/api/connections'

export type ObjectType = 'table' | 'view' | 'trigger' | 'function' | 'procedure'
export type DefaultTab = 'structure' | 'data'

export interface NavigationSelection {
  connectionId: string
  database?: string
  schema?: string
  type?: ObjectType | null
  name?: string | null
  filePath?: string | null
}

export interface OpenObjectPayload {
  connectionId: string
  database: string
  schema?: string
  type: ObjectType
  name: string
  meta: SQLTableMeta | SQLViewMeta | SQLTriggerMeta | SQLRoutineMeta
  mode: 'preview' | 'pinned'
  defaultTab?: DefaultTab
  openInRightSplit?: boolean
}

export interface OpenFilePayload {
  connectionId: string
  path: string
  entry: FileSystemEntry
  mode: 'preview' | 'pinned'
  defaultTab?: DefaultTab
  openInRightSplit?: boolean
}

export const useExplorerNavigationStore = defineStore('explorerNavigation', {
  state: () => ({
    // Active connection ID - SINGLE SOURCE OF TRUTH (synchronous)
    activeConnectionId: null as string | null,

    // UI Filter: Show/hide system objects (databases, schemas, tables)
    // Default: OFF - hide system objects for cleaner UI
    showSystemObjects: false,
    // Per-connection override for system databases: `connectionId` -> boolean
    showSystemDatabasesByConnection: {} as Record<string, boolean>,
    // Per-database override: `${connectionId}:${database}` -> boolean
    showSystemObjectsByDatabase: {} as Record<string, boolean>,

    // Expansion state
    expandedConnections: new Set<string>(),
    expandedDatabases: new Set<string>(),
    expandedSchemas: new Set<string>(),

    // Metadata state - stores fetched data for UI reactivity only (NOT HTTP caching)
    // Backend handles HTTP caching with 30s TTL
    metadataState: {} as Record<string, Record<string, DatabaseMetadata>>,
    // Tracks whether the cached metadata includes system schemas/objects for a database.
    // Key: connectionId:database -> boolean
    metadataIncludesSystem: {} as Record<string, boolean>,

    // Database list state - stores fetched lists for UI reactivity only (NOT HTTP caching)
    // Now includes isSystem flag from API for native database detection
    databasesState: {} as Record<string, DatabaseInfo[]>,

    // Current selection
    selection: null as NavigationSelection | null,

    // Loading states
    loadingDatabases: {} as Record<string, boolean>,
    loadingMetadata: {} as Record<string, boolean>, // key: connectionId:database
    pendingMetadataRequests: {} as Record<
      string,
      { includeSystem: boolean; promise: Promise<DatabaseMetadata | null> }
    >, // key: connectionId:database

    // Error states
    databasesErrors: {} as Record<string, string | null> // connectionId -> error message

    // Removed timestamp-based cache validation - backend handles caching with X-Cache header
  }),

  getters: {
    isConnectionExpanded: (state) => (connectionId: string) => {
      return state.expandedConnections.has(connectionId)
    },

    isDatabaseExpanded: (state) => (key: string) => {
      return state.expandedDatabases.has(key)
    },

    isSchemaExpanded: (state) => (key: string) => {
      return state.expandedSchemas.has(key)
    },

    // Get ALL databases (including system)
    getDatabasesRaw: (state) => (connectionId: string) => {
      return state.databasesState[connectionId] || null
    },

    // Get filtered databases based on showSystemObjects setting
    getDatabases: (state) => (connectionId: string) => {
      const databases = state.databasesState[connectionId]
      if (!databases) return null
      const show = state.showSystemDatabasesByConnection[connectionId] ?? state.showSystemObjects
      if (show) return databases
      // Filter out system databases when showSystemObjects is false
      return databases.filter((db) => !db.isSystem)
    },

    // Get filtered schemas for a database based on showSystemObjects setting
    getFilteredSchemas: (state) => (connectionId: string, databaseName: string) => {
      const databases = state.databasesState[connectionId]
      if (!databases) return null
      const database = databases.find((db) => db.name === databaseName)
      if (!database?.schemas) return null
      const key = `${connectionId}:${databaseName}`
      const show = state.showSystemObjectsByDatabase[key] ?? state.showSystemObjects
      if (show) return database.schemas
      // Filter out system schemas when showSystemObjects is false
      return database.schemas.filter((schema) => !schema.isSystem)
    },

    // Get show/hide system objects setting for a specific database (falls back to global default).
    showSystemObjectsFor: (state) => (connectionId: string, database: string) => {
      const key = `${connectionId}:${database}`
      // If a per-database override isn't set, fall back to per-connection (used by the
      // connection-level "Show system objects" toggle) and then to the global default.
      return (
        state.showSystemObjectsByDatabase[key] ??
        state.showSystemDatabasesByConnection[connectionId] ??
        state.showSystemObjects
      )
    },

    // Get show/hide system databases for a connection (falls back to global default).
    showSystemDatabasesFor: (state) => (connectionId: string) => {
      return state.showSystemDatabasesByConnection[connectionId] ?? state.showSystemObjects
    },

    getMetadata: (state) => (connectionId: string, database: string) => {
      return state.metadataState[connectionId]?.[database] || null
    },

    isMetadataLoading: (state) => (connectionId: string, database: string) => {
      const key = `${connectionId}:${database}`
      return state.loadingMetadata[key] || false
    },

    isDatabasesLoading: (state) => (connectionId: string) => {
      return state.loadingDatabases[connectionId] || false
    },

    getDatabasesError: (state) => (connectionId: string) => {
      return state.databasesErrors[connectionId] || null
    }

    // Removed isMetadataStale and isDatabasesCacheStale getters
    // Backend now handles cache expiration with 30s TTL
  },

  actions: {
    // Toggle showSystemObjects setting
    toggleShowSystemObjects() {
      this.showSystemObjects = !this.showSystemObjects
    },

    setShowSystemObjects(show: boolean) {
      this.showSystemObjects = show
    },

    toggleShowSystemDatabasesFor(connectionId: string) {
      const current = this.showSystemDatabasesByConnection[connectionId] ?? this.showSystemObjects
      this.showSystemDatabasesByConnection[connectionId] = !current
    },

    setShowSystemDatabasesFor(connectionId: string, show: boolean) {
      this.showSystemDatabasesByConnection[connectionId] = show
    },

    toggleShowSystemObjectsFor(connectionId: string, database: string) {
      const key = `${connectionId}:${database}`
      const current = this.showSystemObjectsByDatabase[key] ?? this.showSystemObjects
      this.showSystemObjectsByDatabase[key] = !current
    },

    setShowSystemObjectsFor(connectionId: string, database: string, show: boolean) {
      const key = `${connectionId}:${database}`
      this.showSystemObjectsByDatabase[key] = show
    },

    // Cleanup stale connection references
    cleanupStaleConnections(validConnectionIds: string[]) {
      const validIdSet = new Set(validConnectionIds)

      // Clean up expanded connections
      for (const connId of this.expandedConnections) {
        if (!validIdSet.has(connId)) {
          this.expandedConnections.delete(connId)
        }
      }

      // Clean up per-database system-object settings
      for (const key of Object.keys(this.showSystemObjectsByDatabase)) {
        const connId = key.split(':')[0]
        if (!validIdSet.has(connId)) {
          delete this.showSystemObjectsByDatabase[key]
        }
      }

      // Clean up per-connection system database settings
      for (const connId of Object.keys(this.showSystemDatabasesByConnection)) {
        if (!validIdSet.has(connId)) {
          delete this.showSystemDatabasesByConnection[connId]
        }
      }

      // Clean up databases state
      for (const connId in this.databasesState) {
        if (!validIdSet.has(connId)) {
          delete this.databasesState[connId]
          delete this.loadingDatabases[connId]
          delete this.databasesErrors[connId]
        }
      }

      // Clean up metadata state
      for (const connId in this.metadataState) {
        if (!validIdSet.has(connId)) {
          delete this.metadataState[connId]
        }
      }

      // Clean up expanded databases and schemas
      const expandedDbsToRemove: string[] = []
      for (const key of this.expandedDatabases) {
        const connId = key.split(':')[0]
        if (!validIdSet.has(connId)) {
          expandedDbsToRemove.push(key)
        }
      }
      for (const key of expandedDbsToRemove) {
        this.expandedDatabases.delete(key)
      }

      const expandedSchemasToRemove: string[] = []
      for (const key of this.expandedSchemas) {
        const connId = key.split(':')[0]
        if (!validIdSet.has(connId)) {
          expandedSchemasToRemove.push(key)
        }
      }
      for (const key of expandedSchemasToRemove) {
        this.expandedSchemas.delete(key)
      }

      // Clear active connection if it's invalid
      if (this.activeConnectionId && !validIdSet.has(this.activeConnectionId)) {
        this.activeConnectionId = null
      }

      // Clear selection if it references an invalid connection
      if (this.selection && !validIdSet.has(this.selection.connectionId)) {
        this.selection = null
      }
    },

    // Active connection management
    setActiveConnectionId(connectionId: string | null) {
      this.activeConnectionId = connectionId
    },

    // Expansion actions
    toggleConnection(connectionId: string) {
      if (this.expandedConnections.has(connectionId)) {
        this.expandedConnections.delete(connectionId)
      } else {
        this.expandedConnections.add(connectionId)
      }
    },

    expandConnection(connectionId: string) {
      this.expandedConnections.add(connectionId)
    },

    collapseConnection(connectionId: string) {
      this.expandedConnections.delete(connectionId)
    },

    toggleDatabase(key: string) {
      if (this.expandedDatabases.has(key)) {
        this.expandedDatabases.delete(key)
      } else {
        this.expandedDatabases.add(key)
      }
    },

    expandDatabase(key: string) {
      this.expandedDatabases.add(key)
    },

    collapseDatabase(key: string) {
      this.expandedDatabases.delete(key)
    },

    toggleSchema(key: string) {
      if (this.expandedSchemas.has(key)) {
        this.expandedSchemas.delete(key)
      } else {
        this.expandedSchemas.add(key)
      }
    },

    expandSchema(key: string) {
      this.expandedSchemas.add(key)
    },

    collapseSchema(key: string) {
      this.expandedSchemas.delete(key)
    },

    // Selection actions
    selectConnection(connectionId: string) {
      this.activeConnectionId = connectionId
      this.selection = {
        connectionId,
        database: undefined,
        schema: undefined,
        type: null,
        name: null,
        filePath: null
      }
    },

    selectDatabase(connectionId: string, database: string) {
      this.activeConnectionId = connectionId
      this.selection = {
        connectionId,
        database,
        schema: undefined,
        type: null,
        name: null,
        filePath: null
      }
    },

    selectObject(
      connectionId: string,
      database: string,
      schema: string | undefined,
      type: ObjectType,
      name: string
    ) {
      this.activeConnectionId = connectionId
      this.selection = {
        connectionId,
        database,
        schema,
        type,
        name,
        filePath: null
      }
    },

    selectFile(connectionId: string, path: string) {
      this.activeConnectionId = connectionId
      this.selection = {
        connectionId,
        database: undefined,
        schema: undefined,
        type: null,
        name: null,
        filePath: path
      }
    },

    clearSelection() {
      this.selection = null
    },

    // Data fetching actions
    async ensureDatabases(connectionId: string, forceRefresh = false) {
      // Return cached if available (for UI reactivity only, not HTTP caching)
      if (!forceRefresh && this.databasesState[connectionId]) {
        return this.databasesState[connectionId]
      }

      // Avoid duplicate requests
      if (this.loadingDatabases[connectionId]) {
        return this.databasesState[connectionId] || []
      }

      this.loadingDatabases[connectionId] = true

      try {
        const dbs = await connectionsApi.getDatabases(connectionId)
        // Preserve isSystem and systemReason flags from API for filtering
        this.databasesState[connectionId] = dbs.map((d) => ({
          name: d.name,
          isSystem: d.isSystem,
          systemReason: d.systemReason,
          schemas: d.schemas
        }))
        // Clear error on successful load
        this.databasesErrors[connectionId] = null
        return this.databasesState[connectionId]
      } catch (error) {
        // Store error message for UI display
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to connect to database'
        this.databasesErrors[connectionId] = errorMessage

        // Only log in development to avoid console noise
        if (import.meta.env.DEV) {
          console.warn(`Failed to load databases for ${connectionId}:`, error)
        }
        // Store empty array to avoid retry loops
        this.databasesState[connectionId] = []
        return []
      } finally {
        this.loadingDatabases[connectionId] = false
      }
    },

    async ensureMetadata(connectionId: string, database: string, forceRefresh = false) {
      const cacheKey = `${connectionId}:${database}`
      const includeSystem = this.showSystemObjectsFor(connectionId, database)

      // Return cached if available (for UI reactivity only, not HTTP caching)
      if (
        !forceRefresh &&
        this.metadataState[connectionId]?.[database] &&
        (!includeSystem || this.metadataIncludesSystem[cacheKey])
      ) {
        return this.metadataState[connectionId][database]
      }

      // Await pending request if one exists
      const pending = this.pendingMetadataRequests[cacheKey]
      if (pending && (!includeSystem || pending.includeSystem)) {
        return pending.promise
      }

      this.loadingMetadata[cacheKey] = true

      const doFetch = async (): Promise<DatabaseMetadata | null> => {
        try {
          const meta = await connectionsApi.getMetadata(connectionId, database, forceRefresh, {
            includeSystem
          })

          // Initialize connection cache if needed
          if (!this.metadataState[connectionId]) {
            this.metadataState[connectionId] = {}
          }

          this.metadataState[connectionId][database] = meta
          this.metadataIncludesSystem[cacheKey] = includeSystem
          return meta
        } catch (error) {
          // Silently fail for metadata - component will handle empty state
          // Only log in development to avoid console noise
          if (import.meta.env.DEV) {
            console.warn(`Failed to load metadata for ${connectionId}/${database}:`, error)
          }
          return null
        } finally {
          this.loadingMetadata[cacheKey] = false
        }
      }

      const fetchPromise = doFetch()

      // Clean up pending request when done
      fetchPromise.finally(() => {
        if (this.pendingMetadataRequests[cacheKey]?.promise === fetchPromise) {
          delete this.pendingMetadataRequests[cacheKey]
        }
      })

      this.pendingMetadataRequests[cacheKey] = { includeSystem, promise: fetchPromise }
      return fetchPromise
    },

    // Cache management (UI state only - not HTTP caching)
    invalidateMetadata(connectionId: string, database: string) {
      const cacheKey = `${connectionId}:${database}`
      if (this.metadataState[connectionId]) {
        delete this.metadataState[connectionId][database]
      }
      delete this.metadataIncludesSystem[cacheKey]
    },

    invalidateDatabases(connectionId: string) {
      delete this.databasesState[connectionId]
    },

    invalidateConnection(connectionId: string) {
      // Clear all cached UI state for a connection
      delete this.databasesState[connectionId]
      delete this.metadataState[connectionId]
    },

    clearAllCache() {
      // Clear all UI state caches
      this.metadataState = {}
      this.databasesState = {}
    },

    // Utility to find table metadata
    findTableMeta(
      connectionId: string,
      database: string,
      tableName: string,
      schema?: string
    ): SQLTableMeta | undefined {
      const metadata = this.metadataState[connectionId]?.[database]
      if (!metadata?.tables) return undefined

      return Object.values(metadata.tables).find((t) => {
        if (schema) {
          return t.name === tableName && t.schema === schema
        }
        return t.name === tableName
      })
    },

    // Utility to find view metadata
    findViewMeta(
      connectionId: string,
      database: string,
      viewName: string,
      schema?: string
    ): SQLViewMeta | undefined {
      const metadata = this.metadataState[connectionId]?.[database]
      if (!metadata?.views) return undefined

      return Object.values(metadata.views).find((v) => {
        if (schema) {
          return v.name === viewName && v.schema === schema
        }
        return v.name === viewName
      })
    },

    findTriggerMeta(
      connectionId: string,
      database: string,
      triggerName: string,
      schema?: string
    ): SQLTriggerMeta | undefined {
      const metadata = this.metadataState[connectionId]?.[database]
      if (!metadata?.triggers) return undefined

      return Object.values(metadata.triggers).find((t) => {
        if (schema) {
          return t.name === triggerName && t.schema === schema
        }
        return t.name === triggerName
      })
    },

    findRoutineMeta(
      connectionId: string,
      database: string,
      routineName: string,
      routineType: 'function' | 'procedure',
      schema?: string,
      signature?: string
    ): SQLRoutineMeta | undefined {
      const metadata = this.metadataState[connectionId]?.[database]
      const routines = routineType === 'function' ? metadata?.functions : metadata?.procedures
      if (!routines) return undefined

      const normalizedSignature = (signature || '').trim()
      return Object.values(routines).find((r) => {
        if (schema && r.schema !== schema) return false
        if (r.name !== routineName) return false
        if (!normalizedSignature) return true
        return (r.signature || '').trim() === normalizedSignature
      })
    }
  }
})
