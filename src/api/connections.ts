import axios, { AxiosInstance, AxiosResponse } from "axios";
import { handleApiError } from '@/utils/errorHandler';
import { useCommonStore } from '@/stores/common';
import { Connection, Schema, Database } from '@/types/connections';



const apiClient: AxiosInstance = axios.create({
  baseURL: 'http://0.0.0.0:8020/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

const getConnections = async (): Promise<Connection[]> => {
  const commonStore = useCommonStore();
  try {
    const response: AxiosResponse<Connection[]> = await apiClient.get('/connections', {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const createConnection = async (json: Record<string, unknown>): Promise<Connection> => {
  const commonStore = useCommonStore();
  try {
    const response: AxiosResponse<Connection> = await apiClient.post('/connections', json, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const updateConnection = async (json: Record<string, unknown>): Promise<void> => {
  const commonStore = useCommonStore();
  try {
    await apiClient.put('/connections', json, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
  } catch (error) {
    throw handleApiError(error);
  }
};

const deleteConnection = async (id: string): Promise<void> => {
  const commonStore = useCommonStore();
  try {
    await apiClient.delete(`/connections/${id}`, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
  } catch (error) {
    throw handleApiError(error);
  }
};

const cloneConnection = async (id: string): Promise<Connection> => {
  const commonStore = useCommonStore();
  try {
    const response: AxiosResponse<Connection> = await apiClient.put(`/connections/${id}/clone`, null, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const testConnection = async (json: Record<string, unknown>): Promise<string> => {
  const commonStore = useCommonStore();
  try {
    const response: AxiosResponse<{ ping: string }> = await apiClient.post('/connections/ping', json, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    if (response.data.ping === "ok") {
      return "Connection Test Passed";
    } else {
      throw new Error("Connection Test Failed");
    }
  } catch (error) {
    throw handleApiError(error);
  }
};

const getSchemas = async (id: string): Promise<Schema[]> => {
  const commonStore = useCommonStore();
  try {
    const response: AxiosResponse<Schema[]> = await apiClient.get(`/connections/${id}/schemas`, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const getDatabases = async (id: string): Promise<Database[]> => {
  const commonStore = useCommonStore();
  try {
    const response: AxiosResponse<Database[]> = await apiClient.get(`/connections/${id}/databases`, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const createDatabase = async (newDatabase: string, id: string): Promise<void> => {
  const commonStore = useCommonStore();
  try {
    await apiClient.post(`/connections/${id}/databases`, newDatabase, {
      headers: {
        'Content-Type': 'text/plain',
        'X-API-Key': commonStore.apiKey
      }
    });
  } catch (error) {
    throw handleApiError(error);
  }
};

const createSchema = async (newSchema: string, id: string): Promise<void> => {
  const commonStore = useCommonStore();
  try {
    await apiClient.post(`/connections/${id}/schemas`, newSchema, {
      headers: {
        'Content-Type': 'text/plain',
        'X-API-Key': commonStore.apiKey
      }
    });
  } catch (error) {
    throw handleApiError(error);
  }
};

const getMeta = async (id: string): Promise<Record<string, unknown>> => {
  const commonStore = useCommonStore();
  try {
    const response: AxiosResponse<Record<string, unknown>> = await apiClient.get(`/connections/${id}/meta`, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const getTables = async (id: string): Promise<Record<string, unknown>[]> => {
  const commonStore = useCommonStore();
  try {
    const response: AxiosResponse<Record<string, unknown>[]> = await apiClient.get(`/connections/${id}/tables`, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
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
