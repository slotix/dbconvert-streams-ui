import { connect, AckPolicy, StringCodec, type JetStreamManager, type Consumer } from 'nats.ws'
import { useLogsStore } from '@/stores/logs'

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

  addMessageHandler(handler: MessageHandler) {
    this.handlers.push(handler)
  }

  private processMessage(message: NatsMessage) {
    this.handlers.forEach((handler) => handler(message))
  }

  async connect() {
    const logsStore = useLogsStore()

    while (true) {
      try {
        const natsServer = import.meta.env.VITE_NATS_SERVER
        // Ensure the URL is properly formatted
        const serverUrl = new URL(natsServer)
        if (!serverUrl.protocol.startsWith('ws')) {
          throw new Error('NATS server URL must use WebSocket protocol (ws:// or wss://)')
        }
        console.log('Attempting to connect to NATS server:', natsServer)
        const nc = await connect({
          servers: natsServer,
          debug: false,
          maxReconnectAttempts: 10,
          reconnectTimeWait: 2000
        })
        console.log('Successfully connected to NATS server')
        const js = nc.jetstream()
        const jsm: JetStreamManager = await js.jetstreamManager()

        const sc = StringCodec()
        await jsm.consumers.add('LOGS', {
          durable_name: 'logsAll',
          ack_policy: AckPolicy.Explicit
        })

        const c: Consumer = await js.consumers.get('LOGS', 'logsAll')
        let iter = await c.consume()

        for await (const m of iter) {
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

        await nc.drain()
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('Error in NATS connection:', {
          error,
          server: import.meta.env.VITE_NATS_SERVER,
          message: errorMessage
        })
        logsStore.addLog({
          message: `Error in NATS connection: ${errorMessage}`,
          level: 'error',
          timestamp: Date.now(),
          source: 'monitoring',
          details: { error: errorMessage, server: import.meta.env.VITE_NATS_SERVER }
        })
        // Wait before attempting to reconnect
        await new Promise((resolve) => setTimeout(resolve, 5000))
      }
    }
  }
}

export const natsService = new NatsService()
