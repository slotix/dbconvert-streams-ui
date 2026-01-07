import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import type { Connection } from '@/types/connections'
import {
  getConnectionKindFromSpec,
  getConnectionTypeLabel,
  isDatabaseKind,
  isFileBasedKind,
  matchesConnectionTypeFilter
} from '@/types/specs'

interface SchemaInfo {
  name: string
  tables: string[]
  views: string[]
  functions: string[]
  procedures: string[]
}

function formatRoutineName(name: string, signature?: string): string {
  const trimmed = (signature || '').trim()
  return trimmed ? `${name}(${trimmed})` : name
}

export function useConnectionTreeLogic() {
  const connectionsStore = useConnectionsStore()
  const navigationStore = useExplorerNavigationStore()

  function isFileConnection(connId: string): boolean {
    const conn = connectionsStore.connections.find((c) => c.id === connId)
    const kind = getConnectionKindFromSpec(conn?.spec)
    return isFileBasedKind(kind)
  }

  function isS3Connection(conn: Connection): boolean {
    return getConnectionKindFromSpec(conn.spec) === 's3'
  }

  function getEffectiveType(conn: Connection): string {
    return getConnectionTypeLabel(conn.spec, conn.type) || ''
  }

  function getDbLogoForType(dbType?: string): string {
    const t = (dbType || '').toString().toLowerCase()
    const found = connectionsStore.dbTypes.find((d) => d.type.toLowerCase() === t)
    return found?.logo || '/images/db-logos/all.svg'
  }

  function getDbLogoForConnection(conn: Connection): string {
    const effectiveType = getEffectiveType(conn)
    return getDbLogoForType(effectiveType)
  }

  function isMySQL(connId: string): boolean {
    const conn = connectionsStore.connections.find((c) => c.id === connId)
    const kind = getConnectionKindFromSpec(conn?.spec)
    if (!isDatabaseKind(kind)) return false
    return (conn?.type || '').toLowerCase() === 'mysql'
  }

  function isPostgres(connId: string): boolean {
    const conn = connectionsStore.connections.find((c) => c.id === connId)
    const kind = getConnectionKindFromSpec(conn?.spec)
    if (!isDatabaseKind(kind)) return false
    return (conn?.type || '').toLowerCase() === 'postgresql'
  }

  function isSnowflake(connId: string): boolean {
    const conn = connectionsStore.connections.find((c) => c.id === connId)
    return getConnectionKindFromSpec(conn?.spec) === 'snowflake'
  }

  function hasSchemas(connId: string): boolean {
    // Show schemas for PostgreSQL and Snowflake; hide for others
    return isPostgres(connId) || isSnowflake(connId)
  }

  function getSchemas(connId: string, db: string): SchemaInfo[] {
    const meta = navigationStore.metadataState[connId]?.[db]
    if (!meta) return []

    // Get schema system info from databasesState (from /databases API)
    const dbInfo = navigationStore.databasesState[connId]?.find((d) => d.name === db)
    const schemaSystemInfo = new Map<string, boolean>()
    if (dbInfo?.schemas) {
      dbInfo.schemas.forEach((s) => {
        schemaSystemInfo.set(s.name.toLowerCase(), s.isSystem || false)
      })
    }

    // Initialize buckets for all schemas from the API response
    const buckets = new Map<
      string,
      {
        tables: string[]
        views: string[]
        functions: string[]
        procedures: string[]
      }
    >()

    // First, add all schemas from the API response (including empty ones)
    if (meta.schemas && Array.isArray(meta.schemas)) {
      meta.schemas.forEach((schemaName: string) => {
        buckets.set(schemaName, {
          tables: [],
          views: [],
          functions: [],
          procedures: []
        })
      })
    }

    // Then populate tables and views into their respective schemas
    Object.values(meta.tables || {}).forEach((t) => {
      const s = t.schema || ''
      if (!buckets.has(s)) {
        buckets.set(s, { tables: [], views: [], functions: [], procedures: [] })
      }
      buckets.get(s)!.tables.push(t.name)
    })
    Object.values(meta.views || {}).forEach((v) => {
      const s = v.schema || ''
      if (!buckets.has(s)) {
        buckets.set(s, { tables: [], views: [], functions: [], procedures: [] })
      }
      buckets.get(s)!.views.push(v.name)
    })
    Object.values(meta.functions || {}).forEach((fn) => {
      const s = fn.schema || ''
      if (!buckets.has(s)) {
        buckets.set(s, { tables: [], views: [], functions: [], procedures: [] })
      }
      buckets.get(s)!.functions.push(formatRoutineName(fn.name, fn.signature))
    })
    Object.values(meta.procedures || {}).forEach((proc) => {
      const s = proc.schema || ''
      if (!buckets.has(s)) {
        buckets.set(s, { tables: [], views: [], functions: [], procedures: [] })
      }
      buckets.get(s)!.procedures.push(formatRoutineName(proc.name, proc.signature))
    })

    let arr = Array.from(buckets.entries()).map(([name, bucket]) => ({
      name,
      tables: bucket.tables.sort((a, b) => a.localeCompare(b)),
      views: bucket.views.sort((a, b) => a.localeCompare(b)),
      functions: bucket.functions.sort((a, b) => a.localeCompare(b)),
      procedures: bucket.procedures.sort((a, b) => a.localeCompare(b))
    }))

    // Filter out system schemas when showSystemObjects is false
    if (!navigationStore.showSystemObjectsFor(connId, db)) {
      arr = arr.filter((schema) => !schemaSystemInfo.get(schema.name.toLowerCase()))
    }

    return arr.sort((a, b) => {
      const an = a.name
      const bn = b.name
      if (!an) return -1
      if (!bn) return 1
      if (an === 'public') return -1
      if (bn === 'public') return 1
      return an.localeCompare(bn)
    })
  }

  function getFlatTables(connId: string, db: string): string[] {
    const meta = navigationStore.metadataState[connId]?.[db]
    if (!meta) return []
    return Object.values(meta.tables || {})
      .map((t) => t.name)
      .sort((a, b) => a.localeCompare(b))
  }

  function getFlatViews(connId: string, db: string): string[] {
    const meta = navigationStore.metadataState[connId]?.[db]
    if (!meta) return []
    return Object.values(meta.views || {})
      .map((v) => v.name)
      .sort((a, b) => a.localeCompare(b))
  }

  function getFlatFunctions(connId: string, db: string): string[] {
    const meta = navigationStore.metadataState[connId]?.[db]
    if (!meta) return []
    return Object.values(meta.functions || {})
      .map((f) => formatRoutineName(f.name, f.signature))
      .sort((a, b) => a.localeCompare(b))
  }

  function getFlatProcedures(connId: string, db: string): string[] {
    const meta = navigationStore.metadataState[connId]?.[db]
    if (!meta) return []
    return Object.values(meta.procedures || {})
      .map((p) => formatRoutineName(p.name, p.signature))
      .sort((a, b) => a.localeCompare(b))
  }

  function isMetadataLoaded(connId: string, dbName: string): boolean {
    return !!navigationStore.metadataState[connId]?.[dbName]
  }

  function matchesTypeFilters(conn: Connection, typeFilters: string[]): boolean {
    // If no filters selected, show all
    if (!typeFilters || typeFilters.length === 0) return true
    return typeFilters.some((filter) => matchesConnectionTypeFilter(conn.spec, conn.type, filter))
  }

  return {
    isFileConnection,
    isS3Connection,
    getEffectiveType,
    getDbLogoForType,
    getDbLogoForConnection,
    isMySQL,
    isPostgres,
    isSnowflake,
    hasSchemas,
    getSchemas,
    getFlatTables,
    getFlatViews,
    getFlatFunctions,
    getFlatProcedures,
    isMetadataLoaded,
    matchesTypeFilters
  }
}
