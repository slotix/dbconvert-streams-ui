import { defineStore } from 'pinia'
import type { StreamConfig } from '@/types/streamConfig'
import { NodeTypes, type NodeType } from '@/types/common'
import type { AggregatedStatResponse, AggregatedNodeStats } from '@/types/streamStats'
import {
  STREAM_STATUS,
  TERMINAL_STATUSES,
  STREAM_STATUS_PRIORITY,
  type StreamStatus
} from '@/constants'
import { parseDataSize, parseDuration, parseNumber } from '@/utils/formats'

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
  status: StreamStatus
  streamConfig: StreamConfig
  maxLogs: number
  isLoadingStats: boolean
  statsError: Error | null
  lastStreamId: string | null
  shouldShowMonitorTab: boolean
  aggregatedStats: AggregatedStatResponse | null
}

// Use centralized stream status constants
export const statusEnum = STREAM_STATUS

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
    status: STREAM_STATUS.UNDEFINED,
    streamConfig: {} as StreamConfig,
    maxLogs: 1000,
    isLoadingStats: false,
    statsError: null,
    lastStreamId: null as string | null,
    shouldShowMonitorTab: false,
    aggregatedStats: null
  }),
  getters: {
    currentStage(state: State): Stage | null {
      // Initialize stage to 1 if not set
      if (state.currentStageID === 0) {
        state.currentStageID = 1
      }

      // When stream finishes, update the final stage title based on status
      if (this.stats.length > 0) {
        const runningNodesNumber = this.stats.filter((stat: Log) => {
          const statusID = STREAM_STATUS[stat.status as keyof typeof STREAM_STATUS]
          return statusID < STREAM_STATUS.FAILED
        }).length

        // All nodes finished - update stage 4 title
        if (
          runningNodesNumber === 0 &&
          this.stats.every((stat) => ['FINISHED', 'STOPPED', 'FAILED'].includes(stat.status || ''))
        ) {
          const stage = this.stages.find((s) => s.id === 4)
          if (stage) {
            const isStopped = this.stats.some((stat) => stat.status === 'STOPPED')
            if (isStopped) {
              stage.title = 'Stopped'
            } else if (this.stats.every((stat) => stat.status === 'FINISHED')) {
              stage.title = 'Finished'
            }
          }
        }
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
          (log) => log.nodeID === node.id && log.category === 'stat'
        )
        return logsForNode.length > 0 ? logsForNode[logsForNode.length - 1] : null
      })
      return filteredLogs.filter((log) => log !== null) as Log[]
    },
    aggregatedSourceStats(state: State): AggregatedNodeStats | null {
      return state.aggregatedStats?.source || null
    },
    aggregatedTargetStats(state: State): AggregatedNodeStats | null {
      return state.aggregatedStats?.target || null
    }
  },
  actions: {
    setStream(id: string, streamConfig: StreamConfig) {
      // NOTE: Don't clear logs here! Logs may have already arrived via SSE
      // Just set the streamID and let aggregation filter properly
      this.nodes = []
      this.aggregatedStats = null

      this.streamID = id
      this.streamConfig = streamConfig
    },
    setStageTimestamp(stageId: number) {
      const stage = this.stages.find((s) => s.id === stageId)
      if (stage) {
        stage.timestamp = Date.now()
      }
    },
    updateStreamStatus(status: StreamStatus) {
      this.status = status
    },
    requestShowMonitorTab() {
      this.shouldShowMonitorTab = true
    },
    resetShowMonitorTab() {
      this.shouldShowMonitorTab = false
    },
    addLog(log: Log) {
      if (this.logs.length >= this.maxLogs) {
        this.logs = this.logs.slice(-Math.floor(this.maxLogs / 2))
      }
      this.logs.push(log)

      // Handle progress messages
      if (log.category === 'progress' && log.stage !== undefined) {
        this.currentStageID = log.stage
      }

      if (log.type && log.nodeID && log.category === 'stat') {
        this.aggregateNodeStatsByType()
      }
    },
    aggregateNodeStatsByType() {
      // If streamID not set, infer it from the logs themselves
      let currentStreamID = this.streamID
      if (!currentStreamID && this.logs.length > 0) {
        // Get the most recent log's streamId to use as the current stream
        const recentLog = this.logs[this.logs.length - 1]
        if (recentLog.streamId) {
          currentStreamID = recentLog.streamId
        }
      }

      // Filter logs by current streamID to avoid mixing logs from multiple streams
      // IMPORTANT: Include logs that don't have a streamId field (early logs before streamId was set)
      let logsForCurrentStream = this.logs
      if (currentStreamID) {
        logsForCurrentStream = this.logs.filter(
          (log) => log.streamId === currentStreamID || !log.streamId // Include logs without streamId
        )
      }

      const sourceStats = logsForCurrentStream.filter(
        (log) => log.type === 'source' && log.category === 'stat'
      )
      const targetStats = logsForCurrentStream.filter(
        (log) => log.type === 'target' && log.category === 'stat'
      )

      // Update aggregated stats
      const newAggregatedStats: AggregatedStatResponse = {
        configID: this.streamConfig?.id || '',
        streamID: this.streamID,
        source: null,
        target: null
      }

      if (sourceStats.length > 0) {
        newAggregatedStats.source = this.aggregateStats(sourceStats, 'source')
      }

      if (targetStats.length > 0) {
        newAggregatedStats.target = this.aggregateStats(targetStats, 'target')
      }

      this.aggregatedStats = newAggregatedStats

      // Update stream status based on aggregated node statuses
      if (newAggregatedStats.source && newAggregatedStats.target) {
        const sourceStatus = newAggregatedStats.source.status
        const targetStatus = newAggregatedStats.target.status

        // Determine overall stream status (use worst status from both nodes)
        const statusPriority = Math.max(
          STREAM_STATUS_PRIORITY[sourceStatus] || 0,
          STREAM_STATUS_PRIORITY[targetStatus] || 0
        )

        // Map status string back to StreamStatus enum
        const statusName = Object.keys(STREAM_STATUS_PRIORITY).find(
          (key) => STREAM_STATUS_PRIORITY[key] === statusPriority
        )
        if (statusName) {
          const statusEnum = STREAM_STATUS[statusName as keyof typeof STREAM_STATUS]
          if (statusEnum !== undefined && this.status !== statusEnum) {
            this.status = statusEnum
          }
        }
      }
    },
    aggregateStats(stats: Log[], type: string): AggregatedNodeStats {
      // Get latest stat per node ID to count active nodes
      const latestByNode = new Map<string, Log>()
      stats.forEach((stat) => {
        // Normalize timestamp: if it looks like seconds (< year 3000 in ms), convert to milliseconds
        if (stat.ts && stat.ts < 100000000000) {
          stat.ts = stat.ts * 1000
        }

        const existing = latestByNode.get(stat.nodeID)

        // Prioritize terminal status messages for stats aggregation
        // Keep the most recent message, but always prefer terminal statuses (FINISHED, STOPPED, FAILED)
        // STOPPED should override PAUSED to handle pause->stop transitions correctly
        const isTerminalStatus = (status: string | undefined) =>
          status === 'FINISHED' || status === 'STOPPED' || status === 'FAILED'

        const shouldUpdate =
          !existing ||
          (isTerminalStatus(stat.status) && !isTerminalStatus(existing.status)) ||
          (isTerminalStatus(stat.status) === isTerminalStatus(existing.status) &&
            stat.ts >= existing.ts)

        if (shouldUpdate) {
          latestByNode.set(stat.nodeID, stat)
        }
      })

      // Get all latest stats
      const allLatest = Array.from(latestByNode.values())

      // Filter to stats that have meaningful data OR are in terminal state
      const nodeStats = allLatest.filter((stat) => {
        // Always include terminal status stats (they have the final elapsed time)
        if (stat.status && (TERMINAL_STATUSES as readonly string[]).includes(stat.status)) {
          return true
        }
        // Otherwise require events data
        const hasValues = stat.events && stat.events !== '0'
        return hasValues
      })

      // If no stats with values yet, use the latest status but zero values
      if (nodeStats.length === 0) {
        return {
          type,
          status: this.getWorstStatus(allLatest),
          counter: 0,
          failedEvents: 0,
          dataSize: 0,
          avgRate: 0,
          elapsed: 0,
          activeNodes: allLatest.length
        }
      }

      // Backend now logs aggregated SummaryStat directly (not per-instance stats)
      // So all target writers log the SAME aggregated values
      // We just need to pick the most recent one (preferably FINISHED status)
      // Sort by: FINISHED first, then by timestamp
      const sortedStats = [...nodeStats].sort((a, b) => {
        if (a.status === 'FINISHED' && b.status !== 'FINISHED') return -1
        if (a.status !== 'FINISHED' && b.status === 'FINISHED') return 1
        return (b.ts || 0) - (a.ts || 0)
      })
      const latestStat = sortedStats[0]

      // For structured logs, fields are already correct types (numbers, not strings)
      // For old format logs, fields are strings that need parsing
      const isStructured = latestStat.category === 'stat'

      const aggregated = {
        type,
        status: this.getWorstStatus(nodeStats),
        counter: isStructured
          ? (latestStat.events as number)
          : parseNumber(latestStat.events as string),
        failedEvents: isStructured
          ? (latestStat.failed as number) || 0
          : parseNumber(latestStat.failed as string),
        dataSize: parseDataSize(latestStat.size),
        avgRate: parseDataSize(latestStat.rate),
        // For structured logs, elapsed is already a number in seconds
        // For old format, elapsed is a string like "0.909s" that needs parsing to ms, then convert to ns
        elapsed: isStructured
          ? (latestStat.elapsed as number) * 1e9 // Convert seconds to nanoseconds
          : parseDuration((latestStat.elapsed as string) || '0s') * 1e6, // Convert ms to ns
        activeNodes: nodeStats.length // Count of unique nodes that reported stats
      }

      return aggregated
    },
    getWorstStatus(stats: Log[]): string {
      let worst = 'READY'
      let worstPriority = 0

      stats.forEach((stat) => {
        const status = stat.status || stat.msg?.split('|')[0]?.split(' ')[1] || ''
        const priority = STREAM_STATUS_PRIORITY[status] || 0
        if (priority > worstPriority) {
          worst = status
          worstPriority = priority
        }
      })

      return worst
    },
    processMessage(message: Log) {
      try {
        // Handle progress messages (structured logs with category: 'progress')
        if (message.category === 'progress' && message.stage !== undefined) {
          this.currentStageID = message.stage
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

        // For messages with nodeID, look up the node type if not provided or unknown
        let messageType = message.type
        if (message.nodeID && (!messageType || messageType === 'unknown')) {
          const node = this.nodes.find((n) => n.id === message.nodeID)
          if (node) {
            messageType = node.type
          }
        }

        // Add log with safe defaults and resolved type
        this.addLog({
          ...message,
          type: messageType,
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
    }
  }
})
