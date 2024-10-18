import axios, { AxiosInstance, AxiosError } from 'axios'
import { handleApiError, handleUnauthorizedError } from '@/utils/errorHandler'
import { DailyUsage, MonthlyUsageResponse, UserData } from '@/types/user'

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

const loadUserConfigs = async (apiKey: string): Promise<UserData> => {
  try {
    const response: ApiResponse<UserData> = await backendClient.get('/user/load-configs', {
      headers: { 'X-API-Key': apiKey }
    })
    return response.data
  } catch (error) {
    return handleUnauthorizedError(error as AxiosError)
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

const getDailyUsage = async (apiKey: string): Promise<DailyUsage[]> => {
  try {
    const response: ApiResponse<DailyUsage[]> = await backendClient.get('/user/daily-usage', {
      headers: { 'X-API-Key': apiKey }
    })
    return response.data
  } catch (error) {
    return handleUnauthorizedError(error as AxiosError)
  }
}

const getMonthlyUsage = async (apiKey: string): Promise<MonthlyUsageResponse> => {
  try {
    const response: ApiResponse<MonthlyUsageResponse> = await backendClient.get(
      '/user/monthly-usage',
      {
        headers: { 'X-API-Key': apiKey }
      }
    )
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
  getMonthlyUsage
}
