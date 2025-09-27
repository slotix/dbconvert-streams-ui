import { defineStore } from 'pinia'
import api from '@/api/connections'
import { debounce } from '@/utils/debounce'

import type { Connection, DbType } from '@/types/connections'
import { useCommonStore } from './common'

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
      { id: 0, type: 'All', logo: '/images/db-logos/all.svg' },
      { id: 1, type: 'PostgreSQL', logo: '/images/db-logos/postgresql.svg' },
      { id: 2, type: 'MySQL', logo: '/images/db-logos/mysql.svg' },
      { id: 3, type: 'Snowflake', logo: '/images/db-logos/snowflake.svg' },
      { id: 4, type: 'Files', logo: '/images/db-logos/local-files.svg' }
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
        return el.type && el.type.toLowerCase().indexOf(state.currentFilter.toLowerCase()) > -1
      }).length
    },
    currentConnectionIndexInArray(state: State): number {
      return state.connections.indexOf(state.currentConnection!)
    },
    connectionsByType(state: State): Connection[] {
      return state.connections
        .filter((el) => {
          return el.type && el.type.toLowerCase().indexOf(state.currentFilter.toLowerCase()) > -1
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
    updateConnectionParams(params: any) {
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
      } catch (error) {
        console.error('Failed to refresh connections:', error)
        throw error
      } finally {
        this.isLoadingConnections = false
      }
    },
    async _deleteConnection(id: string) {
      try {
        const index = this.connections.findIndex((connection: Connection) => connection.id === id)
        if (index !== -1) {
          this.connections.splice(index, 1)
        }
        await api.deleteConnection(id)
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
        useCommonStore().showNotification(status, 'success')
      } catch (error) {
        useCommonStore().showNotification((error as Error).message, 'error')
        console.error('Failed to test connection:', error)
        throw error
      } finally {
        this.isTestingConnection = false
      }
    },
    deleteConnection: debounce(function (this: any, id: string) {
      return this._deleteConnection(id)
    }, 500),
    cloneConnection: debounce(function (this: any, id: string) {
      return this._cloneConnection(id)
    }, 500),
    testConnection: debounce(function (this: any) {
      return this._testConnection()
    }, 500),
    resetCurrentConnection() {
      this.currentConnection = null
    },
    async clearConnections() {
      this.connections.length = 0
    },
    async createConnection(): Promise<void> {
      try {
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
        if (!this.currentConnection?.database) {
          throw new Error('Database not selected')
        }
        const response = await api.createSchema(
          schemaName,
          connectionId,
          this.currentConnection.database
        )
        if (response.status === 'success') {
          await this.getDatabases(connectionId)
        }
        return response
      } catch (error) {
        console.error('Failed to create schema:', error)
        throw error
      }
    },
    async getTables(connectionId: string) {
      try {
        const tables = await api.getTables(connectionId)
        return tables
      } catch (error) {
        console.error('Failed to get tables:', error)
        throw error
      }
    },
    // Helper to check if a connection supports multi-schema operations
    supportsMultiSchema(connectionId: string): boolean {
      const connection = this.connections.find((conn) => conn.id === connectionId)
      return (
        connection?.type === 'PostgreSQL' ||
        connection?.type === 'SQL Server' ||
        connection?.type === 'Oracle'
      )
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
        host: '',
        port: 0,
        username: '',
        password: '',
        database: '',
        created: 0,
        cloud_provider: '',
        databasesInfo: []
      }
    },

    setConnectionType(dbType: string) {
      if (this.currentConnection) {
        this.currentConnection.type = dbType.toLowerCase()
      }
    }
  }
})
