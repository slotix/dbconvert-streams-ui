import axios, { type AxiosInstance, type AxiosError } from 'axios'
import { handleApiError } from '@/utils/errorHandler'
import { type UserData } from '@/types/user'
import { type ServiceStatusResponse } from '@/types/common'
import { useCommonStore } from '@/stores/common'
import { getBackendUrl, getSentryDsn, logEnvironment } from '@/utils/environment'

interface ApiResponse<T> {
  data: T
}

interface HealthCheckResponse {
  status: string
}

interface RetryConfig {
  maxRetries: number
  delayMs: number
}

// Log environment configuration
logEnvironment()

export const apiClient: AxiosInstance = axios.create({
  baseURL: getBackendUrl(),
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
})

const sentryClient: AxiosInstance = axios.create({
  baseURL: getSentryDsn(),
  headers: {
    'Content-Type': 'application/json'
  }
})

// Only log errors in interceptors
apiClient.interceptors.request.use(
  (config) => config,
  (error) => {
    console.error('[API] Request error:', error)
    return Promise.reject(error)
  }
)

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  delayMs: 1000
}

apiClient.interceptors.response.use(
  (response) => {
    const commonStore = useCommonStore()
    commonStore.clearError()
    return response
  },
  async (error: AxiosError) => {
    const commonStore = useCommonStore()
    const config = error.config as any

    // Only handle network/connection errors
    if (
      !error.response ||
      error.code === 'ECONNABORTED' ||
      error.message.includes('Network Error')
    ) {
      // Initialize retry count
      config.retryCount = config.retryCount ?? 0

      if (config.retryCount < defaultRetryConfig.maxRetries) {
        config.retryCount += 1

        // Set error state
        commonStore.setError({
          message: `Connection attempt ${config.retryCount} of ${defaultRetryConfig.maxRetries}...`,
          isRetrying: true,
          retryCount: config.retryCount
        })

        // Delay before retry
        await new Promise((resolve) => setTimeout(resolve, defaultRetryConfig.delayMs))

        return apiClient(config)
      }

      // Max retries reached - show final error
      commonStore.setError({
        message: 'Unable to connect to the server. Please check your network connection.',
        isRetrying: false
      })
    }

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
  // console.log('[API] Checking backend health...')
  try {
    const response: ApiResponse<HealthCheckResponse> = await apiClient.get('/health')
    console.log('[API] Backend connection successful:', response.data)
    return response.data
  } catch (error) {
    console.error('[API] Backend connection failed:', error)
    throw handleApiError(error)
  }
}

const sentryHealthCheck = async (): Promise<HealthCheckResponse> => {
  // console.log('[API] Checking Sentry health...')
  try {
    const response: ApiResponse<HealthCheckResponse> = await sentryClient.get('/health')
    console.log('[API] Sentry connection successful:', response.data)
    return response.data
  } catch (error) {
    console.error('[API] Sentry connection failed:', error)
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

export async function getConnections(): Promise<any> {
  try {
    const response = await apiClient.get('/connections')
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export async function getStreams(): Promise<any> {
  try {
    const response = await apiClient.get('/streams')
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export async function initializeApiClient() {
  const commonStore = useCommonStore()
  const savedApiKey = await commonStore.getApiKey()

  if (savedApiKey) {
    configureApiClient(savedApiKey)
  }
}

export function configureApiClient(apiKey: string): void {
  apiClient.defaults.headers.common['X-API-Key'] = apiKey
}

export default {
  validateApiKey,
  getUserDataFromSentry,
  loadUserConfigs,
  backendHealthCheck,
  sentryHealthCheck,
  getServiceStatus,
  getConnections,
  getStreams
}
