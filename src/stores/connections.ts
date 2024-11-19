import { defineStore } from 'pinia'
import api from '@/api/connections'
import { debounce } from 'lodash'

import { Connection, DbType  } from '@/types/connections'

// Define interfaces for the state and other objects
interface State {
  dbTypes: DbType[]
  connections: Connection[]
  currentConnection: Connection | null
  sourceConnection: Connection | null
  targetConnection: Connection | null
  currentFilter: string
}

export const useConnectionsStore = defineStore('connections', {
  state: (): State => ({
    dbTypes: [
      { id: 0, type: 'All', logo: '/images/db-logos/all.svg' },
      { id: 1, type: 'PostgreSQL', logo: '/images/db-logos/postgresql.svg' },
      { id: 2, type: 'MySQL', logo: '/images/db-logos/mysql.svg' },
    ],
    connections: [],
    currentConnection: null,
    sourceConnection: null,
    targetConnection: null,
    currentFilter: '',
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
    },
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
    refreshConnections: debounce(async function (this: State) {
      try {
        this.connections = (await api.getConnections()) as Connection[]
      } catch (error) {
        console.error('Failed to refresh connections:', error)
        throw error
      }
    }, 500),
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
      } catch (error) {
        console.error('Failed to clone connection:', error)
        throw error
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
        const response = await api.createConnection(this.currentConnection as Record<string, unknown>)
        
        if (this.currentConnection) {
          this.currentConnection.id = response.id
          this.currentConnection.created = response.created
          
          const databasesInfo = await api.getDatabases(response.id)
          this.currentConnection.databasesInfo = databasesInfo

          if (this.currentConnection.type === 'PostgreSQL' && this.currentConnection.database) {
            const currentDb = databasesInfo.find(db => db.name === this.currentConnection?.database)
            if (currentDb?.schemas) {
              this.currentConnection.schema = currentDb.schemas[0]
            }
          }
        }
      } catch (error) {
        console.error('Failed to create connection:', error)
        throw error
      }
    },
    async updateConnection(): Promise<void> {
      try {
        if (!this.currentConnection) return

        await api.updateConnection()
        
        const databases = await api.getDatabases(this.currentConnection.id)
        this.currentConnection.databasesInfo = databases

        if (this.currentConnection.type === 'PostgreSQL') {
          const currentDb = databases.find(db => db.name === this.currentConnection?.database)
          if (currentDb?.schemas) {
            this.currentConnection.schema = currentDb.schemas[0]
          }
        }

        await this.refreshConnections()
      } catch (error) {
        console.error('Failed to update connection:', error)
        throw error
      }
    },
  }
})
