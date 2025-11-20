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
  S3ManifestResponse
} from '@/types/s3'

interface FileDataParams {
  limit?: number
  offset?: number
  skipCount?: boolean
  order_by?: string
  order_dir?: string
  where?: string
}

const withAuthHeaders = () => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  return { headers: { [API_HEADERS.API_KEY]: commonStore.apiKey } }
}

export async function getFileMetadata(
  path: string,
  format: FileFormat,
  stats: boolean = false
): Promise<FileMetadata> {
  try {
    const response = await apiClient.get<FileMetadata>('/files/meta', {
      params: { path, format, stats: stats.toString() },
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
  params: FileDataParams = {}
): Promise<FileDataResponse> {
  try {
    const query = new URLSearchParams({ path, format })
    if (params.limit !== undefined) query.set('limit', String(params.limit))
    if (params.offset !== undefined) query.set('offset', String(params.offset))
    if (params.skipCount !== undefined) query.set('skipCount', params.skipCount ? 'true' : 'false')
    if (params.order_by) query.set('order_by', params.order_by)
    if (params.order_dir) query.set('order_dir', params.order_dir)
    if (params.where) query.set('where', params.where)

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

    const response = await apiClient.get<S3ListResponse>(`/files/s3/list?${query.toString()}`, {
      ...withAuthHeaders()
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export async function listS3Buckets(): Promise<{ buckets: string[]; count: number }> {
  try {
    const response = await apiClient.get<{ buckets: string[]; count: number }>(
      '/files/s3/buckets',
      {
        ...withAuthHeaders()
      }
    )
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

export default {
  getFileMetadata,
  getFileData,
  getFileExactCount,
  configureS3Session,
  listS3Objects,
  listS3Buckets,
  validateS3Path,
  readS3Manifest
}
