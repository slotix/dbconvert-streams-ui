import { defineStore } from "pinia";
import api from "@/api/streams.js";

export const useStreamsStore = defineStore("streams", {
  state: () => ({
    streams: [],
    currentStream: {
      id: "",
      source: "",
      mode: "convert",
      limits: { numberOfEvents: 0, elapsedTime: 0 },
      target: "",
      tables: [],
    },
    currentStep: null,
    currentFilter: "",

    modes: [
      { id: "convert", title: "Copy Data/ Convert" },
      { id: "cdc", title: "Change Data Capture Sync" },
    ],
    operationMap: {
      insert: "Insert",
      update: "Update",
      delete: "Delete",
    },
    // modes: [
    //   {
    //     id: "convert",
    //     title: "Convert",
    //     description: "Copy Data",
    //     img: "/images/projects/copy-data.svg",
    //     imgSmall: "/images/projects/copy-data-round.svg"
    //   },
    //   {
    //     id: "cdc",
    //     type: "CDC Sync",
    //     description: "Synchronization",
    //     img: "/images/projects/synchronization.svg",
    //     imgSmall: "/images/projects/synchronization-round.svg"
    //   }
    // ],
    steps: [
      {
        id: 1,
        name: "source",
        title: "Select Source database",
        description:
          "Lorem ipsum dolor sit amet consectetur adipisicing elit. Aperiam facilis, voluptates error alias dolorem praesentium sit soluta iure incidunt labore explicabo eaque, quia architecto veritatis dolores, enim consequatur nihil ipsum.",
        img: "/images/steps/source-step.svg",
      },
      {
        id: 2,
        name: "streamSettings",
        title: "Configure your stream",
        description:
          "We are fetching the schema of your data source. This should take less than a minute, but may take a few minutes on slow internet connections or data sources with a large amount of tables.",
        img: "/images/steps/settings-step.svg",
      },
      {
        id: 3,
        name: "target",
        title: "Select Target database",
        description:
          "Lorem ipsum dolor sit amet consectetur adipisicing elit. Aperiam facilis, voluptates error alias dolorem praesentium sit soluta iure incidunt labore explicabo eaque, quia architecto veritatis dolores, enim consequatur nihil ipsum.",
        img: "/images/steps/destination-step.svg",
      },
      // {
      //   id: 4,
      //   name: "run",
      //   title: "Run the Stream",
      //   description:
      //     "Lorem ipsum dolor sit amet consectetur adipisicing elit. Aperiam facilis, voluptates error alias dolorem praesentium sit soluta iure incidunt labore explicabo eaque, quia architecto veritatis dolores, enim consequatur nihil ipsum.",
      //   img: "/images/steps/launch-step.svg",
      // },
    ],
  }),
  getters: {
    // allStreams(state) {
    //   return state.streams;
    // },
    countStreams(state) {
      return state.streams.length;
      // .filter((el) => {
      //   return (
      //     el.type &&
      //     el.type.toLowerCase().indexOf(state.currentFilter.toLowerCase()) >
      //     -1
      //   );
      // })
      // .length;
    },
    newestFirst(state) {
      return state.streams.slice().reverse();
    },
    streamsByType(state) {
      return state.streams
        .filter(function (el) {
          return (
            el.type &&
            el.type.toLowerCase().indexOf(state.currentFilter.toLowerCase()) >
              -1
          );
        })
        .reverse();
    },
    currentStreamIndexInArray(state) {
      return state.streams.indexOf(state.currentStream);
    },
    allSteps(state) {
      return state.steps;
    },
  },
  actions: {
    setCurrentStream(id) {
      let curStream = this.streams.filter((c) => {
        return c.id === id;
      });
      this.currentStream = curStream[0];
    },
    setFilter(filter) {
      this.currentFilter = filter;
    },
    async saveStream() {
      let stream = this.currentStream;
      if (!stream.id) {
        stream.id = "";
        // stream.id = Date.now();
      }
      this.resetCurrentStream();
    },
    async refreshStreams() {
      try {
        this.streams = await api.getStreams();
      } catch (error) {
        throw error;
      }
    },
    async deleteStream(index) {
      this.streams.splice(index, 1);
      // await idb.deleteStream(index);
    },
    resetCurrentStream() {
      this.currentStream = {
        id: "",
        source: "",
        mode: "convert",
        limits: { numberOfEvents: 0, elapsedTime: 0 },
        target: "",
        tables: [],
      };
    },
    async clearStreams() {
      this.streams.length = 0;
    },
  },
});
