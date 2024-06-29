import axios from "axios";
import { handleApiError } from '@/utils/errorHandler';

const apiClient = axios.create({
  baseURL: 'http://0.0.0.0:8020/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});


const getApiKey = async (token) => {
  try {
    const response = await apiClient.get('/get-api-key', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.apiKey;
  } catch (error) {
    throw handleApiError(error);
  }
};
export default { getApiKey };
