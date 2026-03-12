import { apiClient } from './apiClient'
import { handleApiError } from '@/utils/errorHandler'
import type { FileMetadata, FileDataResponse, CSVSniffResult } from '@/types/files'
import type { FileFormat } from '@/utils/fileFormat'
import type {
  S3ListRequest,
  S3ListResponse,
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
      params
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

async function getFileData(
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

    const response = await apiClient.get<FileDataResponse>(`/files/data?${query.toString()}`)
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

async function sniffCSV(path: string, connectionId?: string): Promise<CSVSniffResult> {
  try {
    const response = await apiClient.post<CSVSniffResult>('/files/csv/sniff', {
      path,
      format: 'csv',
      connectionId
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

// S3 API Functions

export async function listS3Objects(params: S3ListRequest): Promise<S3ListResponse> {
  try {
    const query = new URLSearchParams()
    query.set('bucket', params.bucket)
    if (params.prefix) query.set('prefix', params.prefix)
    if (params.maxKeys) query.set('maxKeys', String(params.maxKeys))
    if (params.continuationToken) query.set('continuationToken', params.continuationToken)
    if (params.connectionId) query.set('connectionId', params.connectionId)
    if (params.refresh) query.set('refresh', 'true')
    if (params.recursive !== undefined) query.set('recursive', params.recursive ? 'true' : 'false')

    const response = await apiClient.get<S3ListResponse>(`/files/s3/list?${query.toString()}`)
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export async function listS3Buckets(
  connectionId?: string,
  options?: { refresh?: boolean }
): Promise<{ buckets: string[]; count: number }> {
  try {
    const query = new URLSearchParams()
    if (connectionId) query.set('connectionId', connectionId)
    if (options?.refresh) query.set('refresh', 'true')

    const url = query.toString() ? `/files/s3/buckets?${query.toString()}` : '/files/s3/buckets'
    const response = await apiClient.get<{ buckets: string[]; count: number }>(url)
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export async function createS3Bucket(
  payload: S3CreateBucketRequest
): Promise<S3CreateBucketResponse> {
  try {
    const response = await apiClient.post<S3CreateBucketResponse>('/files/s3/buckets', payload)
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export async function readS3Manifest(
  path: string,
  connectionId?: string,
  options?: { refresh?: boolean }
): Promise<S3ManifestResponse> {
  try {
    const response = await apiClient.get<S3ManifestResponse>('/files/s3/manifest', {
      params: {
        path,
        ...(connectionId ? { connectionId } : {}),
        ...(options?.refresh ? { refresh: true } : {})
      }
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

// File SQL Query Execution (DuckDB Console)

interface FileQueryRequest {
  query: string
  connectionId?: string
  scopePath?: string
}

interface FileQueryResponse {
  columns: string[]
  rows: unknown[][]
  count: number
  status: string
}

interface FileRowEdit {
  rowId: number
  changes: Record<string, unknown>
}

interface FileRowInsert {
  values: Record<string, unknown>
}

interface FileRowDelete {
  rowId: number
}

interface ApplyFileRowChangesRequest {
  path: string
  format: FileFormat
  connectionId?: string
  edits?: FileRowEdit[]
  inserts?: FileRowInsert[]
  deletes?: FileRowDelete[]
}

interface ApplyFileRowChangesResponse {
  status: string
  updated: number
  inserted: number
  deleted: number
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
  connectionId?: string,
  scopePath?: string
): Promise<FileQueryResponse> {
  try {
    const payload: FileQueryRequest = { query }
    if (connectionId) payload.connectionId = connectionId
    if (scopePath?.trim()) payload.scopePath = scopePath.trim()

    const response = await apiClient.post<FileQueryResponse>('/files/query', payload)
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

async function applyFileRowChanges(
  payload: ApplyFileRowChangesRequest
): Promise<ApplyFileRowChangesResponse> {
  try {
    const response = await apiClient.post<ApplyFileRowChangesResponse>('/files/rows/apply', payload)
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export default {
  getFileMetadata,
  getFileData,
  sniffCSV,
  listS3Objects,
  listS3Buckets,
  createS3Bucket,
  readS3Manifest,
  executeFileQuery,
  applyFileRowChanges
}
