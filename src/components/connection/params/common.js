import ConnectionName from './ConnectionName.vue';
import PasswordBox from '@/components/common/PasswordBox.vue';
import ItemsCombo from '@/components/common/ItemsCombo.vue';
import {ArrowPathIcon, PlusIcon} from '@heroicons/vue/24/solid';
import {DIALOG_TYPES, useCommonStore} from '@/stores/common';
import {useConnectionsStore} from '@/stores/connections';
import {mapWritableState} from 'pinia';
import api from '@/api/connections';

export default {
  components: {
    ConnectionName,
    PasswordBox,
    ArrowPathIcon,
    PlusIcon,
    ItemsCombo,
  },
  data () {
    return {
      connection: {
        name: '',
        type: '',
        host: '',
        username: '',
        schemas: [],
        databases: [],
        database: '',
        schema: '',
      },
    };
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
    'connection.host': 'updateConnectionName',
    'connection.username': 'updateConnectionName',
    connection: {
      handler () {
        this.currentConnection = this.connection;
      },
      deep: true,
    },
  },
  methods: {
    updateConnectionName () {
      if (this.dlgTp === DIALOG_TYPES.SAVE) {
        this.connection.name = this.buildConnectionName ();
      }
    },
    async fetchData (apiMethod, targetProperty) {
      try {
        const data = await apiMethod (this.currentConnection.id);
        this.currentConnection[targetProperty] = data;
      } catch (err) {
        useCommonStore ().showNotification (err.message);
      }
    },
    async refreshSchemas () {
      await this.fetchData (api.getSchemas, 'schemas');
    },
    async refreshDatabases () {
      await this.fetchData (api.getDatabases, 'databases');
    },
    async createData (apiMethod, newData, targetArray, targetProperty) {
      try {
        await apiMethod (newData, this.currentConnection.id);
        this.currentConnection[targetArray].push (newData);
        this.currentConnection[targetProperty] = newData;
        useCommonStore ().showNotification (
          `${targetProperty} created`,
          'success'
        );
        if (targetProperty === 'database') {
          this.refreshDatabases ();
        } else if (targetProperty === 'schema') {
          this.refreshSchemas ();
        }
      } catch (err) {
        useCommonStore ().showNotification (err.message);
      }
    },
    async createDatabase (newDatabase) {
      await this.createData (
        api.createDatabase,
        newDatabase,
        'databases',
        'database'
      );
    },
    async createSchema (newSchema) {
      await this.createData (api.createSchema, newSchema, 'schemas', 'schema');
    },
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
};
