import {defineStore} from 'pinia';
import {connect, AckPolicy, StringCodec} from 'nats.ws';

export const useMonitoringStore = defineStore ('monitoring', {
  state: () => ({
    runningStream: {
      id: '',
      nodes: [],
    },
    node: {
      id: '',
      type: '',
    },
    logs: [],
  }),
  getters: {},
  actions: {
    async consumeLogsFromNATS () {
      try {
        // Create a connection to a nats-server:
        const nc = await connect ({servers: 'ws://0.0.0.0:8081'});
        const js = nc.jetstream ();
        const jsm = await js.jetstreamManager ();

        // Create a codec
        const sc = StringCodec ();
        await jsm.consumers.add ('LOGS', {
          durable_name: 'logsAll',
          ack_policy: AckPolicy.Explicit,
        });

        const c = await js.consumers.get ('LOGS', 'logsAll');

        // Consume logs
        let iter = await c.consume ();
        for await (const m of iter) {
          let data = sc.decode (m.data);
          let parsed = JSON.parse (data);
          parsed.id = m.seq;
          // Extract tab information from the subject
          const subjectParts = m.subject.split ('.');
          parsed.type = subjectParts[1]; // Assuming the Node type is the second part of the subject
          parsed.nodeID = subjectParts[2]; // Assuming the NodeId is the second part of the subject
          const nodeExists = this.runningStream.nodes.find (
            node => node.id === parsed.nodeID
          );

          if (!nodeExists) {
            this.runningStream.nodes.push ({
              id: parsed.nodeID,
              type: parsed.type,
            });
          }
          // Insert new log messages at the beginning of the array
          this.logs.push (parsed);
          m.ack ();
        }

        // Close the connection
        await nc.drain ();
      } catch (error) {
        console.log (error);
      }
    },
  },
});
