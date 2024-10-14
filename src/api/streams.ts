import axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";
import { handleApiError, handleUnauthorizedError } from '@/utils/errorHandler';
import { useCommonStore } from '@/stores/common';
import { Stream } from '@/types/streams';  // Import the Stream interface

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

const getStreams = async (): Promise<Stream[]> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore();
    const response: AxiosResponse<Stream[]> = await apiClient.get('/stream-configs', {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  });
};

const createStream = async (json: Record<string, unknown>): Promise<Stream> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore();
    const response: AxiosResponse<Stream> = await apiClient.post('/stream-configs', json, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  });
};

const deleteStream = async (id: string): Promise<void> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore();
    await apiClient.delete(`/stream-configs/${id}`, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
  });
};

const cloneStreamConfig = async (id: string): Promise<Stream> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore();
    const response: AxiosResponse<Stream> = await apiClient.put(`/stream-configs/${id}/clone`, null, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  });
};

const startStream = async (id: string): Promise<Stream> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore();
    const response: AxiosResponse<Stream> = await apiClient.post(`/streams/${id}/action`, { action: 'start' }, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  });
};

const pauseStream = async (id: string): Promise<Stream> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore();
    const response: AxiosResponse<Stream> = await apiClient.post(`/streams/${id}/action`, { action: 'pause' }, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  });
};

const resumeStream = async (id: string): Promise<Stream> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore();
    const response: AxiosResponse<Stream> = await apiClient.post(`/streams/${id}/action`, { action: 'resume' }, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  });
};

const stopStream = async (id: string): Promise<Stream> => {
  return executeWithRetry(async () => {
    const commonStore = useCommonStore();
    const response: AxiosResponse<Stream> = await apiClient.post(`/streams/${id}/action`, { action: 'stop' }, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  });
};

export default {
  getStreams,
  createStream,
  deleteStream,
  cloneStreamConfig,
  startStream,
  pauseStream,
  resumeStream,
  stopStream,
};
