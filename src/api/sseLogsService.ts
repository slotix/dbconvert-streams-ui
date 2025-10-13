import { useLogsStore } from '@/stores/logs'
import { getBackendUrl } from '@/utils/environment'

export type MessageHandler = (message: any) => void

export class SSELogsService {
  private eventSource: EventSource | null = null
  private handlers: MessageHandler[] = []
  private isConnecting: boolean = false
  private shouldReconnect: boolean = true
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectDelay: number = 10000 // 10 seconds
  private logHeartbeats: boolean = false // Set to false to disable heartbeat logging
  private refreshTimeout: number | null = null
  private debugMode: boolean = false
  private lastHeartbeatTime: number = Date.now()
  private heartbeatCheckInterval: number | null = null
  private isConnected: boolean = false // Add connection state tracking

  constructor() {
    this.connect = this.connect.bind(this)
    this.disconnect = this.disconnect.bind(this)
    // Only log in debug mode
    if (this.debugMode) console.log('SSE Logs Service initialized')
  }

  addMessageHandler(handler: MessageHandler) {
    this.handlers.push(handler)
  }

  private processMessage(message: any) {
    this.handlers.forEach((handler) => handler(message))
  }

  private forceRefreshLogsPanel() {
    const logsStore = useLogsStore()

    // Clear any existing timeout
    if (this.refreshTimeout !== null) {
      window.clearTimeout(this.refreshTimeout)
    }

    // Set a new timeout to force refresh the logs panel
    this.refreshTimeout = window.setTimeout(() => {
      if (this.debugMode) console.log('Force refreshing logs panel')
      this.refreshTimeout = null
    }, 500)
  }

  async disconnect() {
    this.shouldReconnect = false
    this.isConnected = false
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
      if (this.debugMode) console.log('Disconnected from SSE logs')
    }
    if (this.heartbeatCheckInterval !== null) {
      window.clearInterval(this.heartbeatCheckInterval)
      this.heartbeatCheckInterval = null
    }
  }

  async connect() {
    const logsStore = useLogsStore()

    // Prevent multiple concurrent connections
    if (this.isConnecting || this.isConnected) {
      if (this.debugMode) console.log('Already connecting/connected to SSE logs')
      return
    }

    this.isConnecting = true

    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    try {
      // Get the API URL base
      const backendUrl = getBackendUrl()
      // console.log('[SSE] API URL base:', backendUrl)

      // Create the SSE URL - using the backend URL directly
      const sseUrl = `${backendUrl}/logs/stream`
      // console.log('[SSE] Using SSE URL:', sseUrl)

      // Create the EventSource with the URL
      this.eventSource = new EventSource(sseUrl)

      // Set up event handlers
      this.setupEventHandlers(this.eventSource, logsStore, sseUrl)

      // Set a timeout to check if the connection was successful
      setTimeout(() => {
        if (this.eventSource && this.eventSource.readyState !== EventSource.OPEN) {
          console.warn('[SSE] Connection failed or timed out')

          // Close the existing connection
          if (this.eventSource) {
            this.eventSource.close()
            this.eventSource = null
          }

          // Add a message to the logs
          logsStore.addLog({
            message: 'Connection to logs failed. Please check your network connection.',
            level: 'warn',
            timestamp: Date.now(),
            source: 'sse-client',
            details: { type: 'connection' }
          })
        }
      }, 3000) // 3 second timeout

      this.heartbeatCheckInterval = window.setInterval(() => {
        const now = Date.now()
        if (now - this.lastHeartbeatTime > 45000) {
          if (this.debugMode) console.warn('No heartbeat received in 45 seconds, reconnecting...')
          this.disconnect()
          this.connect()
        }
      }, 15000)
    } catch (error) {
      // Always log critical errors
      console.error('Error creating EventSource:', error)
      this.isConnecting = false
    }
  }

  // Method to enable/disable debug mode
  setDebugMode(enabled: boolean) {
    this.debugMode = enabled
    if (this.debugMode) {
      console.log('SSE Logs Service debug mode enabled')
    }
  }

  // Add a method to set up event handlers for an EventSource
  private setupEventHandlers(eventSource: EventSource, logsStore: any, sseUrl: string) {
    eventSource.onopen = () => {
      if (this.debugMode) console.log('SSE logs connection opened')
      this.isConnecting = false
      this.isConnected = true
      this.reconnectAttempts = 0

      // Add a log entry to confirm connection
      logsStore.addLog({
        message: 'SSE logs connection opened',
        level: 'info',
        timestamp: Date.now(),
        source: 'sse-client',
        details: { type: 'connection' }
      })

      // Only log in debug mode
      if (this.debugMode) {
        console.log('Current logs store state:', {
          logCount: logsStore.logs.length,
          isLogsPanelOpen: logsStore.isLogsPanelOpen
        })
      }

      // Force refresh the logs panel
      this.forceRefreshLogsPanel()
    }

    eventSource.addEventListener('connection', (event) => {
      try {
        // Get the raw data
        const rawData = event.data
        if (this.debugMode) console.log('Raw connection event:', rawData)

        // Try to extract JSON from potentially malformed data
        let data
        try {
          // First attempt: try to parse as-is
          data = JSON.parse(rawData)
        } catch (parseError) {
          if (this.debugMode) console.warn('Failed to parse connection JSON:', parseError)
          // Create a basic object with the raw data as message
          data = {
            message: 'Connected to log stream',
            timestamp: Date.now()
          }
        }

        if (this.debugMode) console.log('SSE connection established:', data)

        // Add connection message to logs
        logsStore.addLog({
          message: data.message || 'Connected to log stream',
          level: 'info',
          timestamp: new Date(data.timestamp || Date.now()).getTime(),
          source: 'sse-client',
          details: { type: 'connection' }
        })

        if (this.debugMode)
          console.log('Added connection log, store now has', logsStore.logs.length, 'logs')

        // Force refresh the logs panel
        this.forceRefreshLogsPanel()
      } catch (error) {
        console.error('Error parsing connection event:', error, event.data)
      }
    })

    eventSource.addEventListener('heartbeat', (event) => {
      try {
        // Get the raw data
        const rawData = event.data

        // Try to extract JSON from potentially malformed data
        let data
        try {
          // First attempt: try to parse as-is
          data = JSON.parse(rawData)
        } catch (parseError) {
          if (this.debugMode) console.warn('Failed to parse heartbeat JSON:', parseError)
          // Create a basic object with the raw data as message
          data = {
            type: 'heartbeat',
            timestamp: Date.now()
          }
        }

        // Only log heartbeats if enabled and in debug mode
        if (this.logHeartbeats && this.debugMode) {
          console.log('SSE heartbeat received:', data)

          // Add heartbeat to logs (disabled by default to reduce noise)
          logsStore.addLog({
            message: 'Heartbeat received',
            level: 'debug',
            timestamp: new Date(data.timestamp || Date.now()).getTime(),
            source: 'sse-client',
            details: { type: 'heartbeat' }
          })
        }

        const now = Date.now()
        if (this.debugMode && now - this.lastHeartbeatTime > 30000) {
          console.warn('Heartbeat received after long delay:', now - this.lastHeartbeatTime, 'ms')
        }

        this.lastHeartbeatTime = Date.now()
      } catch (error) {
        if (this.debugMode) console.error('Error parsing heartbeat event:', error, event.data)
      }
    })

    eventSource.onmessage = (event) => {
      try {
        // Get the raw data
        const rawData = event.data
        if (this.debugMode) console.log('Raw SSE message:', rawData)

        // Try to extract JSON from potentially malformed data
        let data
        try {
          // First attempt: try to parse as-is
          data = JSON.parse(rawData)
        } catch (parseError) {
          if (this.debugMode)
            console.warn(
              'Failed to parse JSON directly, trying to extract JSON portion:',
              parseError
            )

          // Second attempt: try to find JSON object in the string
          const jsonMatch = rawData.match(/\{.*\}/)
          if (jsonMatch) {
            try {
              data = JSON.parse(jsonMatch[0])
            } catch (extractError) {
              if (this.debugMode) console.error('Failed to parse extracted JSON:', extractError)
              // Create a basic object with the raw data as message
              data = {
                message: rawData,
                level: 'info',
                timestamp: Date.now(),
                source: 'unknown'
              }
            }
          } else {
            // No JSON found, create a basic object
            data = {
              message: rawData,
              level: 'info',
              timestamp: Date.now(),
              source: 'unknown'
            }
          }
        }

        // Skip processing if this is a heartbeat message (should be handled by the heartbeat event listener)
        if (data.type === 'heartbeat') {
          return
        }

        if (this.debugMode) console.log('Processed log message:', data)

        // Extract message from either message or msg field
        const message = data.message || data.msg || ''

        // Extract level, defaulting to info
        const level = data.level || 'info'

        // Extract timestamp, using current time as fallback
        const timestamp = new Date(data.timestamp || data.ts || Date.now()).getTime()

        // Extract source, using logger, component, caller, or defaulting to unknown
        let source = data.source || data.logger || data.component || ''

        // If source is empty but caller exists, use the caller as the source
        if (!source && data.caller) {
          // Extract the component from the caller path (e.g., "stream-api/connectionHandlers.go:192" -> "api")
          if (data.caller.includes('stream-api/')) {
            source = 'api'
          } else if (data.caller.includes('/')) {
            // Extract the first part of the path
            source = data.caller.split('/')[0]
          } else {
            source = 'unknown'
          }
        }

        // If source is still empty, default to unknown
        if (!source) {
          source = 'unknown'
        }

        // Debug log to understand source mapping - only in debug mode
        if (this.debugMode)
          console.debug(
            `Log source mapping: logger=${data.logger}, source=${source}, nodeId=${data.nodeId || 'none'}`
          )

        // Extract nodeId directly from the data
        const nodeId = data.nodeId || null

        // Check if this is an enhanced SQL log (has connectionId, query, and purpose)
        const isSQL = data.connectionId && data.query && data.purpose

        // Check if this is a query group (has groupId, queryIds, and summary)
        const isGroup = data.groupId && data.queryIds && data.summary

        if (isGroup) {
          // This is a query group - route to addGroup
          logsStore.addGroup({
            groupId: data.groupId,
            type: data.type,
            summary: data.summary,
            queryCount: data.queryCount,
            totalDurationMs: data.totalDurationMs,
            queryIds: data.queryIds,
            collapsed: data.collapsed,
            hasErrors: data.hasErrors
          })
        } else if (isSQL) {
          // This is an enhanced SQL log - route to addSQLLog
          logsStore.addSQLLog({
            id: data.id,
            connectionId: data.connectionId,
            tabId: data.tabId,
            database: data.database,
            schema: data.schema,
            tableName: data.tableName,
            query: data.query,
            params: data.params,
            purpose: data.purpose,
            triggerSource: data.triggerSource,
            startedAt: data.startedAt,
            durationMs: data.durationMs,
            rowCount: data.rowCount,
            error: data.error,
            groupId: data.groupId,
            parentGroupId: data.parentGroupId,
            repeatCount: data.repeatCount,
            redacted: data.redacted
          })
        } else {
          // Regular system log - add to legacy logs
          logsStore.addLog({
            message: message,
            level: level,
            timestamp: timestamp,
            source: source,
            nodeId: nodeId,
            details: data
          })
        }

        if (this.debugMode)
          console.log('Added log message, store now has', logsStore.logs.length, 'logs')

        // Force refresh the logs panel
        this.forceRefreshLogsPanel()

        // Convert to monitoring store format
        const logEntry = {
          id: Date.now(),
          type: source.split('.')[0] || 'unknown',
          nodeID: nodeId || 'unknown',
          msg: message,
          level: level,
          ts: timestamp
        }

        this.processMessage(logEntry)
      } catch (error) {
        // Always log critical errors
        console.error('Error processing SSE message:', error)

        // Try to add the raw message to logs anyway
        try {
          logsStore.addLog({
            message: `Raw message: ${event.data}`,
            level: 'error',
            timestamp: Date.now(),
            source: 'sse-client',
            details: {
              error: error instanceof Error ? error.message : String(error),
              raw: event.data
            }
          })
        } catch (e) {
          console.error('Failed to add error log:', e)
        }
      }
    }

    eventSource.onerror = (error) => {
      // Always log connection errors
      console.error('SSE connection error')

      // Log more details about the error only in debug mode
      if (this.debugMode && error instanceof Event) {
        console.error('EventSource readyState:', this.eventSource?.readyState)
        console.error('EventSource URL:', this.eventSource?.url)

        // Try to fetch the logs endpoint directly to see what's happening
        fetch(sseUrl)
          .then((response) => {
            console.log('Fetch test response:', response.status, response.statusText)
            return response.text()
          })
          .then((text) => {
            console.log(
              'Fetch test response text:',
              text.substring(0, 200) + (text.length > 200 ? '...' : '')
            )
          })
          .catch((fetchError) => {
            console.error('Fetch test error:', fetchError)
          })
      }

      // Close the connection
      if (this.eventSource) {
        this.eventSource.close()
        this.eventSource = null
      }
      this.isConnected = false

      // Add error to logs
      const logsStore = useLogsStore()
      logsStore.addLog({
        message: `SSE connection error: ${error instanceof Event ? 'Connection failed' : error}`,
        level: 'error',
        timestamp: Date.now(),
        source: 'sse-client',
        details: { type: 'error' }
      })

      // Attempt to reconnect
      if (this.shouldReconnect) {
        this.reconnectAttempts++
        if (this.reconnectAttempts <= this.maxReconnectAttempts) {
          if (this.debugMode)
            console.log(
              `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms...`
            )
          setTimeout(() => {
            this.isConnecting = false
            this.connect()
          }, this.reconnectDelay)
        } else {
          // Always log critical errors
          console.error(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached.`)
          const logsStore = useLogsStore()
          logsStore.addLog({
            message: `Maximum reconnect attempts (${this.maxReconnectAttempts}) reached. Please refresh the page to try again.`,
            level: 'error',
            timestamp: Date.now(),
            source: 'sse-client',
            details: { type: 'error' }
          })
          this.isConnecting = false
        }
      }
    }
  }
}

export const sseLogsService = new SSELogsService()
