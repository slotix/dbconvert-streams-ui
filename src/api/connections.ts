import { type AxiosResponse } from 'axios'
import { apiClient } from './apiClient'
import { type Connection, type DatabaseInfo } from '@/types/connections'
import { useConnectionsStore } from '@/stores/connections'
import { handleApiError } from '@/utils/errorHandler'
import { type DatabaseMetadata, type DatabaseSummary } from '@/types/metadata'
import { type DatabaseOverview } from '@/types/overview'
import { OPERATION_TIMEOUTS } from '@/constants'

const getConnections = async (): Promise<Connection[]> => {
  try {
    const response: AxiosResponse<Connection[]> = await apiClient.get('/connections', {
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
  try {
    const response: AxiosResponse<{ id: string; created: number }> = await apiClient.post(
      '/connections',
      json,
      {
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
  if (!id) {
    throw new Error('Connection ID is required')
  }

  try {
    await apiClient.put(`/connections/${id}`, connection, {
      timeout: OPERATION_TIMEOUTS.updateConnection
    })
  } catch (error) {
    throw handleApiError(error)
  }
}

const deleteConnection = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/connections/${id}`, {
      headers: {
        'X-Confirm-Delete': 'true'
      },
      timeout: OPERATION_TIMEOUTS.deleteConnection
    })
  } catch (error) {
    console.error('[deleteConnection] Full error:', error)
    const errRecord =
      typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : null
    console.error('[deleteConnection] Error response:', errRecord?.response)
    console.error('[deleteConnection] Error request:', errRecord?.request)
    throw handleApiError(error)
  }
}

const cloneConnection = async (id: string): Promise<Connection> => {
  try {
    const response: AxiosResponse<Connection> = await apiClient.put(
      `/connections/${id}/clone`,
      null,
      {
        timeout: OPERATION_TIMEOUTS.createConnection
      }
    )
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const testConnection = async (): Promise<string> => {
  const json = useConnectionsStore().currentConnection
  if (!json) {
    throw new Error('Connection is undefined')
  }

  try {
    // If connection has an ID, use the existing ping endpoint
    if (json.id) {
      const response: AxiosResponse<{ ping: string }> = await apiClient.post(
        `/connections/${json.id}/ping`,
        null
      )
      if (response.data.ping === 'ok') {
        return 'Connection Test Passed'
      }
      return 'Connection Test Failed'
    } else {
      // For new connections without ID, test with connection parameters
      const response: AxiosResponse<{ ping: string }> = await apiClient.post(
        '/connections/test',
        json
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
  try {
    const response: AxiosResponse<{ ping: string }> = await apiClient.post(
      `/connections/${id}/ping`,
      null
    )
    return response.data.ping === 'ok' ? 'Connection Test Passed' : 'Connection Test Failed'
  } catch (error) {
    throw handleApiError(error)
  }
}

const getDatabases = async (id: string): Promise<DatabaseInfo[]> => {
  try {
    const response: AxiosResponse<DatabaseInfo[]> = await apiClient.get(
      `/connections/${id}/databases`,
      {
        timeout: OPERATION_TIMEOUTS.getDatabases // 15 second timeout for faster feedback
      }
    )
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const createDatabase = async (newDatabase: string, id: string): Promise<{ status: string }> => {
  try {
    const response: AxiosResponse<{ status: string }> = await apiClient.post(
      `/connections/${id}/databases`,
      newDatabase,
      {
        headers: {
          'Content-Type': 'text/plain'
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
  try {
    const response: AxiosResponse<{ status: string }> = await apiClient.post(
      `/connections/${id}/databases/${encodeURIComponent(dbName)}/schemas`,
      newSchema,
      {
        headers: {
          'Content-Type': 'text/plain'
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
  options?: { schemas?: string[]; includeSystem?: boolean }
): Promise<string[]> => {
  try {
    const qp = new URLSearchParams()
    options?.schemas?.forEach((s) => qp.append('schemas', s))
    if (options?.includeSystem) qp.set('include_system', 'true')
    const url = `/connections/${id}/databases/${encodeURIComponent(database)}/tables${qp.toString() ? `?${qp.toString()}` : ''}`
    const response: AxiosResponse<string[]> = await apiClient.get(url)
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
  options?: { schemas?: string[]; includeSystem?: boolean }
): Promise<DatabaseMetadata> => {
  try {
    const qp = new URLSearchParams()
    if (forceRefresh) qp.set('refresh', 'true')
    options?.schemas?.forEach((s) => qp.append('schemas', s))
    if (options?.includeSystem) qp.set('include_system', 'true')
    const url = `/connections/${id}/databases/${encodeURIComponent(database)}/meta${qp.toString() ? `?${qp.toString()}` : ''}`
    const response: AxiosResponse<DatabaseMetadata> = await apiClient.get(url)

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
  try {
    const qp = new URLSearchParams()
    qp.set('summary', 'true')
    options?.schemas?.forEach((s) => qp.append('schemas', s))
    const url = `/connections/${id}/databases/${encodeURIComponent(database)}/meta?${qp.toString()}`
    const response: AxiosResponse<DatabaseSummary> = await apiClient.get(url)
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
  const qp = new URLSearchParams()
  if (options?.refresh) qp.set('refresh', 'true')

  const url = `/connections/${id}/databases/${encodeURIComponent(database)}/overview${qp.toString() ? `?${qp.toString()}` : ''}`
  try {
    const response = await apiClient.get<DatabaseOverview>(url, {
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

interface UpdateTableRowsResponse {
  status: string
  rows: Record<string, unknown>[]
}

interface InsertTableRowsResponse {
  status: string
  inserted: number
  rows?: Record<string, unknown>[]
}

interface DeleteTableRowsResponse {
  status: string
  deleted: number
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

    const response: AxiosResponse<TableData> = await apiClient.get(url)
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const updateTableRows = async (
  connectionId: string,
  database: string,
  tableName: string,
  body: {
    schema?: string
    edits: { keys: Record<string, unknown>; changes: Record<string, unknown> }[]
  }
): Promise<UpdateTableRowsResponse> => {
  try {
    const url = `/connections/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(tableName)}/rows/edit`
    const response: AxiosResponse<UpdateTableRowsResponse> = await apiClient.patch(url, body, {
      timeout: OPERATION_TIMEOUTS.getTableData
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const insertTableRows = async (
  connectionId: string,
  database: string,
  tableName: string,
  body: {
    schema?: string
    inserts: { values: Record<string, unknown> }[]
  }
): Promise<InsertTableRowsResponse> => {
  try {
    const url = `/connections/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(tableName)}/rows/insert`
    const response: AxiosResponse<InsertTableRowsResponse> = await apiClient.post(url, body, {
      timeout: OPERATION_TIMEOUTS.getTableData
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const deleteTableRows = async (
  connectionId: string,
  database: string,
  tableName: string,
  body: {
    schema?: string
    deletes: { keys: Record<string, unknown> }[]
  }
): Promise<DeleteTableRowsResponse> => {
  try {
    const url = `/connections/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(tableName)}/rows/delete`
    const response: AxiosResponse<DeleteTableRowsResponse> = await apiClient.delete(url, {
      data: body,
      timeout: OPERATION_TIMEOUTS.getTableData
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const getViews = async (
  id: string,
  database: string,
  options?: { schemas?: string[]; includeSystem?: boolean }
): Promise<string[]> => {
  try {
    const qp = new URLSearchParams()
    options?.schemas?.forEach((s) => qp.append('schemas', s))
    if (options?.includeSystem) qp.set('include_system', 'true')
    const url = `/connections/${id}/databases/${encodeURIComponent(database)}/views${qp.toString() ? `?${qp.toString()}` : ''}`
    const response: AxiosResponse<string[]> = await apiClient.get(url)
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

    const response: AxiosResponse<TableData> = await apiClient.get(url)
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
  try {
    const qp = new URLSearchParams()
    if (params.schema) qp.set('schema', params.schema)
    if (params.where) qp.set('where', params.where)
    if (params.tabId) qp.set('tabId', params.tabId)

    const url = `/connections/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(tableName)}/count${qp.toString() ? `?${qp.toString()}` : ''}`
    const response: AxiosResponse<{ count: number; status: string }> = await apiClient.get(url, {
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
  try {
    const qp = new URLSearchParams()
    if (params.schema) qp.set('schema', params.schema)
    if (params.where) qp.set('where', params.where)
    if (params.tabId) qp.set('tabId', params.tabId)

    const url = `/connections/${connectionId}/databases/${encodeURIComponent(database)}/views/${encodeURIComponent(viewName)}/count${qp.toString() ? `?${qp.toString()}` : ''}`
    const response: AxiosResponse<{ count: number; status: string }> = await apiClient.get(url, {
      timeout: OPERATION_TIMEOUTS.getTableExactCount // 2 minute timeout for potentially expensive COUNT(*) queries
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

/**
 * Execute an arbitrary SQL query on a connection.
 * If database is provided, the query runs in that database context.
 * Returns affectedObjects ("database", "schema", "table") for DDL operations.
 */
const executeQuery = async (
  connectionId: string,
  query: string,
  database?: string
): Promise<{
  columns: string[]
  rows: unknown[][]
  results?: Array<{
    columns?: string[]
    rows?: unknown[][]
    commandTag?: string
    rowsAffected?: number
  }>
  affected_rows?: number
  affectedObjects?: string[]
}> => {
  try {
    // Use database-scoped endpoint if database is provided
    const url = database
      ? `/connections/${connectionId}/databases/${encodeURIComponent(database)}/query`
      : `/connections/${connectionId}/query`

    const response: AxiosResponse<{
      columns: string[]
      rows: unknown[][]
      results?: Array<{
        columns?: string[]
        rows?: unknown[][]
        commandTag?: string
        rowsAffected?: number
      }>
      affected_rows?: number
      affectedObjects?: string[]
    }> = await apiClient.post(
      url,
      { query },
      {
        timeout: OPERATION_TIMEOUTS.getTableData // Use table data timeout for queries
      }
    )
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

/**
 * Discover column names and types for a SQL query without executing it fully.
 * Uses LIMIT 0 to get metadata efficiently.
 */
const discoverQueryColumns = async (
  connectionId: string,
  database: string,
  query: string
): Promise<{
  columns: { name: string; type: string; nullable?: boolean }[]
  status: string
}> => {
  try {
    const url = `/connections/${connectionId}/databases/${encodeURIComponent(database)}/query/columns`
    const response: AxiosResponse<{
      columns: { name: string; type: string; nullable?: boolean }[]
      status: string
    }> = await apiClient.post(
      url,
      { query },
      {
        timeout: OPERATION_TIMEOUTS.getTableData
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
  insertTableRows,
  updateTableRows,
  deleteTableRows,
  getViews,
  getViewData,
  getTableExactCount,
  getViewExactCount,
  executeQuery,
  discoverQueryColumns
}
