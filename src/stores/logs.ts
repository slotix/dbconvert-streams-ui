import { defineStore } from 'pinia'
import {
  getStreamLogs,
  getLoggingSettings,
  updateLoggingSettings,
  type LoggingSettings
} from '@/api/apiClient'
import type { StandardLogEntry } from '@/types/logs'
import { useMonitoringStore } from '@/stores/monitoring'
import { useCommonStore } from '@/stores/common'
import type { LogLevel, LogCategory, NodeType, Status } from '@/constants'
import { STORAGE_KEYS, getStorageValue, setStorageValue } from '@/constants/storageKeys'

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
  status?: Status
  events?: number
  size?: string
  rate?: string
  elapsed?: number
}

export interface SystemLogTab {
  id: string // Format: "{streamId}:{timestamp}" or "general"
  streamId: string | null // null for General tab
  timestamp: number | null // null for General tab
  label: string // e.g., "General" or "34nuw...qnuic - 21:48" (shortened for display)
  fullLabel?: string // Full label for tooltip, e.g., "34nuw6KMR7XFQARG5W5xtRqnuic - 21:48"
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
export type SQLCaptureMode = 'off' | 'minimal' | 'verbose'

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

export interface RuntimeLoggingSettings {
  sqlCaptureMode: SQLCaptureMode
  forwardSQLLogs: boolean
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

function normalizeSQLCaptureMode(mode: unknown): SQLCaptureMode {
  if (mode === 'off' || mode === 'verbose') {
    return mode
  }
  return 'minimal'
}

function normalizeRuntimeLoggingSettings(input: Partial<LoggingSettings>): RuntimeLoggingSettings {
  const sqlCaptureMode = normalizeSQLCaptureMode(input.sqlCaptureMode)
  return {
    sqlCaptureMode,
    forwardSQLLogs: sqlCaptureMode !== 'off'
  }
}

export const useLogsStore = defineStore('logs', {
  state: () => {
    const savedRuntimeSettings = normalizeRuntimeLoggingSettings({
      sqlCaptureMode: getStorageValue<SQLCaptureMode>(
        STORAGE_KEYS.LOGGING_SQL_CAPTURE_MODE,
        'minimal'
      )
    })

    return {
      logs: [] as SystemLog[],
      maxLogs: 1000,
      isLogsPanelOpen: false,
      panelHeight: '50vh',
      selectedStreamId: '', // For filtering logs by stream in historical view
      historicalLogsMap: new Map<string, SystemLog[]>(), // Historical logs keyed by tabId
      maxHistoricalTabs: 5, // Limit number of historical log tabs to conserve memory
      isLoadingHistoricalLogs: false, // Loading state for API fetch

      // System Logs Tabs
      systemLogTabs: new Map<string, SystemLogTab>([
        ['general', { id: 'general', streamId: null, timestamp: null, label: 'General' }]
      ]),
      selectedSystemLogTabId: 'general' as string,
      systemLogTabRunTimestamps: new Map<string, number>(), // streamId -> run start timestamp

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
        timeWindow: getStorageValue<TimeWindow>(STORAGE_KEYS.LOGS_TIME_WINDOW, 'session'),
        searchText: '', // Not persisted - session specific
        errorsOnly: getStorageValue<boolean>(STORAGE_KEYS.LOGS_ERRORS_ONLY, false),
        currentTabOnly: false // Not persisted - session specific
      } as LogFilters,

      // Limits
      maxLogsPerTab: 500,
      maxLogsSession: 5000,

      // UI state (with persisted preferences)
      currentTabId: null as string | null,
      collapsedLocations: new Set<string>(), // Locations that are collapsed when visuallyGrouped is true
      visuallyGrouped: getStorageValue<boolean>(STORAGE_KEYS.LOGS_VISUALLY_GROUPED, true), // Show location headers
      sortOrder: getStorageValue<'newest' | 'oldest'>(STORAGE_KEYS.LOGS_SORT_ORDER, 'newest'),

      // Global logging runtime settings (backed by API + local persistence)
      runtimeLoggingSettings: savedRuntimeSettings as RuntimeLoggingSettings,
      runtimeLoggingLoaded: false,
      runtimeLoggingSaving: false,
      runtimeLoggingError: ''
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

    // Check if current tab has historical logs (loaded from API)
    isCurrentTabHistorical: (state) => {
      return state.historicalLogsMap.has(state.selectedSystemLogTabId)
    },

    // Get historical logs for a specific tab
    getHistoricalLogsForTab: (state) => (tabId: string) => {
      return state.historicalLogsMap.get(tabId) || []
    },

    // Total SQL logs count (for sidebar badge)
    sqlLogsCount: (state) => {
      return state.flatLogs.size
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

      // Auto-create tab for new streamIds
      if (log.streamId && !this.systemLogTabRunTimestamps.has(log.streamId)) {
        const streamRunTimestamp = log.timestamp

        // Remove "stream_" prefix if present
        const cleanStreamId = log.streamId.startsWith('stream_')
          ? log.streamId.slice(7)
          : log.streamId

        // Create shortened ID: first 5 chars + ... + last 6 chars
        const shortStreamId =
          cleanStreamId.length > 15
            ? `${cleanStreamId.slice(0, 5)}...${cleanStreamId.slice(-6)}`
            : cleanStreamId

        // Format timestamp as HH:MM:SS
        const date = new Date(streamRunTimestamp)
        const timeLabel = date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
        const label = `${shortStreamId} - ${timeLabel}`
        const fullLabel = `${cleanStreamId} - ${timeLabel}` // Full ID for tooltip

        this.addSystemLogTab(log.streamId, streamRunTimestamp, label, fullLabel)
      }
    },

    clearLogs() {
      this.logs = []
    },

    // System Logs Tab Management
    addSystemLogTab(streamId: string, runTimestamp: number, label: string, fullLabel?: string) {
      const tabId = `${streamId}:${runTimestamp}`
      if (!this.systemLogTabs.has(tabId)) {
        this.systemLogTabs.set(tabId, {
          id: tabId,
          streamId,
          timestamp: runTimestamp,
          label,
          fullLabel
        })
        this.systemLogTabRunTimestamps.set(streamId, runTimestamp)
        this.selectedSystemLogTabId = tabId // Switch to new tab
      }
    },

    removeSystemLogTab(tabId: string) {
      if (tabId === 'general') return // Cannot remove general tab
      this.systemLogTabs.delete(tabId)

      // Clean up historical logs for this tab
      this.historicalLogsMap.delete(tabId)

      // If we removed the selected tab, select General
      if (this.selectedSystemLogTabId === tabId) {
        this.selectedSystemLogTabId = 'general'
      }
    },

    selectSystemLogTab(tabId: string) {
      if (this.systemLogTabs.has(tabId)) {
        this.selectedSystemLogTabId = tabId
      }
    },

    clearSystemLogTabs() {
      // Keep only General tab
      this.systemLogTabs.clear()
      this.systemLogTabs.set('general', {
        id: 'general',
        streamId: null,
        timestamp: null,
        label: 'General'
      })
      this.selectedSystemLogTabId = 'general'
      this.systemLogTabRunTimestamps.clear()
      this.historicalLogsMap.clear()
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

      try {
        // Fetch logs from the API
        const rawLogs = await getStreamLogs(streamId)

        // Get the run timestamp from the first log
        let runTimestamp = Date.now()
        if (rawLogs.length > 0) {
          const firstLog = rawLogs[0]
          // timestamp field is in ISO8601 format from backend
          if (firstLog.timestamp) {
            runTimestamp = new Date(firstLog.timestamp as string).getTime()
          }
        }

        // Convert raw logs to SystemLog format
        const historicalLogs = rawLogs.map((log, index) => ({
          id: Date.now() + index,
          message: (log.msg as string) || (log.message as string) || '',
          level: ((log.level as string) || 'info') as LogLevel,
          timestamp: log.timestamp ? new Date(log.timestamp as string).getTime() : Date.now(),
          source: (log.caller as string) || undefined,
          type: log.type as NodeType | undefined,
          nodeId: log.nodeId as string | undefined,
          streamId: ((log.streamId as string) || streamId) as string,
          category: log.category as LogCategory | undefined,
          table: log.table as string | undefined,
          status: log.status as Status | undefined,
          events: log.events as number | undefined,
          size: log.size as string | undefined,
          rate: log.rate as string | undefined,
          elapsed: log.elapsed as number | undefined,
          details: log
        }))

        // Create a system log tab for this run
        const cleanStreamId = streamId.startsWith('stream_') ? streamId.slice(7) : streamId
        const shortStreamId =
          cleanStreamId.length > 15
            ? `${cleanStreamId.slice(0, 5)}...${cleanStreamId.slice(-6)}`
            : cleanStreamId

        const date = new Date(runTimestamp)
        const timeLabel = date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
        const label = `${shortStreamId} - ${timeLabel}`
        const fullLabel = `${cleanStreamId} - ${timeLabel}`

        const tabId = `${streamId}:${runTimestamp}`

        // Enforce tab limit: remove oldest historical tab if at limit
        const historicalTabIds = Array.from(this.systemLogTabs.keys()).filter(
          (id) => id !== 'general' && this.historicalLogsMap.has(id)
        )
        if (historicalTabIds.length >= this.maxHistoricalTabs) {
          // Remove the oldest historical tab (first one in the map)
          const oldestTabId = historicalTabIds[0]
          this.removeSystemLogTab(oldestTabId)
        }

        // Store historical logs for this tab
        this.historicalLogsMap.set(tabId, historicalLogs)

        // Add the tab and select it
        this.addSystemLogTab(streamId, runTimestamp, label, fullLabel)

        this.selectedStreamId = streamId

        // Open the panel
        if (!this.isLogsPanelOpen) {
          this.isLogsPanelOpen = true
        }
      } catch (error) {
        console.error('Failed to load historical logs:', error)
      } finally {
        this.isLoadingHistoricalLogs = false
      }
    },

    clearHistoricalLogs() {
      this.historicalLogsMap.clear()
    },

    // Phase 2: SQL Logs Actions
    addSQLLog(log: SQLQueryLog) {
      if (this.runtimeLoggingSettings.sqlCaptureMode === 'off') {
        return
      }

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
      setStorageValue(STORAGE_KEYS.LOGS_VISUALLY_GROUPED, this.visuallyGrouped)
    },

    toggleSortOrder() {
      this.sortOrder = this.sortOrder === 'newest' ? 'oldest' : 'newest'
      setStorageValue(STORAGE_KEYS.LOGS_SORT_ORDER, this.sortOrder)
    },

    setSortOrder(order: 'newest' | 'oldest') {
      this.sortOrder = order
      setStorageValue(STORAGE_KEYS.LOGS_SORT_ORDER, order)
    },

    // Filter preference persistence
    setTimeWindow(timeWindow: TimeWindow) {
      this.filters.timeWindow = timeWindow
      setStorageValue(STORAGE_KEYS.LOGS_TIME_WINDOW, timeWindow)
    },

    setErrorsOnly(errorsOnly: boolean) {
      this.filters.errorsOnly = errorsOnly
      setStorageValue(STORAGE_KEYS.LOGS_ERRORS_ONLY, errorsOnly)
    },

    setQueryPurposes(purposes: Set<QueryPurpose>) {
      this.filters.purposes = purposes
      // Note: Query purposes are not persisted as users may want different filters per session
    },

    async loadRuntimeLoggingSettings(force = false) {
      if (this.runtimeLoggingLoaded && !force) return

      this.runtimeLoggingError = ''
      try {
        const settings = normalizeRuntimeLoggingSettings(await getLoggingSettings())
        this.runtimeLoggingSettings = settings
        this.runtimeLoggingLoaded = true
        setStorageValue(STORAGE_KEYS.LOGGING_SQL_CAPTURE_MODE, settings.sqlCaptureMode)
      } catch (error) {
        this.runtimeLoggingError = error instanceof Error ? error.message : String(error)
      }
    },

    async applyPersistedRuntimeLoggingSettings() {
      const desired = normalizeRuntimeLoggingSettings({
        sqlCaptureMode: this.runtimeLoggingSettings.sqlCaptureMode
      })

      this.runtimeLoggingSaving = true
      this.runtimeLoggingError = ''

      try {
        const payload: Partial<LoggingSettings> = {
          sqlCaptureMode: desired.sqlCaptureMode
        }
        const updated = normalizeRuntimeLoggingSettings(await updateLoggingSettings(payload))
        this.runtimeLoggingSettings = updated
        this.runtimeLoggingLoaded = true
        setStorageValue(STORAGE_KEYS.LOGGING_SQL_CAPTURE_MODE, updated.sqlCaptureMode)
      } catch (error) {
        this.runtimeLoggingError = error instanceof Error ? error.message : String(error)
      } finally {
        this.runtimeLoggingSaving = false
      }
    },

    async updateRuntimeLoggingSettings(patch: Partial<RuntimeLoggingSettings>) {
      const previous = this.runtimeLoggingSettings
      const merged = normalizeRuntimeLoggingSettings({
        ...previous,
        ...patch
      })

      this.runtimeLoggingSettings = merged
      this.runtimeLoggingSaving = true
      this.runtimeLoggingError = ''

      try {
        const payload: Partial<LoggingSettings> = {
          sqlCaptureMode: merged.sqlCaptureMode
        }
        const updated = normalizeRuntimeLoggingSettings(await updateLoggingSettings(payload))
        this.runtimeLoggingSettings = updated
        this.runtimeLoggingLoaded = true
        setStorageValue(STORAGE_KEYS.LOGGING_SQL_CAPTURE_MODE, updated.sqlCaptureMode)
      } catch (error) {
        this.runtimeLoggingSettings = previous
        this.runtimeLoggingError = error instanceof Error ? error.message : String(error)
        throw error
      } finally {
        this.runtimeLoggingSaving = false
      }
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
      if (log.extra?.event === 'evaluation_warning') {
        const commonStore = useCommonStore()
        const level = log.level === 'warn' ? 'warning' : log.level === 'error' ? 'error' : 'info'
        commonStore.showNotification(log.message, level)

        const monitoringStore = useMonitoringStore()
        const mode = log.extra?.mode
        const threshold = Number(log.extra?.threshold ?? log.extra?.percent ?? 0)
        const percent = Number(log.extra?.percent ?? threshold)
        const used = Number(log.extra?.used ?? 0)
        const limit = Number(log.extra?.limit ?? 0)
        if (log.streamId && (mode === 'convert' || mode === 'cdc') && Number.isFinite(threshold)) {
          monitoringStore.setEvaluationWarning({
            streamId: log.streamId,
            mode,
            threshold,
            percent,
            used,
            limit,
            message: log.message,
            updatedAt: Date.now()
          })
        }
      }

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
        this.addLog(progressLog)

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
          description: log.description,
          streamId: log.streamId // Include streamId to properly filter logs by stream
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
        this.addLog(statLog)

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
          category: 'stat',
          streamId: log.streamId // Include streamId to properly filter logs by stream
        })
      } else if (log.category === 'table_metadata') {
        // Handle table metadata logs (size estimates)
        const monitoringStore = useMonitoringStore()
        monitoringStore.addLog({
          id: Date.now() + Math.random(),
          type: log.type,
          nodeID: log.nodeId || '',
          msg: log.message,
          level: 'info',
          ts: new Date(log.timestamp).getTime(),
          category: 'table_metadata',
          table: log.table,
          estimatedRows: log.estimatedRows,
          estimatedSizeBytes: log.estimatedSizeBytes,
          streamId: log.streamId
        })
      } else if (log.category === 's3_upload') {
        // Handle S3 upload progress logs
        const s3UploadLog = {
          ...baseLog,
          category: 's3_upload' as const,
          table: log.table,
          status: log.status,
          bucket: log.bucket,
          filesTotal: log.filesTotal,
          filesUploaded: log.filesUploaded,
          bytesTotal: log.bytesTotal,
          bytesUploaded: log.bytesUploaded,
          rate: log.rate,
          elapsed: log.elapsed
        }
        this.addLog(s3UploadLog)

        // Forward to monitoring store for S3 upload progress display
        const monitoringStore = useMonitoringStore()
        monitoringStore.addLog({
          id: Date.now() + Math.random(),
          type: log.type,
          nodeID: log.nodeId || '',
          msg: log.message,
          level: 'info',
          ts: new Date(log.timestamp).getTime(),
          category: 's3_upload',
          table: log.table,
          status: log.status,
          bucket: log.bucket,
          filesTotal: log.filesTotal,
          filesUploaded: log.filesUploaded,
          bytesTotal: log.bytesTotal,
          bytesUploaded: log.bytesUploaded,
          rate: log.rate,
          elapsed: log.elapsed,
          streamId: log.streamId
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
