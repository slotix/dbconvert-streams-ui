import { defineStore } from 'pinia'
import type { StreamConfig } from '@/types/streamConfig'
import { sseLogsService } from '@/api/sseLogsService'
import { NodeTypes, type NodeType } from '@/types/common'
import type { StreamStats } from '@/types/streamStats'
import streamsApi from '@/api/streams'
import { useStreamsStore } from '@/stores/streamConfig'
import { formatDataSize, formatDuration, formatNumber } from '@/utils/formats'

// Define types for the state
interface Node {
  id: string
  type: NodeType
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
  streamStats: StreamStats | null
  isLoadingStats: boolean
  statsError: Error | null
  lastStreamId: string | null
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
    maxLogs: 1000,
    streamStats: null,
    isLoadingStats: false,
    statsError: null,
    lastStreamId: null as string | null
  }),
  getters: {
    currentStage(state: State): Stage | null {
      // Check for finished status in logs even if no stats yet
      const lastLogWithStat = state.logs.filter((log) => log.msg.startsWith('[stat]')).pop()

      if (lastLogWithStat?.msg.includes('FINISHED')) {
        state.currentStageID = 4 // Set to finished stage
        return state.stages.find((stage) => stage.id === state.currentStageID) || null
      }

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
      if (
        runningNodesNumber === 0 &&
        this.stats.every((stat) => ['FINISHED', 'STOPPED', 'FAILED'].includes(stat.status || ''))
      ) {
        // All nodes finished
        if (state.currentStageID !== 4) {
          // Only update if not already in finished stage
          state.currentStageID = 4 // Finished stage
          const stage = this.stages.find((s) => s.id === state.currentStageID)
          const isStopped = this.stats.some((stat) => stat.status === 'STOPPED')
          if (isStopped) {
            stage!.title = 'Stopped'
          } else if (this.stats.every((stat) => stat.status === 'FINISHED')) {
            stage!.title = 'Finished'
          }
        }
      } else if (this.stats.some((stat) => stat.events && parseInt(stat.events) > 0)) {
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
    setStream(id: string, streamConfig: StreamConfig) {
      this.streamID = id
      this.streamConfig = streamConfig
    },
    setStageTimestamp(stageId: number) {
      const stage = this.stages.find((s) => s.id === stageId)
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
    },
    initSSEHandling() {
      sseLogsService.addMessageHandler((message: any) => {
        // Process the message
        this.processMessage(message)
      })
    },
    processMessage(message: any) {
      try {
        // Handle progress messages
        if (message.msg && message.msg.startsWith('[progress]')) {
          const parts = message.msg.split('|')
          const stagePart = parts.find((part: string) => part.includes('STAGE:'))
          if (stagePart) {
            const stage = stagePart.split('STAGE:')[1]
            this.currentStageID = parseInt(stage) || 0
          }
        }

        // Handle node registration
        if (
          message.nodeID &&
          message.type &&
          (message.type === NodeTypes.SOURCE ||
            message.type === NodeTypes.TARGET ||
            message.type === NodeTypes.API)
        ) {
          const nodeExists = this.nodes.find((node) => node.id === message.nodeID)
          if (!nodeExists) {
            this.nodes.push({
              id: message.nodeID,
              type: message.type as NodeType
            })
          }
        }

        // Add log with safe defaults
        this.addLog({
          ...message,
          level: (message.level as keyof LogLevel) || 'info'
        })
      } catch (error) {
        console.error('Error processing message:', error)
        // Add error log
        this.addLog({
          id: Date.now(),
          type: 'monitoring',
          nodeID: 'system',
          msg: `Error processing message: ${error instanceof Error ? error.message : String(error)}`,
          level: 'error',
          ts: Date.now()
        })
      }
    },
    async fetchCurrentStreamStats() {
      this.isLoadingStats = true
      this.statsError = null

      try {
        this.streamStats = await streamsApi.getCurrentStreamStats()

        // Update stream ID and related data
        if (this.streamStats) {
          this.streamID = this.streamStats.streamID
          this.lastStreamId = this.streamStats.streamID
          const streamStore = useStreamsStore()
          const config = await streamStore.getStreamConfigById(this.streamStats.configID)
          if (config) {
            this.streamConfig = config
          }
          this.setStream(this.streamStats.streamID, this.streamConfig)

          // Reset and update nodes based on stream stats
          this.nodes = []
          // Map StreamStats nodes to store nodes
          this.streamStats.nodes.forEach((node) => {
            this.nodes.push({
              id: node.id,
              type: node.type as NodeType
            })

            // Create a stat log entry from streamStats for each node
            if (node.stat) {
              const statMessage = [
                `[stat] ${node.stat.status}`,
                formatNumber(node.stat.counter || 0),
                formatDataSize(node.stat.sumDataSize || 0),
                node.stat.duration !== undefined ? formatDuration(node.stat.duration) : ''
              ]
                .filter(Boolean)
                .join(' | ')

              this.addLog({
                id: Date.now(),
                type: node.type.toLowerCase(),
                nodeID: node.id,
                msg: statMessage,
                status: node.stat.status,
                events: formatNumber(node.stat.counter || 0),
                size: formatDataSize(node.stat.sumDataSize || 0),
                avgRate: node.stat.avgRate ? `${formatDataSize(node.stat.avgRate)}/s` : '0 B/s',
                elapsed: node.stat.duration ? formatDuration(node.stat.duration) : '0s',
                level: 'info',
                ts: Date.now()
              })
            }
          })

          // Find source and target nodes from stats
          const sourceNode = this.streamStats.nodes.find((node) => node.type === NodeTypes.SOURCE)
          const targetNodes = this.streamStats.nodes.find((node) => node.type === NodeTypes.TARGET)

          // Update current stage based on node stats
          if (sourceNode?.stat.status || targetNodes?.stat.status) {
            const status = sourceNode?.stat.status || targetNodes?.stat.status

            switch (status) {
              case 'FINISHED':
                this.currentStageID = 4 // Finished stage
                break
              case 'RUNNING':
                this.currentStageID = 3 // Data transfer stage
                break
              case 'INITIALIZING':
                this.currentStageID = 1 // Init stage
                break
              default:
                this.currentStageID = 1
            }

            // Update timestamps for completed stages
            this.stages.forEach((stage) => {
              if (stage.id < this.currentStageID) {
                stage.timestamp = Date.now()
              }
            })
          }
        }
      } catch (error) {
        this.statsError = error as Error
        this.streamStats = null
        this.lastStreamId = null
        this.streamID = ''
        this.nodes = []
        this.currentStageID = 0
      } finally {
        this.isLoadingStats = false
      }
    },
    clearStreamStats() {
      this.streamStats = null
      this.statsError = null
      this.lastStreamId = null
    }
  }
})
