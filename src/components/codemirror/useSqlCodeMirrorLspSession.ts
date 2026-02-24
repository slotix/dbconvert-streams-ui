import { ref, type Ref } from 'vue'
import {
  buildSqlLspWebSocketUrl,
  type SqlLspConnectionContext
} from '@/composables/useSqlLspProviders'
import { getBackendUrl } from '@/utils/environment'
import { getOrCreateInstallId } from '@/utils/installId'
import type {
  JsonRpcNotification,
  JsonRpcResponse,
  PendingRequest
} from '@/components/codemirror/sqlCodeMirrorTypes'

const REQUEST_TIMEOUT_MS = 8000
const DID_CHANGE_DEBOUNCE_MS = 150
const MAX_LSP_MESSAGE_CHARS = 250_000
const LSP_RECONNECT_BASE_DELAY_MS = 600
const LSP_RECONNECT_MAX_DELAY_MS = 8_000
const LSP_RECONNECT_JITTER_RATIO = 0.2

interface UseSqlCodeMirrorLspSessionOptions {
  shouldEnableLsp: Ref<boolean>
  connectionContext: Ref<SqlLspConnectionContext | undefined>
  textDocumentUri: string
  getDocumentText: () => string
  getApiKey: () => string
  onNotification: (notification: JsonRpcNotification) => void
  onUnavailable: (error: unknown) => void
  onSessionDisposed?: () => void
}

export function useSqlCodeMirrorLspSession(options: UseSqlCodeMirrorLspSessionOptions) {
  const lspReady = ref(false)

  let lspSocket: WebSocket | null = null
  let lspSessionToken = 0
  let lspNextRequestID = 0
  let lspDocumentVersion = 1
  let lspDidChangeTimer: ReturnType<typeof setTimeout> | null = null
  let lspDidChangeText = ''
  let lspDidChangeVersion = 1
  let lspReconnectTimer: ReturnType<typeof setTimeout> | null = null
  let lspReconnectAttempt = 0

  const pendingRequests = new Map<number | string, PendingRequest>()

  function rejectPendingRequests(message: string) {
    pendingRequests.forEach((pending) => {
      clearTimeout(pending.timeoutId)
      pending.reject(new Error(message))
    })
    pendingRequests.clear()
  }

  function reportLspUnavailable(error: unknown) {
    if (!options.shouldEnableLsp.value) {
      return
    }
    options.onUnavailable(error)
  }

  function isActiveLspSession(token: number): boolean {
    return token === lspSessionToken
  }

  function clearLspReconnectTimer() {
    if (!lspReconnectTimer) {
      return
    }
    clearTimeout(lspReconnectTimer)
    lspReconnectTimer = null
  }

  function scheduleLspReconnect(sessionToken: number) {
    if (!isActiveLspSession(sessionToken) || !options.shouldEnableLsp.value) {
      return
    }

    clearLspReconnectTimer()

    lspReconnectAttempt += 1
    const exponentialDelay = Math.min(
      LSP_RECONNECT_BASE_DELAY_MS * 2 ** (lspReconnectAttempt - 1),
      LSP_RECONNECT_MAX_DELAY_MS
    )
    const jitterBound = Math.floor(exponentialDelay * LSP_RECONNECT_JITTER_RATIO)
    const jitter = jitterBound > 0 ? Math.floor(Math.random() * (jitterBound + 1)) : 0
    const reconnectDelay = exponentialDelay + jitter

    lspReconnectTimer = setTimeout(() => {
      lspReconnectTimer = null
      if (!isActiveLspSession(sessionToken) || !options.shouldEnableLsp.value) {
        return
      }
      connectLspSession(false)
    }, reconnectDelay)
  }

  function sendLspNotification(method: string, params?: unknown): void {
    if (!lspSocket || lspSocket.readyState !== WebSocket.OPEN) {
      return
    }
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      method,
      params
    })
    if (payload.length > MAX_LSP_MESSAGE_CHARS) {
      throw new Error(`SQL LSP notification too large (${payload.length} chars)`)
    }
    lspSocket.send(payload)
  }

  function sendLspRequest(method: string, params?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!lspSocket || lspSocket.readyState !== WebSocket.OPEN) {
        reject(new Error('SQL LSP socket is not open'))
        return
      }

      const requestId = ++lspNextRequestID
      const payload = JSON.stringify({
        jsonrpc: '2.0',
        id: requestId,
        method,
        params
      })
      if (payload.length > MAX_LSP_MESSAGE_CHARS) {
        reject(new Error(`SQL LSP request too large (${payload.length} chars)`))
        return
      }

      const timeoutId = setTimeout(() => {
        pendingRequests.delete(requestId)
        reject(new Error(`SQL LSP request timed out: ${method}`))
      }, REQUEST_TIMEOUT_MS)

      pendingRequests.set(requestId, { resolve, reject, timeoutId })
      lspSocket.send(payload)
    })
  }

  function scheduleDidChangeNotification(text: string) {
    if (!lspReady.value || !lspSocket || lspSocket.readyState !== WebSocket.OPEN) {
      return
    }

    lspDidChangeText = text
    lspDidChangeVersion += 1
    const versionToSend = lspDidChangeVersion
    const sessionToken = lspSessionToken

    if (lspDidChangeTimer) {
      clearTimeout(lspDidChangeTimer)
    }

    lspDidChangeTimer = setTimeout(() => {
      lspDidChangeTimer = null
      if (!isActiveLspSession(sessionToken)) {
        return
      }
      sendLspNotification('textDocument/didChange', {
        textDocument: {
          uri: options.textDocumentUri,
          version: versionToSend
        },
        contentChanges: [{ text: lspDidChangeText }]
      })
    }, DID_CHANGE_DEBOUNCE_MS)
  }

  function flushPendingDidChangeNotification() {
    if (!lspDidChangeTimer) {
      return
    }
    clearTimeout(lspDidChangeTimer)
    lspDidChangeTimer = null

    if (!lspReady.value || !lspSocket || lspSocket.readyState !== WebSocket.OPEN) {
      return
    }

    sendLspNotification('textDocument/didChange', {
      textDocument: {
        uri: options.textDocumentUri,
        version: lspDidChangeVersion
      },
      contentChanges: [{ text: lspDidChangeText }]
    })
  }

  function handleSocketMessage(rawData: unknown) {
    if (typeof rawData !== 'string') {
      return
    }
    if (rawData.length > MAX_LSP_MESSAGE_CHARS) {
      reportLspUnavailable(new Error(`SQL LSP message too large (${rawData.length} chars)`))
      disconnectLspSession()
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(rawData)
    } catch (error) {
      reportLspUnavailable(error)
      return
    }

    const notification = parsed as JsonRpcNotification
    if (typeof notification.method === 'string') {
      options.onNotification(notification)
      return
    }

    const response = parsed as JsonRpcResponse
    if (response.id === undefined) {
      return
    }

    const pending = pendingRequests.get(response.id)
    if (!pending) {
      return
    }

    pendingRequests.delete(response.id)
    clearTimeout(pending.timeoutId)

    if (response.error) {
      pending.reject(new Error(response.error.message || 'SQL LSP request failed'))
      return
    }

    pending.resolve(response.result)
  }

  async function initializeLspSession(sessionToken: number) {
    if (!isActiveLspSession(sessionToken)) {
      return
    }

    try {
      await sendLspRequest('initialize', {
        processId: null,
        clientInfo: { name: 'dbconvert-streams-ui', version: '1.0.0' },
        rootUri: null,
        capabilities: {
          textDocument: {
            completion: {
              completionItem: {
                snippetSupport: true
              }
            },
            hover: {
              contentFormat: ['markdown', 'plaintext']
            },
            signatureHelp: {
              signatureInformation: {
                parameterInformation: {
                  labelOffsetSupport: true
                }
              }
            }
          }
        }
      })

      if (!isActiveLspSession(sessionToken)) {
        return
      }

      sendLspNotification('initialized', {})
      lspDocumentVersion = 1
      lspDidChangeVersion = lspDocumentVersion
      sendLspNotification('textDocument/didOpen', {
        textDocument: {
          uri: options.textDocumentUri,
          languageId: 'sql',
          version: lspDocumentVersion,
          text: options.getDocumentText()
        }
      })
      lspReady.value = true
    } catch (error) {
      if (!isActiveLspSession(sessionToken)) {
        return
      }
      lspReady.value = false
      reportLspUnavailable(error)
      if (lspSocket && lspSocket.readyState === WebSocket.OPEN) {
        try {
          lspSocket.close()
          return
        } catch {
          // Fall through to reconnect scheduling.
        }
      }
      scheduleLspReconnect(sessionToken)
    }
  }

  function disconnectLspSession(resetReconnectBackoff = true) {
    clearLspReconnectTimer()
    if (resetReconnectBackoff) {
      lspReconnectAttempt = 0
    }

    lspSessionToken += 1
    lspReady.value = false

    if (lspDidChangeTimer) {
      clearTimeout(lspDidChangeTimer)
      lspDidChangeTimer = null
    }

    rejectPendingRequests('SQL LSP session disposed')

    if (lspSocket) {
      try {
        if (lspSocket.readyState === WebSocket.OPEN) {
          sendLspNotification('textDocument/didClose', {
            textDocument: { uri: options.textDocumentUri }
          })
        }
        lspSocket.close()
      } catch {
        // Ignore close failures from stale or closing sockets.
      }
    }

    lspSocket = null
    options.onSessionDisposed?.()
  }

  function connectLspSession(resetReconnectBackoff = true) {
    disconnectLspSession(resetReconnectBackoff)
    if (!options.shouldEnableLsp.value) {
      return
    }

    const sessionToken = ++lspSessionToken
    const wsUrl = buildSqlLspWebSocketUrl({
      backendUrl: getBackendUrl(),
      apiKey: options.getApiKey(),
      installId: getOrCreateInstallId(),
      connectionContext: options.connectionContext.value
    })

    const socket = new WebSocket(wsUrl)
    lspSocket = socket

    socket.onmessage = (event) => {
      if (!isActiveLspSession(sessionToken)) {
        return
      }
      handleSocketMessage(event.data)
    }

    socket.onerror = () => {
      if (!isActiveLspSession(sessionToken)) {
        return
      }
      reportLspUnavailable(
        new Error(
          `SQL LSP websocket error (url=${new URL(wsUrl).pathname}, readyState=${socket.readyState})`
        )
      )
    }

    socket.onclose = (event) => {
      if (!isActiveLspSession(sessionToken)) {
        return
      }
      lspReady.value = false
      rejectPendingRequests('SQL LSP websocket closed')
      options.onSessionDisposed?.()
      if (event.code !== 1000) {
        const reason = event.reason ? `: ${event.reason}` : ''
        reportLspUnavailable(
          new Error(
            `SQL LSP websocket closed with code ${event.code}${reason} (url=${new URL(wsUrl).pathname})`
          )
        )
      }
      lspSocket = null
      scheduleLspReconnect(sessionToken)
    }

    socket.onopen = () => {
      lspReconnectAttempt = 0
      void initializeLspSession(sessionToken)
    }
  }

  return {
    lspReady,
    sendLspNotification,
    sendLspRequest,
    scheduleDidChangeNotification,
    flushPendingDidChangeNotification,
    connectLspSession,
    disconnectLspSession
  }
}
