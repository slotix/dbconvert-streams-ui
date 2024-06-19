import axios from "axios";
import { handleApiError } from '@/utils/errorHandler';

const apiClient = axios.create({
  baseURL: 'http://0.0.0.0:8020/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

const getStreams = async (token) => {
  try {
    const response = await apiClient.get('/streams', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
const createStream = async (json, token) => {
  try {
    const response = await apiClient.post('/streams/config', json, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const deleteStream = async (id, token) => {
  try {
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    await apiClient.delete(`/streams/${id}`, { headers });
  } catch (error) {
    throw handleApiError(error);
  }
};

const cloneStream = async (id, token) => {
  try {
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    const response = await apiClient.put(`/streams/${id}/clone`, null, { headers });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const startStream = async (id, token) => {
  try {
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    const response = await apiClient.post(`/streams/${id}/start`, null, { headers });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};


export default {
  getStreams,
  createStream,
  deleteStream,
  cloneStream,
  startStream,
};
