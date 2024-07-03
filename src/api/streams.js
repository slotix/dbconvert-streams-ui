import axios from "axios";
import { handleApiError } from '@/utils/errorHandler';
import { useCommonStore } from '@/stores/common';

const apiClient = axios.create({
  baseURL: 'http://0.0.0.0:8020/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

const getStreams = async () => {
  const commonStore = useCommonStore();
  try {
    const response = await apiClient.get('/streams', {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const createStream = async (json) => {
  const commonStore = useCommonStore();
  try {
    const response = await apiClient.post('/streams/config', json, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const deleteStream = async (id) => {
  const commonStore = useCommonStore();
  try {
    await apiClient.delete(`/streams/${id}`, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
  } catch (error) {
    throw handleApiError(error);
  }
};

const cloneStream = async (id) => {
  const commonStore = useCommonStore();
  try {
    const response = await apiClient.put(`/streams/${id}/clone`, null, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const startStream = async (id) => {
  const commonStore = useCommonStore();
  try {
    const response = await apiClient.post(`/streams/${id}/start`, null, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
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
