import axios, { AxiosInstance, AxiosError } from 'axios'
import { handleApiError } from '@/utils/errorHandler'
import { UserData, CombinedUsageResponse } from '@/types/user'
import { ServiceStatusResponse } from '@/types/common'

interface ApiResponse<T> {
  data: T
}

interface HealthCheckResponse {
  status: string
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
  withCredentials: false
})

export function validateApiKey(apiKey: string | null): void {
  if (!apiKey) {
    throw new Error('EMPTY_API_KEY')
  }
}

const getUserDataFromSentry = async (apiKey: string): Promise<UserData> => {
  try {
    validateApiKey(apiKey)
    const response: ApiResponse<UserData> = await backendClient.get('/user', {
      headers: { 'X-API-Key': apiKey }
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

const loadUserConfigs = async (apiKey: string): Promise<void> => {
  validateApiKey(apiKey)
  try {
    await backendClient.get('/user/configs', {
      headers: { 'X-API-Key': apiKey }
    })
  } catch (error) {
    throw handleApiError(error)
  }
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

const getServiceStatus = async (): Promise<ServiceStatusResponse> => {
  try {
    const response: ApiResponse<ServiceStatusResponse> = await backendClient.get('/services/status')
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export default {
  getUserDataFromSentry,
  loadUserConfigs,
  backendHealthCheck,
  sentryHealthCheck,
  getServiceStatus
}
