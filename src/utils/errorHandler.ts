import { AxiosError, type AxiosResponse } from 'axios'
import { useCommonStore } from '@/stores/common'

// Define an interface for the expected error response data structure
interface ErrorResponseData {
  error?: string
  data?: string | ErrorResponseData
}

// Extend AxiosResponse to include ErrorResponseData
interface CustomAxiosResponse extends AxiosResponse {
  data: ErrorResponseData | string
}

// Extend AxiosError to use CustomAxiosResponse
interface CustomAxiosError extends AxiosError {
  response?: CustomAxiosResponse
}

export function handleApiError(error: unknown): Error {
  const axiosError = error as CustomAxiosError
  const responseData = axiosError.response?.data

  // Handle different error message formats
  const message = typeof responseData === 'string'
    ? responseData
    : responseData?.error || responseData?.data || axiosError.message || 'An unknown error occurred'

  return new Error(message as string)
}

export const handleUnauthorizedError = async (error: AxiosError) => {
  if (error.response?.status === 401) {
    const commonStore = useCommonStore()
    const initResult = await commonStore.initApp()
    if (initResult === 'failed') {
      throw error
    }
    throw new Error('UNAUTHORIZED')
  }
  throw error
}
