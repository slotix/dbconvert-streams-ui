import { useConnectionsStore } from '@/stores/connections.js'
import { useModalStore } from '@/stores/modalStore.js'
import { mapState, mapActions } from "pinia";

export default {
  setup() {
    const dbTypesData = useConnectionsStore();
    const dbTypes = dbTypesData.dbTypes;
    return {
      dbTypes
    };
  },
  computed: {
    ...mapState(useConnectionsStore, ['connectionsByType', 'currentConnection', 'currentStep']),
    connectionsCount() {
      return connectionsByType.length
    },
    logoSrc() {
      let dbType = this.dbTypes.filter(f => {
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
      if (this.connection.host === undefined && this.connection.port === undefined) return ''
      return (this.connection.host || '') + (this.connection.port !== undefined ? `:${this.connection.port}` : '')
    },
    selected() {
      if (!this.currentConnection) return false;
      if (this.connection.id === this.currentConnection.id) {
        return true;
      }
      return false;
    },
    highlightSelected() {
      //isSelectable && selected && currentStep.name === 'source',
      if (!this.isSelectable) return "";
      if (this.selected && this.currentStep) return this.currentStep.name;
      return "";
    }
  },
  methods: {
    ...mapActions(useConnectionsStore, [
      "deleteConnection",
      "setCurrentConnection",
      "cloneCurrentConnection",
      "refreshConnections"
    ]),
    addConnection() {
      useModalStore().openModal('Save')
    },
    editConnection() {
      this.setCurrentConnection(this.connection.id);
      useModalStore().openModal('Update')
    },
    cloneConnection() {
      this.setCurrentConnection(this.connection.id);
      this.cloneCurrentConnection();
      useModalStore().openModal('Update')
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
      this.setCurrentConnection(this.connection.id);
    },
  }
};
