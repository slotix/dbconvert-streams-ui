import { AxiosError, AxiosResponse } from 'axios';

// Define an interface for the expected error response data structure
interface ErrorResponseData {
  error?: string;
}

// Extend AxiosResponse to include ErrorResponseData
interface CustomAxiosResponse extends AxiosResponse {
  data: ErrorResponseData;
}

// Extend AxiosError to use CustomAxiosResponse
interface CustomAxiosError extends AxiosError {
  response?: CustomAxiosResponse;
}

export function handleApiError(error: unknown): Error {
  const axiosError = error as CustomAxiosError;
  const message = axiosError.response?.data?.error || axiosError.message || 'An unknown error occurred';
  return new Error(message);
}
