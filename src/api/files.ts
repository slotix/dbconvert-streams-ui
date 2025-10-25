import { apiClient } from './apiClient'
import { useCommonStore } from '@/stores/common'
import { validateApiKey } from './apiClient'
import { handleApiError } from '@/utils/errorHandler'
import type { FileMetadata, FileDataResponse } from '@/types/files'
import type { FileFormat } from '@/utils/fileFormat'
import { API_HEADERS } from '@/constants'

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

export default {
  getFileMetadata,
  getFileData,
  getFileExactCount
}
