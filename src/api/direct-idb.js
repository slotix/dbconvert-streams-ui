const DB_NAME = "connectionsdb";
const DB_VERSION = 1;
let DB;

export default {
  async getConnectionsDb() {
    return new Promise((resolve, reject) => {
      if (DB) {
        return resolve(DB);
      }
      console.log("OPENING DB", DB);
      let request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = e => {
        console.log("Error opening db", e);
        reject("Error");
      };

      request.onsuccess = e => {
        DB = e.target.result;
        resolve(DB);
      };

      request.onupgradeneeded = e => {
        console.log("onupgradeneeded");
        let db = e.target.result;
        db.createObjectStore("connections", {
          autoIncrement: true,
          keyPath: "id"
        });
      };
    });
  },
  async deleteConnection(connection) {
    let db = await this.getConnectionsDb();

    return new Promise(resolve => {
      let trans = db.transaction(["connections"], "readwrite");
      trans.oncomplete = () => {
        resolve();
      };

      let store = trans.objectStore("connections");
      store.delete(connection.id);
    });
  },
  async getConnections() {
    let db = await this.getConnectionsDb();

    return new Promise(resolve => {
      let trans = db.transaction(["connections"], "readonly");
      trans.oncomplete = () => {
        resolve(connections);
      };

      let store = trans.objectStore("connections");
      let connections = [];

      store.openCursor().onsuccess = e => {
        let cursor = e.target.result;
        if (cursor) {
          connections.push(cursor.value);
          cursor.continue();
        }
      };
    });
  },

  async saveConnection(connection) {
    let db = await this.getConnectionsDb();

    return new Promise(resolve => {
      let trans = db.transaction(["connections"], "readwrite");
      trans.oncomplete = () => {
        resolve();
      };

      let store = trans.objectStore("connections");
      store.put(connection);
    });
  }
};
