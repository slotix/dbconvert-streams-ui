import { apiClient } from './apiClient'
import { useCommonStore } from '@/stores/common'
import { validateApiKey } from './apiClient'
import { handleApiError } from '@/utils/errorHandler'
import type { FileMetadata, FileDataResponse } from '@/types/files'
import type { FileFormat } from '@/utils/fileFormat'

interface FileDataParams {
  limit?: number
  offset?: number
  skipCount?: boolean
}

const withAuthHeaders = () => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  return { headers: { 'X-API-Key': commonStore.apiKey } }
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

    const response = await apiClient.get<FileDataResponse>(`/files/data?${query.toString()}`, {
      ...withAuthHeaders()
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export default {
  getFileMetadata,
  getFileData
}
