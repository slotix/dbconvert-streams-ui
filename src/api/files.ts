import { apiClient } from './apiClient'
import { useCommonStore } from '@/stores/common'
import { validateApiKey } from './apiClient'
import { handleApiError } from '@/utils/errorHandler'
import type { FileMetadata, FileDataResponse } from '@/types/files'
import type { FileFormat } from '@/utils/fileFormat'
import { API_HEADERS } from '@/constants'
import type {
  S3ConfigRequest,
  S3ConfigResponse,
  S3ListRequest,
  S3ListResponse,
  S3ValidationResponse,
  S3ManifestResponse,
  S3CreateBucketRequest,
  S3CreateBucketResponse
} from '@/types/s3'

interface FileDataParams {
  limit?: number
  offset?: number
  skipCount?: boolean
  order_by?: string
  order_dir?: string
  where?: string
  max_rows?: number
  refresh?: boolean // If true, invalidates S3 cache to fetch fresh data
}

const withAuthHeaders = () => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  return { headers: { [API_HEADERS.API_KEY]: commonStore.apiKey } }
}

export async function getFileMetadata(
  path: string,
  format: FileFormat,
  stats: boolean = false,
  connectionId?: string
): Promise<FileMetadata> {
  try {
    const params: Record<string, string> = { path, format, stats: stats.toString() }
    if (connectionId) params.connectionId = connectionId

    const response = await apiClient.get<FileMetadata>('/files/meta', {
      params,
      ...withAuthHeaders()
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export async function getFileData(
  path: string,
  format: FileFormat,
  params: FileDataParams = {},
  connectionId?: string
): Promise<FileDataResponse> {
  try {
    const query = new URLSearchParams({ path, format })
    if (connectionId) query.set('connectionId', connectionId)
    if (params.limit !== undefined) query.set('limit', String(params.limit))
    if (params.offset !== undefined) query.set('offset', String(params.offset))
    if (params.skipCount !== undefined) query.set('skipCount', params.skipCount ? 'true' : 'false')
    if (params.order_by) query.set('order_by', params.order_by)
    if (params.order_dir) query.set('order_dir', params.order_dir)
    if (params.where) query.set('where', params.where)
    if (params.max_rows !== undefined) query.set('max_rows', String(params.max_rows))
    if (params.refresh) query.set('refresh', 'true')

    const response = await apiClient.get<FileDataResponse>(`/files/data?${query.toString()}`, {
      ...withAuthHeaders()
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export async function getFileExactCount(
  path: string,
  format: FileFormat
): Promise<{ count: number }> {
  try {
    const response = await apiClient.get<{ count: number }>('/files/count', {
      params: { path, format },
      ...withAuthHeaders()
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

// S3 API Functions

export async function configureS3Session(config: S3ConfigRequest): Promise<S3ConfigResponse> {
  try {
    const response = await apiClient.post<S3ConfigResponse>('/files/s3/configure', config, {
      ...withAuthHeaders()
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export async function listS3Objects(params: S3ListRequest): Promise<S3ListResponse> {
  try {
    const query = new URLSearchParams()
    query.set('bucket', params.bucket)
    if (params.prefix) query.set('prefix', params.prefix)
    if (params.maxKeys) query.set('maxKeys', String(params.maxKeys))
    if (params.continuationToken) query.set('continuationToken', params.continuationToken)
    if (params.connectionId) query.set('connectionId', params.connectionId)
    if (params.recursive !== undefined) query.set('recursive', params.recursive ? 'true' : 'false')

    const response = await apiClient.get<S3ListResponse>(`/files/s3/list?${query.toString()}`, {
      ...withAuthHeaders()
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export async function listS3Buckets(
  connectionId?: string
): Promise<{ buckets: string[]; count: number }> {
  try {
    const query = new URLSearchParams()
    if (connectionId) query.set('connectionId', connectionId)

    const url = query.toString() ? `/files/s3/buckets?${query.toString()}` : '/files/s3/buckets'
    const response = await apiClient.get<{ buckets: string[]; count: number }>(url, {
      ...withAuthHeaders()
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export async function createS3Bucket(
  payload: S3CreateBucketRequest
): Promise<S3CreateBucketResponse> {
  try {
    const response = await apiClient.post<S3CreateBucketResponse>('/files/s3/buckets', payload, {
      ...withAuthHeaders()
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export async function validateS3Path(path: string): Promise<S3ValidationResponse> {
  try {
    const response = await apiClient.get<S3ValidationResponse>('/files/s3/validate', {
      params: { path },
      ...withAuthHeaders()
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export async function readS3Manifest(path: string): Promise<S3ManifestResponse> {
  try {
    const response = await apiClient.get<S3ManifestResponse>('/files/s3/manifest', {
      params: { path },
      ...withAuthHeaders()
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

// File SQL Query Execution (DuckDB Console)

export interface FileQueryRequest {
  query: string
}

export interface FileQueryResponse {
  columns: string[]
  rows: unknown[][]
  count: number
  status: string
}

/**
 * Execute a SQL query on files using DuckDB
 * The query can use DuckDB file reading functions like:
 * - read_csv_auto('/path/to/file.csv')
 * - read_parquet('/path/to/file.parquet')
 * - read_json_auto('/path/to/file.json')
 * - S3 paths: read_parquet('s3://bucket/path/*.parquet')
 *
 * @param query - The SQL query to execute
 * @param connectionId - Optional connection ID for S3 connections (to use stored credentials)
 */
export async function executeFileQuery(
  query: string,
  connectionId?: string
): Promise<FileQueryResponse> {
  try {
    const response = await apiClient.post<FileQueryResponse>(
      '/files/query',
      { query, connectionId },
      {
        ...withAuthHeaders()
      }
    )
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export default {
  getFileMetadata,
  getFileData,
  getFileExactCount,
  configureS3Session,
  listS3Objects,
  listS3Buckets,
  createS3Bucket,
  validateS3Path,
  readS3Manifest,
  executeFileQuery
}
