import { reactive, watch, computed, onMounted } from 'vue'
import ConnectionName from './ConnectionName.vue'
import PasswordBox from '@/components/common/PasswordBox.vue'
import ItemsCombo from '@/components/common/ItemsCombo.vue'
import { ArrowPathIcon, PlusIcon } from '@heroicons/vue/24/solid'
import { DIALOG_TYPES, useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import { type Connection } from '@/types/connections'

function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  )
}

function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

function setProperty<T, K extends keyof T>(obj: T, key: K, value: T[K]): void {
  obj[key] = value
}

export function useCommon<T extends Connection>(defaultConnection: T) {
  const connection = reactive<T>({ ...defaultConnection })

  const commonStore = useCommonStore()
  const connectionsStore = useConnectionsStore()

  const buildConnectionName = computed(() => {
    return `${connection.type}-${connection.host}-${connection.username}`
  })

  const dlgTp = computed(() => commonStore.dlgType)
  const isEdit = computed(() => dlgTp.value === DIALOG_TYPES.UPDATE)

  watch(
    () => connection.host,
    () => updateConnectionName()
  )

  watch(
    () => connection.username,
    () => updateConnectionName()
  )

  watch(
    () => connection,
    () => {
      connectionsStore.currentConnection = connection
    },
    { deep: true }
  )

  const updateConnectionName = () => {
    if (dlgTp.value === DIALOG_TYPES.SAVE) {
      connection.name = buildConnectionName.value
    } else if (dlgTp.value === DIALOG_TYPES.UPDATE) {
      connection.name = connectionsStore.currentConnection?.name || buildConnectionName.value
    }
  }

  onMounted(async () => {
    updateConnectionName()
    if (dlgTp.value === DIALOG_TYPES.UPDATE && connectionsStore.currentConnection) {
      Object.assign(connection, connectionsStore.currentConnection)
      await refreshDatabases()
    }
  })

  const refreshDatabases = async () => {
    try {
      if (!connectionsStore.currentConnection?.id) return

      const currentSchema = connection.schema
      await connectionsStore.getDatabases(connectionsStore.currentConnection.id)

      // Only update the connection while preserving the current schema
      const updatedConnection = { ...connectionsStore.currentConnection, schema: currentSchema }
      Object.assign(connection, updatedConnection)
    } catch (err) {
      if (isErrorWithMessage(err)) {
        commonStore.showNotification(err.message, 'error')
      } else {
        commonStore.showNotification('An unknown error occurred', 'error')
      }
    }
  }

  const createData = async (newData: any, targetArray: keyof T, targetProperty: keyof T) => {
    try {
      if (connectionsStore.currentConnection) {
        if (targetProperty === 'database') {
          await connectionsStore.createDatabase(newData, connectionsStore.currentConnection.id)
        } else if (targetProperty === 'schema') {
          await connectionsStore.createSchema(newData, connectionsStore.currentConnection.id)
        }

        const conn = connectionsStore.currentConnection as any
        if (!conn[targetArray]) {
          conn[targetArray] = []
        }

        const targetArrayValue = conn[targetArray]
        if (Array.isArray(targetArrayValue)) {
          targetArrayValue.push(newData)
        } else {
          conn[targetArray] = [newData]
        }

        conn[targetProperty] = newData
        commonStore.showNotification(`${String(targetProperty)} created`, 'success')

        if (targetProperty === 'database') {
          await refreshDatabases()
        }
      }
    } catch (err) {
      if (isErrorWithMessage(err)) {
        commonStore.showNotification(err.message, 'error')
      } else {
        commonStore.showNotification('An unknown error occurred', 'error')
      }
    }
  }

  const createDatabase = async (newDatabase: string) => {
    await createData(newDatabase, 'databasesInfo' as keyof T, 'database' as keyof T)
  }

  const createSchema = async (newSchema: string) => {
    await createData(newSchema, 'schemas' as keyof T, 'schema' as keyof T)
  }

  const databases = computed(() => connection.databasesInfo.map((db) => db.name))
  const currentDatabaseSchemas = computed(() => {
    const currentDb = connection.databasesInfo.find((db) => db.name === connection.database)
    return currentDb?.schemas || []
  })

  return {
    connection,
    buildConnectionName,
    isEdit,
    dlgTp,
    updateConnectionName,
    refreshDatabases,
    createData,
    createDatabase,
    createSchema,
    ConnectionName,
    PasswordBox,
    ItemsCombo,
    ArrowPathIcon,
    PlusIcon,
    databases,
    currentDatabaseSchemas
  }
}
