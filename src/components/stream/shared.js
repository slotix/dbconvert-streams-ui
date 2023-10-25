import {
  CalendarIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  PencilIcon,
  PlayIcon,
  Square2StackIcon,
  TrashIcon,
} from "@heroicons/vue/24/solid";
import { mapActions, mapState } from "pinia";
import { useStreamsStore } from "@/stores/streams.js";
import { useConnectionsStore } from "@/stores/connections.js";
import { useSettingsStore } from "@/stores/settings.js";
import ActionsMenu from "@/components/common/ActionsMenu.vue";
import api from "@/api/streams.js";

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
    return {
      dbTypes,
    };
  },
  methods: {
    ...mapActions(useSettingsStore, ["getViewType"]),
    editStream() {
      this.$router.push({ name: "ManageStream", params: { mode: "edit" } });
    },
    async deleteStream() {
      try {
        await api.deleteStream(this.stream.id);
        await useStreamsStore().deleteStream(this.stream.id);
        await useStreamsStore().refreshStreams();
      } catch (e) {
        console.log(e);
      }
    },
    async cloneStream() {
      try {
        useStreamsStore().setCurrentStream(this.stream.id);
        const resp = await api.cloneStream(this.stream.id);
        // this.currentStream.id = stream.id;
        // this.currentStream.created = stream.created;
        this.stream.id = resp.id;
        this.stream.created = resp.created;
        await useStreamsStore().saveStream(this.stream.id);
        await useStreamsStore().refreshStreams();
      } catch (e) {
        console.log(e);
      }
    },
    selectStream() {
      useStreamsStore().setCurrentStream(this.stream.id);
    },
  },
  computed: {
    ...mapState(useStreamsStore, ["currentStream"]),
    streamCreated() {
      let date = new Date(this.stream.created * 1000);
      return date.toLocaleDateString() + " - " + date.toLocaleTimeString();
      // return date.toUTCString();
    },
    logoSrc() {
      return (tp) => {
        let dbType = this.dbTypes.filter((f) => {
          return f.type === tp;
        });
        return dbType[0].logo;
      };
    },
    index() {
      return useStreamsStore().currentStreamIndexInArray;
    },
    rowCount() {
      return useStreamsStore().countStreams;
    },
    actionsMenuPosition() {
      if (useSettingsStore().currentViewType === "cards") {
        return "card";
      }
      const index = this.index;
      const rowCount = this.rowCount;

      return index > rowCount / 2 ? "top" : "bottom";
    },
  },
  async mounted() {
    await this.getViewType();
  },
};
