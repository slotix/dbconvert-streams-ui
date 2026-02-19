import { getBackendUrl } from '@/utils/environment'

function normalizeSqlLspContextPart(value: string | undefined): string {
  return value?.trim() || ''
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

export interface SqlLspConnectionContext {
  connectionId?: string
  database?: string
}

export function getSqlLspConnectionContextSignature(context?: SqlLspConnectionContext): string {
  const connectionId = normalizeSqlLspContextPart(context?.connectionId)
  const database = normalizeSqlLspContextPart(context?.database)
  if (!connectionId || !database) {
    return ''
  }
  return `${connectionId}::${database}`
}

export function buildSqlLspWebSocketUrl(params: {
  backendUrl?: string
  apiKey: string
  installId: string
  connectionContext?: SqlLspConnectionContext
}): string {
  const backend = toAbsoluteURL(params.backendUrl ?? getBackendUrl())
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

  return ws.toString()
}
