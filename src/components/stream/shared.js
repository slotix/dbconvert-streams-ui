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
  },
  setup() {
    const dbTypes = useConnectionsStore().dbTypes;
    return {
      dbTypes,
    };
  },
  methods: {
    async deleteStream() {
      try {
        await useStreamsStore().deleteStream(this.stream.id);
        await useStreamsStore().refreshStreams();
      } catch (e) {
        console.log(e);
      }
    },
    selectStream() {
      useStreamsStore().setCurrentStream(this.stream.id);
      console.log(this.stream);
    }
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
