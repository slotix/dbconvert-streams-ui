import { defineStore } from 'pinia'
import api from '@/api/connections'
import { debounce } from '@/utils/debounce'

import type { Connection, DbType } from '@/types/connections'
import { useExplorerNavigationStore } from './explorerNavigation'
import { useFileExplorerStore } from './fileExplorer'
import { getConnectionDatabase } from '@/utils/specBuilder'
import {
  getConnectionKindFromSpec,
  isDatabaseKind,
  matchesConnectionTypeFilter
} from '@/types/specs'

type ConnectionSpecFactory = () => Connection['spec']

const databaseTypeAliases = new Set([
  'postgresql',
  'postgres',
  'mysql',
  'mariadb',
  'sqlserver',
  'mssql',
  'oracle',
  'db2'
])

const buildDatabaseSpec: ConnectionSpecFactory = () => ({
  database: {
    host: '',
    port: 0,
    username: '',
    password: '',
    database: ''
  }
})

// File-based connections use spec.files (local files only)
const buildFileSpec: ConnectionSpecFactory = () => ({
  files: {
    basePath: ''
  }
})

const buildS3Spec: ConnectionSpecFactory = () => ({
  s3: {
    region: '',
    scope: {}
  }
})

const specFactories: Record<string, ConnectionSpecFactory> = {
  database: buildDatabaseSpec,
  snowflake: buildDatabaseSpec,
  files: buildFileSpec,
  s3: buildS3Spec
}

function resolveSpecFactory(type: string): ConnectionSpecFactory | undefined {
  const normalized = type.toLowerCase()
  if (databaseTypeAliases.has(normalized)) {
    return specFactories.database
  }
  return specFactories[normalized]
}

// Define interfaces for the state and other objects
interface State {
  dbTypes: DbType[]
  connections: Connection[]
  currentConnection: Connection | null
  sourceConnection: Connection | null
  targetConnection: Connection | null
  currentFilter: string
  isLoadingConnections: boolean
  isUpdatingConnection: boolean
  isTestingConnection: boolean
  isLoadingDatabases: boolean
}

// Removed cache mechanism - connections are now always fetched fresh from API
// This ensures UI is always in sync with Consul storage via the API

export const useConnectionsStore = defineStore('connections', {
  state: (): State => ({
    dbTypes: [
      { id: 0, type: 'All', logo: '/images/db-logos/all.svg', category: 'all' },
      { id: 1, type: 'PostgreSQL', logo: '/images/db-logos/postgresql.svg', category: 'database' },
      { id: 2, type: 'MySQL', logo: '/images/db-logos/mysql.svg', category: 'database' },
      { id: 3, type: 'Snowflake', logo: '/images/db-logos/snowflake.svg', category: 'database' },
      {
        id: 4,
        type: 'Files',
        logo: '/images/db-logos/local-files.svg',
        category: 'file',
        description: 'Local file formats'
      },
      {
        id: 5,
        type: 'S3',
        logo: '/images/db-logos/s3.svg',
        category: 'file',
        description: 'AWS, MinIO, etc.'
      }
    ],
    connections: [],
    currentConnection: null,
    sourceConnection: null,
    targetConnection: null,
    currentFilter: '',
    isLoadingConnections: false,
    isUpdatingConnection: false,
    isTestingConnection: false,
    isLoadingDatabases: false
  }),
  getters: {
    allConnections(state: State): Connection[] {
      return state.connections
    },
    countConnections(state: State): number {
      return state.connections.filter((el) => {
        const filter = state.currentFilter.toLowerCase()
        return matchesConnectionTypeFilter(el.spec, el.type, filter)
      }).length
    },
    currentConnectionIndexInArray(state: State): number {
      return state.connections.indexOf(state.currentConnection!)
    },
    connectionsByType(state: State): Connection[] {
      return state.connections
        .filter((el) => {
          const filter = state.currentFilter.toLowerCase()
          return matchesConnectionTypeFilter(el.spec, el.type, filter)
        })
        .sort((a, b) => (b.created as number) - (a.created as number))
    }
  },
  actions: {
    // Removed cache persistence methods - connections are now always fetched fresh from API
    // This ensures UI is always in sync with Consul storage via the API

    setCurrentConnection(id: string) {
      const curConnection = this.connections.find((c) => c.id === id)
      if (curConnection) {
        // Create a deep copy to avoid reactivity issues
        this.currentConnection = JSON.parse(JSON.stringify(curConnection))
      }
    },
    connectionByID(id: string): Connection | null {
      const connection = this.connections.find((c) => c.id === id)
      return connection || null
    },
    setFilter(filter: string) {
      this.currentFilter = filter
    },
    updateConnectionParams(params: Partial<Connection>) {
      if (this.currentConnection && params) {
        Object.assign(this.currentConnection, params)
        console.log('Updated connection:', this.currentConnection)
      }
    },
    async refreshConnections() {
      this.isLoadingConnections = true
      try {
        const response = await api.getConnections()
        this.connections = response
        // No longer saving to localStorage - always fetch fresh from API

        // Cleanup stale connection references in explorerNavigation store
        const explorerNavigationStore = useExplorerNavigationStore()
        const fileExplorerStore = useFileExplorerStore()
        const validConnectionIds = this.connections.map((conn) => conn.id)
        explorerNavigationStore.cleanupStaleConnections(validConnectionIds)
        fileExplorerStore.cleanupStaleConnections(validConnectionIds)
      } catch (error) {
        console.error('Failed to refresh connections:', error)
        throw error
      } finally {
        this.isLoadingConnections = false
      }
    },
    async _deleteConnection(id: string) {
      try {
        // Call API first - only update local state if successful
        await api.deleteConnection(id)

        // Remove from local state after successful API call
        const index = this.connections.findIndex((connection: Connection) => connection.id === id)
        if (index !== -1) {
          this.connections.splice(index, 1)
        }

        // Cleanup stale connection references in explorerNavigation store
        const explorerNavigationStore = useExplorerNavigationStore()
        const fileExplorerStore = useFileExplorerStore()
        const validConnectionIds = this.connections.map((conn) => conn.id)
        explorerNavigationStore.cleanupStaleConnections(validConnectionIds)
        fileExplorerStore.cleanupStaleConnections(validConnectionIds)
      } catch (error) {
        console.error('Failed to delete connection:', error)
        throw error
      }
    },
    async _cloneConnection(id: string) {
      try {
        const { id: clonedId, created: clonedCreated } = await api.cloneConnection(id)
        this.currentConnection = {
          ...this.currentConnection!,
          id: clonedId,
          created: clonedCreated
        }
        await this.refreshConnections()
      } catch (error) {
        console.error('Failed to clone connection:', error)
        throw error
      }
    },
    async _testConnection() {
      try {
        this.isTestingConnection = true
        const status = await api.testConnection()
        if (this.currentConnection) {
          this.currentConnection = {
            ...this.currentConnection,
            status: status
          }
        }
        // Check if the test actually failed (API returns string status, not error)
        if (status.includes('Failed')) {
          throw new Error(status)
        }
        // Success is shown inline in the wizard components
      } catch (error) {
        console.error('Failed to test connection:', error)
        throw error
      } finally {
        this.isTestingConnection = false
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deleteConnection: debounce(function (this: any, id: string) {
      return this._deleteConnection(id)
    }, 500),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cloneConnection: debounce(function (this: any, id: string) {
      return this._cloneConnection(id)
    }, 500),
    async testConnection() {
      return this._testConnection()
    },
    resetCurrentConnection() {
      this.currentConnection = null
    },
    async clearConnections() {
      this.connections.length = 0
    },
    async createConnection(): Promise<void> {
      try {
        // Spec is now required - no need to build from flat fields
        if (!this.currentConnection?.spec) {
          throw new Error('Connection spec is required')
        }

        const response = await api.createConnection(
          this.currentConnection as Record<string, unknown>
        )

        if (this.currentConnection) {
          this.currentConnection.id = response.id
          this.currentConnection.created = response.created
          // Initialize empty databases info - will be loaded later when needed
          this.currentConnection.databasesInfo = []

          // Refresh connections to get the latest data and update storage
          try {
            await this.refreshConnections()
          } catch (refreshError) {
            console.warn(
              '[Store] Failed to refresh connections, but connection was created:',
              refreshError
            )
            // Don't fail the whole operation if refresh fails
          }
        }
      } catch (error) {
        console.error('[Store] Failed to create connection:', error)
        throw error
      }
    },
    async updateConnection(): Promise<void> {
      try {
        await api.updateConnection()
        // Refresh connections to get the latest data and update storage
        await this.refreshConnections()
      } catch (error) {
        console.error('[Store] Failed to update connection:', error)
        throw error
      }
    },
    async updateConnectionById(connectionId: string, connection: Connection): Promise<void> {
      try {
        await api.updateConnectionById(connectionId, connection)
        // Refresh connections to get the latest data
        await this.refreshConnections()
      } catch (error) {
        console.error('[Store] Failed to update connection by ID:', error)
        throw error
      }
    },
    async getDatabases(connectionId: string) {
      this.isLoadingDatabases = true
      try {
        const databases = await api.getDatabases(connectionId)
        this.currentConnection!.databasesInfo = databases
        // Schema handling moved to explorer/stream contexts
      } finally {
        this.isLoadingDatabases = false
      }
    },
    async createDatabase(databaseName: string, connectionId: string) {
      try {
        const response = await api.createDatabase(databaseName, connectionId)
        if (response.status === 'success') {
          await this.getDatabases(connectionId)
        }
        return response
      } catch (error) {
        console.error('Failed to create database:', error)
        throw error
      }
    },
    async createSchema(schemaName: string, connectionId: string) {
      try {
        const targetDatabase = this.currentConnection
          ? getConnectionDatabase(this.currentConnection)
          : ''
        if (!targetDatabase) {
          throw new Error('Database not selected')
        }
        const response = await api.createSchema(schemaName, connectionId, targetDatabase)
        if (response.status === 'success') {
          await this.getDatabases(connectionId)
        }
        return response
      } catch (error) {
        console.error('Failed to create schema:', error)
        throw error
      }
    },
    async getTables(connectionId: string, database?: string, options?: { schemas?: string[] }) {
      try {
        // If database is not provided, try to get it from the connection
        let dbName = database
        if (!dbName) {
          const connection = this.connectionByID(connectionId)
          if (!connection) {
            throw new Error(`Connection with ID: ${connectionId} not found`)
          }
          dbName = getConnectionDatabase(connection)
          if (!dbName) {
            throw new Error(`No default database configured for connection ${connectionId}`)
          }
        }
        const tables = await api.getTables(connectionId, dbName, options)
        return tables
      } catch (error) {
        console.error('Failed to get tables:', error)
        throw error
      }
    },
    // Helper to check if a connection supports multi-schema operations
    supportsMultiSchema(connectionId: string): boolean {
      const connection = this.connections.find((conn) => conn.id === connectionId)
      const kind = getConnectionKindFromSpec(connection?.spec)
      if (!isDatabaseKind(kind)) return false
      const type = connection?.type?.toLowerCase()
      return type === 'postgresql' || type === 'sqlserver' || type === 'oracle'
    },
    async forceRefreshConnections() {
      await this.refreshConnections()
    },

    // Helper methods for connection initialization
    initializeNewConnection() {
      this.currentConnection = {
        id: '',
        name: '',
        type: '',
        created: 0,
        cloud_provider: '',
        databasesInfo: [],
        spec: {}
      }
    },

    ensureSpecForType(connectionType: string) {
      if (this.currentConnection?.id) {
        // Editing existing connection - don't overwrite spec
        return
      }

      if (!this.currentConnection) {
        this.initializeNewConnection()
      }
      if (!this.currentConnection) return

      const factory = resolveSpecFactory(connectionType)
      if (factory) {
        this.currentConnection.spec = factory()
      } else {
        this.currentConnection.spec = {}
      }
    },

    setConnectionType(dbType: string) {
      if (this.currentConnection) {
        this.currentConnection.type = dbType.toLowerCase()
      }
    }
  }
})
