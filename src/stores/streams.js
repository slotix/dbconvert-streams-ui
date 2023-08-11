import { defineStore } from 'pinia';
import idb from "@/api/iDBService";

export const useStreamsStore = defineStore('streams', {
  state: () => ({
    streams: [],
    currentStream: null,
    currentStep: null,
    currentFilter: "",
    streamTypes: [
      {
        type: "conversion",
        description: "Copy Data",
        img: "/images/projects/copy-data.svg",
        imgSmall: "/images/projects/copy-data-round.svg"
      },
      {
        type: "sync",
        description: "Synchronization",
        img: "/images/projects/synchronization.svg",
        imgSmall: "/images/projects/synchronization-round.svg"
      }
    ],
    steps: [
      {
        id: 1,
        name: "source",
        title: "Select Source database",
        description:
          "Lorem ipsum dolor sit amet consectetur adipisicing elit. Aperiam facilis, voluptates error alias dolorem praesentium sit soluta iure incidunt labore explicabo eaque, quia architecto veritatis dolores, enim consequatur nihil ipsum.",
        img: "/images/steps/source-step.svg"
      },
      {
        id: 2,
        name: "target",
        title: "Select Target database",
        description:
          "Lorem ipsum dolor sit amet consectetur adipisicing elit. Aperiam facilis, voluptates error alias dolorem praesentium sit soluta iure incidunt labore explicabo eaque, quia architecto veritatis dolores, enim consequatur nihil ipsum.",
        img: "/images/steps/destination-step.svg"
      },
      {
        id: 3,
        name: "settings",
        title: "Customize your Stream",
        description:
          "We are fetching the schema of your data source. This should take less than a minute, but may take a few minutes on slow internet connections or data sources with a large amount of tables.",
        img: "/images/steps/settings-step.svg"
      },
      {
        id: 4,
        name: "run",
        title: "Run the Stream",
        description:
          "Lorem ipsum dolor sit amet consectetur adipisicing elit. Aperiam facilis, voluptates error alias dolorem praesentium sit soluta iure incidunt labore explicabo eaque, quia architecto veritatis dolores, enim consequatur nihil ipsum.",
        img: "/images/steps/launch-step.svg"
      }
    ],
  }),
  getters: {
    allStreams(state) {
      return state.streams;
    },
    countStreams(state) {
      return state.streams
        .filter(el => {
          return (
            el.type &&
            el.type.toLowerCase().indexOf(state.currentFilter.toLowerCase()) > -1
          );
        })
        .length;
    },
    streamsNewestFirst(state) {
      return state.streams.slice().reverse();
    },
    streamsByType(state) {
      return state.streams
        .filter(function(el) {
          return (
            el.type &&
            el.type.toLowerCase().indexOf(state.currentFilter.toLowerCase()) > -1
          );
        })
        .reverse();
    },
    allSteps(state) {
      return state.steps;
    },
  },
  actions: {
    setCurrentStream(id) {
      let curStream = this.streams.filter(c => {
        return c.id === id;
      });
      this.currentStream = curStream[0]
    },
    setFilter(filter) {
      this.currentFilter = filter;
    },
    async saveStream() {
      let stream = this.currentStream;
      if (!stream.id) {
        stream.id = Date.now();
      }
      await idb.saveStream(JSON.parse(JSON.stringify(stream)));
    },
    async cloneCurrentStream() {
      if (!this.currentStream) {
        throw new Error("can't clone empty stream");
      }
      let clonedStream = this.currentStream;
      clonedStream.id = Date.now();
      this.setCurrentStream(clonedStream.id);
      await this.saveStream()
    },

    async refreshStreams() {
      let streams = await idb.getStreams();
      this.streams = streams
    },
    async deleteStream(index) {
      this.streams.splice(index, 1);
      await idb.deleteStream(index);
    },
    async clearStreams() {
      await idb.clearStreams();
      this.streams.length = 0;
    },
  },
})
