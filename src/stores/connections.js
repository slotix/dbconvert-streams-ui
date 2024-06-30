import { defineStore } from "pinia";
import api from "@/api/connections.js";
import { debounce } from 'lodash';

export const useConnectionsStore = defineStore("connections", {
  state: () => ({
    dbTypes: [
      {
        id: 0,
        type: "All",
        logo: "/images/db-logos/all.svg",
      },
      {
        id: 1,
        type: "PostgreSQL",
        logo: "/images/db-logos/postgresql.svg",
      },
      {
        id: 2,
        type: "MySQL",
        logo: "/images/db-logos/mysql.svg",
      },
      {
        id: 3,
        type: "SQLServer",
        logo: "/images/db-logos/sql-server.svg",
      },
      {
        id: 4,
        type: "Azure",
        logo: "/images/db-logos/azure.svg",
      },
      {
        id: 5,
        type: "Oracle",
        logo: "/images/db-logos/oracle.svg",
      },
      {
        id: 6,
        type: "DB2",
        logo: "/images/db-logos/db2.svg",
      },
      {
        id: 7,
        type: "Firebird",
        logo: "/images/db-logos/firebird.svg",
      },
      {
        id: 8,
        type: "Interbase",
        logo: "/images/db-logos/interbase.svg",
      },
      {
        id: 9,
        type: "Access",
        logo: "/images/db-logos/access.svg",
      },
      {
        id: 10,
        type: "FoxPro",
        logo: "/images/db-logos/foxpro.svg",
      },
      {
        id: 11,
        type: "SQLite",
        logo: "/images/db-logos/sqlite.svg",
      },
    ],
    connections: [],
    currentConnection: null,
    sourceConnection: null,
    targetConnection: null,
    currentFilter: "",
    ssh: null,
    ssl: null,
  }),
  getters: {
    allConnections(state) {
      return state.connections;
    },
    countConnections(state) {
      return state.connections
        ?.filter((el) => {
          return (
            el.type &&
            el.type.toLowerCase().indexOf(state.currentFilter.toLowerCase()) >
              -1
          );
        })
        .length || 0;
    },
    currentConnectionIndexInArray(state) {
      return state.connections.indexOf(state.currentConnection);
    },
    connectionsByType(state) {
      return state.connections
        ?.filter(function (el) {
          return (
            el.type &&
            el.type.toLowerCase().indexOf(state.currentFilter.toLowerCase()) >
              -1
          );
        })
        .reverse() || [];
    },
  },
  actions: {
    setCurrentConnection(id) {
      let curConnection = this.connections.filter((c) => {
        return c.id === id;
      });
      this.currentConnection = curConnection[0];
    },
    connectionByID(id) {
      const connection = this.connections?.find((c) => c.id === id);
      return connection !== null && connection !== undefined
        ? connection
        : null;
    },
    setFilter(filter) {
      this.currentFilter = filter;
    },
    saveConnection: debounce(async function () {
      try {
        let connection = this.currentConnection;
        if (this.ssh !== null) {
          connection.ssh = this.ssh;
        }
        if (this.ssl !== null) {
          connection.ssl = this.ssl;
        }
        if (!connection.id) {
          await api.createConnection(connection);
        } else {
          await api.updateConnection(connection);
        }
        await this.refreshConnections();
      } catch (error) {
        console.error('Failed to save connection:', error);
        throw error;
      }
    }, 500),
    async refreshConnections() {
      try {
        this.connections = await api.getConnections();
      } catch (error) {
        console.error('Failed to refresh connections:', error);
        throw error;
      }
    },
    async deleteConnection(index) {
      try {
        this.connections.splice(index, 1);
        await api.deleteConnection(index);
      } catch (error) {
        console.error('Failed to delete connection:', error);
        throw error;
      }
    },
    async cloneConnection(index) {
      try {
        const resp = await api.cloneConnection(index);
        this.currentConnection = {
          ...this.currentConnection,
          id: resp.id,
          created: resp.created,
        };
        this.saveConnection();
      } catch (error) {
        console.error('Failed to clone connection:', error);
        throw error;
      }
    },
    async testConnection(json) {
      try {
        const status = await api.testConnection(json);
        console.log(status);
      } catch (error) {
        console.error('Failed to test connection:', error);
        throw error;
      }
    },
    resetCurrentConnection() {
      this.currentConnection = null;
    },
    async clearConnections() {
      this.connections.length = 0;
    },
    updateSSHParams(ssh) {
      this.ssh = ssh;
    },
    updateSSLParams(ssl) {
      this.ssl = ssl;
    },
  },
});
