import axios from "axios";

const getStreams = async () => {
  try {
    const response = await axios.get(
      "http://0.0.0.0:8020/api/v1/streams",
    );
    return response.data;
  } catch (error) {
    const err = error.response?.data.error || error.message;
    throw new Error(err);
  }
};

const createStream = async (json) => {
  try {
    // console.log(json);
    const response = await axios.post(
      "http://0.0.0.0:8020/api/v1/streams/config",
      json,
    );
    return response.data;
  } catch (error) {
    const err = error.response?.data.error || error.message;
    throw new Error(err);
  }
};

const deleteStream = async (id) => {
  try {
    await axios.delete(
      `http://0.0.0.0:8020/api/v1/streams/${id}`,
    );
  } catch (error) {
    const err = error.response?.data.error || error.message;
    throw new Error(err);
  }
};

const cloneStream = async (id) => {
  try {
    const response = await axios.put(
      `http://0.0.0.0:8020/api/v1/streams/${id}/clone`,
    );
    return response.data;
  } catch (error) {
    const err = error.response?.data.error || error.message;
    throw new Error(err);
  }
};

const startStream = async (id) => {
  try {
    const response = await axios.post(
      `http://0.0.0.0:8020/api/v1/streams/${id}/start`,
    );
    return response.data
  } catch (error) {
    const errMessage = error.response?.data.error || error.message;
    const customErrorMessage =
      `Unable to connect to the API server. ${errMessage}`;
    throw new Error(customErrorMessage);
  }
};

export default {
  getStreams,
  createStream,
  deleteStream,
  cloneStream,
  startStream,
};
