import ConnectionName from "./ConnectionName.vue";
import { useModalStore, DIALOG_TYPES } from '@/stores/modalStore.js'
import { useConnectionsStore } from '@/stores/connections.js'
import { mapWritableState } from 'pinia'

export default {
  components: { ConnectionName },
  mounted() {
    if (this.dlgTp === DIALOG_TYPES.SAVE) {
      this.connection.name = this.buildConnectionName;
    }
    this.connection.type = this.connectionType;
  },
  activated() {
    if (this.dlgTp === DIALOG_TYPES.SAVE) {
      this.currentConnection = this.connection
    } else {
      this.connection = this.currentConnection;
    }
  },
  computed: {
    ...mapWritableState(useConnectionsStore, ['currentConnection']),
    buildConnectionName() {
      return (
        this.connectionType +
        "_" +
        this.connection.host +
        "_" +
        this.connection.userName
      );
    },
    dlgTp() {
      return useModalStore().dlgType
    }
  },
  watch: {
    "connection.host": function() {
    if (this.dlgTp === DIALOG_TYPES.SAVE) {
        this.connection.name = this.buildConnectionName;
      }
    },
    "connection.userName": function() {
    if (this.dlgTp === DIALOG_TYPES.SAVE) {
        this.connection.name = this.buildConnectionName;
      }
    },
    connection: {
      handler() {
        this.currentConnection = this.connection
      },
      deep: true
    }
  }
}
