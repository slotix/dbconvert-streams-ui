import {
  CalendarIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  PencilIcon,
  PlayIcon,
  Square2StackIcon,
  TrashIcon,
} from '@heroicons/vue/24/solid';
import {mapActions, mapState} from 'pinia';
import {useStreamsStore} from '@/stores/streams.js';
import {useConnectionsStore} from '@/stores/connections.js';
import {useCommonStore} from '@/stores/common.js';
import ActionsMenu from '@/components/common/ActionsMenu.vue';
import {useClerk} from 'vue-clerk';

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
  setup () {
    const dbTypes = useConnectionsStore ().dbTypes;
    const steps = useCommonStore ().steps;
    const clerk = useClerk ();
    return {
      dbTypes,
      steps,
      clerk,
    };
  },
  methods: {
    ...mapActions (useCommonStore, ['getViewType']),
    async getToken () {
      const token = await this.clerk.session.getToken ();
      return token;
    },
    editStream () {
      this.selectStream ();
      this.$router.push ({name: 'ManageStream', params: {mode: 'edit'}});
    },
    async deleteStream () {
      try {
        const token = await this.getToken ();
        await useStreamsStore ().deleteStream (this.stream.id, token);
        await useStreamsStore ().refreshStreams (token);
      } catch (e) {
        console.log (e);
      }
    },

    async cloneStream () {
      try {
        // useStreamsStore ().setCurrentStream (this.stream.id);
        const token = await this.getToken();
        await useStreamsStore ().cloneStream (this.stream.id, token);
        await useStreamsStore ().refreshStreams (token);
      } catch (e) {
        console.log (e);
      }
    },
    selectStream () {
      useStreamsStore ().setCurrentStream (this.stream.id);
    },
    async startStream () {
      try {
        const token = await this.getToken ();
        await useStreamsStore ().startStream (this.stream.id, token);
      } catch (err) {
        useCommonStore ().showNotification (err.message);
      }
    },
  },
  computed: {
    ...mapState (useStreamsStore, ['currentStream']),
    streamCreated () {
      let date = new Date (this.stream.created * 1000);
      return date.toLocaleDateString () + ' - ' + date.toLocaleTimeString ();
      // return date.toUTCString();
    },
    logoSrc () {
      return tp => {
        let dbType = this.dbTypes.filter (f => {
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
    index () {
      return useStreamsStore ().currentStreamIndexInArray;
    },
    rowCount () {
      return useStreamsStore ().countStreams;
    },
    actionsMenuPosition () {
      if (useCommonStore ().currentViewType === 'cards') {
        return 'card';
      }
      const index = this.index;
      const rowCount = this.rowCount;

      return index > rowCount / 2 ? 'top' : 'bottom';
    },
  },
  async mounted () {
    await this.getViewType ();
  },
};
