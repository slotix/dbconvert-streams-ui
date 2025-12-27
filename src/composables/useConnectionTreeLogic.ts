import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import type { Connection } from '@/types/connections'

interface SchemaInfo {
  name: string
  tables: string[]
  views: string[]
}

export function useConnectionTreeLogic() {
  const connectionsStore = useConnectionsStore()
  const navigationStore = useExplorerNavigationStore()

  function isFileConnection(connId: string): boolean {
    const conn = connectionsStore.connections.find((c) => c.id === connId)
    const t = (conn?.type || '').toLowerCase().trim()
    return t.includes('file') || t === 'files' || t === 's3' || !!conn?.spec?.s3
  }

  function isS3Connection(conn: Connection): boolean {
    // Check if connection has S3 spec
    return !!conn.spec?.s3
  }

  function getEffectiveType(conn: Connection): string {
    // For file connections, distinguish between S3 and local files
    const baseType = (conn.type || '').toLowerCase().trim()
    if (baseType === 's3') return 's3'
    // Check for S3 spec even when type is 'files' - S3 connections may have type='files' with spec.s3 set
    if (baseType === 'files') return isS3Connection(conn) ? 's3' : 'files'
    if (baseType.includes('file')) return isS3Connection(conn) ? 's3' : 'files'
    if (isS3Connection(conn)) return 's3'
    return baseType
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
    return (conn?.type || '').toLowerCase() === 'mysql'
  }

  function isPostgres(connId: string): boolean {
    const conn = connectionsStore.connections.find((c) => c.id === connId)
    return (conn?.type || '').toLowerCase() === 'postgresql'
  }

  function isSnowflake(connId: string): boolean {
    const conn = connectionsStore.connections.find((c) => c.id === connId)
    return (conn?.type || '').toLowerCase() === 'snowflake'
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
    const buckets = new Map<string, { tables: string[]; views: string[] }>()

    // First, add all schemas from the API response (including empty ones)
    if (meta.schemas && Array.isArray(meta.schemas)) {
      meta.schemas.forEach((schemaName: string) => {
        buckets.set(schemaName, { tables: [], views: [] })
      })
    }

    // Then populate tables and views into their respective schemas
    Object.values(meta.tables || {}).forEach((t) => {
      const s = t.schema || ''
      if (!buckets.has(s)) buckets.set(s, { tables: [], views: [] })
      buckets.get(s)!.tables.push(t.name)
    })
    Object.values(meta.views || {}).forEach((v) => {
      const s = v.schema || ''
      if (!buckets.has(s)) buckets.set(s, { tables: [], views: [] })
      buckets.get(s)!.views.push(v.name)
    })

    let arr = Array.from(buckets.entries()).map(([name, bucket]) => ({
      name,
      tables: bucket.tables.sort((a, b) => a.localeCompare(b)),
      views: bucket.views.sort((a, b) => a.localeCompare(b))
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

  function isMetadataLoaded(connId: string, dbName: string): boolean {
    return !!navigationStore.metadataState[connId]?.[dbName]
  }

  function matchesTypeFilters(conn: Connection, typeFilters: string[]): boolean {
    // If no filters selected, show all
    if (!typeFilters || typeFilters.length === 0) return true

    const effectiveType = getEffectiveType(conn)
    if (!effectiveType) return false

    // Check if connection matches any of the selected type filters (case-insensitive)
    return typeFilters.some((filter) => {
      const filterLower = filter.toLowerCase().trim()

      // Treat "Files" filter as including both local files + S3.
      if (filterLower === 'files') {
        return effectiveType === 'files' || effectiveType === 's3'
      }

      if (filterLower === 's3') {
        return effectiveType === 's3'
      }

      // Fallback: match by substring for DB types (postgresql, mysql, snowflake, etc.)
      return effectiveType.includes(filterLower) || filterLower.includes(effectiveType)
    })
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
    isMetadataLoaded,
    matchesTypeFilters
  }
}
