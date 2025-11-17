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

    // Metadata state - stores fetched data for UI reactivity only (NOT HTTP caching)
    // Backend handles HTTP caching with 30s TTL
    metadataState: {} as Record<string, Record<string, DatabaseMetadata>>,

    // Database list state - stores fetched lists for UI reactivity only (NOT HTTP caching)
    databasesState: {} as Record<string, Array<{ name: string }>>,

    // Current selection
    selection: null as NavigationSelection | null,

    // Loading states
    loadingDatabases: {} as Record<string, boolean>,
    loadingMetadata: {} as Record<string, boolean>, // key: connectionId:database

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

    getDatabases: (state) => (connectionId: string) => {
      return state.databasesState[connectionId] || null
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
        this.databasesState[connectionId] = dbs.map((d) => ({ name: d.name }))
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

      // Return cached if available (for UI reactivity only, not HTTP caching)
      if (!forceRefresh && this.metadataState[connectionId]?.[database]) {
        return this.metadataState[connectionId][database]
      }

      // Avoid duplicate requests
      if (this.loadingMetadata[cacheKey]) {
        return this.metadataState[connectionId]?.[database] || null
      }

      this.loadingMetadata[cacheKey] = true

      try {
        const meta = await connectionsApi.getMetadata(connectionId, database, forceRefresh)

        // Initialize connection cache if needed
        if (!this.metadataState[connectionId]) {
          this.metadataState[connectionId] = {}
        }

        this.metadataState[connectionId][database] = meta
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

    // Cache management (UI state only - not HTTP caching)
    invalidateMetadata(connectionId: string, database: string) {
      if (this.metadataState[connectionId]) {
        delete this.metadataState[connectionId][database]
      }
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
    }
  }
})
