import ConnectionName from "./ConnectionName.vue";
import { DIALOG_TYPES, useSettingsStore } from "@/stores/settings.js";
import { useConnectionsStore } from "@/stores/connections.js";
import { mapWritableState } from "pinia";
import PasswordBox from "@/components/common/PasswordBox.vue";
import { ArrowPathIcon } from "@heroicons/vue/24/solid";

export default {
  components: { ConnectionName, PasswordBox, ArrowPathIcon },
  mounted() {
    if (this.dlgTp === DIALOG_TYPES.SAVE) {
      this.connection.name = this.buildConnectionName;
    }
    this.connection.type = this.connectionType;
  },
  activated() {
    if (this.dlgTp === DIALOG_TYPES.SAVE) {
      this.currentConnection = this.connection;
    } else {
      this.connection = this.currentConnection;
    }
  },
  computed: {
    ...mapWritableState(useConnectionsStore, ["currentConnection"]),
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
      return useSettingsStore().dlgType;
    },
  },
  watch: {
    "connection.host": function () {
      if (this.dlgTp === DIALOG_TYPES.SAVE) {
        this.connection.name = this.buildConnectionName;
      }
    },
    "connection.userName": function () {
      if (this.dlgTp === DIALOG_TYPES.SAVE) {
        this.connection.name = this.buildConnectionName;
      }
    },
    connection: {
      handler() {
        this.currentConnection = this.connection;
      },
      deep: true,
    }
  }
}
