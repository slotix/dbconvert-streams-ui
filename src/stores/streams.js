import { defineStore } from 'pinia';
import api from '@/api/streams.js';
import { debounce } from 'lodash';

export const defaultStreamOptions = {
  mode: 'convert',
  dataBundleSize: 100,
  reportingIntervals: { source: 3, target: 3 },
  operations: ['insert', 'update', 'delete'],
  createStructure: true,
  limits: { numberOfEvents: 0, elapsedTime: 0 },
  tables: [],
};

export const useStreamsStore = defineStore('streams', {
  state: () => ({
    streams: [],
    currentStream: null,
    currentStep: null,
    currentFilter: '',
  }),
  getters: {
    countStreams() {
      return this.streams ? this.streams.length : 0;
    },
    newestFirst(state) {
      return state.streams ? state.streams.slice().reverse() : [];
    },
    streamsByType(state) {
      return state.streams
        .filter(el => {
          return (
            el.type &&
            el.type.toLowerCase().indexOf(state.currentFilter.toLowerCase()) > -1
          );
        })
        .reverse();
    },
    currentStreamIndexInArray(state) {
      return state.streams.indexOf(state.currentStream);
    },
  },
  actions: {
    setCurrentStream(id) {
      let curStream = this.streams.find(c => c.id === id);
      if (!curStream) {
        this.currentStream = { ...defaultStreamOptions };
      } else {
        this.currentStream = curStream;
      }
    },
    setFilter(filter) {
      this.currentFilter = filter;
    },
    saveStream: debounce(async function (token) {
      try {
        this.prepareStreamData();
        const stream = await api.createStream(this.currentStream, token);
        this.resetCurrentStream();
        await this.refreshStreams(token);
        this.currentStream.id = stream.id;
        this.currentStream.created = stream.created;
      } catch (err) {
        throw err;
      }
    }, 500),
    prepareStreamData() {
      let stream = this.currentStream;
      if (!stream.id) {
        stream.id = '';
      }
      if (stream.mode === 'cdc') {
        stream.tables.forEach(table => {
          table.query = '';
        });
      } else if (stream.mode === 'convert') {
        stream.operations = [];
        stream.tables.forEach(table => {
          table.operations = [];
        });
      }
    },
    async refreshStreams(token) {
      try {
        this.streams = await api.getStreams(token);
      } catch (error) {
        throw error;
      }
    },
    async deleteStream(index, token) {
      try {
        this.streams.splice(index, 1);
        await api.deleteStream(index, token);
      } catch (error) {
        throw error;
      }
    },

    async cloneStream(index, token) {
      try {
        const resp = await api.cloneStream(index, token);
        this.currentStream.id = resp.id;
        this.currentStream.created = resp.created;
        this.saveStream(token);
      } catch (error) {
        throw error;
      }
    },

    async startStream(index, token) {
      try {
        const resp = await api.startStream (index, token);
        console.log (resp.data.id);
      } catch (error) {
        throw error;
      }
    },
    resetCurrentStream() {
      this.currentStream = {
        id: '',
        source: '',
        target: '',
        tables: [],
        ...defaultStreamOptions,
      };
    },
    async clearStreams() {
      this.streams.length = 0;
    },
  },
});
