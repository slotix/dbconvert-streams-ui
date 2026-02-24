import { useLogsStore } from '@/stores/logs'
import { getBackendUrl } from '@/utils/environment'
import type { StandardLogEntry } from '@/types/logs'
import type { SQLQueryLog } from '@/stores/logs'
import { LOG_CATEGORIES, LOG_LEVELS, NODE_TYPES } from '@/constants'

type LogsStoreActions = Pick<
  ReturnType<typeof useLogsStore>,
  'addSQLLog' | 'addStreamLog' | 'addSystemLog'
>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isLogLevel(value: unknown): value is StandardLogEntry['level'] {
  return (
    value === LOG_LEVELS.DEBUG ||
    value === LOG_LEVELS.INFO ||
    value === LOG_LEVELS.WARN ||
    value === LOG_LEVELS.ERROR
  )
}

function isNodeType(value: unknown): value is StandardLogEntry['type'] {
  return value === NODE_TYPES.API || value === NODE_TYPES.SOURCE || value === NODE_TYPES.TARGET
}

function isLogCategory(value: unknown): value is NonNullable<StandardLogEntry['category']> {
  return (
    value === LOG_CATEGORIES.GENERAL ||
    value === LOG_CATEGORIES.PROGRESS ||
    value === LOG_CATEGORIES.STAT ||
    value === LOG_CATEGORIES.TABLE_METADATA ||
    value === LOG_CATEGORIES.SQL ||
    value === LOG_CATEGORIES.ERROR ||
    value === LOG_CATEGORIES.DEBUG ||
    value === LOG_CATEGORIES.S3_UPLOAD
  )
}

function parseSQLLog(payload: unknown): SQLQueryLog | null {
  if (!isRecord(payload)) {
    return null
  }

  const id = payload.id
  const connectionId = payload.connectionId
  const database = payload.database
  const query = payload.query
  const purpose = payload.purpose
  const startedAt = payload.startedAt
  const durationMs = payload.durationMs
  const rowCount = payload.rowCount

  if (
    !isString(id) ||
    !isString(connectionId) ||
    !isString(database) ||
    !isString(query) ||
    !isString(purpose) ||
    !isString(startedAt) ||
    !isNumber(durationMs) ||
    !isNumber(rowCount)
  ) {
    return null
  }

  return {
    id,
    connectionId,
    database,
    query,
    purpose: purpose as SQLQueryLog['purpose'],
    startedAt,
    durationMs,
    rowCount,
    tabId: isString(payload.tabId) ? payload.tabId : undefined,
    schema: isString(payload.schema) ? payload.schema : undefined,
    tableName: isString(payload.tableName) ? payload.tableName : undefined,
    params: Array.isArray(payload.params) ? payload.params : undefined,
    error: isString(payload.error) ? payload.error : undefined,
    redacted: typeof payload.redacted === 'boolean' ? payload.redacted : undefined
  }
}

function isStandardLogEntry(payload: unknown): payload is StandardLogEntry {
  if (!isRecord(payload)) {
    return false
  }

  const level = payload.level
  const timestamp = payload.timestamp
  const message = payload.message
  const type = payload.type

  if (!isLogLevel(level) || !isString(timestamp) || !isString(message) || !isNodeType(type)) {
    return false
  }

  if (payload.category !== undefined && !isLogCategory(payload.category)) {
    return false
  }

  return true
}

class SSELogsService {
  private eventSource: EventSource | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000
  private isConnected = false
  private backendAvailable = true // Track backend availability

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  connect(sseUrl?: string) {
    this.clearReconnectTimer()

    if (this.eventSource) {
      this.disconnect()
    }

    const logsStore = useLogsStore()
    const url = sseUrl || `${getBackendUrl()}/logs/stream`

    try {
      this.eventSource = new EventSource(url)
      this.setupEventHandlers(this.eventSource, logsStore, url)
      this.reconnectAttempts = 0
    } catch (error) {
      // Only log if backend is expected to be available
      if (this.backendAvailable) {
        console.error('Failed to create EventSource:', error)
      }
      this.scheduleReconnect(url)
    }
  }

  private setupEventHandlers(
    eventSource: EventSource,
    logsStore: LogsStoreActions,
    sseUrl: string
  ) {
    eventSource.addEventListener('open', () => {
      // Only log if this is a new connection or reconnection after failure
      if (!this.isConnected) {
        // console.log('SSE connection established')
      }
      this.reconnectAttempts = 0
      this.isConnected = true
      this.backendAvailable = true
    })

    eventSource.addEventListener('message', (event: MessageEvent) => {
      try {
        const data: unknown = JSON.parse(event.data)

        const sqlLog = parseSQLLog(data)
        if (sqlLog) {
          logsStore.addSQLLog(sqlLog)
          return
        }

        if (!isStandardLogEntry(data)) {
          console.warn('Incomplete structured log entry received:', data)
          return
        }

        // Route log based on category
        this.routeLog(data, logsStore)
      } catch (error) {
        console.error('Failed to parse structured log:', error, event.data)
      }
    })

    eventSource.addEventListener('error', (_error) => {
      // Only log errors if we think backend should be available
      // This prevents console spam when backend is known to be down
      if (this.backendAvailable && this.isConnected) {
        console.warn('Browser connection failed, will retry: Connection closed')
      }

      if (eventSource.readyState === EventSource.CLOSED) {
        this.isConnected = false
        this.scheduleReconnect(sseUrl)
      }
    })
  }

  private routeLog(log: StandardLogEntry, logsStore: LogsStoreActions) {
    // Route to appropriate store method based on category
    switch (log.category) {
      case 'sql':
        {
          const sqlLog = parseSQLLog(log)
          if (!sqlLog) {
            console.warn('Incomplete SQL log entry received:', log)
            return
          }
          logsStore.addSQLLog(sqlLog)
        }
        break

      case 'stat':
      case 'progress':
      case 'table_metadata':
      case 's3_upload':
        logsStore.addStreamLog(log)
        break

      case 'error':
        logsStore.addSystemLog(log)
        // Also log errors to console for visibility
        console.error(`[${log.type}] ${log.message}`, log)
        break

      default:
        logsStore.addSystemLog(log)
    }
  }

  private scheduleReconnect(sseUrl: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // Silently mark backend as unavailable after max attempts
      this.backendAvailable = false
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * this.reconnectAttempts

    // Only log if backend is expected to be available
    if (this.backendAvailable) {
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
    }

    this.clearReconnectTimer()
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect(sseUrl)
    }, delay)
  }

  disconnect() {
    this.clearReconnectTimer()

    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
      this.isConnected = false
      // Only log if this is an intentional disconnect (not due to backend being down)
      if (this.backendAvailable) {
        console.log('SSE connection closed')
      }
    }
  }

  // Method to notify SSE service about backend status
  setBackendAvailable(available: boolean) {
    this.backendAvailable = available

    // Reset reconnect attempts when backend becomes available
    if (available) {
      this.reconnectAttempts = 0
    }
  }

  isActive(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN
  }
}

export const sseLogsService = new SSELogsService()
