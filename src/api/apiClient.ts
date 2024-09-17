import axios, { AxiosInstance, AxiosError } from 'axios';
import { handleApiError, handleUnauthorizedError } from '@/utils/errorHandler';
import { DailyUsage, MonthlyUsage, MonthlyUsageResponse, UserData } from '@/types/user';

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

const getUserDataFromSentry = async (token: string): Promise<UserData> => {
  try {
    const response: ApiResponse<UserData> = await backendClient.post('/user', {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    return handleUnauthorizedError(error as AxiosError);
  }
};

const storeAPIKey = async (token: string, userID: string, apiKey: string): Promise<StoreAPIKeyResponse> => {
  try {
    const response: ApiResponse<StoreAPIKeyResponse> = await backendClient.post(
      '/storeAPIKey',
      { user_id: userID, api_key: apiKey, token: token },
      { headers: { 'X-API-Key': apiKey } }
    );
    return response.data;
  } catch (error) {
    return handleUnauthorizedError(error as AxiosError);
  }
};

const loadUserConfigs = async (apiKey: string): Promise<UserData> => {
  try {
    const response: ApiResponse<UserData> = await backendClient.get('/loadUserConfigs', {
      headers: { 'X-API-Key': apiKey },
    });
    return response.data;
  } catch (error) {
    return handleUnauthorizedError(error as AxiosError);
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

const getDailyUsage = async (apiKey: string): Promise<DailyUsage[]> => {
  try {
    const response: ApiResponse<DailyUsage[]> = await backendClient.get('/usage/daily', {
      headers: { 'X-API-Key': apiKey },
    });
    return response.data;
  } catch (error) {
    return handleUnauthorizedError(error as AxiosError);
  }
};

const getMonthlyUsage = async (apiKey: string): Promise<MonthlyUsageResponse> => {
  try {
    const response: ApiResponse<MonthlyUsageResponse> = await backendClient.get('/usage/monthly', {
      headers: { 'X-API-Key': apiKey },
    });
    return response.data;
  } catch (error) {
    return handleUnauthorizedError(error as AxiosError);
  }
};

export default { 
  getUserDataFromSentry, 
  storeAPIKey, 
  loadUserConfigs, 
  backendHealthCheck, 
  sentryHealthCheck,
  getDailyUsage,
  getMonthlyUsage 
};