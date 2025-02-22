import axios, { type AxiosInstance, type AxiosError } from 'axios'
import { handleApiError } from '@/utils/errorHandler'
import { type UserData, type CombinedUsageResponse } from '@/types/user'
import { type ServiceStatusResponse } from '@/types/common'
import { logger } from '@/utils/logger'

interface ApiResponse<T> {
  data: T
}

interface HealthCheckResponse {
  status: string
}

// Add logging for API configuration
console.log('[API] Environment configuration:', {
  baseURL: import.meta.env.VITE_BACKEND_URL,
  sentryDSN: import.meta.env.VITE_SENTRY_DSN
})

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

// Add request/response interceptors for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API] Making request to: ${config.url}`, config)
    return config
  },
  (error) => {
    console.error('[API] Request error:', error)
    return Promise.reject(error)
  }
)

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] Received response from: ${response.config.url}`, response.status)
    return response
  },
  (error) => {
    console.error('[API] Response error:', error.response?.status, error.message)
    return Promise.reject(error)
  }
)

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

// Add logging to health check functions
const backendHealthCheck = async (): Promise<HealthCheckResponse> => {
  console.log('[API] Checking backend health...')
  try {
    const response: ApiResponse<HealthCheckResponse> = await apiClient.get('/health')
    console.log('[API] Backend health check response:', response.data)
    return response.data
  } catch (error) {
    console.error('[API] Backend health check failed:', error)
    throw handleApiError(error)
  }
}

const sentryHealthCheck = async (): Promise<HealthCheckResponse> => {
  console.log('[API] Checking Sentry health...')
  try {
    const response: ApiResponse<HealthCheckResponse> = await sentryClient.get('/health')
    console.log('[API] Sentry health check response:', response.data)
    return response.data
  } catch (error) {
    console.error('[API] Sentry health check failed:', error)
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
