import { useConnectionsStore } from "@/stores/connections.js";
import { useStreamsStore } from "@/stores/streams.js";
import { useSettingsStore } from "@/stores/settings.js";
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
      "currentConnection",
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
      if (
        this.connection.host === undefined && this.connection.port === undefined
      ) return "";
      return (this.connection.host || "") +
        (this.connection.port !== undefined ? `:${this.connection.port}` : "");
    },
    selected() {
      if (!this.isStreamsTab) {
        return false;
      }

      const isSourceStreamSelected = this.currentStep.name === "source" &&
        this.currentStream.source === this.connection.id;

      const isTargetStreamSelected = this.currentStep.name === "target" &&
        this.currentStream.target === this.connection.id;

      return isSourceStreamSelected || isTargetStreamSelected;
    },
    bgRowClass() {
      return (connection) => ({
        "hover:bg-gray-50": !this.isStreamsTab,
        "bg-yellow-50": this.isStreamsTab && this.currentStep?.name === "source" && this.currentStream?.source === connection.id,
        "bg-green-50": this.isStreamsTab && this.currentStep?.name === "target" && this.currentStream?.target === connection.id,
        "hover:bg-yellow-50": this.isStreamsTab && this.currentStep?.name === "source",
        "hover:bg-green-50": this.isStreamsTab && this.currentStep?.name === "target",
      });
    },
    actionsMenuPosition() {
      const index = useConnectionsStore().currentConnectionIndexInArray;
      const rowCount = useConnectionsStore().countConnections;

      return index >= rowCount / 2 ? "top" : "bottom";
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
      useSettingsStore().openModal("Save");
    },
    editConnection() {
      this.setCurrentConnection(this.connection.id);
      useSettingsStore().openModal("Update");
    },
    async cloneConnection() {
      this.setCurrentConnection(this.connection.id);
      try {
        await this.cloneCurrentConnection();
        await this.refreshConnections();
      } catch (e) {
        console.log(e);
      }
      // useSettingsStore().openModal("Update");
    },
    async deleteConn() {
      try {
        await this.deleteConnection(this.connection.id);
        await this.refreshConnections();
      } catch (e) {
        console.log(e);
      }
    },
    selectConnection() {
      this.setCurrentConnection(this.connection.id);
      // Stream
      if (this.currentStep?.name === "source") {
        if (this.currentStream) {
          this.currentStream.source = this.connection.id;
          // console.log(this.currentStream);
        }
      }
      if (this.currentStep?.name === "target") {
        if (this.currentStream) {
          this.currentStream.target = this.connection.id;
        }
      }
    },
  },
};
