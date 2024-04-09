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

  }),
  getters: {
    // allStreams(state) {
    //   return state.streams;
    // },
    countStreams() {
      return this.streams?.length || 0;
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
      return state.streams?.slice().reverse() || [];
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
    // allSteps() {
    //   return this.steps;
    // },
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
