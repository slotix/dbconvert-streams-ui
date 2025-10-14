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
  | 'METADATA'
  | 'DATA_FETCH'
  | 'COUNT_ESTIMATE'
  | 'PLAN_ANALYSIS'
  | 'DDL_MANAGEMENT'
  | 'BACKGROUND_TASK'
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
  type:
    | 'metadata'
    | 'data-fetch'
    | 'count-estimate'
    | 'plan-analysis'
    | 'ddl-management'
    | 'background-task'
    | 'utility'
    | 'repeated'
    | 'unknown'
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

  // Level-based filtering
  switch (filters.level) {
    case 'minimal':
      // Only show user-focused activity (data fetches and quick counts)
      if (log.purpose !== 'DATA_FETCH' && log.purpose !== 'COUNT_ESTIMATE') {
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
      groups: new Map<string, QueryGroup>(), // groupId -> group
      displayOrder: [] as string[], // IDs in chronological order

      // Filters (with persisted preferences)
      filters: {
        level: loadFromStorage<LoggingLevel>(STORAGE_KEYS.level, 'normal'),
        purposes: new Set<QueryPurpose>([
          'METADATA',
          'DATA_FETCH',
          'COUNT_ESTIMATE',
          'PLAN_ANALYSIS',
          'DDL_MANAGEMENT',
          'BACKGROUND_TASK',
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
      expandedGroups: new Set<string>(),
      expandedQueries: new Set<string>(),
      viewMode: loadFromStorage<'grouped' | 'flat'>(STORAGE_KEYS.viewMode, 'grouped'),
      sortOrder: loadFromStorage<'newest' | 'oldest'>(STORAGE_KEYS.sortOrder, 'newest'),
      lastAutoExpandedGroupId: null as string | null
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
    visibleLogs(): (SQLQueryLog | QueryGroup)[] {
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
      if (
        group.type === 'metadata' ||
        group.type === 'background-task' ||
        group.type === 'utility'
      ) {
        group.collapsed = true
      } else {
        group.collapsed = false
      }

      if (group.hasErrors) {
        this.expandedGroups.add(group.groupId)
        this.ensureFirstQueryExpanded(group.groupId)
        this.lastAutoExpandedGroupId = null
        return
      }

      if (!group.collapsed) {
        this.autoExpandGroup(group.groupId)
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
        this.expandedGroups.add(group.groupId)
        this.ensureFirstQueryExpanded(group.groupId)
        this.lastAutoExpandedGroupId = null
      } else if (group.queryCount === 1) {
        // First log in the group - auto expand
        this.autoExpandGroup(group.groupId)
      }
    },

    inferGroupType(log: SQLQueryLog): QueryGroup['type'] {
      if (log.repeatCount && log.repeatCount > 1) return 'repeated'

      switch (log.purpose) {
        case 'METADATA':
          return 'metadata'
        case 'DATA_FETCH':
          return 'data-fetch'
        case 'COUNT_ESTIMATE':
          return 'count-estimate'
        case 'PLAN_ANALYSIS':
          return 'plan-analysis'
        case 'DDL_MANAGEMENT':
          return 'ddl-management'
        case 'BACKGROUND_TASK':
          return 'background-task'
        case 'UTILITY':
          return 'utility'
        default:
          return 'unknown'
      }
    },

    buildGroupSummary(log: SQLQueryLog): string {
      if (log.repeatCount && log.repeatCount > 1) return `Repeated query ×${log.repeatCount}`

      switch (log.purpose) {
        case 'METADATA':
          return 'Schema introspection'
        case 'DATA_FETCH': {
          const table = log.tableName || 'data'
          return `Data fetch for ${log.database}.${table}`
        }
        case 'COUNT_ESTIMATE':
          return 'Row count estimate'
        case 'PLAN_ANALYSIS':
          return 'Execution plan analysis'
        case 'DDL_MANAGEMENT':
          return 'Schema management operation'
        case 'BACKGROUND_TASK':
          return 'Background task'
        case 'UTILITY':
          return 'Utility query'
        default: {
          const table = log.tableName || 'table'
          return `Query activity on ${log.database}.${table}`
        }
      }
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
        this.collapseQueriesForGroup(groupId)
        if (this.lastAutoExpandedGroupId === groupId) {
          this.lastAutoExpandedGroupId = null
        }
      } else {
        this.expandedGroups.add(groupId)
        this.ensureFirstQueryExpanded(groupId)
        if (this.lastAutoExpandedGroupId === groupId) {
          this.lastAutoExpandedGroupId = null
        }
      }
    },

    toggleQuery(queryId: string) {
      if (this.expandedQueries.has(queryId)) {
        this.expandedQueries.delete(queryId)
      } else {
        this.expandedQueries.add(queryId)
      }
    },

    autoExpandGroup(groupId: string) {
      const group = this.groups.get(groupId)
      if (!group) return

      if (this.lastAutoExpandedGroupId && this.lastAutoExpandedGroupId !== groupId) {
        this.collapseQueriesForGroup(this.lastAutoExpandedGroupId)
        this.expandedGroups.delete(this.lastAutoExpandedGroupId)
      }

      this.expandedGroups.add(groupId)
      this.ensureFirstQueryExpanded(groupId)
      this.lastAutoExpandedGroupId = groupId
    },

    ensureFirstQueryExpanded(groupId: string) {
      const group = this.groups.get(groupId)
      if (!group || group.queryIds.length === 0) return
      const firstQueryId = group.queryIds[0]
      if (!this.expandedQueries.has(firstQueryId)) {
        this.expandedQueries.add(firstQueryId)
      }
    },

    collapseQueriesForGroup(groupId: string) {
      const group = this.groups.get(groupId)
      if (!group) return
      for (const queryId of group.queryIds) {
        this.expandedQueries.delete(queryId)
      }
    },

    expandAllGroups() {
      for (const [groupId, group] of this.groups.entries()) {
        this.expandedGroups.add(groupId)
        if (group.queryIds.length > 0) {
          this.ensureFirstQueryExpanded(groupId)
        }
      }
      this.lastAutoExpandedGroupId = null
    },

    collapseAllGroups() {
      this.expandedGroups.clear()
      this.expandedQueries.clear()
      this.lastAutoExpandedGroupId = null
    },

    clearSQLLogs() {
      this.flatLogs.clear()
      this.groups.clear()
      this.displayOrder = []
      this.expandedGroups.clear()
      this.expandedQueries.clear()
      this.lastAutoExpandedGroupId = null
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
