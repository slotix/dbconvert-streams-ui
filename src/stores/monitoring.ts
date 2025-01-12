import { defineStore } from 'pinia'
import { StreamConfig } from '@/types/streamConfig'

// Define types for the state
interface Node {
  id: string
  type: NodeType
  current?: boolean
}

interface LogLevel {
  info: 'info'
  debug: 'debug'
  warn: 'warn'
  error: 'error'
}

interface Log {
  id: number
  type: string
  nodeID: string
  msg: string
  status?: string
  level: keyof LogLevel
  ts: number
  [key: string]: any
}

interface Stage {
  id: number
  name: string
  title: string
  description: string
  timestamp: number | null
}

interface State {
  streamID: string
  nodes: Node[]
  logs: Log[]
  currentStageID: number
  stages: Stage[]
  status: typeof statusEnum
  streamConfig: StreamConfig
  maxLogs: number
}
export const statusEnum = {
  UNDEFINED: 0,
  READY: 1,
  RUNNING: 2,
  PAUSED: 3,
  FAILED: 4,
  TIME_LIMIT_REACHED: 5,
  EVENT_LIMIT_REACHED: 6,
  STOPPED: 7,
  FINISHED: 8
} as const

const NodeType = {
  SOURCE: 'source',
  TARGET: 'target',
  API: 'api'
} as const
type NodeType = typeof NodeType[keyof typeof NodeType]

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
        timestamp: null
      },
      {
        id: 2,
        name: 'createMeta',
        title: 'Replicating Meta Structures',
        description: 'Duplicating table and index meta-information onto the target database.',
        timestamp: null
      },
      {
        id: 3,
        name: 'dataTransfer',
        title: 'Transferring Data',
        description: 'Actual movement of data records from the source to the target database.',
        timestamp: null
      },
      {
        id: 4,
        name: 'finished',
        title: 'Finished',
        description: 'Completed the data transfer process.',
        timestamp: null
      }
    ],
    status: statusEnum,
    streamConfig: {} as StreamConfig,
    maxLogs: 1000
  }),
  getters: {
    currentStage(state: State): Stage | null {
      // If no stats yet, return current stage based on stageID
      if (this.stats.length === 0) {
        return state.stages.find((stage) => stage.id === state.currentStageID) || null
      }

      // Check current status of nodes
      const runningNodesNumber = this.stats.filter((stat: Log) => {
        const statusID = state.status[stat.status as keyof typeof statusEnum]
        return statusID < state.status.FAILED
      }).length

      // Determine stage based on node status and current stats
      if (runningNodesNumber === 0 && this.stats.every(stat =>
        ['FINISHED', 'STOPPED', 'FAILED'].includes(stat.status || '')
      )) {
        // All nodes finished
        if (state.currentStageID !== 4) {  // Only update if not already in finished stage
          state.currentStageID = 4 // Finished stage
          const stage = this.stages.find(s => s.id === state.currentStageID)
          const isStopped = this.stats.some(stat => stat.status === 'STOPPED')
          if (isStopped) {
            stage!.title = 'Stopped'
          } else if (this.stats.every(stat => stat.status === 'FINISHED')) {
            stage!.title = 'Finished'
          }
        }
      } else if (this.stats.some(stat => stat.events && parseInt(stat.events) > 0)) {
        // If we have events being processed, we're in data transfer stage
        state.currentStageID = 3
      } else if (state.currentStageID < 2) {
        // Initial stages
        state.currentStageID = 2
      }

      return state.stages.find((stage) => stage.id === state.currentStageID) || null
    },
    stagesBarWidth(state: State): string {
      return `${Math.floor((state.currentStageID / state.stages.length) * 100)}%`
    },
    statNodes(state: State): Node[] {
      return state.nodes.filter((node) => node.type === 'source' || node.type === 'target')
    },
    apiNode(state: State): Node[] {
      return state.nodes.filter((node) => node.type === 'api')
    },
    stats(state: State): Log[] {
      const filteredLogs = this.statNodes.map((node: Node) => {
        const logsForNode = state.logs.filter(
          (log) => log.nodeID === node.id && log.msg.startsWith('[stat]')
        )

        const lastLogEntry = logsForNode.length > 0 ? logsForNode[logsForNode.length - 1] : null
        if (lastLogEntry) {
          const parts = lastLogEntry.msg.split('|').map((part) => part.trim())
          lastLogEntry['status'] = parts[0].split(' ')[1]
          parts.forEach((part) => {
            const [key, value] = part.split(':')
            if (key && value) {
              lastLogEntry[key.toLowerCase()] = value.trim()
            }
          })
        }
        return lastLogEntry
      })
      return filteredLogs.filter((log) => log !== null) as Log[]
    }
  },
  actions: {
    setStreamConfig(streamConfig: StreamConfig) {
      this.streamConfig = streamConfig
    },
    setStageTimestamp(stageId: number) {
      const stage = this.stages.find(s => s.id === stageId)
      if (stage) {
        stage.timestamp = Date.now()
      }
    },
    updateStreamStatus(status: typeof statusEnum) {
      this.status = status
    },
    addLog(log: Log) {
      if (this.logs.length >= this.maxLogs) {
        this.logs = this.logs.slice(-Math.floor(this.maxLogs / 2))
      }
      this.logs.push(log)
    }
  }
})
