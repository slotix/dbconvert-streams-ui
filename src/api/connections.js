import axios from "axios";
import { useConnectionsStore } from "@/stores/connections";

const createConnection = async () => {
  const connection = useConnectionsStore().currentConnection;
  const json = JSON.stringify(connection);
  await axios.post("http://0.0.0.0:8020/api/v1/connections", json)
    .then((response) => {
      // Handle the response
      console.log(response.data);
    })
    .catch((error) => {
      // Handle the error
      console.log(error);
    });
};

const updateConnection = async () => {
  const connection = useConnectionsStore().currentConnection;
  const json = JSON.stringify(connection);
  
  try {
    const response = await axios.put(
      `http://0.0.0.0:8020/api/v1/connections/${connection.id}`,
      json
    );
    
    // Handle the response
    console.log(response.data);
    
    // Optionally, you can update the current connection in the store if needed
    // useConnectionsStore().updateCurrentConnection(response.data);
    
    return response.data; // You can return the updated connection data or any other relevant information.
  } catch (error) {
    // Handle the error
    console.log(error);
    throw new Error("Failed to update connection");
  }
};

const testConnection = async () => {
  const connection = useConnectionsStore().currentConnection;
  try {
    const response = await axios.get(
      `http://0.0.0.0:8020/api/v1/connections/${connection.id}/ping`,
    );
    if (response.data.ping === "ok") {
      const status = "Connection Test Passed";
      return status;
    }
  } catch (error) {
    const status = error.response.data.error;
    throw new Error(status);
  }
};
const refreshDatabases = async () => {
  const connection = useConnectionsStore().currentConnection;
  try {
    const response = await axios.get(
      `http://0.0.0.0:8020/api/v1/connections/${connection.id}/schemas`,
    );
    if (response.data) {
      return response.data;
    }
  } catch (error) {
    const err = error.response.data.error;
    throw new Error(err);
  }
};

export default {
  createConnection,
  updateConnection,
  testConnection,
  refreshDatabases
};
