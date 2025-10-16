import { defineStore } from 'pinia'

// localStorage keys for user preferences
const STORAGE_KEYS = {
  viewMode: 'sqlLogViewMode',
  sortOrder: 'sqlLogSortOrder',
  level: 'sqlLogLevel',
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

interface LogLevel {
  info: 'info'
  debug: 'debug'
  warn: 'warn'
  error: 'error'
  sql: 'sql'
}

export interface SystemLog {
  id: number
  message: string
  level: keyof LogLevel
  timestamp: number
  source?: string
  nodeId?: string
  details?: Record<string, unknown>
}

// Phase 2: Enhanced SQL Logging Types
export type LoggingLevel = 'minimal' | 'normal'
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
  level: LoggingLevel
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

// Frontend-only group structure (built from location)
export interface LocationGroup {
  location: string // e.g., "sakila.customer", "postgres.private.products"
  queries: SQLQueryLog[]
  queryCount: number
  totalDurationMs: number
  hasErrors: boolean
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

  // Level-based filtering
  switch (filters.level) {
    case 'minimal':
      // Only show user-focused activity (data queries and quick counts)
      if (log.purpose !== 'DATA_QUERY' && log.purpose !== 'COUNT_QUERY') {
        return false
      }
      break
    case 'normal':
      // Check purposes filter
      if (!filters.purposes.has(log.purpose)) {
        return false
      }
      break
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
    // Clean up old unused localStorage keys
    try {
      localStorage.removeItem('sqlLogPurposes')
    } catch (e) {
      // Ignore errors
    }

    return {
      logs: [] as SystemLog[],
      maxLogs: 1000,
      isLogsPanelOpen: false,
      panelHeight: '50vh',
      // Keep track of recent messages to prevent duplicates
      recentMessages: new Map<string, { count: number; timestamp: number }>(),

      // Phase 2: SQL Logs
      flatLogs: new Map<string, SQLQueryLog>(), // id -> log
      displayOrder: [] as string[], // IDs in chronological order

      // Filters (with persisted preferences)
      filters: {
        level: loadFromStorage<LoggingLevel>(STORAGE_KEYS.level, 'normal'),
        purposes: new Set<QueryPurpose>([
          'SCHEMA_INTROSPECTION',
          'DATA_QUERY',
          'COUNT_QUERY',
          'PLAN_ANALYSIS',
          'SCHEMA_CHANGE',
          'DML_OPERATION',
          'SYSTEM_TASK',
          'UTILITY'
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
      expandedLocations: new Set<string>(), // Locations (e.g., "sakila.customer") that are expanded
      expandedQueries: new Set<string>(),
      viewMode: loadFromStorage<'grouped' | 'flat'>(STORAGE_KEYS.viewMode, 'grouped'),
      sortOrder: loadFromStorage<'newest' | 'oldest'>(STORAGE_KEYS.sortOrder, 'newest')
    }
  },

  getters: {
    filteredLogs: (state) => (level?: keyof LogLevel) => {
      if (!level) return state.logs
      return state.logs.filter((log) => log.level === level)
    },

    hasErrors: (state) => {
      return state.logs.some((log) => log.level === 'error')
    },

    // Phase 2: SQL Logs Getters
    visibleLogs(): (SQLQueryLog | LocationGroup)[] {
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

      // If in flat mode, just return the queries
      if (this.viewMode === 'flat') {
        return filtered
      }

      // Build location-based groups
      const locationMap = new Map<string, SQLQueryLog[]>()

      for (const log of filtered) {
        const location = this.getLocationKey(log)
        if (!locationMap.has(location)) {
          locationMap.set(location, [])
        }
        locationMap.get(location)!.push(log)
      }

      // Build result with groups
      const result: (SQLQueryLog | LocationGroup)[] = []
      const processedLocations = new Set<string>()

      for (const log of filtered) {
        const location = this.getLocationKey(log)
        if (!processedLocations.has(location)) {
          processedLocations.add(location)
          const queries = locationMap.get(location)!

          // If only one query for this location, don't group it
          if (queries.length === 1) {
            result.push(log)
          } else {
            // Create group
            const totalDurationMs = queries.reduce((sum, q) => sum + q.durationMs, 0)
            const hasErrors = queries.some((q) => !!q.error)

            result.push({
              location,
              queries,
              queryCount: queries.length,
              totalDurationMs,
              hasErrors
            })
          }
        }
      }

      return result
    },

    // Helper to get location key from a log
    getLocationKey(): (log: SQLQueryLog) => string {
      return (log: SQLQueryLog) => {
        // Build location string: database.schema.table or database.table
        if (log.tableName) {
          if (log.schema) {
            return `${log.database}.${log.schema}.${log.tableName}`
          }
          return `${log.database}.${log.tableName}`
        }
        // Fallback to purpose if no table
        return `${log.database} (${log.purpose})`
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
    getDedupKey(log: SystemLog | Omit<SystemLog, 'id'>): string {
      const sourceType = log.source?.split(':')[0] || 'unknown'
      return `${sourceType}:${log.level}:${log.message}`
    },

    addLog(log: Omit<SystemLog, 'id'>) {
      const now = Date.now()
      const dedupKey = this.getDedupKey(log)
      const recentMessage = this.recentMessages.get(dedupKey)

      // Check if we've seen this message recently (within 2 seconds)
      if (recentMessage && now - recentMessage.timestamp < 2000) {
        // Update the existing log instead of adding a new one
        const existingLog = this.logs.find((l) => this.getDedupKey(l) === dedupKey)
        if (existingLog) {
          recentMessage.count++
          if (recentMessage.count > 1) {
            existingLog.details = {
              ...existingLog.details,
              duplicateCount: recentMessage.count,
              lastTimestamp: log.timestamp
            }
          }
          return
        }
      }

      // Clean up old messages from the dedup cache (older than 5 seconds)
      for (const [key, value] of this.recentMessages.entries()) {
        if (now - value.timestamp > 5000) {
          this.recentMessages.delete(key)
        }
      }

      // Add new message to dedup cache
      this.recentMessages.set(dedupKey, { count: 1, timestamp: now })

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
      this.recentMessages.clear()
    },

    toggleLogsPanel() {
      this.isLogsPanelOpen = !this.isLogsPanelOpen
    },

    updatePanelHeight(height: string) {
      this.panelHeight = height
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
      if (this.expandedLocations.has(location)) {
        this.expandedLocations.delete(location)
      } else {
        this.expandedLocations.add(location)
      }
    },

    toggleQuery(queryId: string) {
      if (this.expandedQueries.has(queryId)) {
        this.expandedQueries.delete(queryId)
      } else {
        this.expandedQueries.add(queryId)
      }
    },

    expandAllGroups() {
      // Expand all locations
      const logs = Array.from(this.flatLogs.values())
      const locations = new Set(logs.map((log) => this.getLocationKey(log)))
      for (const location of locations) {
        this.expandedLocations.add(location)
      }
    },

    collapseAllGroups() {
      this.expandedLocations.clear()
      this.expandedQueries.clear()
    },

    clearSQLLogs() {
      this.flatLogs.clear()
      this.displayOrder = []
      this.expandedLocations.clear()
      this.expandedQueries.clear()
    },

    setViewMode(mode: 'grouped' | 'flat') {
      this.viewMode = mode
      saveToStorage(STORAGE_KEYS.viewMode, mode)
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
    setLevel(level: LoggingLevel) {
      this.filters.level = level
      saveToStorage(STORAGE_KEYS.level, level)
    },

    setTimeWindow(timeWindow: TimeWindow) {
      this.filters.timeWindow = timeWindow
      saveToStorage(STORAGE_KEYS.timeWindow, timeWindow)
    },

    setErrorsOnly(errorsOnly: boolean) {
      this.filters.errorsOnly = errorsOnly
      saveToStorage(STORAGE_KEYS.errorsOnly, errorsOnly)
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
