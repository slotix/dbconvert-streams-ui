import { defineStore } from 'pinia'
import api from '@/api/connections'
import { debounce } from 'lodash'

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

// Constants for localStorage keys
const CONNECTIONS_STORAGE_KEY = 'dbconvert-connections'
const CONNECTIONS_TIMESTAMP_KEY = 'dbconvert-connections-timestamp'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

export const useConnectionsStore = defineStore('connections', {
  state: (): State => ({
    dbTypes: [
      { id: 0, type: 'All', logo: '/images/db-logos/all.svg' },
      { id: 1, type: 'PostgreSQL', logo: '/images/db-logos/postgresql.svg' },
      { id: 2, type: 'MySQL', logo: '/images/db-logos/mysql.svg' }
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
    // Persistence methods
    saveConnectionsToStorage() {
      try {
        // Only save basic connection info, exclude sensitive data like passwords
        const connectionsToSave = this.connections.map(conn => ({
          id: conn.id,
          name: conn.name,
          type: conn.type,
          host: conn.host,
          port: conn.port,
          username: conn.username,
          database: conn.database,
          created: conn.created,
          cloud_provider: conn.cloud_provider,
          // Exclude password and other sensitive data
        }))
        
        localStorage.setItem(CONNECTIONS_STORAGE_KEY, JSON.stringify(connectionsToSave))
        localStorage.setItem(CONNECTIONS_TIMESTAMP_KEY, Date.now().toString())
      } catch (error) {
        console.warn('Failed to save connections to localStorage:', error)
      }
    },

    loadConnectionsFromStorage(): Connection[] {
      try {
        const timestamp = localStorage.getItem(CONNECTIONS_TIMESTAMP_KEY)
        const now = Date.now()
        
        // Check if cache is expired
        if (!timestamp || (now - parseInt(timestamp)) > CACHE_DURATION) {
          return []
        }
        
        const savedConnections = localStorage.getItem(CONNECTIONS_STORAGE_KEY)
        if (savedConnections) {
          return JSON.parse(savedConnections)
        }
      } catch (error) {
        console.warn('Failed to load connections from localStorage:', error)
      }
      return []
    },

    clearConnectionsStorage() {
      try {
        localStorage.removeItem(CONNECTIONS_STORAGE_KEY)
        localStorage.removeItem(CONNECTIONS_TIMESTAMP_KEY)
      } catch (error) {
        console.warn('Failed to clear connections from localStorage:', error)
      }
    },

    initializeFromStorage() {
      const savedConnections = this.loadConnectionsFromStorage()
      if (savedConnections.length > 0) {
        this.connections = savedConnections
      }
    },

    shouldRefreshFromAPI(): boolean {
      try {
        const timestamp = localStorage.getItem(CONNECTIONS_TIMESTAMP_KEY)
        if (!timestamp) return true
        
        const now = Date.now()
        return (now - parseInt(timestamp)) > CACHE_DURATION
      } catch (error) {
        return true
      }
    },

    setCurrentConnection(id: string) {
      const curConnection = this.connections.filter((c) => {
        return c.id === id
      })
      this.currentConnection = curConnection[0]
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
        // Simulate a delay for testing
        // await new Promise((resolve) => setTimeout(resolve, 10000)); // 2 seconds delay

        const response = await api.getConnections()
        this.connections = response
        
        // Save to localStorage after successful fetch
        this.saveConnectionsToStorage()
      } catch (error) {
        console.error('Failed to refresh connections:', error)
        throw error
      } finally {
        this.isLoadingConnections = false
      }
    },
    deleteConnection: debounce(async function (this: any, id: string) {
      try {
        const index = this.connections.findIndex((connection: Connection) => connection.id === id)
        if (index !== -1) {
          this.connections.splice(index, 1)
        }
        await api.deleteConnection(id)
        
        // Update localStorage after deletion
        this.saveConnectionsToStorage()
      } catch (error) {
        console.error('Failed to delete connection:', error)
        throw error
      }
    }, 500),
    cloneConnection: debounce(async function (this: any, id: string) {
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
    }, 500),

    testConnection: debounce(async function (this: any, id: string) {
      try {
        this.isTestingConnection = true
        const status = await api.testConnection()
        this.currentConnection = {
          ...this.currentConnection!,
          status: status
        }
        useCommonStore().showNotification(status, 'success')
      } catch (error) {
        useCommonStore().showNotification((error as Error).message, 'error')
        console.error('Failed to test connection:', error)
        throw error
      } finally {
        this.isTestingConnection = false
      }
    }, 500),
    resetCurrentConnection() {
      this.currentConnection = null
    },
    async clearConnections() {
      this.connections.length = 0
      this.clearConnectionsStorage()
    },
    async createConnection(): Promise<void> {
      try {
        const response = await api.createConnection(
          this.currentConnection as Record<string, unknown>
        )

        if (this.currentConnection) {
          this.currentConnection.id = response.id
          this.currentConnection.created = response.created

          const databasesInfo = await api.getDatabases(response.id)
          this.currentConnection.databasesInfo = databasesInfo
          // Schema handling moved to explorer/stream contexts
          
          // Refresh connections to get the latest data and update storage
          await this.refreshConnections()
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
      this.clearConnectionsStorage()
      await this.refreshConnections()
    },

    // Debug method to check cache status
    getCacheInfo() {
      try {
        const timestamp = localStorage.getItem(CONNECTIONS_TIMESTAMP_KEY)
        const connections = localStorage.getItem(CONNECTIONS_STORAGE_KEY)
        const now = Date.now()
        
        if (!timestamp || !connections) {
          return { hasCache: false, expired: true, age: 0, connectionCount: 0 }
        }
        
        const age = now - parseInt(timestamp)
        const expired = age > CACHE_DURATION
        const connectionCount = JSON.parse(connections).length
        
        return {
          hasCache: true,
          expired,
          age: Math.round(age / 1000), // in seconds
          maxAge: Math.round(CACHE_DURATION / 1000), // in seconds
          connectionCount,
          timestamp: new Date(parseInt(timestamp)).toISOString()
        }
      } catch (error) {
        return { hasCache: false, expired: true, age: 0, connectionCount: 0, error: (error as Error).message }
      }
    }
  }
})
