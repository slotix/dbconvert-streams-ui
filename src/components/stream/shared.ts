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
import { useStreamsStore } from '@/stores/streams';
import { useConnectionsStore } from '@/stores/connections';
import { useCommonStore } from '@/stores/common';
import ActionsMenu from '@/components/common/ActionsMenu.vue';
import { defineComponent, PropType } from 'vue';
import { Stream } from '@/types/streams';
import { DbType } from '@/types/connections';

export default defineComponent({
  props: {
    stream: {
      type: Object as PropType<Stream>,
      required: true,
    },
    source: {
      required: true,
    },
    target: {
      required: true,
    },
  },
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
    const dbTypes = useConnectionsStore().dbTypes;
    const steps = useCommonStore().steps;
    return {
      dbTypes,
      steps,
    };
  },
  methods: {
    ...mapActions(useCommonStore, ['getViewType']),
    editStream() {
      this.selectStream();
      this.$router.push({ name: 'ManageStream', params: { mode: 'edit' } });
    },
    async deleteStream() {
      try {
        await useStreamsStore().deleteStream(this.stream.id);
        await useStreamsStore().refreshStreams();
        useCommonStore().showNotification('Stream deleted', 'success');
      } catch (e: unknown) {
        if (e instanceof Error) {
          useCommonStore().showNotification(e.message, 'error');
        } else {
          useCommonStore().showNotification('An unknown error occurred', 'error');
        }
        console.log(e);
      }
    },

    async cloneStream() {
      try {
        await useStreamsStore().cloneStream(this.stream.id);
        await useStreamsStore().refreshStreams();
        useCommonStore().showNotification('Stream cloned', 'success');
      } catch (e: unknown) {
        if (e instanceof Error) {
          useCommonStore().showNotification(e.message, 'error');
        } else {
          useCommonStore().showNotification('An unknown error occurred', 'error');
        }
        console.log(e);
      }
    },
    selectStream() {
      useStreamsStore().setCurrentStream(this.stream.id);
    },
    async startStream() {
      try {
        await useStreamsStore().startStream(this.stream.id);
        useCommonStore().showNotification('Stream started', 'success');
        this.$router.push({ name: 'MonitorStream' });
      } catch (err: unknown) {
        if (err instanceof Error) {
          useCommonStore().showNotification(err.message, 'error');
        } else {
          useCommonStore().showNotification('An unknown error occurred', 'error');
        }
      }
    },
  },
  computed: {
    ...mapState(useStreamsStore, ['currentStream']),
    streamCreated(): string {
      if (!this.stream || typeof this.stream.created !== 'number') return '';
      const date = new Date(this.stream.created * 1000);
      return date.toLocaleDateString() + ' - ' + date.toLocaleTimeString();
    },
    logoSrc(): (tp: string) => string {
      return (tp: string) => {
        const dbType = this.dbTypes.find((f: DbType) => f.type === tp);
        return dbType ? dbType.logo : '';
      };
    },
    index(): number {
      return useStreamsStore().currentStreamIndexInArray;
    },
    rowCount(): number {
      return useStreamsStore().countStreams;
    },
    actionsMenuPosition(): string {
      if (useCommonStore().currentViewType === 'cards') {
        return 'card';
      }
      const index = this.index;
      const rowCount = this.rowCount;
      return index > rowCount / 2 ? 'top' : 'bottom';
    },
    streamNameWithId(): string {
      if (!this.stream) return '';
      return `ID: ${this.stream.id}`;
    },

    displayedTables(): string[] {
      const maxDisplayedTables = 5; // Adjust this number as needed
      if (this.stream && this.stream.tables && this.stream.tables.length) {
        return this.stream.tables.slice(0, maxDisplayedTables).map(table => table.name);
      }
      return [];
    },

    remainingTablesCount(): number {
      if (this.stream && this.stream.tables) {
        return Math.max(0, this.stream.tables.length - this.displayedTables.length);
      }
      return 0;
    },
  },
  async mounted() {
    await this.getViewType();
  },
});
