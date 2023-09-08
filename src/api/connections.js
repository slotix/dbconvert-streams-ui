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
const testConnection = async () => {
  const connection = useConnectionsStore().currentConnection;
  await axios.get(
    `http://0.0.0.0:8020/api/v1/connections/${connection.id}/ping`,
  )
    .then((response) => {
      // Handle the response
      console.log(response.data);
    })
    .catch((error) => {
      // Handle the error
      console.log(error);
    });
};
export default {
  createConnection,
  testConnection,
};
