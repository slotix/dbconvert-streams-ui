import { defineStore } from 'pinia';
import idb from "@/api/iDBService";

export const useConnectionsStore = defineStore('connections', {
  state: () => ({
    connections: [],
    currentConnection: null,
    currentFilter: "",
    ssh: null,
    ssl: null,
  }),
  getters: {
    allConnections(state) {
      return state.connections;
    },
    connectionsNewestFirst(state) {
      return state.connections.reverse();
    },
    connectionsByType(state) {
      return state.connections
        .filter(function (el) {
          return (
            el.type &&
            el.type.toLowerCase().indexOf(state.currentFilter.toLowerCase()) > -1
          );
        })
        .reverse();
    },
  },
  actions: {
    setCurrentConnection(id) {
      let curConnection = this.connections.filter(c => {
        return c.id === id;
      });
      this.currentConnection = curConnection[0]
    },
    setFilter(filter) {
      this.currentFilter = filter;
    },
    async saveConnection() {
      let connection = this.currentConnection;
      if (connection && connection.password) {
        connection.password = encryptPassword(connection.password);
      }
      if (this.sshConnection !== null) {
        connection["ssh"] = this.sshConnection;
      }
      if (this.sslConnection !== null) {
        connection["ssl"] = this.sslconnection;
      }
      if (!connection.id) {
        connection.id = Date.now();
      }
      await idb.saveConnection(JSON.parse(JSON.stringify(connection)));
      // connection.password = "";
    },
    async cloneCurrentConnection() {
      if (!this.currentConnection) {
        throw new Error("can't clone empty connection");
      }
      let clonedConnection = this.currentConnection;
      clonedConnection.id = Date.now();
      this.setCurrentConnection(clonedConnection.id);
      await this.saveConnection()
    },

    async refreshConnections() {
      let connections = await idb.getConnections();
      this.connections = connections
    },
    async deleteConnection(index) {
      this.connections.splice(index, 1);
      await idb.deleteConnection(index);
      //  await dispatch("refreshConnections");
    },
    async clearConnections() {
      await idb.clearConnections();
      this.connections.length = 0;
    },
    updateSSHParams(ssh) {
      this.ssh = ssh;
    },
    updateSSLParams(ssl) {
      this.ssl = ssl;
    },
  },
})

function encryptPassword(password) {
  return btoa(password);
}
