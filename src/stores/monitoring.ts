import { defineStore } from 'pinia'
import type { StreamConfig } from '@/types/streamConfig'
import { NodeTypes, type NodeType } from '@/types/common'
import type { AggregatedStatResponse, AggregatedNodeStats } from '@/types/streamStats'
import type { TableStat, TableStatsGroup, TableMetadata } from '@/types/tableStats'
import { STATUS, STATUS_PRIORITY, TERMINAL_STATUSES, type Status } from '@/constants'
import { parseDataSize, formatDataSize, formatDataRate } from '@/utils/formats'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'

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

  // Dynamic fields emitted by different log categories
  category?: string
  streamId?: string
  table?: string
  stage?: number
  events?: number
  elapsed?: number
  rate?: number | string
  size?: number | string
  writerId?: number
  filesTotal?: number
  filesUploaded?: number
  bytesTotal?: number
  bytesUploaded?: number
  bucket?: string
  estimatedRows?: number
  estimatedSizeBytes?: number

  [key: string]: unknown
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
  status: Status
  streamConfig: StreamConfig
  maxLogs: number
  isLoadingStats: boolean
  statsError: Error | null
  lastStreamId: string | null
  shouldShowMonitorTab: boolean
  aggregatedStats: AggregatedStatResponse | null
  tableMetadata: Map<string, TableMetadata>
}

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
        name: 's3Upload',
        title: 'Uploading to S3',
        description: 'Uploading staged files to cloud storage.',
        timestamp: null
      },
      {
        id: 5,
        name: 'finished',
        title: 'Finished',
        description: 'Completed the data transfer process.',
        timestamp: null
      }
    ],
    status: STATUS.UNDEFINED,
    streamConfig: {} as StreamConfig,
    maxLogs: 1000,
    isLoadingStats: false,
    statsError: null,
    lastStreamId: null as string | null,
    shouldShowMonitorTab: false,
    aggregatedStats: null,
    tableMetadata: new Map()
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
          const statusPriority = STATUS_PRIORITY[stat.status as Status] || 0
          return statusPriority < STATUS_PRIORITY[STATUS.FAILED]
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
    },
    /**
     * Extract table-level statistics from logs
     * Groups by table name and returns latest stat per table
     */
    tableStats(state: State): TableStatsGroup {
      // Get current stream ID (prefer explicit selection; fallback to last run for config)
      const currentStreamID = state.streamID
      if (!currentStreamID) {
        return {
          completed: [],
          running: [],
          failed: [],
          stopped: [],
          paused: [],
          total: 0
        }
      }

      // Filter to stat logs for current stream with table field
      // Exclude aggregate entries (table field empty, "Total", or similar aggregate markers)
      // Use target stats as they reflect actual written data
      const tableLogs = state.logs.filter(
        (log) =>
          log.category === 'stat' &&
          log.type === 'target' && // Only target node stats (actual written data)
          log.table &&
          log.table.toLowerCase() !== 'total' && // Exclude aggregate "Total" entries
          log.table.toLowerCase() !== 'summary' && // Exclude aggregate "Summary" entries
          log.streamId === currentStreamID
      )

      // Group by table name to get the worst status per table
      // If ANY writer reports FAILED for a table, that table should show as FAILED
      // Multiple writers may report different statuses for the same table
      const latestByTable = new Map<string, Log>()
      tableLogs.forEach((log) => {
        const existing = latestByTable.get(log.table!)
        if (!existing) {
          latestByTable.set(log.table!, log)
        } else {
          const logStatus = (log.status as Status) || STATUS.RUNNING
          const existingStatus = (existing.status as Status) || STATUS.RUNNING

          // Use STATUS_PRIORITY to determine worst status
          // FAILED=9, STOPPED=8, FINISHED=7, etc. - higher number = worse status
          const logPriority = STATUS_PRIORITY[logStatus] || 0
          const existingPriority = STATUS_PRIORITY[existingStatus] || 0

          if (logPriority > existingPriority) {
            // New log has worse status - use it (e.g., FAILED over FINISHED)
            latestByTable.set(log.table!, log)
          } else if (logPriority === existingPriority) {
            // Same status priority - prefer the one with more events or more recent
            const logEvents = (log.events as number) || 0
            const existingEvents = (existing.events as number) || 0

            if (logEvents > existingEvents) {
              latestByTable.set(log.table!, log)
            } else if (log.ts && existing.ts && log.ts > existing.ts) {
              latestByTable.set(log.table!, log)
            }
          }
          // If existing has worse status, keep it
        }
      })

      // Convert to TableStat array
      const allTableStats: TableStat[] = Array.from(latestByTable.values()).map((log) => {
        // Backend sends raw numeric bytes in size and rate fields
        // Handle both number (new format) and string (old cached format)
        let sizeFormatted: string
        let sizeBytes: number
        if (typeof log.size === 'number') {
          sizeBytes = log.size
          sizeFormatted = formatDataSize(log.size)
        } else if (typeof log.size === 'string') {
          sizeBytes = parseDataSize(log.size)
          sizeFormatted = log.size // Already formatted
        } else {
          sizeBytes = 0
          sizeFormatted = '0 B'
        }

        let rateFormatted: string
        if (typeof log.rate === 'number') {
          rateFormatted = log.rate > 0 ? formatDataRate(log.rate) : '0 B/s'
        } else if (typeof log.rate === 'string') {
          rateFormatted = log.rate // Already formatted
        } else {
          rateFormatted = '0 B/s'
        }

        // Get metadata for this table (if available)
        const metadata = state.tableMetadata.get(log.table!)

        return {
          table: log.table!,
          status: (log.status as Status) || STATUS.RUNNING,
          events: (log.events as number) || 0,
          size: sizeFormatted,
          sizeBytes,
          rate: rateFormatted,
          elapsed: (log.elapsed as number) || 0,
          timestamp: log.ts || Date.now(),
          estimatedRows: metadata?.estimatedRows,
          estimatedSizeBytes: metadata?.estimatedSizeBytes
        }
      })

      // Group by status
      const completed = allTableStats.filter((t) => t.status === STATUS.FINISHED)
      const running = allTableStats.filter((t) => t.status === STATUS.RUNNING)
      const failed = allTableStats.filter((t) => t.status === STATUS.FAILED)
      const stopped = allTableStats.filter((t) => t.status === STATUS.STOPPED)
      const paused = allTableStats.filter((t) => t.status === STATUS.PAUSED)

      return {
        completed,
        running,
        failed,
        stopped,
        paused,
        total: allTableStats.length
      }
    },

    /**
     * Check if target is an S3 connection
     */
    isS3Target(state: State): boolean {
      const spec = state.streamConfig?.target?.spec
      return !!(spec?.s3 || spec?.gcs || spec?.azure)
    },

    /**
     * Extract S3 upload statistics from logs
     * Groups by table name and returns latest stat per table
     */
    s3UploadStats(state: State): {
      completed: Array<{
        table: string
        status: string
        filesTotal: number
        filesUploaded: number
        bytesTotal: number
        bytesUploaded: number
        bucket: string
        rate: number
        elapsed: number
        timestamp: number
      }>
      uploading: Array<{
        table: string
        status: string
        filesTotal: number
        filesUploaded: number
        bytesTotal: number
        bytesUploaded: number
        bucket: string
        rate: number
        elapsed: number
        timestamp: number
      }>
      failed: Array<{
        table: string
        status: string
        filesTotal: number
        filesUploaded: number
        bytesTotal: number
        bytesUploaded: number
        bucket: string
        rate: number
        elapsed: number
        timestamp: number
      }>
      total: number
      aggregate: {
        filesTotal: number
        filesUploaded: number
        bytesTotal: number
        bytesUploaded: number
        rate: number
      }
    } {
      // Get current stream ID (prefer explicit selection; fallback to last run for config)
      const currentStreamID = state.streamID
      if (!currentStreamID) {
        return {
          completed: [],
          uploading: [],
          failed: [],
          total: 0,
          aggregate: {
            filesTotal: 0,
            filesUploaded: 0,
            bytesTotal: 0,
            bytesUploaded: 0,
            rate: 0
          }
        }
      }

      // Filter to s3_upload logs for current stream
      const uploadLogs = state.logs.filter(
        (log) =>
          log.category === 's3_upload' && log.table && log.streamId === currentStreamID
      )

      // S3 upload has its own status values: UPLOADING, FINISHED, FAILED
      type S3UploadStatus = 'UPLOADING' | 'FINISHED' | 'FAILED'

      // STEP 1: Deduplicate by table + writerId to get the final state per writer
      // Each writer has a unique writerId, so we track each writer's upload separately
      // This prevents multiple logs from the same writer being counted multiple times
      const latestByWriter = new Map<
        string,
        {
          table: string
          writerId: number
          status: S3UploadStatus
          filesTotal: number
          filesUploaded: number
          bytesTotal: number
          bytesUploaded: number
          bucket: string
          rate: number
          elapsed: number
          timestamp: number
        }
      >()

      uploadLogs.forEach((log) => {
        const tableName = log.table as string
        const writerId = (log.writerId as number) || 0
        const key = `${tableName}:${writerId}`
        const existing = latestByWriter.get(key)

        const logStatus = ((log.status as string) || 'UPLOADING') as S3UploadStatus
        const logFilesTotal = (log.filesTotal as number) || 0
        const logFilesUploaded = (log.filesUploaded as number) || 0
        const logBytesTotal = (log.bytesTotal as number) || 0
        const logBytesUploaded = (log.bytesUploaded as number) || 0
        const logRate = (log.rate as number) || 0
        const logElapsed = (log.elapsed as number) || 0
        const logTimestamp = log.ts || Date.now()

        const logEntry = {
          table: tableName,
          writerId,
          status: logStatus,
          filesTotal: logFilesTotal,
          filesUploaded: logFilesUploaded,
          bytesTotal: logBytesTotal,
          bytesUploaded: logBytesUploaded,
          bucket: (log.bucket as string) || '',
          rate: logRate,
          elapsed: logElapsed,
          timestamp: logTimestamp
        }

        if (!existing) {
          latestByWriter.set(key, logEntry)
        } else {
          // Prefer FINISHED status, otherwise take most recent
          if (logStatus === 'FINISHED' && existing.status !== 'FINISHED') {
            latestByWriter.set(key, logEntry)
          } else if (existing.status === 'FINISHED' && logStatus !== 'FINISHED') {
            // Keep existing finished entry
          } else if (logTimestamp > existing.timestamp) {
            latestByWriter.set(key, logEntry)
          }
        }
      })

      // STEP 2: Aggregate across writers for the same table
      const aggregatedByTable = new Map<
        string,
        {
          table: string
          status: S3UploadStatus
          filesTotal: number
          filesUploaded: number
          bytesTotal: number
          bytesUploaded: number
          bucket: string
          rate: number
          elapsed: number
          timestamp: number
        }
      >()

      latestByWriter.forEach((writerStat) => {
        const existing = aggregatedByTable.get(writerStat.table)

        if (!existing) {
          // First writer for this table
          aggregatedByTable.set(writerStat.table, {
            table: writerStat.table,
            status: writerStat.status,
            filesTotal: writerStat.filesTotal,
            filesUploaded: writerStat.filesUploaded,
            bytesTotal: writerStat.bytesTotal,
            bytesUploaded: writerStat.bytesUploaded,
            bucket: writerStat.bucket,
            rate: writerStat.rate,
            elapsed: writerStat.elapsed,
            timestamp: writerStat.timestamp
          })
        } else {
          // Sum up stats from this writer
          existing.filesTotal += writerStat.filesTotal
          existing.filesUploaded += writerStat.filesUploaded
          existing.bytesTotal += writerStat.bytesTotal
          existing.bytesUploaded += writerStat.bytesUploaded
          existing.rate += writerStat.rate
          existing.elapsed = Math.max(existing.elapsed, writerStat.elapsed)
          existing.timestamp = Math.max(existing.timestamp, writerStat.timestamp)
          // Status: FINISHED only if all writers finished
          if (writerStat.status !== 'FINISHED') {
            existing.status = writerStat.status
          }
        }
      })

      // Convert to array
      const allUploadStats = Array.from(aggregatedByTable.values())

      // Group by status
      const completed = allUploadStats.filter((t) => t.status === 'FINISHED')
      const uploading = allUploadStats.filter((t) => t.status === 'UPLOADING')
      const failed = allUploadStats.filter((t) => t.status === 'FAILED')

      // Calculate aggregates
      const aggregate = allUploadStats.reduce(
        (acc, stat) => ({
          filesTotal: acc.filesTotal + stat.filesTotal,
          filesUploaded: acc.filesUploaded + stat.filesUploaded,
          bytesTotal: acc.bytesTotal + stat.bytesTotal,
          bytesUploaded: acc.bytesUploaded + stat.bytesUploaded,
          rate: acc.rate + stat.rate
        }),
        { filesTotal: 0, filesUploaded: 0, bytesTotal: 0, bytesUploaded: 0, rate: 0 }
      )

      return {
        completed,
        uploading,
        failed,
        total: allUploadStats.length,
        aggregate
      }
    }
  },
  actions: {
    setStream(id: string, streamConfig: StreamConfig) {
      // If switching to a different stream, clear old data
      // This prevents mixing old stream's logs with the new stream
      if (this.streamID !== id) {
        this.nodes = []
        this.aggregatedStats = null
        this.currentStageID = 0
        this.tableMetadata = new Map() // Clear old metadata
        // Reset all stage timestamps when switching streams
        this.stages.forEach((stage) => {
          stage.timestamp = null
        })
      }

      this.streamID = id
      this.streamConfig = streamConfig

      // Rebuild table metadata from logs that arrived before setStream was called
      // Table metadata is now logged with the first stats report (after 500ms delay)
      // when SSE connection is guaranteed to be established
      const metadataLogs = this.logs.filter(
        (log) => log.category === 'table_metadata' && log.table && log.streamId === id
      )
      metadataLogs.forEach((log) => {
        const metadata: TableMetadata = {
          name: log.table!,
          estimatedRows: (log.estimatedRows as number) || 0,
          estimatedSizeBytes: (log.estimatedSizeBytes as number) || 0
        }
        this.tableMetadata.set(log.table!, metadata)
      })

      // Trigger aggregation to process any logs that arrived before setStream was called
      if (this.logs.length > 0) {
        this.aggregateNodeStatsByType()
      }
    },
    setStageTimestamp(stageId: number) {
      const stage = this.stages.find((s) => s.id === stageId)
      if (stage) {
        stage.timestamp = Date.now()
      }
    },
    updateStreamStatus(status: Status) {
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

      // Handle S3 upload logs - transition to stage 4 (s3Upload)
      // This triggers when the first s3_upload log arrives
      if (log.category === 's3_upload' && this.currentStageID < 4) {
        this.currentStageID = 4
        this.setStageTimestamp(4)
      }

      // Handle table metadata logs (from SSE instead of API)
      // Accept metadata logs even before streamID is set (they arrive early during stream init)
      // The tableStats getter will filter by streamID when reading from this Map
      if (log.category === 'table_metadata' && log.table && log.streamId) {
        const metadata: TableMetadata = {
          name: log.table,
          estimatedRows: (log.estimatedRows as number) || 0,
          estimatedSizeBytes: (log.estimatedSizeBytes as number) || 0
        }
        this.tableMetadata.set(log.table, metadata)
      }

      if (log.type && log.nodeID && log.category === 'stat') {
        this.aggregateNodeStatsByType()
      }
    },
    aggregateNodeStatsByType() {
      // If streamID not set, don't aggregate anything
      // This prevents showing stats before a stream is properly initialized
      if (!this.streamID) {
        this.aggregatedStats = null
        return
      }

      // Filter logs by current streamID to avoid mixing logs from multiple streams
      // Only include logs that match the current stream ID
      const logsForCurrentStream = this.logs.filter((log) => log.streamId === this.streamID)

      // If no logs match the current stream, clear stats entirely
      if (logsForCurrentStream.length === 0) {
        this.aggregatedStats = null
        return
      }

      // Filter to only "Total" stats (empty table name) for aggregate views
      // Backend logs both:
      // 1. Total stats (table="") - aggregated across all writers via NATS counters
      // 2. Per-table stats (table="products", etc.) - also aggregated, shown in table list
      // For aggregate node stats, we only want Total stats, not per-table stats
      const sourceStats = logsForCurrentStream.filter(
        (log) =>
          log.type === 'source' &&
          log.category === 'stat' &&
          (!log.table || log.table === '' || log.table.toLowerCase() === 'total')
      )
      const targetStats = logsForCurrentStream.filter(
        (log) =>
          log.type === 'target' &&
          log.category === 'stat' &&
          (!log.table || log.table === '' || log.table.toLowerCase() === 'total')
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
          STATUS_PRIORITY[sourceStatus as Status] || 0,
          STATUS_PRIORITY[targetStatus as Status] || 0
        )

        // Find the status with this priority
        const statusWithPriority = Object.entries(STATUS_PRIORITY).find(
          ([_, priority]) => priority === statusPriority
        )
        if (statusWithPriority) {
          const [statusKey] = statusWithPriority
          const newStatus = statusKey as Status
          if (this.status !== newStatus) {
            const previousStatus = this.status
            this.status = newStatus
            // Refresh target when stream finishes or is stopped (CDC mode ends with STOPPED)
            const isTerminalTransition =
              (newStatus === STATUS.FINISHED || newStatus === STATUS.STOPPED) &&
              previousStatus !== STATUS.FINISHED &&
              previousStatus !== STATUS.STOPPED
            if (isTerminalTransition) {
              this.refreshTargetFileExplorer()
              this.refreshTargetDatabaseMetadata()
            }
          }
        }
      } else if (newAggregatedStats.source && !newAggregatedStats.target) {
        // Only source stats exist - handle early failure case
        // When source fails before target starts, we need to set stream status to FAILED
        const sourceStatus = newAggregatedStats.source.status
        // console.log('[Monitoring] Early failure check:', {
        //   sourceStatus,
        //   currentStatus: this.status,
        //   willUpdate: sourceStatus === STATUS.FAILED
        // })
        if (sourceStatus === STATUS.FAILED) {
          // console.log('[Monitoring] Setting stream status to FAILED (early source failure)')
          this.status = STATUS.FAILED
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
        return typeof stat.events === 'number' && stat.events > 0
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

      const aggregated = {
        type,
        status: this.getWorstStatus(nodeStats),
        counter: latestStat.events ?? 0,
        failedEvents: (latestStat.failed as number) || 0,
        dataSize: parseDataSize(latestStat.size),
        avgRate: parseDataSize(latestStat.rate),
        // elapsed is in seconds; convert to nanoseconds
        elapsed: (latestStat.elapsed ?? 0) * 1e9,
        activeNodes: nodeStats.length // Count of unique nodes that reported stats
      }

      return aggregated
    },
    getWorstStatus(stats: Log[]): Status {
      let worst: Status = STATUS.READY
      let worstPriority = 0

      stats.forEach((stat) => {
        const status = stat.status || stat.msg?.split('|')[0]?.split(' ')[1] || ''
        const priority = STATUS_PRIORITY[status as Status] || 0
        if (priority > worstPriority) {
          worst = status as Status
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
    },
    /**
     * Refresh file explorer for target connection when stream finishes
     * This ensures newly written files appear without requiring page refresh
     */
    refreshTargetFileExplorer() {
      const targetId = this.streamConfig?.target?.id
      if (!targetId) return

      const fileExplorerStore = useFileExplorerStore()

      // Check if target is a file-type connection
      if (fileExplorerStore.isFilesConnectionType(targetId)) {
        // Force refresh the file list for the target connection
        fileExplorerStore.loadEntries(targetId, true)
      }
    },
    /**
     * Refresh database metadata for target connection when stream finishes
     * This ensures newly created tables, indexes, and foreign keys appear
     * without requiring manual metadata refresh
     */
    async refreshTargetDatabaseMetadata() {
      const targetId = this.streamConfig?.target?.id
      const targetDatabase = this.streamConfig?.target?.spec?.database?.database
      if (!targetId || !targetDatabase) return

      const fileExplorerStore = useFileExplorerStore()

      // Only refresh for database connections (not file-type connections)
      if (fileExplorerStore.isFilesConnectionType(targetId)) {
        return
      }

      const navigationStore = useExplorerNavigationStore()

      // Invalidate and refresh the metadata cache for the target database
      navigationStore.invalidateMetadata(targetId, targetDatabase)
      await navigationStore.ensureMetadata(targetId, targetDatabase, true)
    }
  }
})
