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

// Removed cache mechanism - connections are now always fetched fresh from API
// This ensures UI is always in sync with Consul storage via the API
// Recent connections still use localStorage but are managed separately

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
    // Minimal fallback: load basic connection info from recent connections when API unavailable
    loadConnectionsFromRecentData() {
      try {
        const recentConnections = localStorage.getItem('recentConnections')
        if (recentConnections) {
          const recentData = JSON.parse(recentConnections)
          // Convert recent connections to minimal connection objects for display
          this.connections = recentData.map((recent: any) => ({
            id: recent.id,
            name: recent.name,
            type: recent.type || 'unknown',
            host: recent.host || '',
            port: recent.port || '',
            username: '',
            password: '',
            database: recent.database || '',
            created: 0,
            cloud_provider: recent.cloud_provider || ''
          }))
          console.log('Loaded connections from recent data as fallback')
        }
      } catch (error) {
        console.warn('Failed to load connections from recent data:', error)
      }
    },

    // Removed cache persistence methods - connections are now always fetched fresh from API
    // This ensures UI is always in sync with Consul storage via the API

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
    deleteConnection: debounce(async function (this: any, id: string) {
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
      await this.refreshConnections()
    },

    // Removed cache-related debug methods since we no longer use caching
    // Connections are always fetched fresh from the API
    getRecentConnectionsInfo() {
      try {
        const recentConnections = localStorage.getItem('recentConnections')
        const lastViewedConnectionId = localStorage.getItem('lastViewedConnectionId')
        
        if (!recentConnections) {
          return { hasRecentConnections: false, count: 0, lastViewed: null }
        }
        
        const parsed = JSON.parse(recentConnections)
        return {
          hasRecentConnections: true,
          count: parsed.length,
          lastViewed: lastViewedConnectionId,
          connections: parsed.map((conn: any) => ({
            id: conn.id,
            name: conn.name,
            type: conn.type || 'unknown'
          }))
        }
      } catch (error) {
        return { hasRecentConnections: false, count: 0, lastViewed: null, error: (error as Error).message }
      }
    }
  }
})
