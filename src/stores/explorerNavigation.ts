import { defineStore } from 'pinia'
import type { DatabaseMetadata, SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'
import connectionsApi from '@/api/connections'

export type ObjectType = 'table' | 'view'
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
  meta: SQLTableMeta | SQLViewMeta
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

    // Expansion state
    expandedConnections: new Set<string>(),
    expandedDatabases: new Set<string>(),
    expandedSchemas: new Set<string>(),

    // Metadata cache - indexed by connectionId -> database -> metadata
    metadataCache: {} as Record<string, Record<string, DatabaseMetadata>>,

    // Database list cache - indexed by connectionId
    databasesCache: {} as Record<string, Array<{ name: string }>>,

    // Current selection
    selection: null as NavigationSelection | null,

    // Loading states
    loadingDatabases: {} as Record<string, boolean>,
    loadingMetadata: {} as Record<string, boolean>, // key: connectionId:database

    // Timestamps for cache invalidation (in milliseconds)
    metadataCacheTimestamps: {} as Record<string, number>, // key: connectionId:database
    databasesCacheTimestamps: {} as Record<string, number> // key: connectionId
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

    getDatabases: (state) => (connectionId: string) => {
      return state.databasesCache[connectionId] || null
    },

    getMetadata: (state) => (connectionId: string, database: string) => {
      return state.metadataCache[connectionId]?.[database] || null
    },

    isMetadataLoading: (state) => (connectionId: string, database: string) => {
      const key = `${connectionId}:${database}`
      return state.loadingMetadata[key] || false
    },

    isDatabasesLoading: (state) => (connectionId: string) => {
      return state.loadingDatabases[connectionId] || false
    },

    // Check if cache is stale (older than 5 minutes)
    isMetadataStale: (state) => (connectionId: string, database: string) => {
      const key = `${connectionId}:${database}`
      const timestamp = state.metadataCacheTimestamps[key]
      if (!timestamp) return true
      const now = Date.now()
      const FIVE_MINUTES = 5 * 60 * 1000
      return now - timestamp > FIVE_MINUTES
    },

    isDatabasesCacheStale: (state) => (connectionId: string) => {
      const timestamp = state.databasesCacheTimestamps[connectionId]
      if (!timestamp) return true
      const now = Date.now()
      const FIVE_MINUTES = 5 * 60 * 1000
      return now - timestamp > FIVE_MINUTES
    }
  },

  actions: {
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
      // Return cached if available and not stale
      if (
        !forceRefresh &&
        this.databasesCache[connectionId] &&
        !this.isDatabasesCacheStale(connectionId)
      ) {
        return this.databasesCache[connectionId]
      }

      // Avoid duplicate requests
      if (this.loadingDatabases[connectionId]) {
        return this.databasesCache[connectionId] || []
      }

      this.loadingDatabases[connectionId] = true

      try {
        const dbs = await connectionsApi.getDatabases(connectionId)
        this.databasesCache[connectionId] = dbs.map((d) => ({ name: d.name }))
        this.databasesCacheTimestamps[connectionId] = Date.now()
        return this.databasesCache[connectionId]
      } catch (error) {
        // Silently fail for databases - component will handle empty state
        // Only log in development to avoid console noise
        if (import.meta.env.DEV) {
          console.warn(`Failed to load databases for ${connectionId}:`, error)
        }
        // Store empty array to avoid retry loops
        this.databasesCache[connectionId] = []
        this.databasesCacheTimestamps[connectionId] = Date.now()
        return []
      } finally {
        this.loadingDatabases[connectionId] = false
      }
    },

    async ensureMetadata(connectionId: string, database: string, forceRefresh = false) {
      const cacheKey = `${connectionId}:${database}`

      // Return cached if available and not stale
      if (
        !forceRefresh &&
        this.metadataCache[connectionId]?.[database] &&
        !this.isMetadataStale(connectionId, database)
      ) {
        return this.metadataCache[connectionId][database]
      }

      // Avoid duplicate requests
      if (this.loadingMetadata[cacheKey]) {
        return this.metadataCache[connectionId]?.[database] || null
      }

      this.loadingMetadata[cacheKey] = true

      try {
        const meta = await connectionsApi.getMetadata(connectionId, database, forceRefresh)

        // Initialize connection cache if needed
        if (!this.metadataCache[connectionId]) {
          this.metadataCache[connectionId] = {}
        }

        this.metadataCache[connectionId][database] = meta
        this.metadataCacheTimestamps[cacheKey] = Date.now()
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
    },

    // Cache management
    invalidateMetadata(connectionId: string, database: string) {
      const cacheKey = `${connectionId}:${database}`
      if (this.metadataCache[connectionId]) {
        delete this.metadataCache[connectionId][database]
      }
      delete this.metadataCacheTimestamps[cacheKey]
    },

    invalidateDatabases(connectionId: string) {
      delete this.databasesCache[connectionId]
      delete this.databasesCacheTimestamps[connectionId]
    },

    invalidateConnection(connectionId: string) {
      // Clear all cached data for a connection
      delete this.databasesCache[connectionId]
      delete this.databasesCacheTimestamps[connectionId]
      delete this.metadataCache[connectionId]

      // Clear metadata timestamps for this connection
      Object.keys(this.metadataCacheTimestamps).forEach((key) => {
        if (key.startsWith(`${connectionId}:`)) {
          delete this.metadataCacheTimestamps[key]
        }
      })
    },

    clearAllCache() {
      this.metadataCache = {}
      this.databasesCache = {}
      this.metadataCacheTimestamps = {}
      this.databasesCacheTimestamps = {}
    },

    // Utility to find table metadata
    findTableMeta(
      connectionId: string,
      database: string,
      tableName: string,
      schema?: string
    ): SQLTableMeta | undefined {
      const metadata = this.metadataCache[connectionId]?.[database]
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
      const metadata = this.metadataCache[connectionId]?.[database]
      if (!metadata?.views) return undefined

      return Object.values(metadata.views).find((v) => {
        if (schema) {
          return v.name === viewName && v.schema === schema
        }
        return v.name === viewName
      })
    }
  }
})
