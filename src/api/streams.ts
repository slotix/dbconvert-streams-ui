import { useCommonStore } from '@/stores/common'
import { type StreamConfig, type StreamID } from '@/types/streamConfig'
import { validateApiKey } from './apiClient'
import { handleApiError } from '@/utils/errorHandler'
import { apiClient } from './apiClient'
import { type AxiosResponse } from 'axios'
import { API_HEADERS } from '@/constants'

type FKViolationDetail = {
  schemaName: string
  tableName: string
  constraintName: string
  orphanCount: number
}

type ValidatedConstraintDetail = {
  schemaName: string
  tableName: string
  constraintName: string
}

export type ConstraintsActionResponse = {
  engine: string
  action: string
  validatedCount?: number
  validatedConstraints?: ValidatedConstraintDetail[]
  totalOrphanRows?: number
  violations?: FKViolationDetail[]
}

const getStreams = async (): Promise<StreamConfig[]> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)

  try {
    const response: AxiosResponse<StreamConfig[]> = await apiClient.get('/stream-configs', {
      headers: { [API_HEADERS.API_KEY]: commonStore.apiKey }
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const createStream = async (json: Record<string, unknown>): Promise<StreamConfig> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)

  try {
    const response: AxiosResponse<StreamConfig> = await apiClient.post('/stream-configs', json, {
      headers: { [API_HEADERS.API_KEY]: commonStore.apiKey }
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const deleteStreamConfig = async (id: string): Promise<void> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)

  try {
    await apiClient.delete(`/stream-configs/${id}`, {
      headers: {
        [API_HEADERS.API_KEY]: commonStore.apiKey,
        'X-Confirm-Delete': 'true'
      }
    })
  } catch (error) {
    throw handleApiError(error)
  }
}

const cloneStreamConfig = async (id: string): Promise<StreamConfig> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)

  try {
    const response: AxiosResponse<StreamConfig> = await apiClient.put(
      `/stream-configs/${id}/clone`,
      null,
      {
        headers: { [API_HEADERS.API_KEY]: commonStore.apiKey }
      }
    )
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const startStream = async (id: string): Promise<string> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  try {
    const response: AxiosResponse<StreamID> = await apiClient.post(
      `/stream-configs/${id}/start`,
      null,
      {
        headers: { [API_HEADERS.API_KEY]: commonStore.apiKey }
      }
    )
    return response.data.id
  } catch (error) {
    throw handleApiError(error)
  }
}

const pauseStream = async (id: string): Promise<void> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  try {
    await apiClient.post(`/streams/${id}/pause`, null, {
      headers: { [API_HEADERS.API_KEY]: commonStore.apiKey }
    })
  } catch (error) {
    throw handleApiError(error)
  }
}

const resumeStream = async (id: string): Promise<void> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  try {
    await apiClient.post(`/streams/${id}/resume`, null, {
      headers: { [API_HEADERS.API_KEY]: commonStore.apiKey }
    })
  } catch (error) {
    throw handleApiError(error)
  }
}

const stopStream = async (id: string): Promise<void> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)
  try {
    await apiClient.post(`/streams/${id}/stop`, null, {
      headers: { [API_HEADERS.API_KEY]: commonStore.apiKey }
    })
  } catch (error) {
    throw handleApiError(error)
  }
}

const updateStreamConfig = async (id: string, config: StreamConfig): Promise<StreamConfig> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)

  try {
    const response: AxiosResponse<StreamConfig> = await apiClient.put(
      `/stream-configs/${id}`,
      config,
      {
        headers: { [API_HEADERS.API_KEY]: commonStore.apiKey }
      }
    )
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const runTargetConstraintsAction = async (configId: string): Promise<ConstraintsActionResponse> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)

  try {
    const response: AxiosResponse<ConstraintsActionResponse> = await apiClient.post(
      `/stream/${configId}/validate-constraints`,
      null,
      {
        headers: { [API_HEADERS.API_KEY]: commonStore.apiKey }
      }
    )
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export default {
  getStreams,
  createStream,
  deleteStream: deleteStreamConfig,
  cloneStreamConfig,
  startStream,
  pauseStream,
  resumeStream,
  stopStream,
  updateStreamConfig,
  runTargetConstraintsAction
}
