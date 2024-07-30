import axios, { AxiosInstance } from 'axios';
import { handleApiError } from '@/utils/errorHandler';

interface ApiResponse<T> {
  data: T;
}

interface UserDataResponse {
  userID: string;
  apiKey: string;
}

interface HealthCheckResponse {
  status: string;
}

const apiClient: AxiosInstance = axios.create({
  baseURL: 'http://localhost:8019',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

const getUserData = async (token: string): Promise<UserDataResponse> => {
  try {
    const response: ApiResponse<UserDataResponse> = await apiClient.post('/apikey', {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data; // Return the entire UserDataResponse object
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

export default { getUserData, healthCheck };