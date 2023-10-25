import { openDB } from "idb";

const db = dbPromise();

function dbPromise() {
  if (!("indexedDB" in window)) {
    throw new Error("Browser does not support IndexedDB");
  }
  return openDB("dbconvert", 1, {
    upgrade(db) {
      const settingsStore = db.createObjectStore("settings", {});
      const viewTypeExists = settingsStore.indexNames.contains("viewType");
      if (!viewTypeExists) {
        settingsStore.put("cards", "viewType");
      }
    },
  });
}

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

export default {
  setCurrentViewType,
  getCurrentViewType,
};
