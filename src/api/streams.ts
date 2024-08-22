import axios, { AxiosInstance, AxiosResponse } from "axios";
import { handleApiError } from '@/utils/errorHandler';
import { useCommonStore } from '@/stores/common';
import { Stream } from '@/types/streams';  // Import the Stream interface

const apiClient: AxiosInstance = axios.create({
  baseURL: 'http://127.0.0.1:8020/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

const getStreams = async (): Promise<Stream[]> => {
  const commonStore = useCommonStore();
  try {
    const response: AxiosResponse<Stream[]> = await apiClient.get('/streams', {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const createStream = async (json: Record<string, unknown>): Promise<Stream> => {
  const commonStore = useCommonStore();
  try {
    const response: AxiosResponse<Stream> = await apiClient.post('/streams', json, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const deleteStream = async (id: string): Promise<void> => {
  const commonStore = useCommonStore();
  try {
    await apiClient.delete(`/streams/${id}`, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
  } catch (error) {
    throw handleApiError(error);
  }
};

const cloneStream = async (id: string): Promise<Stream> => {
  const commonStore = useCommonStore();
  try {
    const response: AxiosResponse<Stream> = await apiClient.put(`/streams/${id}/clone`, null, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const startStream = async (id: string): Promise<Stream> => {
  const commonStore = useCommonStore();
  try {
    const response: AxiosResponse<Stream> = await apiClient.post(`/streams/${id}/start`, null, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const pauseStream = async (id: string): Promise<Stream> => {
  const commonStore = useCommonStore();
  try {
    const response: AxiosResponse<Stream> = await apiClient.post(`/streams/${id}/pause`, null, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const resumeStream = async (id: string): Promise<Stream> => {
  const commonStore = useCommonStore();
  try {
    const response: AxiosResponse<Stream> = await apiClient.post(`/streams/${id}/resume`, null, {
      headers: { 'X-API-Key': commonStore.apiKey }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const stopStream = async (id: string): Promise<Stream> => {
  const commonStore = useCommonStore();
  try {
    const response: AxiosResponse<Stream> = await apiClient.post(`/streams/${id}/stop`, null, {
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
  pauseStream,
  resumeStream,
  stopStream,
};
