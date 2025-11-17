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
  private backendAvailable = true // Track backend availability

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
      // Only log if backend is expected to be available
      if (this.backendAvailable) {
        console.error('Failed to create EventSource:', error)
      }
      this.scheduleReconnect(url)
    }
  }

  private setupEventHandlers(eventSource: EventSource, logsStore: Store, sseUrl: string) {
    eventSource.addEventListener('open', () => {
      // Only log if this is a new connection or reconnection after failure
      if (!this.isConnected) {
        console.log('SSE connection established')
      }
      this.reconnectAttempts = 0
      this.isConnected = true
      this.backendAvailable = true
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

  private routeLog(log: StandardLogEntry, logsStore: Store) {
    // Route to appropriate store method based on category
    switch (log.category) {
      case 'sql':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(logsStore as any).addSQLLog(log)
        break

      case 'stat':
      case 'progress':
      case 'table_metadata':
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

    setTimeout(() => {
      this.connect(sseUrl)
    }, delay)
  }

  disconnect() {
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
