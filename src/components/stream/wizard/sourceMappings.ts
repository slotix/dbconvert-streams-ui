import type { StreamConnectionMapping } from '@/types/streamConfig'
import type { ConnectionKind } from '@/types/specs'

export type ConnectionKindResolver = (connectionId: string) => ConnectionKind | null

export function getSourceSelectionValue(
  mapping: StreamConnectionMapping,
  kind: ConnectionKind | null
): string | undefined {
  if (kind === 's3') return mapping.s3?.bucket
  if (kind === 'files') return mapping.files?.basePath
  return mapping.database
}

export function isSameSourceSelection(
  a: StreamConnectionMapping,
  b: { connectionId: string; selectionValue?: string },
  kind: ConnectionKind | null
): boolean {
  return a.connectionId === b.connectionId && getSourceSelectionValue(a, kind) === b.selectionValue
}

export function makeDatabaseSourceMapping(params: {
  connectionId: string
  alias: string
  database?: string
}): StreamConnectionMapping {
  return {
    connectionId: params.connectionId,
    alias: params.alias,
    database: params.database
  }
}

export function makeFileSourceMapping(params: {
  connectionId: string
  alias: string
  basePath: string
  paths?: string[]
}): StreamConnectionMapping {
  return {
    connectionId: params.connectionId,
    alias: params.alias,
    files: {
      basePath: params.basePath,
      paths: params.paths
    }
  }
}

export function makeS3SourceMapping(params: {
  connectionId: string
  alias: string
  bucket: string
}): StreamConnectionMapping {
  return {
    connectionId: params.connectionId,
    alias: params.alias,
    s3: { bucket: params.bucket }
  }
}

export function toggleSourceMapping(params: {
  current: StreamConnectionMapping[]
  connectionId: string
  selectionValue?: string
  checked: boolean
  alias: string
  kind: ConnectionKind | null
}): StreamConnectionMapping[] {
  const key = { connectionId: params.connectionId, selectionValue: params.selectionValue }

  if (!params.checked) {
    return params.current.filter((m) => !isSameSourceSelection(m, key, params.kind))
  }

  const exists = params.current.some((m) => isSameSourceSelection(m, key, params.kind))
  if (exists) return params.current

  if (params.kind === 's3') {
    if (!params.selectionValue) return params.current
    return [
      ...params.current,
      makeS3SourceMapping({
        connectionId: params.connectionId,
        alias: params.alias,
        bucket: params.selectionValue
      })
    ]
  }

  if (params.kind === 'files') {
    if (!params.selectionValue) return params.current
    return [
      ...params.current,
      makeFileSourceMapping({
        connectionId: params.connectionId,
        alias: params.alias,
        basePath: params.selectionValue
      })
    ]
  }

  // Default: database-like sources.
  return [
    ...params.current,
    makeDatabaseSourceMapping({
      connectionId: params.connectionId,
      alias: params.alias,
      database: params.selectionValue
    })
  ]
}
