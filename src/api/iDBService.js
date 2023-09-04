//import { openDB, deleteDB, wrap, unwrap } from 'idb';
//import { openDB } from "idb";
import { openDB } from "idb";

const db = dbPromise();

function dbPromise() {
  if (!("indexedDB" in window)) {
    throw new Error("Browser does not support IndexedDB");
  }
  return openDB("dbconvert", 1, {
    upgrade(db) {
      const connectionStore = db.createObjectStore("connections", {
        autoIncrement: true,
        keyPath: "id"
      });
      connectionStore.createIndex("type_idx", "type");
      db.createObjectStore("streams", {
        keyPath: "id",
        autoIncrement: true
      });
      const settingsStore = db.createObjectStore("settings", {
      })
      const viewTypeExists = settingsStore.indexNames.contains("viewType");
      if (!viewTypeExists) {
        settingsStore.put("cards", "viewType");
      }
    }
  });
  //   return openDB("dbconvert", 1, upgrade => {
  //     if (!upgrade.objectStoreNames.contains("connections")) {
  //       upgrade.createObjectStore("connections", {
  //         // keyPath: "id",
  //         // autoIncrement: true
  //       });
  //     }
  //   });
}

const saveConnection = async (item) => {
  try {
    // const tx = db.transaction(storeName, "readwrite");
    // const store = tx.objectStore(storeName);
    // store.add(items, storeName);

    (await db).put("connections", item);
    // .then(result => {
    //   console.log("success!", result);
    // })
    // .catch(err => {
    //   console.error("error: ", err);
    // });
    //=======
    //   const tx = db.transaction("connections", "readwrite");
    //   const store = tx.objectStore("connections");
    //   store.put(items);
    //   return tx.complete;
  } catch (error) {
    return error;
  }
};

const getConnections = async () => {
  try {
    // const store = (await db).transaction("connections", "readonly").store;
    // let request = await store.openCursor(null, "prev");

    // request.onsuccess = function(event) {
    //   var cursor = event.target.result;
    //   if (cursor) {
    //     // cursor.value contains the current record being iterated through
    //     // this is where you'd do something with the result
    //     cursor.continue();
    //   } else {
    //     // no more results
    //   }
    // };
    //const db = await dbPromise();
    //  const tx = db.transaction("connections", "readonly");
    // const store = tx.objectStore("connections");
    //const cons = await store.get("connections");
    //tx.complete;
    //store.getAll("connections").then(console.log);
    return (await db).getAll("connections");
    //return db.getAllFromIndex("connections", "id");
  } catch (error) {
    return error;
  }
};

const getConnectionById = async (id) => {
  try {
    return (await db).get("connections", id);
  } catch (error) {
    return error;
  }
};

const getConnectionsByType = async (dbType) => {
  try {
    return (await db).getAllFromIndex("type_idx", dbType);
  } catch (error) {
    return error;
  }
};

const deleteConnection = async (index) => {
  try {
    (await db).delete("connections", index);
  } catch (error) {
    return error;
  }
};

const clearConnections = async () => {
  try {
    (await db).clear("connections");
  } catch (error) {
    return error;
  }
};

// const checkStorage = async storeName => {
//   try {
//     const db = await dbPromise();
//     const tx = db.transaction(storeName, "readonly");
//     const store = tx.objectStore(storeName);
//     return store.get(storeName);
//   } catch (error) {
//     return error;
//   }
// };
const setCurrentViewType = async (type) => {
  try {
    (await db).put("settings", type, "viewType");
  } catch (error) {
    return error;
  }
};

const getCurrentViewType = async () => {
  try {
    var vType = await (await db).get("settings", "viewType");
    return vType;
  } catch (error) {
    return error;
  }
};

const getStreams = async () => {
  try {
    return (await db).getAll("streams");
  } catch (error) {
    return error;
  }
};

const saveStream = async (item) => {
  try {
    (await db).put("streams", item);
  } catch (error) {
    return error;
  }
};

const deleteStream = async (index) => {
  try {
    (await db).delete("streams", index);
  } catch (error) {
    return error;
  }
};

const clearStreams = async () => {
  try {
    (await db).clear("streams");
  } catch (error) {
    return error;
  }
};

export default {
  deleteConnection,
  clearConnections,
  saveConnection,
  getConnections,
  getConnectionsByType,
  getConnectionById,
  getStreams,
  saveStream,
  deleteStream,
  clearStreams,
  setCurrentViewType,
  getCurrentViewType,
};
