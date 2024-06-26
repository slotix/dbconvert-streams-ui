import axios from "axios";
import { handleApiError } from '@/utils/errorHandler';

const apiClient = axios.create({
  baseURL: 'http://0.0.0.0:8020/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

const getConnections = async (token) => {
  try {
    const response = await apiClient.get('/connections', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const createConnection = async (json, token) => {
  try {
    const response = await apiClient.post('/connections', json, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const updateConnection = async (json, token) => {
  try {
    await apiClient.put('/connections', json, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (error) {
    throw handleApiError(error);
  }
};

const deleteConnection = async (id, token) => {
  try {
    await apiClient.delete(`/connections/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (error) {
    throw handleApiError(error);
  }
};

const cloneConnection = async (id, token) => {
  try {
    const response = await apiClient.put(`/connections/${id}/clone`, null, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const testConnection = async (json, token) => {
  try {
    const response = await apiClient.post('/connections/ping', json, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.data.ping === "ok") {
      return "Connection Test Passed";
    }
  } catch (error) {
    throw handleApiError(error);
  }
};

const getSchemas = async (id, token) => {
  try {
    const response = await apiClient.get(`/connections/${id}/schemas`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const getDatabases = async (id, token) => {
  try {
    const response = await apiClient.get(`/connections/${id}/databases`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const createDatabase = async (newDatabase, id, token) => {
  try {
    await apiClient.post(`/connections/${id}/databases`, newDatabase, {
      headers: {
        'Content-Type': 'text/plain',
        Authorization: `Bearer ${token}`
      }
    });
  } catch (error) {
    throw handleApiError(error);
  }
};

const createSchema = async (newSchema, id, token) => {
  try {
    await apiClient.post(`/connections/${id}/schemas`, newSchema, {
      headers: {
        'Content-Type': 'text/plain',
        Authorization: `Bearer ${token}`
      }
    });
  } catch (error) {
    throw handleApiError(error);
  }
};

const getMeta = async (id, token) => {
  try {
    const response = await apiClient.get(`/connections/${id}/meta`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const getTables = async (id, token) => {
  try {
    const response = await apiClient.get(`/connections/${id}/tables`, {
      headers: { Authorization: `Bearer ${token}` }
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
