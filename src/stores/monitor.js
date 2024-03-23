import {defineStore} from 'pinia';
import api from '@/api/streams.js';

export const useMonitoringStore = defineStore ('monitoring', {
  state: () => ({
    runningStream: {
      id: '',
      nodes: [],
    },
    node: {
      id: '',
      type: '',
      logs: [],
    },
    // currentStep: null,
    // currentFilter: "",
  }),
  getters: {
    // countNodes (state) {
    // return state.runningStream.nodes?.length || 0;
    // },
    // newestFirst(state) {
    //   return state.streams?.slice().reverse() || [];
    // },
    // streamsByType(state) {
    //   return state.streams
    //     .filter(function (el) {
    //       return (
    //         el.type &&
    //         el.type.toLowerCase().indexOf(state.currentFilter.toLowerCase()) >
    //           -1
    //       );
    //     })
    //     .reverse();
    // },
    // currentStreamIndexInArray(state) {
    //   return state.streams.indexOf(state.currentStream);
    // },
    // allSteps(state) {
    //   return state.steps;
    // },
  },
  actions: {
    async connectAndConsumeLogs () {
      try {
        // Create a connection to a nats-server:
        const nc = await connect ({servers: 'ws://0.0.0.0:8081'});
        const js = nc.jetstream ();
        const jsm = await js.jetstreamManager ();

        // Create a codec
        const sc = StringCodec ();
        // const logsName = 'logs-' + props.nodeType;
        await jsm.consumers.add ('LOGS', {
          // durable_name: logsName,
          durable_name: 'logsAll',
          ack_policy: AckPolicy.Explicit,
          // filter_subject: 'logs.' + props.nodeType + '.*',
          // filter_subject: 'logs.>',
        });

        // const c = await js.consumers.get('LOGS', logsName);
        const c = await js.consumers.get ('LOGS', 'logsAll');

        // Consume logs
        let iter = await c.consume ();
        for await (const m of iter) {
          let data = sc.decode (m.data);
          let parsed = JSON.parse (data);
          parsed.id = m.seq;
          // Extract tab information from the subject
          const subjectParts = m.subject.split ('.');
          parsed.tab = subjectParts[1]; // Assuming the Node type is the second part of the subject
          parsed.nodeID = subjectParts[2]; // Assuming the NodeId is the second part of the subject
          // Insert new log messages at the beginning of the array
          logs.value.push (parsed);
          m.ack ();
          // Limit the number of logs to a certain threshold (e.g., 100)
          // console.log(logs.value.length)
          // if (logs.value.length > 100) {
          //   logs.value.pop(); // Remove the oldest log when the threshold is reached
          // }
          // if (m.info.pending === 0) {
          //   break;
          // }
          if (logContainer.value) {
            logContainer.value.scrollTop = logContainer.value.scrollHeight;
          }
        }

        // Close the connection
        await nc.drain ();
      } catch (error) {
        console.log (error);
      }
    },
    // setCurrentStream (id) {
    //   let curStream = this.streams.filter (c => {
    //     return c.id === id;
    //   });
    //   this.currentStream = curStream[0];
    // },
    // setFilter (filter) {
    //   this.currentFilter = filter;
    // },
    // async saveStream () {
    //   let stream = this.currentStream;
    //   if (!stream.id) {
    //     stream.id = '';
    //     // stream.id = Date.now();
    //   }
    //   this.resetCurrentStream ();
    // },
    // async refreshStreams () {
    //   try {
    //     this.streams = await api.getStreams ();
    //   } catch (error) {
    //     throw error;
    //   }
    // },
    // async deleteStream (index) {
    //   this.streams.splice (index, 1);
    //   // await idb.deleteStream(index);
    // },
    // resetCurrentStream () {
    //   this.currentStream = {
    //     id: '',
    //     source: '',
    //     mode: 'convert',
    //     limits: {numberOfEvents: 0, elapsedTime: 0},
    //     target: '',
    //     tables: [],
    //   };
    // },
    // async clearStreams () {
    //   this.streams.length = 0;
    // },
  },
});
