import { connect, AckPolicy, StringCodec, type JetStreamManager, type Consumer } from 'nats.ws'
import { useLogsStore } from '@/stores/logs'
import { getNatsServerUrl, validateWebSocketUrl, getBooleanEnv } from '@/utils/environment'

export interface NatsMessage {
  id: number
  type: string
  nodeID: string
  msg: string
  level: string
  ts: number
  [key: string]: any
}

export type MessageHandler = (message: NatsMessage) => void

export class NatsService {
  private handlers: MessageHandler[] = []
  private connection: any = null
  private isConnecting: boolean = false
  private shouldReconnect: boolean = true
  private natsServerUrl: string = '';

  constructor() {
    // Initialize the NATS server URL
    try {
      this.natsServerUrl = getNatsServerUrl();
      validateWebSocketUrl(this.natsServerUrl);
      console.log('NATS server URL configured:', this.natsServerUrl);
    } catch (error) {
      console.error('Error configuring NATS server URL:', error);
      // Don't throw here, let connect() handle it
    }
  }

  addMessageHandler(handler: MessageHandler) {
    this.handlers.push(handler)
  }

  private processMessage(message: NatsMessage) {
    this.handlers.forEach((handler) => handler(message))
  }

  async disconnect() {
    this.shouldReconnect = false
    if (this.connection) {
      try {
        await this.connection.drain()
        this.connection = null
      } catch (error) {
        console.error('Error disconnecting from NATS:', error)
      }
    }
  }

  async connect() {
    const logsStore = useLogsStore()

    if (this.isConnecting) {
      console.log('Already attempting to connect to NATS server')
      return
    }

    this.shouldReconnect = true
    this.isConnecting = true

    while (this.shouldReconnect) {
      try {
        // Get the NATS server URL (may have changed since constructor)
        const natsServer = getNatsServerUrl();

        // Validate the URL
        validateWebSocketUrl(natsServer);

        // Update the stored URL if it changed
        if (this.natsServerUrl !== natsServer) {
          console.log('NATS server URL changed from', this.natsServerUrl, 'to', natsServer);
          this.natsServerUrl = natsServer;
        }

        console.log('Attempting to connect to NATS server:', this.natsServerUrl)

        // Clean up existing connection if any
        if (this.connection) {
          await this.connection.drain()
          this.connection = null
        }

        // Connect to NATS
        this.connection = await connect({
          servers: this.natsServerUrl,
          debug: false,
          maxReconnectAttempts: 10,
          reconnectTimeWait: 2000,
          // Use TLS settings from environment if available
          tls: getBooleanEnv('VITE_NATS_WS_TLS') ? {} : undefined,
          // Allow reconnect if specified in environment
          reconnect: getBooleanEnv('VITE_NATS_ALLOW_RECONNECT', true)
        })

        console.log('Successfully connected to NATS server')
        const js = this.connection.jetstream()
        const jsm: JetStreamManager = await js.jetstreamManager()

        const sc = StringCodec()
        await jsm.consumers.add('LOGS', {
          durable_name: 'logsAll',
          ack_policy: AckPolicy.Explicit
        })

        const c: Consumer = await js.consumers.get('LOGS', 'logsAll')
        let iter = await c.consume()

        for await (const m of iter) {
          if (!this.shouldReconnect) break

          let data = sc.decode(m.data)
          let parsed = JSON.parse(data)
          parsed.id = m.seq
          const subjectParts = m.subject.split('.')
          parsed.type = subjectParts[1]
          parsed.nodeID = subjectParts[2]

          // Add to global logs store
          logsStore.addLog({
            message: parsed.msg,
            level: parsed.level,
            timestamp: parsed.ts,
            source: `${parsed.type}:${parsed.nodeID}`,
            details: parsed
          })

          this.processMessage(parsed)
          m.ack()
        }

        if (this.connection) {
          await this.connection.drain()
          this.connection = null
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorDetails = {
          message: errorMessage,
          server: this.natsServerUrl,
          stack: error instanceof Error ? error.stack : undefined
        }

        console.error('Error in NATS connection:', errorDetails)
        logsStore.addLog({
          message: `Error in NATS connection: ${errorMessage}`,
          level: 'error',
          timestamp: Date.now(),
          source: 'monitoring',
          details: errorDetails
        })
        // Wait before attempting to reconnect
        await new Promise((resolve) => setTimeout(resolve, 5000))
      } finally {
        this.isConnecting = false
      }
    }
  }
}

export const natsService = new NatsService()
