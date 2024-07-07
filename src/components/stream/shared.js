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

export default {
  props: {
    stream: {
      type: Object,
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
      } catch (e) {
        console.log(e);
      }
    },

    async cloneStream() {
      try {
        // useStreamsStore ().setCurrentStream (this.stream.id);
        await useStreamsStore().cloneStream(this.stream.id);
        await useStreamsStore().refreshStreams();
      } catch (e) {
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
      } catch (err) {
        useCommonStore().showNotification(err.message);
      }
    },
  },
  computed: {
    ...mapState(useStreamsStore, ['currentStream']),
    streamCreated() {
      let date = new Date(this.stream.created * 1000);
      return date.toLocaleDateString() + ' - ' + date.toLocaleTimeString();
      // return date.toUTCString();
    },
    logoSrc() {
      return tp => {
        let dbType = this.dbTypes.filter(f => {
          return f.type === tp;
        });
        return dbType[0].logo;
      };
    },
    // step () {
    //   return name => {
    //     let step = this.steps.filter (step => {
    //       return step.name === name;
    //     });
    //     return step[0];
    //   };
    // },
    index() {
      return useStreamsStore().currentStreamIndexInArray;
    },
    rowCount() {
      return useStreamsStore().countStreams;
    },
    actionsMenuPosition() {
      if (useCommonStore().currentViewType === 'cards') {
        return 'card';
      }
      const index = this.index;
      const rowCount = this.rowCount;

      return index > rowCount / 2 ? 'top' : 'bottom';
    },
  },
  async mounted() {
    await this.getViewType();
  },
};
