import { type AxiosResponse } from 'axios'
import { apiClient } from './apiClient'
import { useCommonStore } from '@/stores/common'
import { type Connection, type DatabaseInfo } from '@/types/connections'
import { useConnectionsStore } from '@/stores/connections'
import { validateApiKey } from './apiClient'
import { handleApiError } from '@/utils/errorHandler'
import { type DatabaseMetadata, type DatabaseSummary } from '@/types/metadata'
import { type DatabaseOverview } from '@/types/overview'
import { API_HEADERS, OPERATION_TIMEOUTS } from '@/constants'

const getConnections = async (): Promise<Connection[]> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  try {
    const response: AxiosResponse<Connection[]> = await apiClient.get('/connections', {
      headers: { [API_HEADERS.API_KEY]: commonStore.apiKey },
      timeout: OPERATION_TIMEOUTS.getConnections
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
        headers: { [API_HEADERS.API_KEY]: commonStore.apiKey },
        timeout: OPERATION_TIMEOUTS.createConnection
      }
    )
    return response.data
  } catch (error: unknown) {
    console.error('[API] Failed to create connection:', error)
    const err = error as { response?: { data?: { error?: string } } }
    throw new Error(err.response?.data?.error || 'An unknown error occurred')
  }
}

const updateConnection = async (): Promise<void> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  const connectionsStore = useConnectionsStore()
  const json = connectionsStore.currentConnection

  if (!json) {
    throw new Error('No connection data available')
  }

  // Now we can safely access the id
  const id = json.id as string

  if (!id) {
    throw new Error('Connection ID is undefined or empty')
  }

  try {
    await apiClient.put(`/connections/${id}`, json, {
      headers: { [API_HEADERS.API_KEY]: commonStore.apiKey },
      timeout: OPERATION_TIMEOUTS.updateConnection
    })
  } catch (error) {
    throw handleApiError(error)
  }
}

/**
 * Update a connection by ID with the provided connection data.
 * Unlike updateConnection(), this doesn't read from the store - it uses the provided data directly.
 * Used by the JSON editor to save edited connection configurations.
 */
const updateConnectionById = async (id: string, connection: Connection): Promise<void> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)

  if (!id) {
    throw new Error('Connection ID is required')
  }

  try {
    await apiClient.put(`/connections/${id}`, connection, {
      headers: { [API_HEADERS.API_KEY]: commonStore.apiKey },
      timeout: OPERATION_TIMEOUTS.updateConnection
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
      headers: { [API_HEADERS.API_KEY]: commonStore.apiKey },
      timeout: OPERATION_TIMEOUTS.deleteConnection
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
        headers: { [API_HEADERS.API_KEY]: commonStore.apiKey },
        timeout: OPERATION_TIMEOUTS.createConnection
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
  if (!json) {
    throw new Error('Connection is undefined')
  }

  try {
    // If connection has an ID, use the existing ping endpoint
    if (json.id) {
      const response: AxiosResponse<{ ping: string }> = await apiClient.post(
        `/connections/${json.id}/ping`,
        null,
        {
          headers: { [API_HEADERS.API_KEY]: commonStore.apiKey }
        }
      )
      if (response.data.ping === 'ok') {
        return 'Connection Test Passed'
      }
      return 'Connection Test Failed'
    } else {
      // For new connections without ID, test with connection parameters
      const response: AxiosResponse<{ ping: string }> = await apiClient.post(
        '/connections/test',
        json,
        {
          headers: { [API_HEADERS.API_KEY]: commonStore.apiKey }
        }
      )
      if (response.data.ping === 'ok') {
        return 'Connection Test Passed'
      }
      return 'Connection Test Failed'
    }
  } catch (error) {
    throw handleApiError(error)
  }
}

const pingConnectionById = async (id: string): Promise<string> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  try {
    const response: AxiosResponse<{ ping: string }> = await apiClient.post(
      `/connections/${id}/ping`,
      null,
      {
        headers: { [API_HEADERS.API_KEY]: commonStore.apiKey }
      }
    )
    return response.data.ping === 'ok' ? 'Connection Test Passed' : 'Connection Test Failed'
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
        headers: { [API_HEADERS.API_KEY]: commonStore.apiKey },
        timeout: OPERATION_TIMEOUTS.getDatabases // 15 second timeout for faster feedback
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
          [API_HEADERS.API_KEY]: commonStore.apiKey
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
      `/connections/${id}/databases/${encodeURIComponent(dbName)}/schemas`,
      newSchema,
      {
        headers: {
          'Content-Type': 'text/plain',
          [API_HEADERS.API_KEY]: commonStore.apiKey
        }
      }
    )
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const getTables = async (
  id: string,
  database: string,
  options?: { schemas?: string[] }
): Promise<string[]> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  try {
    const qp = new URLSearchParams()
    options?.schemas?.forEach((s) => qp.append('schemas', s))
    const url = `/connections/${id}/databases/${encodeURIComponent(database)}/tables${qp.toString() ? `?${qp.toString()}` : ''}`
    const response: AxiosResponse<string[]> = await apiClient.get(url, {
      headers: { [API_HEADERS.API_KEY]: commonStore.apiKey }
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

// Removed frontend metadataCache - backend now handles caching with 30s TTL
// Backend returns X-Cache header to indicate HIT/MISS status
const getMetadata = async (
  id: string,
  database: string,
  forceRefresh = false,
  options?: { schemas?: string[] }
): Promise<DatabaseMetadata> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)

  try {
    const qp = new URLSearchParams()
    if (forceRefresh) qp.set('refresh', 'true')
    options?.schemas?.forEach((s) => qp.append('schemas', s))
    const url = `/connections/${id}/databases/${encodeURIComponent(database)}/meta${qp.toString() ? `?${qp.toString()}` : ''}`
    const response: AxiosResponse<DatabaseMetadata> = await apiClient.get(url, {
      headers: { [API_HEADERS.API_KEY]: commonStore.apiKey }
    })

    // Backend cache status available in response.headers['x-cache'] (HIT/MISS)
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const getDatabaseSummary = async (
  id: string,
  database: string,
  options?: { schemas?: string[] }
): Promise<DatabaseSummary> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  try {
    const qp = new URLSearchParams()
    qp.set('summary', 'true')
    options?.schemas?.forEach((s) => qp.append('schemas', s))
    const url = `/connections/${id}/databases/${encodeURIComponent(database)}/meta?${qp.toString()}`
    const response: AxiosResponse<DatabaseSummary> = await apiClient.get(url, {
      headers: { [API_HEADERS.API_KEY]: commonStore.apiKey }
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

// Removed frontend overviewCache - backend now handles caching with 30s TTL
// Backend returns X-Cache header to indicate HIT/MISS status
const getDatabaseOverview = async (
  id: string,
  database: string,
  options?: { refresh?: boolean }
): Promise<DatabaseOverview> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)

  const qp = new URLSearchParams()
  if (options?.refresh) qp.set('refresh', 'true')

  const url = `/connections/${id}/databases/${encodeURIComponent(database)}/overview${qp.toString() ? `?${qp.toString()}` : ''}`
  try {
    const response = await apiClient.get<DatabaseOverview>(url, {
      headers: { [API_HEADERS.API_KEY]: commonStore.apiKey },
      timeout: OPERATION_TIMEOUTS.getDatabases
    })
    // Backend cache status available in response.headers['x-cache'] (HIT/MISS)
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

interface TableData {
  columns: string[]
  rows: unknown[][]
  count: number
  total_count: number
  limit: number
  offset: number
  status: string
}

const getTableData = async (
  connectionId: string,
  database: string,
  tableName: string,
  params: {
    limit: number
    offset: number
    skip_count: boolean
    schema?: string
    order_by?: string
    order_dir?: string
    where?: string
  }
): Promise<TableData> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  try {
    const queryParams = new URLSearchParams({
      limit: params.limit.toString(),
      offset: params.offset.toString(),
      skip_count: params.skip_count.toString()
    })

    if (params.schema) {
      queryParams.append('schema', params.schema)
    }

    if (params.order_by) {
      queryParams.append('order_by', params.order_by)
    }

    if (params.order_dir) {
      queryParams.append('order_dir', params.order_dir)
    }

    if (params.where) {
      queryParams.append('where', params.where)
    }

    const url = `/connections/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(tableName)}/data?${queryParams.toString()}`

    const response: AxiosResponse<TableData> = await apiClient.get(url, {
      headers: { [API_HEADERS.API_KEY]: commonStore.apiKey }
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const getViews = async (
  id: string,
  database: string,
  options?: { schemas?: string[] }
): Promise<string[]> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  try {
    const qp = new URLSearchParams()
    options?.schemas?.forEach((s) => qp.append('schemas', s))
    const url = `/connections/${id}/databases/${encodeURIComponent(database)}/views${qp.toString() ? `?${qp.toString()}` : ''}`
    const response: AxiosResponse<string[]> = await apiClient.get(url, {
      headers: { [API_HEADERS.API_KEY]: commonStore.apiKey }
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const getViewData = async (
  connectionId: string,
  database: string,
  viewName: string,
  params: {
    limit: number
    offset: number
    skip_count: boolean
    schema?: string
    order_by?: string
    order_dir?: string
    where?: string
  }
): Promise<TableData> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  try {
    const queryParams = new URLSearchParams({
      limit: params.limit.toString(),
      offset: params.offset.toString()
    })

    if (params.schema) {
      queryParams.append('schema', params.schema)
    }

    if (params.order_by) {
      queryParams.append('order_by', params.order_by)
    }

    if (params.order_dir) {
      queryParams.append('order_dir', params.order_dir)
    }

    if (params.where) {
      queryParams.append('where', params.where)
    }

    const url = `/connections/${connectionId}/databases/${encodeURIComponent(database)}/views/${encodeURIComponent(viewName)}/data?${queryParams.toString()}`

    const response: AxiosResponse<TableData> = await apiClient.get(url, {
      headers: { [API_HEADERS.API_KEY]: commonStore.apiKey }
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const getTableExactCount = async (
  connectionId: string,
  database: string,
  tableName: string,
  params: { schema?: string; where?: string; tabId?: string }
): Promise<{ count: number }> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  try {
    const qp = new URLSearchParams()
    if (params.schema) qp.set('schema', params.schema)
    if (params.where) qp.set('where', params.where)
    if (params.tabId) qp.set('tabId', params.tabId)

    const url = `/connections/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(tableName)}/count${qp.toString() ? `?${qp.toString()}` : ''}`
    const response: AxiosResponse<{ count: number; status: string }> = await apiClient.get(url, {
      headers: { [API_HEADERS.API_KEY]: commonStore.apiKey },
      timeout: OPERATION_TIMEOUTS.getTableExactCount // 2 minute timeout for potentially expensive COUNT(*) queries
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const getViewExactCount = async (
  connectionId: string,
  database: string,
  viewName: string,
  params: { schema?: string; where?: string; tabId?: string }
): Promise<{ count: number }> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  try {
    const qp = new URLSearchParams()
    if (params.schema) qp.set('schema', params.schema)
    if (params.where) qp.set('where', params.where)
    if (params.tabId) qp.set('tabId', params.tabId)

    const url = `/connections/${connectionId}/databases/${encodeURIComponent(database)}/views/${encodeURIComponent(viewName)}/count${qp.toString() ? `?${qp.toString()}` : ''}`
    const response: AxiosResponse<{ count: number; status: string }> = await apiClient.get(url, {
      headers: { [API_HEADERS.API_KEY]: commonStore.apiKey },
      timeout: OPERATION_TIMEOUTS.getTableExactCount // 2 minute timeout for potentially expensive COUNT(*) queries
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export default {
  getConnections,
  createConnection,
  updateConnection,
  updateConnectionById,
  deleteConnection,
  cloneConnection,
  testConnection,
  pingConnectionById,
  getDatabases,
  createDatabase,
  createSchema,
  getTables,
  getMetadata,
  getDatabaseSummary,
  getDatabaseOverview,
  getTableData,
  getViews,
  getViewData,
  getTableExactCount,
  getViewExactCount
}
