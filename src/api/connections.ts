import axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";
import { handleApiError, handleUnauthorizedError } from '@/utils/errorHandler';
import { useCommonStore } from '@/stores/common';
import { Connection, Schema, Database } from '@/types/connections';

const apiClient: AxiosInstance = axios.create({
  baseURL: 'http://127.0.0.1:8020/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});


const executeWithRetry = async <T>(operation: () => Promise<T>): Promise<T> => {
  const commonStore = useCommonStore();
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 401) {
      await handleUnauthorizedError(error);
      // Retry the operation after reinitialization
      return await operation();
    }
    throw handleApiError(error);
  }
};

const getConnections = async (): Promise<Connection[]> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore();
    const response: AxiosResponse<Connection[]> = await apiClient.get('/connections', {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  });
};

const createConnection = async (json: Record<string, unknown>): Promise<Connection> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore();
    const response: AxiosResponse<Connection> = await apiClient.post('/connections', json, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  });
};

const updateConnection = async (json: Record<string, unknown>): Promise<void> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore();
    await apiClient.put('/connections', json, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
  });
};

const deleteConnection = async (id: string): Promise<void> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore();
    await apiClient.delete(`/connections/${id}`, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
  });
};

const cloneConnection = async (id: string): Promise<Connection> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore();
    const response: AxiosResponse<Connection> = await apiClient.put(`/connections/${id}/clone`, null, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  });
};

const testConnection = async (json: Record<string, unknown>): Promise<string> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore();
    const response: AxiosResponse<{ ping: string }> = await apiClient.post('/connections/ping', json, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    if (response.data.ping === "ok") {
      return "Connection Test Passed";
    } else {
      throw new Error("Connection Test Failed");
    }
  });
};

const getSchemas = async (id: string): Promise<Schema[]> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore();
    const response: AxiosResponse<Schema[]> = await apiClient.get(`/connections/${id}/schemas`, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  });
};

const getDatabases = async (id: string): Promise<Database[]> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore();
    const response: AxiosResponse<Database[]> = await apiClient.get(`/connections/${id}/databases`, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  });
};

const createDatabase = async (newDatabase: string, id: string): Promise<void> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore();
    await apiClient.post(`/connections/${id}/databases`, newDatabase, {
      headers: {
        'Content-Type': 'text/plain',
        'X-API-Key': commonStore.apiKey
      }
    });
  });
};

const createSchema = async (newSchema: string, id: string): Promise<void> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore();
    await apiClient.post(`/connections/${id}/schemas`, newSchema, {
      headers: {
        'Content-Type': 'text/plain',
        'X-API-Key': commonStore.apiKey
      }
    });
  });
};

const getMeta = async (id: string): Promise<Record<string, unknown>> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore();
    const response: AxiosResponse<Record<string, unknown>> = await apiClient.get(`/connections/${id}/meta`, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  });
};

const getTables = async (id: string): Promise<Record<string, unknown>[]> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore();
    const response: AxiosResponse<Record<string, unknown>[]> = await apiClient.get(`/connections/${id}/tables`, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  });
};

export default {
  getConnections,
  createConnection,
  updateConnection,
  deleteConnection,
  cloneConnection,
  testConnection,
  getSchemas,
  getDatabases,
  createDatabase,
  createSchema,
  getMeta,
  getTables,
};
