import { useLogsStore } from '@/stores/logs'
import { getBackendUrl } from '@/utils/environment'
import type { StandardLogEntry } from '@/types/logs'
import type { Store } from 'pinia'

class SSELogsService {
  private eventSource: EventSource | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000
  private isConnected = false

  connect(sseUrl?: string) {
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
      console.error('Failed to create EventSource:', error)
      this.scheduleReconnect(url)
    }
  }

  private setupEventHandlers(eventSource: EventSource, logsStore: Store, sseUrl: string) {
    eventSource.addEventListener('open', () => {
      console.log('SSE connection established')
      this.reconnectAttempts = 0
      this.isConnected = true
    })

    eventSource.addEventListener('message', (event: MessageEvent) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = JSON.parse(event.data)

        // Check if this is a SQL log (has connectionId, query, purpose)
        if (data.connectionId && data.query && data.purpose) {
          // Route SQL log directly
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(logsStore as any).addSQLLog(data)
          return
        }

        // Otherwise, treat as structured log entry
        const log: StandardLogEntry = data

        // Validate required fields for structured logs
        if (!log.level || !log.type || !log.message) {
          console.warn('Incomplete log entry received:', {
            hasLevel: !!log.level,
            hasType: !!log.type,
            hasMessage: !!log.message
          })
          return
        }

        // Ensure timestamp is present
        if (!log.timestamp) {
          log.timestamp = new Date().toISOString()
        }

        // Route log based on category
        this.routeLog(log, logsStore)
      } catch (error) {
        console.error('Failed to parse structured log:', error, event.data)
      }
    })

    eventSource.addEventListener('error', (error) => {
      console.error('SSE connection error:', error)

      if (eventSource.readyState === EventSource.CLOSED) {
        this.isConnected = false
        this.scheduleReconnect(sseUrl)
      }
    })
  }

  private routeLog(log: StandardLogEntry, logsStore: Store) {
    // Route to appropriate store method based on category
    switch (log.category) {
      case 'sql':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(logsStore as any).addSQLLog(log)
        break

      case 'stat':
      case 'progress':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(logsStore as any).addStreamLog(log)
        break

      case 'error':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(logsStore as any).addSystemLog(log)
        // Also log errors to console for visibility
        console.error(`[${log.type}] ${log.message}`, log)
        break

      default:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(logsStore as any).addSystemLog(log)
    }
  }

  private scheduleReconnect(sseUrl: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * this.reconnectAttempts

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    setTimeout(() => {
      this.connect(sseUrl)
    }, delay)
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
      this.isConnected = false
      console.log('SSE connection closed')
    }
  }

  isActive(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN
  }
}

export const sseLogsService = new SSELogsService()
