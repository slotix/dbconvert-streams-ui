import { useConnectionsStore } from '@/stores/connections.js'
import { useStreamsStore } from '@/stores/streams.js'
import { useModalStore } from '@/stores/modalStore.js'
import { mapState, mapActions } from "pinia";

export default {
  setup() {
    const dbTypesData = useConnectionsStore();
    const dbTypes = dbTypesData.dbTypes;
    return {
      dbTypes,
    };
  },
  computed: {
    ...mapState(useConnectionsStore, ['connectionsByType', 'currentConnection', 'currentStep']),
    ...mapState(useStreamsStore, ['currentStep', 'currentStream']),
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
      return this.currentConnection && this.connection.id === this.currentConnection.id;
    },
    bgRowClass() {
      return connection => ({
        'bg-yellow-50 ': this.isStreamsTab && this.currentStep.name === 'source' && this.currentConnection && this.currentConnection.id === connection.id,
        'bg-green-50 ': this.isStreamsTab && this.currentStep.name === 'target' && this.currentConnection && this.currentConnection.id === connection.id,
        'hover:bg-yellow-50 ': this.isStreamsTab && this.currentStep.name === 'source',
        'hover:bg-green-50 ': this.isStreamsTab && this.currentStep.name === 'target',
        'hover:bg-gray-50 ': !this.isStreamsTab
      });
    },
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
    // handleSelectedModeUpdate(mode) {
      // (mode) => console.log(currentConnection)
      // console.log(this.currentConnection, mode);
      // this.currentStream.mode = mode
      // console.log(this.currentStream);
    // },
    selectConnection() {
      this.setCurrentConnection(this.connection.id);
      // Stream
      if (this.isStreamsTab && this.currentStep.name === 'source') {
        if (this.currentStream) {
          this.currentStream.source = this.connection.id;
          // console.log(this.currentStream);
        }
      }
      if (this.isStreamsTab && this.currentStep.name === 'target') {
        if (this.currentStream) {
          this.currentStream.target = this.connection.id;
        }
      }
    },
  }
};
