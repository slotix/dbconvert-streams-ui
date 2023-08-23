import { useConnectionsStore } from "@/stores/connections.js";
import { useStreamsStore } from "@/stores/streams.js";
import { useModalStore } from "@/stores/modalStore.js";
import { mapActions, mapState } from "pinia";

export default {
  setup() {
    const dbTypesData = useConnectionsStore();
    const dbTypes = dbTypesData.dbTypes;
    return {
      dbTypes,
    };
  },

  computed: {
    ...mapState(useConnectionsStore, [
      "connectionsByType",
      "sourceConnection",
      "targetConnection",
      "currentStep",
    ]),
    ...mapState(useStreamsStore, ["currentStep", "currentStream"]),
    connectionsCount() {
      return connectionsByType.length;
    },
    logoSrc() {
      let dbType = this.dbTypes.filter((f) => {
        return f.type === this.connection.type;
      });
      return dbType[0].logo;
    },
    connectionCreated() {
      let date = new Date(this.connection.id);
      return date.toLocaleDateString() + " - " + date.toLocaleTimeString();
      //return date.toUTCString();
    },

    concatenateValues() {
      const { host, port } = this.connection;
      return (host || "") + (port ? `:${port}` : "");
    },

    selected() {
      let isSource = this.currentStep.name === "source";
      return (isSource ? this.sourceConnection : this.targetConnection) &&
        this.connection.id ===
        (isSource ? this.sourceConnection.id : this.targetConnection.id);
    },
    bgRowClass() {
      return (connection) => {
        const isSourceTab = this.isStreamsTab && this.currentStep.name === "source";
        const isTargetTab = this.isStreamsTab && this.currentStep.name === "target";
        const isMatchingSourceConnection = isSourceTab && this.sourceConnection && this.sourceConnection.id === connection.id;
        const isMatchingTargetConnection = isTargetTab && this.targetConnection && this.targetConnection.id === connection.id;

        return {
          "bg-yellow-50 ": isMatchingSourceConnection,
          "bg-green-50 ": isMatchingTargetConnection,
          "hover:bg-yellow-50 ": isSourceTab,
          "hover:bg-green-50 ": isTargetTab,
          "hover:bg-gray-50 ": !this.isStreamsTab,
        };
      };
    },
  },
  methods: {
    ...mapActions(useConnectionsStore, [
      "deleteConnection",
      "setCurrentConnection",
      "cloneCurrentConnection",
      "refreshConnections",
    ]),
    addConnection() {
      useModalStore().openModal("Save");
    },
    editConnection() {
      this.setCurrentConnection(this.connection.id);
      useModalStore().openModal("Update");
    },
    cloneConnection() {
      this.setCurrentConnection(this.connection.id);
      this.cloneCurrentConnection();
      useModalStore().openModal("Update");
    },
    async deleteConn(id) {
      try {
        await this.deleteConnection(id);
        await this.refreshConnections();
      } catch (e) {
        console.log(e);
      }
    },
    selectConnection() {
      const { currentStep, currentStream, connection } = this;
      const { id } = connection;
      const { name: step } = currentStep || {};

      if (this.isStreamsTab) {
        if (step === "source") {
          currentStream.source = id;
        }
        if (step === "target") {
          currentStream.target = id;
        }
      }

      currentStream.currentConnection = id;
      this.setCurrentConnection(id, step);
    }
  },
};
