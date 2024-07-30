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
}

const apiClient: AxiosInstance = axios.create({
  baseURL: 'http://127.0.0.1:8020/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

const storeAPIKey = async (token: string): Promise<StoreAPIKeyResponse> => {
  const commonStore = useCommonStore();
  try {
    const response: ApiResponse<StoreAPIKeyResponse> = await apiClient.post(
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

const load = async (apiKey: string): Promise<UserDataResponse> => {
  const commonStore = useCommonStore();
  try {
    const response: ApiResponse<UserDataResponse> = await apiClient.get('/loadUserData', {
      headers: { 'X-API-Key': commonStore.apiKey },
    });
    return response.data;
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

export default { healthCheck, storeAPIKey, load };
