import axios, { AxiosInstance } from 'axios';
import { handleApiError } from '@/utils/errorHandler';

// Define the shape of the API responses
interface ApiResponse<T> {
  data: T;
}

interface ApiKeyResponse {
  apiKey: string;
}

interface HealthCheckResponse {
  status: string;
}

const apiClient: AxiosInstance = axios.create({
  baseURL: 'http://0.0.0.0:8020/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

const getApiKey = async (token: string): Promise<string> => {
  try {
    const response: ApiResponse<ApiKeyResponse> = await apiClient.get('/get-api-key', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.apiKey;
  } catch (error) {
    throw handleApiError(error);
  }
};

const healthCheck = async (): Promise<HealthCheckResponse> => {
  try {
    const response: ApiResponse<HealthCheckResponse> = await apiClient.get('/health');
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export default { getApiKey, healthCheck };
