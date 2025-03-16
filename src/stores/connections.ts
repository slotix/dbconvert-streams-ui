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

          if (this.currentConnection.type === 'PostgreSQL' && this.currentConnection.database) {
            const currentDb = databasesInfo.find(
              (db) => db.name === this.currentConnection?.database
            )
            if (currentDb?.schemas) {
              this.currentConnection.schema = currentDb.schemas[0]
            }
          }
        }
      } catch (error) {
        console.error('[Store] Failed to create connection:', error)
        throw error
      }
    },
    async updateConnection() {
      this.isUpdatingConnection = true
      try {
        if (!this.currentConnection) return

        await api.updateConnection()
        await this.refreshConnections()
      } catch (error) {
        console.error('Failed to update connection:', error)
        throw error
      } finally {
        this.isUpdatingConnection = false
      }
    },
    async getDatabases(connectionId: string) {
      this.isLoadingDatabases = true
      try {
        const databases = await api.getDatabases(connectionId)
        this.currentConnection!.databasesInfo = databases

        // Only set schema if it's a new connection or if current schema doesn't exist in the database
        if (this.currentConnection!.type === 'PostgreSQL') {
          const currentDb = databases.find((db) => db.name === this.currentConnection?.database)
          if (currentDb?.schemas) {
            // Only set schema if it's not already set or if current schema is not in the list
            if (
              !this.currentConnection!.schema ||
              !currentDb.schemas.includes(this.currentConnection!.schema)
            ) {
              this.currentConnection!.schema = currentDb.schemas[0]
            }
          }
        }
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
    }
  }
})
