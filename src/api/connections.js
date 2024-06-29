import axios from "axios";
import { handleApiError } from '@/utils/errorHandler';
import { useCommonStore } from '@/stores/common';  

const apiClient = axios.create({
  baseURL: 'http://0.0.0.0:8020/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

const getConnections = async () => {
  const commonStore = useCommonStore();
  try {
    const response = await apiClient.get('/connections', {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const createConnection = async (json) => {
  const commonStore = useCommonStore();
  try {
    const response = await apiClient.post('/connections', json, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const updateConnection = async (json) => {
  const commonStore = useCommonStore();
  try {
    await apiClient.put('/connections', json, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
  } catch (error) {
    throw handleApiError(error);
  }
};

const deleteConnection = async (id) => {
  const commonStore = useCommonStore();
  try {
    await apiClient.delete(`/connections/${id}`, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
  } catch (error) {
    throw handleApiError(error);
  }
};

const cloneConnection = async (id) => {
  const commonStore = useCommonStore();
  try {
    const response = await apiClient.put(`/connections/${id}/clone`, null, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const testConnection = async (json) => {
  const commonStore = useCommonStore();
  try {
    const response = await apiClient.post('/connections/ping', json, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    if (response.data.ping === "ok") {
      return "Connection Test Passed";
    }
  } catch (error) {
    throw handleApiError(error);
  }
};

const getSchemas = async (id) => {
  const commonStore = useCommonStore();
  try {
    const response = await apiClient.get(`/connections/${id}/schemas`, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const getDatabases = async (id) => {
  const commonStore = useCommonStore();
  try {
    const response = await apiClient.get(`/connections/${id}/databases`, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const createDatabase = async (newDatabase, id) => {
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

const createSchema = async (newSchema, id) => {
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

const getMeta = async (id) => {
  const commonStore = useCommonStore();
  try {
    const response = await apiClient.get(`/connections/${id}/meta`, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const getTables = async (id) => {
  const commonStore = useCommonStore();
  try {
    const response = await apiClient.get(`/connections/${id}/tables`, {
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
