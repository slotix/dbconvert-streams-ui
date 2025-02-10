import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import { useCommonStore } from '@/stores/common'
import { type StreamConfig, type StreamID } from '@/types/streamConfig'
import { validateApiKey } from './apiClient'
import { handleApiError } from '@/utils/errorHandler'
import { type StreamStats } from '@/types/streamStats'

const apiClient: AxiosInstance = axios.create({
  baseURL: 'http://127.0.0.1:8020/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
})

const getStreams = async (): Promise<StreamConfig[]> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)

  try {
    const response: AxiosResponse<StreamConfig[]> = await apiClient.get('/stream-configs', {
      headers: { 'X-API-Key': commonStore.apiKey }
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
      headers: { 'X-API-Key': commonStore.apiKey }
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
      headers: { 'X-API-Key': commonStore.apiKey }
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
        headers: { 'X-API-Key': commonStore.apiKey }
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
    const response: AxiosResponse<StreamID> = await apiClient.post(`/streams/${id}/start`, null, {
      headers: { 'X-API-Key': commonStore.apiKey }
    })
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
      headers: { 'X-API-Key': commonStore.apiKey }
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
      headers: { 'X-API-Key': commonStore.apiKey }
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
      headers: { 'X-API-Key': commonStore.apiKey }
    })
  } catch (error) {
    throw handleApiError(error)
  }
}

const getCurrentStreamStats = async (): Promise<StreamStats> => {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)

  try {
    const response: AxiosResponse<StreamStats> = await apiClient.get(`/streams/current/stats`, {
      headers: { 'X-API-Key': commonStore.apiKey }
    })
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
  getCurrentStreamStats
}
