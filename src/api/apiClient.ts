import axios, { AxiosInstance } from 'axios';
import { handleApiError } from '@/utils/errorHandler';
import { useCommonStore } from '@/stores/common';

// Define the shape of the API responses
interface ApiResponse<T> {
  data: T;
}

interface HealthCheckResponse {
  status: string;
}

interface StoreAPIKeyResponse {
  status: string;
}

interface UserDataResponse {
  status: string;
  userID: string;
  apiKey: string;
}

const backendClient: AxiosInstance = axios.create({
  baseURL: 'http://127.0.0.1:8020/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

const sentryClient: AxiosInstance = axios.create({
  baseURL: 'http://localhost:8019',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

const getUserDataFromSentry = async (token: string): Promise<UserDataResponse> => {
  try {
    const response: ApiResponse<UserDataResponse> = await backendClient.post('/getUserData', {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Token is invalid or expired, throw a specific error
      throw new Error('UNAUTHORIZED');
    }
    throw handleApiError(error);
  }
};

const storeAPIKey = async (token: string): Promise<StoreAPIKeyResponse> => {
  const commonStore = useCommonStore();
  try {
    const response: ApiResponse<StoreAPIKeyResponse> = await backendClient.post(
      '/storeAPIKey',
      {
        user_id: commonStore.userID,
        api_key: commonStore.apiKey,
        token: token,
      },
      {
        headers: { 'X-API-Key': commonStore.apiKey },
      }
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const loadUserConfigs = async (): Promise<UserDataResponse> => {
  const commonStore = useCommonStore();
  try {
    const response: ApiResponse<UserDataResponse> = await backendClient.get('/loadUserConfigs', {
      headers: { 'X-API-Key': commonStore.apiKey },
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const backendHealthCheck = async (): Promise<HealthCheckResponse> => {
  try {
    const response: ApiResponse<HealthCheckResponse> = await backendClient.get('/health');
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const sentryHealthCheck = async (): Promise<HealthCheckResponse> => {
  try {
    const response: ApiResponse<HealthCheckResponse> = await sentryClient.get('/health');
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export default { 
  getUserDataFromSentry, 
  storeAPIKey, 
  loadUserConfigs, 
  backendHealthCheck, 
  sentryHealthCheck 
};