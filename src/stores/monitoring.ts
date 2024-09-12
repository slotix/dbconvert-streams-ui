import { defineStore } from 'pinia';
import { connect, AckPolicy, StringCodec, JetStreamManager, Consumer } from 'nats.ws';

// Define types for the state
interface Node {
  id: string;
  type: string;
}

interface Log {
  id: number;
  type: string;
  nodeID: string;
  msg: string;
  status?: string;
  [key: string]: any;
}

interface Stage {
  id: number;
  name: string;
  title: string;
  description: string;
}

interface Status {
  [key: string]: number;
}

interface State {
  streamID: string;
  nodes: Node[];
  logs: Log[];
  currentStageID: number;
  stages: Stage[];
  status: typeof statusEnum;
}
const statusEnum = {
  UNDEFINED: 0,
  READY: 1,
  RUNNING: 2,
  FAILED: 3,
  TIME_LIMIT_REACHED: 4,
  EVENT_LIMIT_REACHED: 5,
  STOPPED: 6,
  FINISHED: 7,
} as const;

export const useMonitoringStore = defineStore('monitoring', {
  state: (): State => ({
    streamID: '',
    nodes: [],
    logs: [],
    currentStageID: 0,
    stages: [
      {
        id: 1,
        name: 'init',
        title: 'Initializing Stream',
        description: 'Setting up connections and resources for data transfer.',
      },
      {
        id: 2,
        name: 'createMeta',
        title: 'Replicating Meta Structures',
        description: 'Duplicating table and index meta-information onto the target database.',
      },
      {
        id: 3,
        name: 'dataTransfer',
        title: 'Transferring Data',
        description: 'Actual movement of data records from the source to the target database.',
      },
      {
        id: 4,
        name: 'finished',
        title: 'Finished',
        description: 'Completed the data transfer process.',
      },
    ],
    status: statusEnum,
  }),
  getters: {
    currentStage(state: State): Stage | null {
      if (this.stats.length > 0) {
        const runningNodesNumber = this.stats.filter((stat: Log) => {
          const statusID = statusEnum[stat.status as keyof typeof statusEnum];
          return statusID < statusEnum.FAILED;
        }).length;
        if (runningNodesNumber === 0) {
          state.currentStageID = 4;
        }
      }
      const stage = state.stages.find(stage => stage.id === state.currentStageID);
      return stage ? stage : null;
    },
    stagesBarWidth(state: State): string {
      return `${Math.floor((state.currentStageID / state.stages.length) * 100)}%`;
    },
    statNodes(state: State): Node[] {
      return state.nodes.filter(node => node.type === 'source' || node.type === 'target');
    },
    apiNode(state: State): Node[] {
      return state.nodes.filter(node => node.type === 'api');
    },
    stats(state: State): Log[] {
      const filteredLogs = this.statNodes.map((node: Node) => {
        const logsForNode = state.logs.filter(
          log => log.nodeID === node.id && log.msg.startsWith('[stat]')
        );

        const lastLogEntry = logsForNode.length > 0 ? logsForNode[logsForNode.length - 1] : null;
        if (lastLogEntry) {
          const parts = lastLogEntry.msg.split('|').map(part => part.trim());
          lastLogEntry['status'] = parts[0].split(' ')[1];
          parts.forEach(part => {
            const [key, value] = part.split(':');
            if (key && value) {
              lastLogEntry[key.toLowerCase()] = value.trim();
            }
          });
        }
        return lastLogEntry;
      });
      return filteredLogs.filter(log => log !== null) as Log[];
    },
  },
  actions: {
    async consumeLogsFromNATS() {
      while (true) {
        try {
          const nc = await connect({ servers: 'ws://127.0.0.1:8081' });
          const js = nc.jetstream();
          const jsm: JetStreamManager = await js.jetstreamManager();

          const sc = StringCodec();
          await jsm.consumers.add('LOGS', {
            durable_name: 'logsAll',
            ack_policy: AckPolicy.Explicit,
          });

          const c: Consumer = await js.consumers.get('LOGS', 'logsAll');

          let iter = await c.consume();
          for await (const m of iter) {
            let data = sc.decode(m.data);
            let parsed: Log = JSON.parse(data);
            parsed.id = m.seq;
            const subjectParts = m.subject.split('.');
            parsed.type = subjectParts[1];
            parsed.nodeID = subjectParts[2];

            if (parsed.msg.startsWith('[init]') && parsed.type === 'api') {
              this.nodes = [];
              const parts = parsed.msg.split('ID:');
              const id = parts[1].trim();
              this.streamID = id;
            }
            if (parsed.msg.startsWith('[progress]')) {
              const parts = parsed.msg.split('|');
              const stage = parts[0].split('STAGE:')[1];
              this.currentStageID = parseInt(stage);
            }
            const nodeExists = this.nodes.find(node => node.id === parsed.nodeID);
            if (!nodeExists) {
              this.nodes.push({
                id: parsed.nodeID,
                type: parsed.type,
              });
            }
            this.logs.push(parsed);
            m.ack();
          }

          await nc.drain();
        } catch (error) {
          console.error('Error in NATS connection:', error);
          // Wait before attempting to reconnect
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    },
  },
});
