import { getBackendUrl } from '@/utils/environment'

import type * as MonacoTypes from 'monaco-editor'

export type MonacoApi = typeof import('monaco-editor')

const LSP_MARKER_OWNER = 'sql-lsp'
const REQUEST_TIMEOUT_MS = 8000

type JsonRpcID = number | string

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: JsonRpcID
  method: string
  params?: unknown
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: JsonRpcID
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

interface JsonRpcNotification {
  jsonrpc: '2.0'
  method: string
  params?: unknown
}

interface LspPosition {
  line: number
  character: number
}

interface LspRange {
  start: LspPosition
  end: LspPosition
}

interface LspMarkupContent {
  kind?: string
  value?: string
}

interface LspMarkedString {
  language?: string
  value?: string
}

interface LspHoverResult {
  contents?: unknown
  range?: LspRange
}

interface LspCompletionItem {
  label?: string
  kind?: number
  detail?: string
  documentation?: unknown
  sortText?: string
  filterText?: string
  insertText?: string
  insertTextFormat?: number
  textEdit?: {
    range?: LspRange
    newText?: string
  }
}

interface LspCompletionList {
  isIncomplete?: boolean
  items?: LspCompletionItem[]
}

interface LspDiagnostic {
  range?: LspRange
  severity?: number
  message?: string
  source?: string
}

interface LspPublishDiagnosticsParams {
  uri?: string
  diagnostics?: LspDiagnostic[]
}

interface CreateMonacoSqlLspSessionParams {
  monaco: MonacoApi
  editor: MonacoTypes.editor.IStandaloneCodeEditor
  language: string
  apiKey: string
  installId: string
  connectionContext?: SqlLspConnectionContext
  onError?: (error: unknown) => void
}

export interface SqlLspConnectionContext {
  connectionId?: string
  database?: string
  dialect?: string
}

function normalizeSqlLspContextPart(value: string | undefined): string {
  return value?.trim() || ''
}

export function getSqlLspConnectionContextSignature(context?: SqlLspConnectionContext): string {
  const connectionId = normalizeSqlLspContextPart(context?.connectionId)
  const database = normalizeSqlLspContextPart(context?.database)
  if (!connectionId || !database) {
    return ''
  }
  const dialect = normalizeSqlLspContextPart(context?.dialect)
  return `${connectionId}::${database}::${dialect}`
}

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timeoutId: number
}

function normalizeFlag(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false
  }
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

function getRuntimeLspFlag(): string | undefined {
  if (typeof window === 'undefined' || !window.ENV) {
    return undefined
  }
  const value = window.ENV.VITE_SQL_LSP_ENABLED
  return typeof value === 'string' ? value : undefined
}

function trimTrailingSlashes(path: string): string {
  let result = path
  for (; result.length > 0 && result.endsWith('/'); ) {
    result = result.slice(0, -1)
  }
  return result
}

function joinPath(basePath: string, suffixPath: string): string {
  const base = trimTrailingSlashes(basePath)
  const suffix = suffixPath.startsWith('/') ? suffixPath.slice(1) : suffixPath
  if (!base) {
    return `/${suffix}`
  }
  return `${base}/${suffix}`
}

function toAbsoluteURL(url: string): URL {
  const trimmed = url.trim()
  if (!trimmed) {
    throw new Error('backend URL is empty')
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return new URL(trimmed)
  }

  if (typeof window === 'undefined') {
    throw new Error('cannot resolve relative backend URL outside browser environment')
  }

  return new URL(trimmed, window.location.origin)
}

export function isSqlLspEnabled(runtimeValue?: string, buildValue?: string): boolean {
  const runtimeFlag = runtimeValue ?? getRuntimeLspFlag()
  if (runtimeFlag !== undefined) {
    return normalizeFlag(runtimeFlag)
  }

  const buildFlag = buildValue ?? import.meta.env.VITE_SQL_LSP_ENABLED
  return normalizeFlag(buildFlag)
}

export function buildSqlLspWebSocketUrl(params: {
  backendUrl: string
  apiKey: string
  installId: string
  connectionContext?: SqlLspConnectionContext
}): string {
  const backend = toAbsoluteURL(params.backendUrl)
  const ws = new URL(backend.toString())
  ws.hash = ''
  ws.search = ''
  ws.protocol = ws.protocol === 'https:' ? 'wss:' : 'ws:'
  ws.pathname = joinPath(ws.pathname, 'lsp/ws')
  const apiKey = params.apiKey.trim()
  if (apiKey) {
    ws.searchParams.set('api_key', apiKey)
  }
  const installId = params.installId.trim()
  if (installId) {
    ws.searchParams.set('install_id', installId)
  }
  const connectionId = params.connectionContext?.connectionId?.trim()
  if (connectionId) {
    ws.searchParams.set('connection_id', connectionId)
  }
  const database = params.connectionContext?.database?.trim()
  if (database) {
    ws.searchParams.set('database', database)
  }
  const dialect = params.connectionContext?.dialect?.trim()
  if (dialect) {
    ws.searchParams.set('dialect', dialect)
  }
  return ws.toString()
}

function normalizeCompletionItems(
  response: LspCompletionItem[] | LspCompletionList | null | undefined
): LspCompletionItem[] {
  if (!response) {
    return []
  }
  if (Array.isArray(response)) {
    return response
  }
  return Array.isArray(response.items) ? response.items : []
}

function getLspTextDocumentUri(model: MonacoTypes.editor.ITextModel): string {
  const modelUri = model.uri?.toString()
  if (modelUri) {
    return modelUri
  }
  return `inmemory://sql/${Date.now()}`
}

function toLspPosition(position: MonacoTypes.Position): LspPosition {
  return {
    line: Math.max(position.lineNumber - 1, 0),
    character: Math.max(position.column - 1, 0)
  }
}

function toMonacoRange(range: LspRange | undefined): MonacoTypes.IRange | undefined {
  if (!range?.start || !range.end) {
    return undefined
  }
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1
  }
}

function normalizeHoverContents(contents: unknown): string {
  if (!contents) {
    return ''
  }

  if (typeof contents === 'string') {
    return contents
  }

  if (Array.isArray(contents)) {
    return contents
      .map((part) => normalizeHoverContents(part))
      .filter(Boolean)
      .join('\n\n')
  }

  const asMarkup = contents as LspMarkupContent
  if (typeof asMarkup.value === 'string') {
    return asMarkup.value
  }

  const asMarked = contents as LspMarkedString
  if (typeof asMarked.value === 'string' && typeof asMarked.language === 'string') {
    return `\`\`\`${asMarked.language}\n${asMarked.value}\n\`\`\``
  }

  return ''
}

function mapCompletionKind(
  monaco: MonacoApi,
  kind: number | undefined
): MonacoTypes.languages.CompletionItemKind {
  const fallback = monaco.languages.CompletionItemKind.Text
  if (!kind) {
    return fallback
  }

  switch (kind) {
    case 2:
      return monaco.languages.CompletionItemKind.Method
    case 3:
      return monaco.languages.CompletionItemKind.Function
    case 4:
      return monaco.languages.CompletionItemKind.Constructor
    case 5:
      return monaco.languages.CompletionItemKind.Field
    case 6:
      return monaco.languages.CompletionItemKind.Variable
    case 7:
      return monaco.languages.CompletionItemKind.Class
    case 8:
      return monaco.languages.CompletionItemKind.Interface
    case 10:
      return monaco.languages.CompletionItemKind.Property
    case 12:
      return monaco.languages.CompletionItemKind.Value
    case 13:
      return monaco.languages.CompletionItemKind.Enum
    case 14:
      return monaco.languages.CompletionItemKind.Keyword
    case 15:
      return monaco.languages.CompletionItemKind.Snippet
    case 17:
      return monaco.languages.CompletionItemKind.File
    default:
      return fallback
  }
}

function mapDiagnosticSeverity(
  monaco: MonacoApi,
  severity: number | undefined
): MonacoTypes.MarkerSeverity {
  switch (severity) {
    case 1:
      return monaco.MarkerSeverity.Error
    case 2:
      return monaco.MarkerSeverity.Warning
    case 3:
      return monaco.MarkerSeverity.Info
    case 4:
      return monaco.MarkerSeverity.Hint
    default:
      return monaco.MarkerSeverity.Info
  }
}

class MonacoSqlLspSessionImpl {
  private ws: WebSocket | null = null
  private readonly pendingRequests = new Map<JsonRpcID, PendingRequest>()
  private readonly providerDisposables: Array<{ dispose: () => void }> = []
  private modelChangeDisposable: MonacoTypes.IDisposable | null = null
  private documentVersion = 1
  private nextID = 1
  private isDisposed = false
  private readonly model: MonacoTypes.editor.ITextModel
  private readonly textDocumentUri: string

  constructor(private readonly params: CreateMonacoSqlLspSessionParams) {
    const model = params.editor.getModel()
    if (!model) {
      throw new Error('Monaco model is not available for SQL LSP session')
    }
    this.model = model
    this.textDocumentUri = getLspTextDocumentUri(model)
  }

  async start(): Promise<void> {
    const url = buildSqlLspWebSocketUrl({
      backendUrl: getBackendUrl(),
      apiKey: this.params.apiKey,
      installId: this.params.installId,
      connectionContext: this.params.connectionContext
    })

    const socket = await this.openWebSocket(url)
    if (this.isDisposed) {
      try {
        socket.close(1000, 'SQL LSP session disposed before startup')
      } catch {
        // no-op
      }
      return
    }

    this.ws = socket
    this.bindSocketHandlers(socket)
    await this.initializeLsp()
    if (this.isDisposed) {
      return
    }

    this.registerProviders()
    if (this.isDisposed) {
      this.providerDisposables.forEach((d) => d.dispose())
      this.providerDisposables.length = 0
      return
    }

    this.modelChangeDisposable = this.model.onDidChangeContent(() => {
      if (this.isDisposed) {
        return
      }
      this.documentVersion += 1
      this.sendNotification('textDocument/didChange', {
        textDocument: {
          uri: this.textDocumentUri,
          version: this.documentVersion
        },
        contentChanges: [{ text: this.model.getValue() }]
      })
    })
  }

  isClosed(): boolean {
    return this.isDisposed
  }

  dispose(): void {
    if (!this.isDisposed) {
      this.sendNotification('textDocument/didClose', {
        textDocument: { uri: this.textDocumentUri }
      })
      this.sendNotification('exit')
      this.isDisposed = true
    }

    this.providerDisposables.forEach((d) => d.dispose())
    this.providerDisposables.length = 0
    this.modelChangeDisposable?.dispose()
    this.modelChangeDisposable = null
    this.params.monaco.editor.setModelMarkers(this.model, LSP_MARKER_OWNER, [])

    this.pendingRequests.forEach((pending) => {
      window.clearTimeout(pending.timeoutId)
      pending.reject(new Error('LSP session disposed'))
    })
    this.pendingRequests.clear()

    if (this.ws) {
      try {
        this.ws.close(1000, 'SQL LSP session disposed')
      } catch {
        // no-op
      }
    }
    this.ws = null
  }

  private bindSocketHandlers(ws: WebSocket): void {
    ws.onmessage = (event) => {
      this.handleSocketMessage(event.data)
    }

    ws.onerror = (event) => {
      this.handleFailure(event)
    }

    ws.onclose = (event) => {
      if (this.isDisposed) {
        return
      }
      this.handleFailure(new Error(`SQL LSP socket closed (${event.code})`))
    }
  }

  private handleFailure(error: unknown): void {
    if (this.isDisposed) {
      return
    }
    this.params.onError?.(error)
    this.dispose()
  }

  private async initializeLsp(): Promise<void> {
    await this.sendRequest('initialize', {
      processId: null,
      clientInfo: {
        name: 'dbconvert-streams-ui',
        version: import.meta.env.PACKAGE_VERSION || 'dev'
      },
      rootUri: null,
      capabilities: {
        textDocument: {
          completion: {
            completionItem: {
              snippetSupport: true,
              documentationFormat: ['markdown', 'plaintext']
            }
          },
          hover: {
            contentFormat: ['markdown', 'plaintext']
          },
          publishDiagnostics: {}
        },
        workspace: {}
      }
    })

    this.sendNotification('initialized', {})
    this.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri: this.textDocumentUri,
        languageId: this.params.language,
        version: this.documentVersion,
        text: this.model.getValue()
      }
    })
  }

  private registerProviders(): void {
    const completionDisposable = this.params.monaco.languages.registerCompletionItemProvider(
      this.params.language,
      {
        triggerCharacters: ['.', '"', '`'],
        provideCompletionItems: async (model, position) => {
          if (model.uri.toString() !== this.model.uri.toString()) {
            return { suggestions: [] }
          }

          const response = await this.sendRequest<LspCompletionItem[] | LspCompletionList>(
            'textDocument/completion',
            {
              textDocument: { uri: this.textDocumentUri },
              position: toLspPosition(position),
              context: {
                triggerKind: 1
              }
            }
          ).catch(() => null)

          const word = model.getWordUntilPosition(position)
          const defaultRange: MonacoTypes.IRange = {
            startLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endLineNumber: position.lineNumber,
            endColumn: word.endColumn
          }

          const suggestions = normalizeCompletionItems(response).map((item) => {
            const insertText = item.textEdit?.newText || item.insertText || item.label || ''
            const lspRange = item.textEdit?.range
            const range = toMonacoRange(lspRange) || defaultRange
            return {
              label: item.label || insertText,
              kind: mapCompletionKind(this.params.monaco, item.kind),
              detail: item.detail,
              documentation: normalizeHoverContents(item.documentation) || undefined,
              sortText: item.sortText,
              filterText: item.filterText,
              insertText,
              range,
              insertTextRules:
                item.insertTextFormat === 2
                  ? this.params.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                  : undefined
            }
          })

          return { suggestions }
        }
      }
    )
    this.providerDisposables.push(completionDisposable)

    const hoverDisposable = this.params.monaco.languages.registerHoverProvider(
      this.params.language,
      {
        provideHover: async (model, position) => {
          if (model.uri.toString() !== this.model.uri.toString()) {
            return null
          }
          const response = await this.sendRequest<LspHoverResult>('textDocument/hover', {
            textDocument: { uri: this.textDocumentUri },
            position: toLspPosition(position)
          }).catch(() => null)

          const content = normalizeHoverContents(response?.contents)
          if (!content) {
            return null
          }

          return {
            range: toMonacoRange(response?.range),
            contents: [{ value: content }]
          }
        }
      }
    )
    this.providerDisposables.push(hoverDisposable)
  }

  private handleSocketMessage(rawData: unknown): void {
    if (typeof rawData !== 'string') {
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(rawData)
    } catch {
      return
    }

    if (Array.isArray(parsed)) {
      parsed.forEach((message) => this.handleParsedMessage(message))
      return
    }

    this.handleParsedMessage(parsed)
  }

  private handleParsedMessage(message: unknown): void {
    if (!message || typeof message !== 'object') {
      return
    }

    const asResponse = message as JsonRpcResponse
    if (asResponse.id !== undefined) {
      const pending = this.pendingRequests.get(asResponse.id)
      if (!pending) {
        return
      }
      this.pendingRequests.delete(asResponse.id)
      window.clearTimeout(pending.timeoutId)
      if (asResponse.error) {
        pending.reject(new Error(asResponse.error.message || 'LSP request failed'))
      } else {
        pending.resolve(asResponse.result)
      }
      return
    }

    const asNotification = message as JsonRpcNotification
    if (asNotification.method === 'textDocument/publishDiagnostics') {
      this.applyDiagnostics(asNotification.params as LspPublishDiagnosticsParams)
    }
  }

  private applyDiagnostics(params: LspPublishDiagnosticsParams): void {
    if (!params || params.uri !== this.textDocumentUri) {
      return
    }

    const markers =
      params.diagnostics?.map((diagnostic) => {
        const range = toMonacoRange(diagnostic.range)
        if (!range) {
          return null
        }
        return {
          ...range,
          message: diagnostic.message || 'SQL diagnostic',
          source: diagnostic.source || 'lsp',
          severity: mapDiagnosticSeverity(this.params.monaco, diagnostic.severity)
        }
      }) || []

    this.params.monaco.editor.setModelMarkers(
      this.model,
      LSP_MARKER_OWNER,
      markers.filter((marker): marker is MonacoTypes.editor.IMarkerData => marker !== null)
    )
  }

  private sendNotification(method: string, params?: unknown): void {
    const ws = this.ws
    if (!ws || ws.readyState !== WebSocket.OPEN || this.isDisposed) {
      return
    }

    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      params
    }

    ws.send(JSON.stringify(notification))
  }

  private sendRequest<T>(method: string, params?: unknown): Promise<T> {
    const ws = this.ws
    if (!ws || ws.readyState !== WebSocket.OPEN || this.isDisposed) {
      return Promise.reject(new Error('LSP websocket is not open'))
    }

    const id = this.nextID
    this.nextID += 1
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    }

    return new Promise<T>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`LSP request timed out: ${method}`))
      }, REQUEST_TIMEOUT_MS)

      this.pendingRequests.set(id, { resolve, reject, timeoutId })
      try {
        ws.send(JSON.stringify(request))
      } catch (error) {
        window.clearTimeout(timeoutId)
        this.pendingRequests.delete(id)
        reject(error instanceof Error ? error : new Error('Failed to send LSP request'))
      }
    })
  }

  private openWebSocket(url: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url)

      const handleOpen = () => {
        cleanup()
        resolve(socket)
      }
      const handleError = () => {
        cleanup()
        reject(new Error('Failed to open SQL LSP websocket'))
      }
      const handleClose = (event: CloseEvent) => {
        cleanup()
        const reason = event.reason?.trim()
        if (reason) {
          reject(new Error(`SQL LSP websocket closed before initialization: ${reason}`))
          return
        }
        reject(new Error(`SQL LSP websocket closed before initialization (${event.code})`))
      }
      const cleanup = () => {
        socket.removeEventListener('open', handleOpen)
        socket.removeEventListener('error', handleError)
        socket.removeEventListener('close', handleClose)
      }

      socket.addEventListener('open', handleOpen)
      socket.addEventListener('error', handleError)
      socket.addEventListener('close', handleClose)
    })
  }
}

export interface MonacoSqlLspSession {
  dispose: () => void
}

export function createMonacoSqlLspSession(
  params: CreateMonacoSqlLspSessionParams
): MonacoSqlLspSession | null {
  const apiKey = params.apiKey.trim()
  const installId = params.installId.trim()

  const session = new MonacoSqlLspSessionImpl({
    ...params,
    apiKey,
    installId
  })
  session.start().catch((error) => {
    if (session.isClosed()) {
      return
    }
    params.onError?.(error)
    session.dispose()
  })
  return session
}
