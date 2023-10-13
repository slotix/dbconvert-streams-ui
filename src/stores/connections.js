import { defineStore } from "pinia";
import idb from "@/api/iDBService";
import bcrypt from "bcryptjs";

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
    currentConnectionIndexInArray(state) {
      return state.connections.indexOf(state.currentConnection);
    },
    // connectionsNewestFirst(state) {
    //   // return state.connections.reverse();
    //   return state.connections.slice().reverse();
    // },
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
    setCurrentConnection(id) {
      let curConnection = this.connections.filter((c) => {
        return c.id === id;
      });
      this.currentConnection = curConnection[0];
      // if (step === "source") {
      //   this.sourceConnection = curConnection[0];
      // } else if (step === "target") {
      //   this.targetConnection = curConnection[0];
      // }
    },
    setFilter(filter) {
      this.currentFilter = filter;
    },
    async saveConnection() {
      let connection = this.currentConnection;
      // if (connection && connection.password) {
      //   connection.password = await hashPassword(connection.password);
      // }
      if (this.sshConnection !== null) {
        connection["ssh"] = this.sshConnection;
      }
      if (this.sslConnection !== null) {
        connection["ssl"] = this.sslconnection;
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
    connectionByID(id) {
      const connection = this.connections.find((c) => c.id === id);
      return connection !== null && connection !== undefined
        ? connection
        : null;
    },
    async deleteConnection(index) {
      this.connections.splice(index, 1);
      await idb.deleteConnection(index);
    },
    resetCurrentConnection() {
      this.currentConnection = null;
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

async function hashPassword(password) {
  try {
    // Generate a salt with a cost factor of 10 (you can adjust this as needed)
    const salt = await bcrypt.genSalt(10);
    // Hash the password with the generated salt
    const hashedPassword = await bcrypt.hash(password, salt);

    return hashedPassword;
  } catch (error) {
    throw error;
  }
}
