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
import { useCommonStore } from '@/stores/common';
import ActionsMenu from '@/components/common/ActionsMenu.vue';

export default {
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
  setup() {
    const connectionsStore = useConnectionsStore();
    const streamsStore = useStreamsStore();
    const commonStore = useCommonStore();
    const dbTypes = connectionsStore.dbTypes;
    const steps = commonStore.steps;

    return {
      dbTypes,
      steps,
      connectionsStore,
      streamsStore,
      commonStore,
    };
  },
  computed: {
    ...mapState(useConnectionsStore, ['connectionsByType', 'currentConnection', 'currentStep']),
    ...mapState(useStreamsStore, ['currentStep', 'currentStream']),
    connectionsCount() {
      return this.connectionsByType.length;
    },
    logoSrc() {
      let dbType = this.dbTypes.filter(f => {
        return f.type === this.connection.type;
      });
      return dbType[0].logo;
    },
    connectionCreated() {
      const milliseconds = this.connection.created * 1000;
      const date = new Date(milliseconds);
      return date.toLocaleDateString() + ' - ' + date.toLocaleTimeString();
    },
    concatenateValues() {
      if (this.connection.host === undefined && this.connection.port === undefined) return '';
      return (this.connection.host || '') + (this.connection.port !== undefined ? `:${this.connection.port}` : '');
    },
    selected() {
      if (!this.isStreamsTab) {
        return false;
      }

      const isSourceStreamSelected = this.currentStep.name === 'source' && this.currentStream.source === this.connection.id;
      const isTargetStreamSelected = this.currentStep.name === 'target' && this.currentStream.target === this.connection.id;

      return isSourceStreamSelected || isTargetStreamSelected;
    },
    bgRowClass() {
      return connection => ({
        'hover:bg-gray-50': !this.isStreamsTab,
        'bg-yellow-50': this.isStreamsTab && this.currentStep?.name === 'source' && this.currentStream?.source === connection.id,
        'bg-green-50': this.isStreamsTab && this.currentStep?.name === 'target' && this.currentStream?.target === connection.id,
        'hover:bg-yellow-50': this.isStreamsTab && this.currentStep?.name === 'source',
        'hover:bg-green-50': this.isStreamsTab && this.currentStep?.name === 'target',
      });
    },
    actionsMenuPosition() {
      const index = this.connectionsStore.currentConnectionIndexInArray;
      const rowCount = this.connectionsStore.countConnections;
      return index > rowCount / 2 ? 'top' : 'bottom';
    },
  },
  methods: {
    ...mapActions(useConnectionsStore, ['setCurrentConnection', 'saveConnection']),
    addConnection() {
      this.commonStore.openModal('Save');
    },
    editConnection() {
      this.setCurrentConnection(this.connection.id);
      this.commonStore.openModal('Update');
    },
    async cloneConnection() {
      this.setCurrentConnection(this.connection.id);
      try {
        await this.connectionsStore.cloneConnection(this.connection.id);
        await this.connectionsStore.refreshConnections();
      } catch (e) {
        console.log(e);
      }
    },
    async deleteConn() {
      try {
        await this.connectionsStore.deleteConnection(this.connection.id);
        await this.connectionsStore.refreshConnections();
      } catch (e) {
        console.log(e);
      }
    },
    selectConnection() {
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
};