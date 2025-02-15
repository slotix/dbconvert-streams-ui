import axios, { type AxiosInstance, type AxiosError } from 'axios'
import { handleApiError } from '@/utils/errorHandler'
import { type UserData, type CombinedUsageResponse } from '@/types/user'
import { type ServiceStatusResponse } from '@/types/common'

interface ApiResponse<T> {
  data: T
}

interface HealthCheckResponse {
  status: string
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

const sentryClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_SENTRY_DSN,
  headers: {
    'Content-Type': 'application/json'
  }
})

export async function validateApiKey(apiKey: string | null): Promise<void> {
  if (!apiKey) {
    throw new Error('API key is required')
  }

  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    throw new Error('Invalid API key format')
  }

  try {
    // Validate the API key by making a request to a protected endpoint
    await apiClient.get('/user', {
      headers: { 'X-API-Key': apiKey }
    })
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('Invalid API key')
    }
    throw error
  }
}

const getUserDataFromSentry = async (apiKey: string): Promise<UserData> => {
  try {
    await validateApiKey(apiKey)
    const response: ApiResponse<UserData> = await apiClient.get('/user', {
      headers: { 'X-API-Key': apiKey }
    })
    return response.data
  } catch (error: any) {
    console.error('[API] Failed to get user data from Sentry:', error)
    if (error.response?.status === 401) {
      throw new Error('Invalid API key')
    }
    throw new Error(error.response?.data?.message || 'Failed to fetch user data')
  }
}

const loadUserConfigs = async (apiKey: string): Promise<void> => {
  validateApiKey(apiKey)
  try {
    await apiClient.get('/user/configs', {
      headers: { 'X-API-Key': apiKey }
    })
  } catch (error) {
    throw handleApiError(error)
  }
}

const backendHealthCheck = async (): Promise<HealthCheckResponse> => {
  try {
    const response: ApiResponse<HealthCheckResponse> = await apiClient.get('/health')
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const sentryHealthCheck = async (): Promise<HealthCheckResponse> => {
  try {
    const response: ApiResponse<HealthCheckResponse> = await sentryClient.get('/health')
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const getServiceStatus = async (): Promise<ServiceStatusResponse> => {
  try {
    const response: ApiResponse<ServiceStatusResponse> = await apiClient.get('/services/status')
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export default {
  validateApiKey,
  getUserDataFromSentry,
  loadUserConfigs,
  backendHealthCheck,
  sentryHealthCheck,
  getServiceStatus,
}
