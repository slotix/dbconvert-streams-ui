import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { useCommonStore } from '@/stores/common'
import { Connection, DatabaseInfo } from '@/types/connections'
import { useConnectionsStore } from '@/stores/connections'
import { executeWithRetry, validateApiKey } from './apiClient'

const apiClient: AxiosInstance = axios.create({
  baseURL: 'http://127.0.0.1:8020/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
})




const getConnections = async (): Promise<Connection[]> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore()
    validateApiKey(commonStore.apiKey)

    const response: AxiosResponse<Connection[]> = await apiClient.get('/connections', {
      headers: { 'X-API-Key': commonStore.apiKey }
    })
    return response.data
  })
}

const createConnection = async (json: Record<string, unknown>): Promise<{ id: string; created: number }> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore()
    validateApiKey(commonStore.apiKey)

    const response: AxiosResponse<{ id: string; created: number }> = await apiClient.post('/connections', json, {
      headers: { 'X-API-Key': commonStore.apiKey }
    })
    return response.data
  })
}

const updateConnection = async (): Promise<void> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore()
    const json = useConnectionsStore().currentConnection

    // Now we can safely access the id
    const id = json?.id as string

    if (!id) {
      throw new Error('Connection ID is undefined or empty')
    }

    await apiClient.put(`/connections/${id}`, json, {
      headers: { 'X-API-Key': commonStore.apiKey }
    })
  })
}

const deleteConnection = async (id: string): Promise<void> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore()
    await apiClient.delete(`/connections/${id}`, {
      headers: { 'X-API-Key': commonStore.apiKey }
    })
  })
}

const cloneConnection = async (id: string): Promise<Connection> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore()
    const response: AxiosResponse<Connection> = await apiClient.put(
      `/connections/${id}/clone`,
      null,
      {
        headers: { 'X-API-Key': commonStore.apiKey }
      }
    )
    return response.data
  })
}

const testConnection = async (): Promise<string> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore()
    const json = useConnectionsStore().currentConnection
    if (!json || !json.id) {
      throw new Error('Connection ID is undefined or empty')
    }
    const response: AxiosResponse<{ ping: string }> = await apiClient.post(
      `/connections/${json.id}/ping`,
      json,
      {
        headers: { 'X-API-Key': commonStore.apiKey }
      }
    )
     if (response.data.ping === 'ok') {
      return 'Connection Test Passed'
    }
    return "Connection Test Failed"
  })
}


const getDatabases = async (id: string): Promise<DatabaseInfo[]> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore()
    const response: AxiosResponse<DatabaseInfo[]> = await apiClient.get(
      `/connections/${id}/databases`,
      {
        headers: { 'X-API-Key': commonStore.apiKey }
      }
    )
    return response.data
  })
}

const createDatabase = async (newDatabase: string, id: string): Promise<void> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore()
    await apiClient.post(`/connections/${id}/databases`, newDatabase, {
      headers: {
        'Content-Type': 'text/plain',
        'X-API-Key': commonStore.apiKey
      }
    })
  })
}

const createSchema = async (newSchema: string, id: string): Promise<void> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore()
    await apiClient.post(`/connections/${id}/schemas`, newSchema, {
      headers: {
        'Content-Type': 'text/plain',
        'X-API-Key': commonStore.apiKey
      }
    })
  })
}

const getMeta = async (id: string): Promise<Record<string, unknown>> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore()
    const response: AxiosResponse<Record<string, unknown>> = await apiClient.get(
      `/connections/${id}/meta`,
      {
        headers: { 'X-API-Key': commonStore.apiKey }
      }
    )
    return response.data
  })
}

const getTables = async (id: string): Promise<Record<string, unknown>[]> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore()
    const response: AxiosResponse<Record<string, unknown>[]> = await apiClient.get(
      `/connections/${id}/tables`,
      {
        headers: { 'X-API-Key': commonStore.apiKey }
      }
    )
    return response.data
  })
}

export default {
  getConnections,
  createConnection,
  updateConnection,
  deleteConnection,
  cloneConnection,
  testConnection,
  getDatabases,
  createDatabase,
  createSchema,
  getMeta,
  getTables
}
