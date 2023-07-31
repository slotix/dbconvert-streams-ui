import idb from "../../api/iDBService";
function encryptPassword(password) {
  return btoa(password);
}
export default {
  state: {
    connections: [],
    currentConnection: null,
    currentFilter: "",
    sshConnection: null,
    sslConnection: null,
    // viewTypes: ["grid", "list"]
  },
  mutations: {
    SET_FILTER: (state, filter) => {
      console.log(filter)
      state.currentFilter = filter;
    },
    REFRESH_CONNECTIONS: (state, connections) => {
      state.connections = connections;
    },
    UPDATE_CURRENT_CONNECTION: (state, connection) => {
      state.currentConnection = connection;
    },
    UPDATE_SSH_CONNECTION: (state, ssh) => {
      state.sshConnection = ssh;
    },
    UPDATE_SSL_CONNECTION: (state, ssl) => {
      state.sslConnection = ssl;
    },
    ADD_CONNECTION: (state, connection) => {
      state.connections.push(connection);
    },
    REMOVE_CONNECTION: (state, index) => {
      state.connections.splice(index, 1);
    },
    CLEAR_CONNECTIONS: state => {
      state.connections.length = 0;
    }
  },
  actions: {
    async saveConnection({ state }) {
      let connection = state.currentConnection;
      if (connection.password) {
        connection.password = encryptPassword(connection.password);
      }
      if (state.sshconnection !== null) {
        connection["ssh"] = state.sshConnection;
      }
      if (state.sslConnection !== null) {
        connection["ssl"] = state.sslconnection;
      }
      if (!connection.id) {
        connection.id = Date.now();
      }
      await idb.saveConnection(JSON.parse(JSON.stringify(connection)));
      // connection.password = "";
    },
    setCurrentConnection(context, id) {
      let curConnection = context.state.connections.filter(c => {
        return c.id === id;
      });
      context.commit("UPDATE_CURRENT_CONNECTION", curConnection[0]);
    },
    async cloneCurrentConnection(context) {
      if (!context.state.currentConnection) {
        throw new Error("can't clone empty connection");
      }
      let clonedConnection = context.state.currentConnection;
      clonedConnection.id = Date.now();
      context.dispatch("setCurrentConnection", clonedConnection.id);
      await context.dispatch("saveConnection");
    },

    async refreshConnections(context) {
      let connections = await idb.getConnections();
      //console.log("inside", connections);
      context.commit("REFRESH_CONNECTIONS", connections);
    },
    async deleteConnection({ commit }, index) {
      commit("REMOVE_CONNECTION", index);
      await idb.deleteConnection(index);
      //  await dispatch("refreshConnections");
    },
    async clearConnections({ commit }) {
      await idb.clearConnections();
      commit("CLEAR_CONNECTIONS");
      // await dispatch("refreshConnections");
    }
  },
  getters: {
    allConnections(state) {
      return state.connections;
    },
    connectionsNewestFirst(state) {
      return state.connections.reverse();
    },
    connectionsByType(state) {
      return state.connections
        .filter(function(el) {
          return (
            el.type &&
            el.type.toLowerCase().indexOf(state.currentFilter.toLowerCase()) > -1
          );
        })
        .reverse();
    },
    currentConnection(state) {
      return state.currentConnection;
    },
    sshConnection(state) {
      return state.sshConnection;
    },
    sslConnection(state) {
      return state.sslConnection;
    },
    dbTypes(state) {
      return state.dbTypes;
    }
  }
};
