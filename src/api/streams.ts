import { type StreamConfig, type StreamID } from '@/types/streamConfig'
import { handleApiError } from '@/utils/errorHandler'
import { apiClient } from './apiClient'
import { type AxiosResponse } from 'axios'

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
  try {
    const response: AxiosResponse<StreamConfig[]> = await apiClient.get('/stream-configs')
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const createStream = async (json: Record<string, unknown>): Promise<StreamConfig> => {
  try {
    const response: AxiosResponse<StreamConfig> = await apiClient.post('/stream-configs', json)
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const deleteStreamConfig = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/stream-configs/${id}`, {
      headers: {
        'X-Confirm-Delete': 'true'
      }
    })
  } catch (error) {
    throw handleApiError(error)
  }
}

const cloneStreamConfig = async (id: string): Promise<StreamConfig> => {
  try {
    const response: AxiosResponse<StreamConfig> = await apiClient.put(
      `/stream-configs/${id}/clone`,
      null
    )
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const startStream = async (id: string): Promise<string> => {
  try {
    const response: AxiosResponse<StreamID> = await apiClient.post(
      `/stream-configs/${id}/start`,
      null
    )
    return response.data.id
  } catch (error) {
    throw handleApiError(error)
  }
}

const pauseStream = async (id: string): Promise<void> => {
  try {
    await apiClient.post(`/streams/${id}/pause`, null)
  } catch (error) {
    throw handleApiError(error)
  }
}

const resumeStream = async (id: string): Promise<void> => {
  try {
    await apiClient.post(`/streams/${id}/resume`, null)
  } catch (error) {
    throw handleApiError(error)
  }
}

const stopStream = async (id: string): Promise<void> => {
  try {
    await apiClient.post(`/streams/${id}/stop`, null)
  } catch (error) {
    throw handleApiError(error)
  }
}

const updateStreamConfig = async (id: string, config: StreamConfig): Promise<StreamConfig> => {
  try {
    const response: AxiosResponse<StreamConfig> = await apiClient.put(
      `/stream-configs/${id}`,
      config
    )
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const runTargetConstraintsAction = async (configId: string): Promise<ConstraintsActionResponse> => {
  try {
    const response: AxiosResponse<ConstraintsActionResponse> = await apiClient.post(
      `/stream/${configId}/validate-constraints`,
      null
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
