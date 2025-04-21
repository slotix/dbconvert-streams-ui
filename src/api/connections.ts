import { type AxiosResponse } from 'axios'
import { apiClient } from './apiClient'
import { useCommonStore } from '@/stores/common'
import { type Connection, type DatabaseInfo } from '@/types/connections'
import { useConnectionsStore } from '@/stores/connections'
import { validateApiKey } from './apiClient'
import { handleApiError } from '@/utils/errorHandler'
import { type DatabaseMetadata } from '@/types/metadata'

const getConnections = async (): Promise<Connection[]> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  try {
    const response: AxiosResponse<Connection[]> = await apiClient.get('/connections', {
      headers: { 'X-API-Key': commonStore.apiKey }
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const createConnection = async (
  json: Record<string, unknown>
): Promise<{ id: string; created: number }> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  try {
    const response: AxiosResponse<{ id: string; created: number }> = await apiClient.post(
      '/connections',
      json,
      {
        headers: { 'X-API-Key': commonStore.apiKey }
      }
    )
    return response.data
  } catch (error: any) {
    console.error('[API] Failed to create connection:', error)
    throw new Error(error.response?.data.error || 'An unknown error occurred')
  }
}

const updateConnection = async (): Promise<void> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  const json = useConnectionsStore().currentConnection

  // Now we can safely access the id
  const id = json?.id as string

  if (!id) {
    throw new Error('Connection ID is undefined or empty')
  }

  try {
    await apiClient.put(`/connections/${id}`, json, {
      headers: { 'X-API-Key': commonStore.apiKey }
    })
  } catch (error) {
    throw handleApiError(error)
  }
}

const deleteConnection = async (id: string): Promise<void> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  try {
    await apiClient.delete(`/connections/${id}`, {
      headers: { 'X-API-Key': commonStore.apiKey }
    })
  } catch (error) {
    throw handleApiError(error)
  }
}

const cloneConnection = async (id: string): Promise<Connection> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  try {
    const response: AxiosResponse<Connection> = await apiClient.put(
      `/connections/${id}/clone`,
      null,
      {
        headers: { 'X-API-Key': commonStore.apiKey }
      }
    )
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const testConnection = async (): Promise<string> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  const json = useConnectionsStore().currentConnection
  if (!json || !json.id) {
    throw new Error('Connection ID is undefined or empty')
  }
  try {
    const response: AxiosResponse<{ ping: string }> = await apiClient.post(
      `/connections/${json.id}/ping`,
      null,
      {
        headers: { 'X-API-Key': commonStore.apiKey }
      }
    )
    if (response.data.ping === 'ok') {
      return 'Connection Test Passed'
    }
    return 'Connection Test Failed'
  } catch (error) {
    throw handleApiError(error)
  }
}

const getDatabases = async (id: string): Promise<DatabaseInfo[]> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  try {
    const response: AxiosResponse<DatabaseInfo[]> = await apiClient.get(
      `/connections/${id}/databases`,
      {
        headers: { 'X-API-Key': commonStore.apiKey }
      }
    )
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const createDatabase = async (newDatabase: string, id: string): Promise<{ status: string }> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  try {
    const response: AxiosResponse<{ status: string }> = await apiClient.post(
      `/connections/${id}/databases`,
      newDatabase,
      {
        headers: {
          'Content-Type': 'text/plain',
          'X-API-Key': commonStore.apiKey
        }
      }
    )
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const createSchema = async (
  newSchema: string,
  id: string,
  dbName: string
): Promise<{ status: string }> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  try {
    const response: AxiosResponse<{ status: string }> = await apiClient.post(
      `/connections/${id}/schemas?database=${encodeURIComponent(dbName)}`,
      newSchema,
      {
        headers: {
          'Content-Type': 'text/plain',
          'X-API-Key': commonStore.apiKey
        }
      }
    )
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}


const getTables = async (id: string): Promise<Record<string, unknown>[]> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  try {
    const response: AxiosResponse<Record<string, unknown>[]> = await apiClient.get(
      `/connections/${id}/tables`,
      {
        headers: { 'X-API-Key': commonStore.apiKey }
      }
    )
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const getMetadata = async (id: string, forceRefresh = false): Promise<DatabaseMetadata> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  try {
    const response: AxiosResponse<DatabaseMetadata> = await apiClient.get(
      `/connections/${id}/newmeta${forceRefresh ? '?refresh=true' : ''}`,
      {
        headers: { 'X-API-Key': commonStore.apiKey }
      }
    )
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
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
  getTables,
  getMetadata
}
