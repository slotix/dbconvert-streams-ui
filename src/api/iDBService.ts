import { openDB, type IDBPDatabase } from 'idb'

interface DB extends IDBPDatabase {
  getCurrentViewType: () => Promise<string>
  setCurrentViewType: (type: string) => Promise<void>
}

async function dbPromise(): Promise<IDBPDatabase> {
  if (!('indexedDB' in window)) {
    throw new Error('Browser does not support IndexedDB')
  }
  return openDB('dbconvert', 1, {
    upgrade(db) {
      const settingsStore = db.createObjectStore('settings', {})
      const viewTypeExists = settingsStore.indexNames.contains('viewType')
      if (!viewTypeExists) {
        settingsStore.put('cards', 'viewType')
      }
    }
  })
}

const db = dbPromise()

const setCurrentViewType = async (type: string): Promise<void> => {
  try {
    ;(await db).put('settings', type, 'viewType')
  } catch (error) {
    console.error(error)
  }
}

const getCurrentViewType = async (): Promise<string> => {
  try {
    const vType = await (await db).get('settings', 'viewType')
    return vType || ''
  } catch (error) {
    console.error(error)
    return ''
  }
}

export default {
  setCurrentViewType,
  getCurrentViewType
}
