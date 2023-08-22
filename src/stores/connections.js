import { defineStore } from "pinia";
import idb from "@/api/iDBService";

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
        .filter((el) => {
          return (
            el.type &&
            el.type.toLowerCase().indexOf(state.currentFilter.toLowerCase()) >
              -1
          );
        })
        .length;
    },
    connectionsNewestFirst(state) {
      // return state.connections.reverse();
      return state.connections.slice().reverse();
    },
    connectionsByType(state) {
      return state.connections
        .filter(function (el) {
          return (
            el.type &&
            el.type.toLowerCase().indexOf(state.currentFilter.toLowerCase()) >
              -1
          );
        })
        .reverse();
    },
  },
  actions: {
    setCurrentConnection(id, step) {
      let curConnection = this.connections.filter((c) => {
        return c.id === id;
      });
      this.currentConnection = curConnection[0];
      if (step === "source") {
        this.sourceConnection = curConnection[0];
      } else if (step === "target") {
        this.targetConnection = curConnection[0];
      }
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
      await this.saveConnection();
    },

    async refreshConnections() {
      let connections = await idb.getConnections();
      this.connections = connections;
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
});

function encryptPassword(password) {
  return btoa(password);
}
