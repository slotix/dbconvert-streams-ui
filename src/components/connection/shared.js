import { mapGetters, mapActions } from "vuex";
export default {
  props: {
    connection: {
      type: Object,
      required: true
    },
    isSelectable: {
      type: Boolean,
      required: true,
      default: true
    }
  },
  emits: {
    edit: null,
    clone: null,
    delete: null
  },
  computed: {
    ...mapGetters(['connectionsByType','dbTypes', 'currentConnection', 'currentStep']),
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
    ...mapActions([
      "deleteConnection",
      "setCurrentConnection",
      "cloneCurrentConnection",
      "refreshConnections"
    ]),
    editConnection() {
      this.setCurrentConnection(this.connection.id);
      this.$emit("edit");
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
    cloneConnection() {
      this.setCurrentConnection(this.connection.id);
      this.cloneCurrentConnection();
      this.$emit("edit");
    }
  }
};
