import axios, { AxiosInstance, AxiosError } from 'axios'
import { handleApiError, handleUnauthorizedError } from '@/utils/errorHandler'
import { DailyUsage, MonthlyUsageResponse, UserData, CombinedUsageResponse } from '@/types/user'
import { ServiceStatus, ServiceStatusResponse } from '@/types/common'
import { useCommonStore } from '@/stores/common'
// Define the shape of the API responses
interface ApiResponse<T> {
  data: T
}

interface HealthCheckResponse {
  status: string
}

interface UpdateAPIKeyResponse {
  status: string
  apiKey: string
}

const backendClient: AxiosInstance = axios.create({
  baseURL: 'http://127.0.0.1:8020/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
})

const sentryClient: AxiosInstance = axios.create({
  baseURL: 'http://localhost:8019',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
})

export function validateApiKey(apiKey: string | null): void {
  if (!apiKey) {
    throw new Error('EMPTY_API_KEY')
  }
}

export const executeWithRetry = async <T>(operation: () => Promise<T>): Promise<T> => {
  return executeWithEmptyKeyRetry(async () => {
    try {
      return await operation()
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        await handleUnauthorizedError(error)
        return await operation()
      }
      throw handleApiError(error)
    }
  })
}

const executeWithEmptyKeyRetry = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof Error && error.message === 'EMPTY_API_KEY') {
      const commonStore = useCommonStore()
      const initResult = await commonStore.initApp()
      if (initResult === 'failed') {
        throw new Error('Failed to initialize application')
      }
      // Retry the operation after initialization
      return await operation()
    }
    throw error
  }
}

const getUserDataFromSentry = async (token: string): Promise<UserData> => {
  try {
    const response: ApiResponse<UserData> = await backendClient.get('/user', {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
  } catch (error) {
    return handleUnauthorizedError(error as AxiosError)
  }
}

const updateAPIKey = async (token: string): Promise<UpdateAPIKeyResponse> => {
  try {
    const response: ApiResponse<UpdateAPIKeyResponse> = await backendClient.post(
      '/user/api-key',
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data
  } catch (error) {
    return handleUnauthorizedError(error as AxiosError)
  }
}

const loadUserConfigs = async (apiKey: string): Promise<void> => {
  return executeWithEmptyKeyRetry(async () => {
    validateApiKey(apiKey)
    try {
      await backendClient.get('/user/configs', {
        headers: { 'X-API-Key': apiKey }
      })
    } catch (error) {
      return handleUnauthorizedError(error as AxiosError)
    }
  })
}

const backendHealthCheck = async (): Promise<HealthCheckResponse> => {
  try {
    const response: ApiResponse<HealthCheckResponse> = await backendClient.get('/health')
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

const getCombinedUsage = async (apiKey: string): Promise<CombinedUsageResponse> => {
  return executeWithEmptyKeyRetry(async () => {
    validateApiKey(apiKey)
    const response: ApiResponse<CombinedUsageResponse> = await backendClient.get('/user/combined-usage', {
      headers: { 'X-API-Key': apiKey }
    })
    return response.data
  })
}

const getDailyUsage = async (apiKey: string): Promise<DailyUsage[]> => {
  return executeWithEmptyKeyRetry(async () => {
    validateApiKey(apiKey)
    try {
      const response: ApiResponse<DailyUsage[]> = await backendClient.get('/user/daily-usage', {
        headers: { 'X-API-Key': apiKey }
      })
      return response.data
    } catch (error) {
      return handleUnauthorizedError(error as AxiosError)
    }
  })
}

const getMonthlyUsage = async (apiKey: string): Promise<MonthlyUsageResponse> => {
  return executeWithEmptyKeyRetry(async () => {
    validateApiKey(apiKey)
    try {
      const response: ApiResponse<MonthlyUsageResponse> = await backendClient.get('/user/monthly-usage', {
        headers: { 'X-API-Key': apiKey }
      })
      return response.data
    } catch (error) {
      return handleUnauthorizedError(error as AxiosError)
    }
  })
}

const getServiceStatus = async (): Promise<ServiceStatusResponse> => {
  try {
    const response: ApiResponse<ServiceStatusResponse> = await backendClient.get('/services/status')
    return response.data
  } catch (error) {
    return handleUnauthorizedError(error as AxiosError)
  }
}

export default {
  getUserDataFromSentry,
  updateAPIKey,
  loadUserConfigs,
  backendHealthCheck,
  sentryHealthCheck,
  getDailyUsage,
  getMonthlyUsage,
  getCombinedUsage,
  getServiceStatus
}
