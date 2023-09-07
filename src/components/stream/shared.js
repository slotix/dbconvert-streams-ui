import {
  CalendarIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  PencilIcon,
  PlayIcon,
  Square2StackIcon,
  TrashIcon,
} from "@heroicons/vue/24/solid";
import { mapActions } from "pinia";
import { useStreamsStore } from "@/stores/streams.js";
import { useConnectionsStore } from "@/stores/connections.js";
import { useSettingsStore } from "@/stores/settings.js";
import ActionsMenu from "@/components/common/ActionsMenu.vue";
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
        await useStreamsStore().deleteStream(this.stream.id);
        await useStreamsStore().refreshStreams();
      } catch (e) {
        console.log(e);
      }
    },
    async cloneStream() {
      try {
        useStreamsStore().setCurrentStream(this.stream.id);
        await useStreamsStore().cloneStream(this.stream.id);
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
    streamCreated() {
      let date = new Date(this.stream.id);
      return date.toLocaleDateString() + " - " + date.toLocaleTimeString();
      //return date.toUTCString();
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
