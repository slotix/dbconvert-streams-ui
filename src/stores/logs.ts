import { defineStore } from 'pinia'
import type { StandardLogEntry } from '@/types/logs'
import { useMonitoringStore } from '@/stores/monitoring'
import type { LogLevel, LogCategory, NodeType, StatStatus } from '@/constants'

// localStorage keys for user preferences
const STORAGE_KEYS = {
  viewMode: 'sqlLogViewMode',
  sortOrder: 'sqlLogSortOrder',
  timeWindow: 'sqlLogTimeWindow',
  errorsOnly: 'sqlLogErrorsOnly'
} as const

// Helper functions for localStorage persistence
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : defaultValue
  } catch {
    return defaultValue
  }
}

function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn(`Failed to save ${key} to localStorage:`, e)
  }
}

export interface SystemLog {
  id: number
  message: string
  level: LogLevel
  timestamp: number
  source?: string
  nodeId?: string
  type?: NodeType
  streamId?: string
  details?: Record<string, unknown>
  // Structured log fields
  category?: LogCategory
  // Progress fields
  stage?: number
  description?: string
  percentage?: number
  // Stat fields
  table?: string
  status?: StatStatus
  events?: number
  size?: string
  rate?: string
  elapsed?: number
}

// Phase 2: Enhanced SQL Logging Types
export type QueryPurpose =
  | 'SCHEMA_INTROSPECTION'
  | 'DATA_QUERY'
  | 'COUNT_QUERY'
  | 'PLAN_ANALYSIS'
  | 'SCHEMA_CHANGE'
  | 'DML_OPERATION'
  | 'SYSTEM_TASK'
  | 'UTILITY'

export type TimeWindow = '5m' | '1h' | 'session' | 'all'
export type ExportFormat = 'text' | 'csv' | 'json'

export interface LogFilters {
  purposes: Set<QueryPurpose>
  timeWindow: TimeWindow
  searchText: string
  errorsOnly: boolean
  currentTabOnly: boolean
}

export interface SQLQueryLog {
  id: string
  connectionId: string
  tabId?: string
  database: string
  schema?: string
  tableName?: string
  query: string
  params?: unknown[]
  purpose: QueryPurpose
  startedAt: string
  durationMs: number
  rowCount: number
  error?: string
  redacted?: boolean
}

// Helper interface for display with location headers
export interface LogWithHeader {
  log: SQLQueryLog
  showHeader: boolean
  location: string
  queriesInGroup?: number
}

type ExportFieldKey =
  | 'startedAt'
  | 'purpose'
  | 'database'
  | 'query'
  | 'durationMs'
  | 'rowCount'
  | 'error'

const EXPORT_FIELD_DEFS: Array<{ key: ExportFieldKey; label: string }> = [
  { key: 'startedAt', label: 'Timestamp' },
  { key: 'purpose', label: 'Purpose' },
  { key: 'database', label: 'Database' },
  { key: 'query', label: 'Query' },
  { key: 'durationMs', label: 'Duration (ms)' },
  { key: 'rowCount', label: 'Rows' },
  { key: 'error', label: 'Error' }
]

interface FilterMatchOptions {
  respectTimeWindow?: boolean
  cutoffOverride?: number | null
  now?: number
}

function logMatchesFilters(
  log: SQLQueryLog,
  filters: LogFilters,
  currentTabId: string | null,
  options: FilterMatchOptions = {}
): boolean {
  const { respectTimeWindow = true, cutoffOverride, now = Date.now() } = options
  let cutoff: number | null = null

  if (cutoffOverride !== undefined) {
    cutoff = cutoffOverride
  } else if (respectTimeWindow) {
    switch (filters.timeWindow) {
      case '5m':
        cutoff = now - 5 * 60 * 1000
        break
      case '1h':
        cutoff = now - 60 * 60 * 1000
        break
      case 'session':
      case 'all':
        cutoff = null
        break
    }
  }

  if (cutoff !== null) {
    const logTime = new Date(log.startedAt).getTime()
    if (logTime < cutoff) {
      return false
    }
  }

  if (filters.currentTabOnly && currentTabId && log.tabId !== currentTabId) {
    return false
  }

  // Purpose-based filtering
  if (!filters.purposes.has(log.purpose)) {
    return false
  }

  if (filters.errorsOnly && !log.error) return false

  if (filters.searchText) {
    const search = filters.searchText.trim().toLowerCase()
    if (search) {
      const matches =
        log.query.toLowerCase().includes(search) ||
        log.database.toLowerCase().includes(search) ||
        (!!log.schema && log.schema.toLowerCase().includes(search)) ||
        (!!log.tableName && log.tableName.toLowerCase().includes(search)) ||
        (!!log.error && log.error.toLowerCase().includes(search))
      if (!matches) return false
    }
  }

  return true
}

export const useLogsStore = defineStore('logs', {
  state: () => {
    return {
      logs: [] as SystemLog[],
      maxLogs: 1000,
      isLogsPanelOpen: false,
      panelHeight: '50vh',
      selectedStreamId: '', // For filtering logs by stream
      historicalLogs: [] as SystemLog[], // Logs loaded from API
      isHistoricalView: false, // Flag to indicate if showing historical logs
      isLoadingHistoricalLogs: false, // Loading state for API fetch

      // Phase 2: SQL Logs
      flatLogs: new Map<string, SQLQueryLog>(), // id -> log
      displayOrder: [] as string[], // IDs in chronological order

      // Filters (with persisted preferences)
      filters: {
        purposes: new Set<QueryPurpose>([
          'SCHEMA_INTROSPECTION',
          'DATA_QUERY',
          'COUNT_QUERY',
          'SCHEMA_CHANGE',
          'DML_OPERATION'
        ]),
        timeWindow: loadFromStorage<TimeWindow>(STORAGE_KEYS.timeWindow, 'session'),
        searchText: '', // Not persisted - session specific
        errorsOnly: loadFromStorage<boolean>(STORAGE_KEYS.errorsOnly, false),
        currentTabOnly: false // Not persisted - session specific
      } as LogFilters,

      // Limits
      maxLogsPerTab: 500,
      maxLogsSession: 5000,

      // UI state (with persisted preferences)
      currentTabId: null as string | null,
      collapsedLocations: new Set<string>(), // Locations that are collapsed when visuallyGrouped is true
      visuallyGrouped: loadFromStorage<boolean>('sqlLogVisuallyGrouped', true), // Show location headers
      sortOrder: loadFromStorage<'newest' | 'oldest'>(STORAGE_KEYS.sortOrder, 'newest')
    }
  },

  getters: {
    filteredLogs: (state) => (level?: LogLevel) => {
      if (!level) return state.logs
      return state.logs.filter((log) => log.level === level)
    },

    hasErrors: (state) => {
      return state.logs.some((log) => log.level === 'error')
    },

    // Phase 2: SQL Logs Getters
    visibleLogs(): SQLQueryLog[] {
      const filtered: SQLQueryLog[] = []
      const now = Date.now()

      for (const log of this.flatLogs.values()) {
        if (logMatchesFilters(log, this.filters, this.currentTabId, { now })) {
          filtered.push(log)
        }
      }

      // Sort filtered logs based on sortOrder preference
      filtered.sort((a, b) => {
        const timeA = new Date(a.startedAt).getTime()
        const timeB = new Date(b.startedAt).getTime()
        return this.sortOrder === 'newest' ? timeB - timeA : timeA - timeB
      })

      return filtered
    },

    // Get logs with location headers for visual grouping
    logsWithHeaders(): LogWithHeader[] {
      const logs = this.visibleLogs

      if (!this.visuallyGrouped) {
        // No headers when not visually grouped
        return logs.map((log) => ({
          log,
          showHeader: false,
          location: this.getLocationKey(log)
        }))
      }

      // Build location counts
      const locationCounts = new Map<string, number>()
      for (const log of logs) {
        const location = this.getLocationKey(log)
        locationCounts.set(location, (locationCounts.get(location) || 0) + 1)
      }

      // Add headers when location changes
      let lastLocation = ''
      return logs.map((log) => {
        const location = this.getLocationKey(log)
        const showHeader = location !== lastLocation
        lastLocation = location

        return {
          log,
          showHeader,
          location,
          queriesInGroup: locationCounts.get(location)
        }
      })
    },

    // Helper to get location key from a log
    getLocationKey(): (log: SQLQueryLog) => string {
      return (log: SQLQueryLog) => {
        // Build location string: database.schema.table or database.table
        if (log.tableName) {
          // For files (empty database), just show the table name (filename)
          if (!log.database) {
            return log.tableName
          }
          if (log.schema) {
            return `${log.database}.${log.schema}.${log.tableName}`
          }
          return `${log.database}.${log.tableName}`
        }
        // Fallback to purpose if no table
        return log.database ? `${log.database} (${log.purpose})` : log.purpose
      }
    },

    hasSQLErrors(): boolean {
      for (const log of this.flatLogs.values()) {
        if (log.error) return true
      }
      return false
    }
  },

  actions: {
    addLog(log: Omit<SystemLog, 'id'>) {
      // Trim logs if we exceed maxLogs
      if (this.logs.length >= this.maxLogs) {
        this.logs = this.logs.slice(-Math.floor(this.maxLogs / 2))
      }

      // Add the new log
      this.logs.push({
        ...log,
        id: Date.now() + Math.random()
      })
    },

    clearLogs() {
      this.logs = []
    },

    cleanupEmptyLogs() {
      // Remove ALL logs with empty messages - they have no value
      const beforeCount = this.logs.length
      this.logs = this.logs.filter((log) => {
        const message = (log.message || '').trim()
        return message.length > 0
      })

      if (this.logs.length < beforeCount) {
        console.info(`🧹 Cleaned up ${beforeCount - this.logs.length} empty-message logs`)
      }
    },

    toggleLogsPanel() {
      this.isLogsPanelOpen = !this.isLogsPanelOpen
    },

    updatePanelHeight(height: string) {
      this.panelHeight = height
    },

    setStreamFilter(streamId: string) {
      this.selectedStreamId = streamId
      // Open the panel if not already open
      if (!this.isLogsPanelOpen) {
        this.isLogsPanelOpen = true
      }
    },

    async loadHistoricalLogs(streamId: string) {
      this.isLoadingHistoricalLogs = true
      this.isHistoricalView = false
      this.historicalLogs = []

      try {
        // Import the API client function
        const { getStreamLogs } = await import('@/api/apiClient')

        // Fetch logs from the API
        const rawLogs = await getStreamLogs(streamId)

        // Convert raw logs to SystemLog format
        this.historicalLogs = rawLogs.map((log, index) => ({
          id: Date.now() + index,
          message: (log.msg as string) || (log.message as string) || '',
          level: ((log.level as string) || 'info') as LogLevel,
          timestamp: log.ts
            ? typeof log.ts === 'number'
              ? log.ts * 1000
              : new Date(log.ts as string).getTime()
            : log.time
              ? new Date(log.time as string).getTime()
              : Date.now(),
          source: (log.caller as string) || undefined,
          type: log.type as NodeType | undefined,
          nodeId: log.nodeId as string | undefined,
          streamId: ((log.streamId as string) || streamId) as string,
          category: log.category as LogCategory | undefined,
          table: log.table as string | undefined,
          status: log.status as StatStatus | undefined,
          events: log.events as number | undefined,
          size: log.size as string | undefined,
          rate: log.rate as string | undefined,
          elapsed: log.elapsed as number | undefined,
          details: log
        }))

        // Set the view to historical
        this.isHistoricalView = true
        this.selectedStreamId = streamId

        // Open the panel
        if (!this.isLogsPanelOpen) {
          this.isLogsPanelOpen = true
        }
      } catch (error) {
        console.error('Failed to load historical logs:', error)
        // Fall back to in-memory logs
        this.isHistoricalView = false
      } finally {
        this.isLoadingHistoricalLogs = false
      }
    },

    clearHistoricalLogs() {
      this.historicalLogs = []
      this.isHistoricalView = false
    },

    // Phase 2: SQL Logs Actions
    addSQLLog(log: SQLQueryLog) {
      // Store log
      this.flatLogs.set(log.id, log)
      this.displayOrder.push(log.id)

      // Trim if needed
      this.trimSQLLogs()
    },

    trimSQLLogs() {
      // Per-tab limit
      const tabCounts = new Map<string, number>()
      for (const log of this.flatLogs.values()) {
        if (log.tabId) {
          tabCounts.set(log.tabId, (tabCounts.get(log.tabId) || 0) + 1)
        }
      }

      // Trim oldest from over-limit tabs
      for (const [tabId, count] of tabCounts) {
        if (count > this.maxLogsPerTab) {
          const toRemove = count - this.maxLogsPerTab
          let removed = 0
          for (const id of this.displayOrder) {
            const log = this.flatLogs.get(id)
            if (log?.tabId === tabId) {
              this.flatLogs.delete(id)
              this.displayOrder = this.displayOrder.filter((x) => x !== id)
              removed++
              if (removed >= toRemove) break
            }
          }
        }
      }

      // Session limit (LRU)
      if (this.flatLogs.size > this.maxLogsSession) {
        const toRemove = this.flatLogs.size - this.maxLogsSession
        for (let i = 0; i < toRemove; i++) {
          const oldestId = this.displayOrder[0]
          this.flatLogs.delete(oldestId)
          this.displayOrder.shift()
        }
      }
    },

    toggleLocation(location: string) {
      if (this.collapsedLocations.has(location)) {
        this.collapsedLocations.delete(location)
      } else {
        this.collapsedLocations.add(location)
      }
    },

    expandAllLocations() {
      this.collapsedLocations.clear()
    },

    collapseAllLocations() {
      // Collapse all locations
      const logs = Array.from(this.flatLogs.values())
      const locations = new Set(logs.map((log) => this.getLocationKey(log)))
      for (const location of locations) {
        this.collapsedLocations.add(location)
      }
    },

    clearSQLLogs() {
      this.flatLogs.clear()
      this.displayOrder = []
      this.collapsedLocations.clear()
    },

    toggleVisualGrouping() {
      this.visuallyGrouped = !this.visuallyGrouped
      saveToStorage('sqlLogVisuallyGrouped', this.visuallyGrouped)
    },

    toggleSortOrder() {
      this.sortOrder = this.sortOrder === 'newest' ? 'oldest' : 'newest'
      saveToStorage(STORAGE_KEYS.sortOrder, this.sortOrder)
    },

    setSortOrder(order: 'newest' | 'oldest') {
      this.sortOrder = order
      saveToStorage(STORAGE_KEYS.sortOrder, order)
    },

    // Filter preference persistence
    setTimeWindow(timeWindow: TimeWindow) {
      this.filters.timeWindow = timeWindow
      saveToStorage(STORAGE_KEYS.timeWindow, timeWindow)
    },

    setErrorsOnly(errorsOnly: boolean) {
      this.filters.errorsOnly = errorsOnly
      saveToStorage(STORAGE_KEYS.errorsOnly, errorsOnly)
    },

    setQueryPurposes(purposes: Set<QueryPurpose>) {
      this.filters.purposes = purposes
      // Note: Query purposes are not persisted as users may want different filters per session
    },

    getOrderedLogs(): SQLQueryLog[] {
      const ordered: SQLQueryLog[] = []
      for (const id of this.displayOrder) {
        const log = this.flatLogs.get(id)
        if (log) ordered.push(log)
      }
      return ordered
    },

    exportLogs(format: ExportFormat) {
      const now = Date.now()
      const logs = this.getOrderedLogs().filter((log) =>
        logMatchesFilters(log, this.filters, this.currentTabId, { respectTimeWindow: true, now })
      )
      if (logs.length === 0) return

      const records = logs.map((log) => ({
        startedAt: new Date(log.startedAt).toISOString(),
        purpose: log.purpose,
        database: log.database,
        query: log.query.replace(/\s+/g, ' ').trim(),
        durationMs: log.durationMs,
        rowCount: log.rowCount,
        error: log.error ?? ''
      }))

      let payload = ''
      let extension = 'log'
      let mime = 'text/plain'

      if (format === 'json') {
        payload = JSON.stringify(records, null, 2)
        extension = 'json'
        mime = 'application/json'
      } else if (format === 'csv') {
        const header = EXPORT_FIELD_DEFS.map((field) => csvEscape(field.label)).join(',')
        const rows = records.map((record) =>
          EXPORT_FIELD_DEFS.map((field) => csvEscape(String(record[field.key] ?? ''))).join(',')
        )
        payload = [header, ...rows].join('\n')
        extension = 'csv'
      } else {
        const header = EXPORT_FIELD_DEFS.map((field) => field.label).join('\t')
        const rows = records.map((record) =>
          EXPORT_FIELD_DEFS.map((field) => String(record[field.key] ?? '')).join('\t')
        )
        payload = [header, ...rows].join('\n')
      }

      downloadFile(payload, extension, mime)
    },

    // Structured logging methods for new SSE service
    addSystemLog(log: StandardLogEntry) {
      // Convert StandardLogEntry to SystemLog format
      this.addLog({
        message: log.message,
        level: log.level,
        timestamp: new Date(log.timestamp).getTime(),
        source: log.type,
        type: log.type,
        nodeId: log.nodeId,
        streamId: log.streamId,
        category: log.category,
        details: {
          category: log.category,
          caller: log.caller,
          ...log.extra
        }
      })
    },

    addStreamLog(log: StandardLogEntry) {
      // Debug: Log what's being received for progress/stat logs
      if (log.category === 'progress' || log.category === 'stat') {
        console.debug('📥 SSE Log received:', {
          category: log.category,
          message: log.message,
          messageLength: log.message?.length || 0,
          messageIsWhitespace: log.message?.trim().length === 0,
          ...(log.category === 'progress' && {
            stage: log.stage,
            description: log.description,
            percentage: log.percentage
          }),
          ...(log.category === 'stat' && {
            table: log.table,
            status: log.status,
            events: log.events,
            size: log.size,
            rate: log.rate
          }),
          nodeId: log.nodeId,
          type: log.type,
          timestamp: log.timestamp
        })
      }

      const baseLog = {
        message: log.message,
        level: 'info' as LogLevel,
        timestamp: new Date(log.timestamp).getTime(),
        source: log.type,
        type: log.type,
        nodeId: log.nodeId,
        streamId: log.streamId,
        category: log.category,
        details: log.extra
      }

      if (log.category === 'progress') {
        const progressLog = {
          ...baseLog,
          category: 'progress' as const,
          // Progress-specific fields
          ...(log.stage !== undefined && { stage: log.stage }),
          ...(log.percentage !== undefined && { percentage: log.percentage }),
          ...(log.description !== undefined && { description: log.description })
        }
        console.debug('➕ Adding progress log to store:', {
          message: progressLog.message,
          stage: progressLog.stage,
          logsCountBefore: this.logs.length
        })
        this.addLog(progressLog)
        console.debug('✅ Progress log added. New count:', this.logs.length)

        // Send progress to monitoring store to update stage
        const monitoringStore = useMonitoringStore()
        monitoringStore.addLog({
          id: Date.now(),
          type: log.type,
          nodeID: log.nodeId || '',
          msg: log.message,
          level: 'info',
          ts: new Date(log.timestamp).getTime(),
          category: 'progress',
          stage: log.stage,
          description: log.description
        })
      } else if (log.category === 'stat') {
        const statLog = {
          ...baseLog,
          category: 'stat' as const,
          // Stat-specific fields
          table: log.table,
          events: log.events,
          size: log.size,
          rate: log.rate,
          elapsed: log.elapsed,
          status: log.status
        }
        console.debug('➕ Adding stat log to store:', {
          message: statLog.message,
          table: statLog.table,
          status: statLog.status,
          logsCountBefore: this.logs.length
        })
        this.addLog(statLog)
        console.debug('✅ Stat log added. New count:', this.logs.length)

        // Also send to monitoring store for Stream Performance panel
        const monitoringStore = useMonitoringStore()
        monitoringStore.addLog({
          id: Date.now(),
          type: log.type,
          nodeID: log.nodeId || '',
          msg: log.message,
          status: log.status,
          level: 'info',
          ts: new Date(log.timestamp).getTime(),
          table: log.table,
          events: log.events,
          size: log.size,
          rate: log.rate,
          elapsed: log.elapsed,
          category: 'stat'
        })
      }
    }
  }
})

function csvEscape(value: string): string {
  if (/["\n,\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function downloadFile(content: string, extension: string, mime: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([content], { type: mime }))
  link.download = `sql-logs-${timestamp}.${extension}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}
