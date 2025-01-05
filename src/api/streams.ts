import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { useCommonStore } from '@/stores/common'
import { StreamConfig } from '@/types/streamConfig'
import { validateApiKey } from './apiClient'

const apiClient: AxiosInstance = axios.create({
  baseURL: 'http://127.0.0.1:8020/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
})

const getStreams = async (): Promise<StreamConfig[]> => {
    const commonStore = useCommonStore()
    validateApiKey(commonStore.apiKey)
    
    const response: AxiosResponse<StreamConfig[]> = await apiClient.get('/stream-configs', {
      headers: { 'X-API-Key': commonStore.apiKey }
    })
    return response.data
}

const createStream = async (json: Record<string, unknown>): Promise<StreamConfig> => {
    const commonStore = useCommonStore()
    validateApiKey(commonStore.apiKey)
    
    const response: AxiosResponse<StreamConfig> = await apiClient.post('/stream-configs', json, {
      headers: { 'X-API-Key': commonStore.apiKey }
    })
    return response.data
}

const deleteStream = async (id: string): Promise<void> => {
    const commonStore = useCommonStore()
    validateApiKey(commonStore.apiKey)
    
    await apiClient.delete(`/stream-configs/${id}`, {
      headers: { 'X-API-Key': commonStore.apiKey }
    })
}

const cloneStreamConfig = async (id: string): Promise<StreamConfig> => {
    const commonStore = useCommonStore()
    validateApiKey(commonStore.apiKey)
    
    const response: AxiosResponse<StreamConfig> = await apiClient.put(
      `/stream-configs/${id}/clone`,
      null,
      {
        headers: { 'X-API-Key': commonStore.apiKey }
      }
    )
    return response.data
}

const startStream = async (id: string): Promise<StreamConfig> => {
    const commonStore = useCommonStore()
    validateApiKey(commonStore.apiKey)
    
    const response: AxiosResponse<StreamConfig> = await apiClient.post(
      `/streams/${id}/action`,
      { action: 'start' },
      {
        headers: { 'X-API-Key': commonStore.apiKey }
      }
    )
    return response.data
}

const pauseStream = async (id: string): Promise<StreamConfig> => {
    const commonStore = useCommonStore()
    validateApiKey(commonStore.apiKey)
    
    const response: AxiosResponse<StreamConfig> = await apiClient.post(
      `/streams/${id}/action`,
      { action: 'pause' },
      {
        headers: { 'X-API-Key': commonStore.apiKey }
      }
    )
    return response.data
}

const resumeStream = async (id: string): Promise<StreamConfig> => {
    const commonStore = useCommonStore()
    validateApiKey(commonStore.apiKey)
    
    const response: AxiosResponse<StreamConfig> = await apiClient.post(
      `/streams/${id}/action`,
      { action: 'resume' },
      {
        headers: { 'X-API-Key': commonStore.apiKey }
      }
    )
    return response.data
}

const stopStream = async (id: string): Promise<StreamConfig> => {
    const commonStore = useCommonStore()
    validateApiKey(commonStore.apiKey)
    
    const response: AxiosResponse<StreamConfig> = await apiClient.post(
      `/streams/${id}/action`,
      { action: 'stop' },
      {
        headers: { 'X-API-Key': commonStore.apiKey }
      }
    )
    return response.data
}

export default {
  getStreams,
  createStream,
  deleteStream,
  cloneStreamConfig,
  startStream,
  pauseStream,
  resumeStream,
  stopStream
}
