import axios from "axios";

const createConnection = async (json) => {
  try {
    const response = await axios.post(
      "http://0.0.0.0:8020/api/v1/connections",
      json,
    );
    return response.data;
  } catch (error) {
    const err = error.response?.data.error || error.message;
    throw new Error(err);
  }
};

const updateConnection = async (id, json) => {
  try {
    const response = await axios.put(
      `http://0.0.0.0:8020/api/v1/connections/${id}`,
      json,
    );
    // Handle the response
    // console.log(response.data);
    // Optionally, you can update the current connection in the store if needed
    // useConnectionsStore().updateCurrentConnection(response.data);
    return response.data; // You can return the updated connection data or any other relevant information.
  } catch (error) {
    // Handle the error
    const err = error.response?.data.error || error.message;
    throw new Error(err);
  }
};

const testConnection = async (id) => {
  try {
    const response = await axios.get(
      `http://0.0.0.0:8020/api/v1/connections/${id}/ping`,
    );
    if (response.data.ping === "ok") {
      const status = "Connection Test Passed";
      return status;
    }
  } catch (error) {
    const err = error.response?.data.error || error.message;
    throw new Error(err);
  }
};
const getSchemas = async (id) => {
  try {
    const response = await axios.get(
      `http://0.0.0.0:8020/api/v1/connections/${id}/schemas`,
    );
    if (response.data) {
      return response.data;
    }
  } catch (error) {
    const err = error.response?.data.error || error.message;
    throw new Error(err);
  }
};

const getDatabases = async (id) => {
  try {
    const response = await axios.get(
      `http://0.0.0.0:8020/api/v1/connections/${id}/databases`,
    );
    if (response.data) {
      return response.data;
    }
  } catch (error) {
    const err = error.response?.data.error || error.message;
    throw new Error(err);
  }
};

const createDatabase = async (newDatabase, id) => {
  try {
    await axios.post(
      `http://0.0.0.0:8020/api/v1/connections/${id}/databases`,
      newDatabase,
      {
        headers: {
          "Content-Type": "text/plain", // Set the content type to plain text
        },
      },
    );
    connection.databases.push(newDatabase);
    connection.database = newDatabase;
  } catch (error) {
    const err = error.response?.data.error || error.message;
    throw new Error(err);
  }
};

const createSchema = async (newSchema, id) => {
  try {
    await axios.post(
      `http://0.0.0.0:8020/api/v1/connections/${id}/schemas`,
      newSchema,
      {
        headers: {
          "Content-Type": "text/plain", // Set the content type to plain text
        },
      },
    );
    connection.schemas.push(newSchema);
    connection.schema = newSchema;
  } catch (error) {
    const err = error.response?.data.error || error.message;
    throw new Error(err);
  }
};

const getMeta = async (id) => {
  try {
    const response = await axios.get(
      `http://0.0.0.0:8020/api/v1/connections/${id}/meta`,
    );
    if (response.data) {
      console.log(response.data);
      return response.data;
    }
  } catch (error) {
    const err = error.response?.data.error || error.message;
    throw new Error(err);
  }
};

const getTables = async (id) => {
  try {
    const response = await axios.get(
      `http://0.0.0.0:8020/api/v1/connections/${id}/tables`,
    );

    if (response.data) {
      // console.log(response.data);
      return response.data;
    }
  } catch (error) {
    const err = error.response?.data.error || error.message;
    throw new Error(err);
  }
};
export default {
  createConnection,
  updateConnection,
  testConnection,
  getSchemas,
  getDatabases,
  createDatabase,
  createSchema,
  getMeta,
  getTables,
};
