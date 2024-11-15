import { defineStore } from 'pinia'
import api from '@/api/connections'
import { debounce } from 'lodash'

import { Connection, DbType, SSLConfig } from '@/types/connections'

// Define interfaces for the state and other objects
interface State {
  dbTypes: DbType[]
  connections: Connection[]
  currentConnection: Connection | null
  sourceConnection: Connection | null
  targetConnection: Connection | null
  currentFilter: string
  ssl: SSLConfig | null
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
    ssl: null
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
    saveConnection: debounce(async function (this: any) {
      try {
        const connection = this.currentConnection
        if (!connection) return

        // Create a copy of the connection object
        const connectionToSave = { ...connection }

        // If SSL config exists, merge it with the connection
        if (this.ssl !== null) {
          connectionToSave.ssl = this.ssl
        }

        if (!connectionToSave.id) {
          await api.createConnection(connectionToSave)
        } else {
          await api.updateConnection(connectionToSave)
        }
        await this.refreshConnections()
      } catch (error) {
        console.error('Failed to save connection:', error)
        throw error
      }
    }, 500),
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
        const resp = (await api.cloneConnection(id)) as Connection
        this.currentConnection = {
          ...this.currentConnection!,
          id: resp.id,
          created: resp.created
        }
        this.saveConnection()
      } catch (error) {
        console.error('Failed to clone connection:', error)
        throw error
      }
    }, 500),
    resetCurrentConnection() {
      this.currentConnection = null
      this.ssl = null
    },
    async clearConnections() {
      this.connections.length = 0
    },
    updateSSLParams(ssl: any) {
      this.ssl = ssl
    }
  }
})
