import {
  CalendarIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  PencilIcon,
  PlayIcon,
  Square2StackIcon,
  TrashIcon,
} from '@heroicons/vue/24/solid';
import { mapActions, mapState } from 'pinia';
import { useConnectionsStore } from '@/stores/connections';
import { useStreamsStore } from '@/stores/streams';
import { useCommonStore, DIALOG_TYPES } from '@/stores/common';
import ActionsMenu from '@/components/common/ActionsMenu.vue';
import { defineComponent, computed, ref, PropType } from 'vue';
import { Connection, DbType } from '@/types/connections';

export default defineComponent({
  components: {
    PencilIcon,
    Square2StackIcon,
    TrashIcon,
    CalendarIcon,
    CheckCircleIcon,
    ChevronRightIcon,
    PlayIcon,
    ActionsMenu,
  },
  props: {
    connection: {
      type: Object as PropType<Connection>,
    }
  },
  setup(props) {
    const connectionsStore = useConnectionsStore();
    const streamsStore = useStreamsStore();
    const commonStore = useCommonStore();
    const dbTypes = ref<DbType[]>(connectionsStore.dbTypes);
    const steps = ref(commonStore.steps);

    const isStreamsPage = computed(() => commonStore.isStreamsPage);

    return {
      dbTypes,
      steps,
      connectionsStore,
      streamsStore,
      commonStore,
      isStreamsPage,
      connection: props.connection
    };
  },
  computed: {
    ...mapState(useConnectionsStore, {
      connectionsByType: 'connectionsByType',
      currentConnection: 'currentConnection',
    }),
    ...mapState(useStreamsStore, {
      currentStep: 'currentStep',
      currentStream: 'currentStream'
    }),
    connectionsCount(): number {
      return this.connectionsByType.length;
    },
    logoSrc(): string {
      const dbType = this.dbTypes.find((f) => f.type === this.connection?.type);
      return dbType ? dbType.logo : '';
    },
    connectionCreated(): string {
      if (!this.connection || typeof this.connection.created !== 'number') return '';
      const milliseconds = this.connection.created * 1000;
      const date = new Date(milliseconds);
      return date.toLocaleDateString() + ' - ' + date.toLocaleTimeString();
    },
    concatenateValues(): string {
      if (!this.connection) return '';
      const { host, port } = this.connection;
      if (host === undefined && port === undefined) return '';
      return (host || '') + (port !== undefined ? `:${port}` : '');
    },
    selected(): boolean {
      if (!this.isStreamsPage) {
        return false;
      }
      const isSourceStreamSelected =
        this.currentStep?.name === 'source' && this.currentStream?.source === this.connection?.id;
      const isTargetStreamSelected =
        this.currentStep?.name === 'target' && this.currentStream?.target === this.connection?.id;

      return isSourceStreamSelected || isTargetStreamSelected;
    },
    bgRowClass(): (connection: Connection) => object {
      return (connection: Connection) => ({
        'hover:bg-gray-50': !this.isStreamsPage,
        'bg-yellow-50': this.isStreamsPage && this.currentStep?.name === 'source' && this.currentStream?.source === connection.id,
        'bg-green-50': this.isStreamsPage && this.currentStep?.name === 'target' && this.currentStream?.target === connection.id,
        'hover:bg-yellow-50': this.isStreamsPage && this.currentStep?.name === 'source',
        'hover:bg-green-50': this.isStreamsPage && this.currentStep?.name === 'target',
      });
    },
    actionsMenuPosition(): string {
      const index = this.connectionsStore.currentConnectionIndexInArray;
      const rowCount = this.connectionsStore.countConnections;
      return index > rowCount / 2 ? 'top' : 'bottom';
    },
  },
  methods: {
    ...mapActions(useConnectionsStore, ['setCurrentConnection', 'saveConnection']),
    addConnection(): void {
      this.commonStore.openModal(DIALOG_TYPES.SAVE);
    },
    editConnection(): void {
      if (this.connection) {
        this.setCurrentConnection(this.connection.id);
        this.commonStore.openModal(DIALOG_TYPES.UPDATE);
      }
    },
    async cloneConnection(): Promise<void> {
      if (!this.connection) return;
      this.setCurrentConnection(this.connection.id);
      try {
        await this.connectionsStore.cloneConnection(this.connection.id);
        await this.connectionsStore.refreshConnections();
        this.commonStore.showNotification('Connection cloned', 'success');
      } catch (e: unknown) {
        if (e instanceof Error) {
          this.commonStore.showNotification(e.message, 'error');
        } else {
          this.commonStore.showNotification('An unknown error occurred', 'error');
        }
        console.error(e);
      }
    },
    async deleteConn(): Promise<void> {
      if (!this.connection) return;
      try {
        await this.connectionsStore.deleteConnection(this.connection.id);
        await this.connectionsStore.refreshConnections();
        this.commonStore.showNotification('Connection deleted', 'success');
      } catch (e: unknown) {
        if (e instanceof Error) {
          this.commonStore.showNotification(e.message, 'error');
        } else {
          this.commonStore.showNotification('An unknown error occurred', 'error');
        }
        console.error(e);
      }
    },

    selectConnection(): void {
      if (!this.connection) return;
      this.setCurrentConnection(this.connection.id);
      if (this.currentStep?.name === 'source') {
        if (this.currentStream) {
          this.currentStream.source = this.connection.id;
        }
      }
      if (this.currentStep?.name === 'target') {
        if (this.currentStream) {
          this.currentStream.target = this.connection.id;
        }
      }
    },
  },
});