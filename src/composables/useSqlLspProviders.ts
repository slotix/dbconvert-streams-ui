import { getBackendUrl } from '@/utils/environment'

function normalizeSqlLspContextPart(value: string | undefined): string {
  return value?.trim() || ''
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

export function isSqlLspEnabled(runtimeValue?: string, buildValue?: string): boolean {
  const runtimeFlag = runtimeValue ?? getRuntimeLspFlag()
  if (runtimeFlag !== undefined) {
    return normalizeFlag(runtimeFlag)
  }

  const buildFlag = buildValue ?? import.meta.env.VITE_SQL_LSP_ENABLED
  return normalizeFlag(buildFlag)
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
