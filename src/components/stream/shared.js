import {
  CalendarIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  PencilIcon,
  Square2StackIcon,
  TrashIcon,
} from "@heroicons/vue/24/outline";
import { useStreamsStore } from "@/stores/streams.js";
import { useConnectionsStore } from "@/stores/connections.js";
export default {
  props: {
    stream: {
      type: Object,
      required: true,
    },
    source: {
      type: Object,
      required: true,
    },
    target: {
      type: Object,
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
  },
  setup() {
    const dbTypes = useConnectionsStore().dbTypes;
    return {
      dbTypes,
    };
  },
  methods: {
    async deleteStream(id) {
      try {
        await useStreamsStore().deleteStream(id);
        await useStreamsStore().refreshStreams();
      } catch (e) {
        console.log(e);
      }
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
  },
};
