import ConnectionName from './ConnectionName.vue';
import {DIALOG_TYPES, useCommonStore} from '@/stores/common.js';
import {useConnectionsStore} from '@/stores/connections.js';
import {mapWritableState} from 'pinia';
import PasswordBox from '@/components/common/PasswordBox.vue';
import ItemsCombo from '@/components/common/ItemsCombo.vue';
import {ArrowPathIcon, PlusIcon} from '@heroicons/vue/24/solid';
import api from '@/api/connections.js';

export default {
  components: {
    ConnectionName,
    PasswordBox,
    ArrowPathIcon,
    PlusIcon,
    ItemsCombo,
  },
  mounted () {
    if (this.dlgTp === DIALOG_TYPES.SAVE) {
      this.connection.name = this.buildConnectionName;
    }
    this.connection.type = this.connectionType;
  },
  activated () {
    if (this.dlgTp === DIALOG_TYPES.SAVE) {
      this.currentConnection = this.connection;
    } else {
      this.connection = this.currentConnection;
    }
  },
  computed: {
    ...mapWritableState (useConnectionsStore, ['currentConnection']),
    buildConnectionName () {
      return (
        this.connectionType +
        '-' +
        this.connection.host +
        '-' +
        this.connection.username
      );
    },
    dlgTp () {
      return useCommonStore ().dlgType;
    },
  },
  watch: {
    'connection.host': function () {
      if (this.dlgTp === DIALOG_TYPES.SAVE) {
        this.connection.name = this.buildConnectionName;
      }
    },
    'connection.username': function () {
      if (this.dlgTp === DIALOG_TYPES.SAVE) {
        this.connection.name = this.buildConnectionName;
      }
    },
    connection: {
      handler () {
        this.currentConnection = this.connection;
      },
      deep: true,
    },
  },
  methods: {
    //for postgres only
    async refreshSchemas () {
      try {
        const schemas = await api.getSchemas (this.currentConnection.id);
        this.currentConnection.schemas = schemas;
        // this.connection.schema= schemas[0];
        console.log (this.currentConnection.schemas);
      } catch (err) {
        useCommonStore ().showNotification (err.message);
      }
    },
    async refreshDatabases () {
      try {
        const databases = await api.getDatabases (this.currentConnection.id);
        this.currentConnection.databases = databases;
      } catch (err) {
        useCommonStore ().showNotification (err.message);
      }
    },

    async createDatabase (newDatabase) {
      try {
        await api.createDatabase (newDatabase, this.currentConnection.id);
        this.currentConnection.databases.push (newDatabase);
        this.currentConnection.database = newDatabase;
        useCommonStore ().showNotificationBar = false;
        useCommonStore ().showNotification (
          (msg = 'Database created'),
          (type = 'success')
        );
        this.refreshDatabases ();
      } catch (err) {
        useCommonStore ().showNotificationBar = false;
        useCommonStore ().showNotification (err.message);
      }
    },

    async createSchema (newSchema) {
      try {
        await api.createSchema (newSchema, this.currentConnection.id);
        this.currentConnection.schemas.push (newSchema);
        this.currentConnection.schema = newSchema;
        useCommonStore ().showNotificationBar = false;

        useCommonStore ().showNotification (
          (msg = 'Schema created'),
          (type = 'success')
        );
        this.refreshSchemas ();
      } catch (err) {
        useCommonStore ().showNotificationBar = false;
        useCommonStore ().showNotification (err.message);
      }
    },
  },
};
