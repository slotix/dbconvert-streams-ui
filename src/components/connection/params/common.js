import ConnectionName from "./ConnectionName.vue";
import { DIALOG_TYPES, useSettingsStore } from "@/stores/settings.js";
import { useConnectionsStore } from "@/stores/connections.js";
import { mapWritableState } from "pinia";
import PasswordBox from "@/components/common/PasswordBox.vue";
import ItemsCombo from "@/components/common/ItemsCombo.vue";
import { ArrowPathIcon, PlusIcon } from "@heroicons/vue/24/solid";
import api from "@/api/connections.js";

export default {
  components: { ConnectionName, PasswordBox, ArrowPathIcon, PlusIcon, ItemsCombo },
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
        const schemas = await api.getSchemas(this.currentConnection.id);
        this.currentConnection.schemas = schemas;
        // this.connection.schema= schemas[0];
        console.log(this.currentConnection.schemas);
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
        const databases = await api.getDatabases(this.currentConnection.id);
        this.currentConnection.databases = databases;
      } catch (error) {
        useSettingsStore().showNotificationBar = false;
        useSettingsStore().notificationBar = {
          msg: "Error: " + error.message,
          type: "error",
        };
        useSettingsStore().showNotificationBar = true;
      }
    },

    async createDatabase(newDatabase) {
      try {
        await api.createDatabase(newDatabase, this.currentConnection.id);
        useSettingsStore().showNotificationBar = false;
        useSettingsStore().notificationBar = {
          msg: "Database created",
          type: "success",
        };
        useSettingsStore().showNotificationBar = true;
        this.getDatabases();
      } catch (error) {
        useSettingsStore().showNotificationBar = false;
        useSettingsStore().notificationBar = {
          msg: "Error: " + error.message,
          type: "error",
        };
        useSettingsStore().showNotificationBar = true;
      }
    },

    async createSchema(newSchema) {
      try {
        await api.createSchema(newSchema, this.currentConnection.id);
        useSettingsStore().showNotificationBar = false;
        useSettingsStore().notificationBar = {
          msg: "Schema created",
          type: "success",
        };
        useSettingsStore().showNotificationBar = true;
        this.getSchemas();
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
