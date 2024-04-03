import {defineStore} from 'pinia';
import {connect, AckPolicy, StringCodec} from 'nats.ws';

export const useMonitoringStore = defineStore ('monitoring', {
  state: () => ({
    streamID: '',
    nodes: [],
    logs: [],
  }),
  getters: {
    statNodes (state) {
      return state.nodes.filter (node => {
        return node.type === 'source' || node.type === 'target';
      });
    },
    apiNode (state) {
      return state.nodes.filter (node => {
        return node.type === 'api';
      });
    },
    stats (state) {
      const filteredLogs = this.statNodes.map (node => {
        // Filter logs for each node
        const logsForNode = state.logs.filter (
          log => log.nodeID === node.id && log.msg.startsWith ('[stat]')
        );

        // Find the last log entry for the current node
        const lastLogEntry = logsForNode.length > 0
          ? logsForNode[logsForNode.length - 1]
          : null;
        if (lastLogEntry) {
          // Split the message into parts
          const parts = lastLogEntry.msg.split ('|').map (part => part.trim ());
          lastLogEntry['status'] = parts[0].split (' ')[1];
          // Extract individual parts using key-value pairs
          parts.forEach (part => {
            const [key, value] = part.split (':');
            if (key && value) {
              lastLogEntry[key.toLowerCase ()] = value.trim ();
            }
          });
        }
        return lastLogEntry;
      });
      // Remove null entries (nodes without any logs)
      const filtered = filteredLogs.filter (log => log !== null);
      return filtered;
    },
  },
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

          if (parsed.msg.startsWith ('[init]') && parsed.type === 'api') {
            this.nodes = [];
            const parts = parsed.msg.split ('ID:');
            const id = parts[1].trim ();
            this.streamID = id;
          }

          const nodeExists = this.nodes.find (
            node => node.id === parsed.nodeID
          );

          if (!nodeExists) {
            this.nodes.push ({
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
