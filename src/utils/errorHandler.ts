import { AxiosError, type AxiosResponse } from 'axios'

// Define an interface for the expected error response data structure
interface ErrorResponseData {
  error?: string
  message?: string
  type?: string
  code?: string
  details?: Record<string, unknown>
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

export class ApiError extends Error {
  type?: string
  code?: string
  status?: number
  details?: Record<string, unknown>

  constructor(
    message: string,
    options: {
      type?: string
      code?: string
      status?: number
      details?: Record<string, unknown>
    } = {}
  ) {
    super(message)
    this.name = 'ApiError'
    this.type = options.type
    this.code = options.code
    this.status = options.status
    this.details = options.details
  }
}

export function handleApiError(error: unknown): Error {
  const axiosError = error as CustomAxiosError
  const responseData = axiosError.response?.data

  // Handle different error message formats
  let message = axiosError.message || 'An unknown error occurred'
  if (typeof responseData === 'string') {
    message = responseData
  } else if (responseData) {
    const nestedData =
      typeof responseData.data === 'string'
        ? responseData.data
        : typeof responseData.data === 'object' &&
            responseData.data !== null &&
            typeof responseData.data.error === 'string'
          ? responseData.data.error
          : undefined

    message = responseData.error || responseData.message || nestedData || message
  }

  return new ApiError(message, {
    type: typeof responseData === 'object' ? responseData?.type : undefined,
    code: typeof responseData === 'object' ? responseData?.code : undefined,
    status: axiosError.response?.status,
    details: typeof responseData === 'object' ? responseData?.details : undefined
  })
}
