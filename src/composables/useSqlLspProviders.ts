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
  provider?: 'sqls' | 'duckdb'
  connectionId?: string
  database?: string
  filePath?: string
  fileFormat?: string
  federatedConnections?: Array<{
    connectionId: string
    alias?: string
    database?: string
  }>
}

export function getSqlLspConnectionContextSignature(context?: SqlLspConnectionContext): string {
  const provider = normalizeSqlLspContextPart(context?.provider) || 'sqls'
  const connectionId = normalizeSqlLspContextPart(context?.connectionId)
  const database = normalizeSqlLspContextPart(context?.database)

  if (provider !== 'duckdb') {
    if (!connectionId || !database) {
      return ''
    }
    return `${provider}::${connectionId}::${database}`
  }

  const filePath = normalizeSqlLspContextPart(context?.filePath)
  const fileFormat = normalizeSqlLspContextPart(context?.fileFormat)
  const federated = (context?.federatedConnections || [])
    .map((mapping) => {
      const mappedConnectionID = normalizeSqlLspContextPart(mapping.connectionId)
      const mappedAlias = normalizeSqlLspContextPart(mapping.alias)
      const mappedDatabase = normalizeSqlLspContextPart(mapping.database)
      if (!mappedConnectionID) return ''
      return `${mappedConnectionID}:${mappedAlias}:${mappedDatabase}`
    })
    .filter((value) => value)
    .join('|')

  if (!federated && !filePath && !connectionId) {
    return ''
  }

  const parts = [provider]
  if (connectionId) parts.push(`conn=${connectionId}`)
  if (database) parts.push(`db=${database}`)
  if (filePath) parts.push(`file=${filePath}`)
  if (fileFormat) parts.push(`format=${fileFormat}`)
  if (federated) parts.push(`federated=${federated}`)

  return parts.join('::')
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
  const provider = params.connectionContext?.provider?.trim() || 'sqls'
  ws.pathname = joinPath(ws.pathname, provider === 'duckdb' ? 'lsp/duckdb/ws' : 'lsp/ws')

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

  const filePath = params.connectionContext?.filePath?.trim()
  if (filePath) {
    ws.searchParams.set('file', filePath)
  }

  const fileFormat = params.connectionContext?.fileFormat?.trim()
  if (fileFormat) {
    ws.searchParams.set('format', fileFormat)
  }

  const federatedConnections = params.connectionContext?.federatedConnections || []
  federatedConnections.forEach((mapping) => {
    const mappedConnectionID = mapping.connectionId?.trim()
    if (!mappedConnectionID) return

    ws.searchParams.append('connection_id', mappedConnectionID)

    const mappedAlias = mapping.alias?.trim()
    if (mappedAlias) {
      ws.searchParams.append('connection_alias', mappedAlias)
    }

    const mappedDatabase = mapping.database?.trim()
    if (mappedDatabase) {
      ws.searchParams.append('database', mappedDatabase)
    }
  })

  return ws.toString()
}
