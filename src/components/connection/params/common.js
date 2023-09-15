import ConnectionName from "./ConnectionName.vue";
import { DIALOG_TYPES, useSettingsStore } from "@/stores/settings.js";
import { useConnectionsStore } from "@/stores/connections.js";
import { mapWritableState } from "pinia";
import PasswordBox from "@/components/common/PasswordBox.vue";
import ItemsCombo from "./ItemsCombo.vue";
import { ArrowPathIcon } from "@heroicons/vue/24/solid";
import api from "@/api/connections.js";

export default {
  components: { ConnectionName, PasswordBox, ArrowPathIcon, ItemsCombo },
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
    },
  },
  methods: {
    //for postgres only
    async refreshSchemas() {
      try {
        const schemas = await api.refreshSchemas();
        this.schemas = schemas;
        // this.connection.schema= schemas[0];
        console.log(this.schemas);
      } catch (error) {
        useSettingsStore().showNotificationBar = false;
        useSettingsStore().notificationBar = {
          msg: "Error: " + error.message,
          type: "error",
        };
        useSettingsStore().showNotificationBar = true;
      }
    },
    async refreshDatabases() {
      try {
        const databases = await api.refreshDatabases();
        this.databases = databases;
        console.log(this.databases);
      } catch (error) {
        useSettingsStore().showNotificationBar = false;
        useSettingsStore().notificationBar = {
          msg: "Error: " + error.message,
          type: "error",
        };
        useSettingsStore().showNotificationBar = true;
      }
    },

    async createDatabase() {
      try {
        await api.createDatabase();
        useSettingsStore().showNotificationBar = false;
        useSettingsStore().notificationBar = {
          msg: "Database created",
          type: "success",
        };
        useSettingsStore().showNotificationBar = true;
      } catch (error) {
        useSettingsStore().showNotificationBar = false;
        useSettingsStore().notificationBar = {
          msg: "Error: " + error.message,
          type: "error",
        };
        useSettingsStore().showNotificationBar = true;
      }
    },
  },
};
