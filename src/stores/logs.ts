import { defineStore } from 'pinia'

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
export type LoggingLevel = 'minimal' | 'normal' | 'debug'
export type QueryPurpose =
  | 'USER_DATA'
  | 'USER_ACTION'
  | 'METADATA'
  | 'PAGINATION'
  | 'ESTIMATE'
  | 'EXPLAIN'
  | 'BACKGROUND_SYNC'

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
  queryType: string
  purpose: QueryPurpose
  triggerSource?: string
  startedAt: string
  durationMs: number
  rowCount: number
  error?: string
  groupId?: string
  parentGroupId?: string
  repeatCount?: number
  redacted?: boolean
}

export interface QueryGroup {
  groupId: string
  type: 'table-open' | 'repeated' | 'metadata' | 'pagination'
  summary: string
  queryCount: number
  totalDurationMs: number
  queryIds: string[]
  collapsed: boolean
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

  let shouldShow = true
  switch (filters.level) {
    case 'minimal':
      shouldShow = log.purpose === 'USER_DATA' || log.purpose === 'USER_ACTION'
      break
    case 'normal':
      if (log.purpose === 'BACKGROUND_SYNC' && !log.error) {
        shouldShow = false
      }
      break
    case 'debug':
      shouldShow = true
      break
  }

  if (!shouldShow) return false

  if (!filters.purposes.has(log.purpose)) return false

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
  state: () => ({
    logs: [] as SystemLog[],
    maxLogs: 1000,
    isLogsPanelOpen: false,
    panelHeight: '50vh',
    // Keep track of recent messages to prevent duplicates
    recentMessages: new Map<string, { count: number; timestamp: number }>(),

    // Phase 2: SQL Logs
    flatLogs: new Map<string, SQLQueryLog>(), // id -> log
    groups: new Map<string, QueryGroup>(), // groupId -> group
    displayOrder: [] as string[], // IDs in chronological order

    // Filters
    filters: {
      level: 'normal' as LoggingLevel,
      purposes: new Set<QueryPurpose>([
        'USER_DATA',
        'USER_ACTION',
        'METADATA',
        'PAGINATION',
        'ESTIMATE',
        'EXPLAIN'
      ]),
      timeWindow: 'session' as TimeWindow,
      searchText: '',
      errorsOnly: false,
      currentTabOnly: false
    } as LogFilters,

    // Limits
    maxLogsPerTab: 500,
    maxLogsSession: 5000,

    // UI state
    currentTabId: null as string | null,
    expandedGroups: new Set<string>(),
    expandedQueries: new Set<string>(),
    viewMode: 'grouped' as 'grouped' | 'flat'
  }),

  getters: {
    filteredLogs: (state) => (level?: keyof LogLevel) => {
      if (!level) return state.logs
      return state.logs.filter((log) => log.level === level)
    },

    hasErrors: (state) => {
      return state.logs.some((log) => log.level === 'error')
    },

    // Phase 2: SQL Logs Getters
    visibleLogs(): (SQLQueryLog | QueryGroup)[] {
      const filtered: SQLQueryLog[] = []
      const now = Date.now()

      for (const log of this.flatLogs.values()) {
        if (logMatchesFilters(log, this.filters, this.currentTabId, { now })) {
          filtered.push(log)
        }
      }

      // Build display tree
      const result: (SQLQueryLog | QueryGroup)[] = []
      const processedGroups = new Set<string>()

      for (const log of filtered) {
        if (log.groupId && !processedGroups.has(log.groupId)) {
          const group = this.groups.get(log.groupId)
          if (group) {
            result.push(group)
            processedGroups.add(log.groupId)
          } else {
            result.push(log)
          }
        } else if (!log.groupId) {
          result.push(log)
        }
      }

      return result
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

      // Handle grouping
      if (log.groupId) {
        this.updateGroup(log)
      }
    },

    addGroup(group: QueryGroup) {
      this.groups.set(group.groupId, group)

      // Auto-collapse based on type
      if (group.type === 'metadata' || group.type === 'pagination') {
        group.collapsed = true
      } else if (group.hasErrors) {
        group.collapsed = false
        this.expandedGroups.add(group.groupId)
      }
    },

    updateGroup(log: SQLQueryLog) {
      if (!log.groupId) return

      let group = this.groups.get(log.groupId)
      if (!group) {
        // Create new group
        group = {
          groupId: log.groupId,
          type: this.inferGroupType(log),
          summary: this.buildGroupSummary(log),
          queryCount: 0,
          totalDurationMs: 0,
          queryIds: [],
          collapsed: false,
          hasErrors: false
        }
        this.groups.set(log.groupId, group)
      }

      group.queryCount++
      group.totalDurationMs += log.durationMs
      group.queryIds.push(log.id)

      if (log.error) {
        group.hasErrors = true
        group.collapsed = false
      }
    },

    inferGroupType(log: SQLQueryLog): QueryGroup['type'] {
      if (log.purpose === 'METADATA') return 'metadata'
      if (log.purpose === 'PAGINATION') return 'pagination'
      if (log.repeatCount && log.repeatCount > 1) return 'repeated'
      return 'table-open'
    },

    buildGroupSummary(log: SQLQueryLog): string {
      if (log.purpose === 'METADATA') return 'Schema introspection'
      if (log.purpose === 'PAGINATION') return 'Grid pagination'
      if (log.repeatCount && log.repeatCount > 1) return `Repeated query ×${log.repeatCount}`
      const table = log.tableName || 'table'
      return `Opened ${log.database}.${table}`
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

    toggleGroup(groupId: string) {
      if (this.expandedGroups.has(groupId)) {
        this.expandedGroups.delete(groupId)
      } else {
        this.expandedGroups.add(groupId)
      }
    },

    toggleQuery(queryId: string) {
      if (this.expandedQueries.has(queryId)) {
        this.expandedQueries.delete(queryId)
      } else {
        this.expandedQueries.add(queryId)
      }
    },

    clearSQLLogs() {
      this.flatLogs.clear()
      this.groups.clear()
      this.displayOrder = []
      this.expandedGroups.clear()
      this.expandedQueries.clear()
    },

    setViewMode(mode: 'grouped' | 'flat') {
      this.viewMode = mode
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
