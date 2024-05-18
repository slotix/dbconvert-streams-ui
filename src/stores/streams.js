import {defineStore} from 'pinia';
import api from '@/api/streams.js';

export const defaultStreamOptions = {
  mode: 'convert',
  dataBundleSize: 100,
  reportingIntervals: {source: 3, target: 3},
  cdcOperations: ['insert', 'update', 'delete'],
  createStructure: true,
  limits: {numberOfEvents: 0, elapsedTime: 0},
};
export const useStreamsStore = defineStore ('streams', {
  state: () => ({
    streams: [],
    currentStream: null,
    currentStep: null,
    currentFilter: '',
  }),
  getters: {
    countStreams () {
      return this.streams ? this.streams.length : 0;
      // return this.streams?.length || 0;
      // .filter((el) => {
      //   return (
      //     el.type &&
      //     el.type.toLowerCase().indexOf(state.currentFilter.toLowerCase()) >
      //     -1
      //   );
      // })
      // .length;
    },
    newestFirst (state) {
      return state.streams ? state.streams.slice ().reverse () : [];
      // return state.streams?.slice().reverse() || [];
    },
    streamsByType (state) {
      return state.streams
        .filter (function (el) {
          return (
            el.type &&
            el.type
              .toLowerCase ()
              .indexOf (state.currentFilter.toLowerCase ()) > -1
          );
        })
        .reverse ();
    },
    currentStreamIndexInArray (state) {
      return state.streams.indexOf (state.currentStream);
    },
  },
  actions: {
    setCurrentStream (id) {
      let curStream = this.streams.find (c => c.id === id);
      if (!curStream) {
        // If stream does not exist, set it to default options
        this.currentStream = {...defaultStreamOptions};
      } else {
        this.currentStream = curStream;
      }
    },
    setFilter (filter) {
      this.currentFilter = filter;
    },
    async saveStream () {
      let stream = this.currentStream;
      if (!stream.id) {
        stream.id = '';
        // stream.id = Date.now();
      }
      this.resetCurrentStream ();
    },
    async refreshStreams () {
      try {
        this.streams = await api.getStreams ();
      } catch (error) {
        throw error;
      }
    },
    async deleteStream (index) {
      this.streams.splice (index, 1);
      // await idb.deleteStream(index);
    },
    resetCurrentStream () {
      this.currentStream = {
        id: '',
        source: '',
        target: '',
        tables: [],
        ...defaultStreamOptions,
      };
    },
    async clearStreams () {
      this.streams.length = 0;
    },
  },
});
