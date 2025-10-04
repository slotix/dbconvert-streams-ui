import { computed, ref } from 'vue'
import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import connections from '@/api/connections'
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
    return (conn?.type || '').toLowerCase().includes('file')
  }

  function getDbLogoForType(dbType?: string): string {
    const t = (dbType || '').toString().toLowerCase()
    const found = connectionsStore.dbTypes.find((d) => d.type.toLowerCase() === t)
    return found?.logo || '/images/db-logos/all.svg'
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
    const meta = navigationStore.metadataCache[connId]?.[db]
    if (!meta) return []

    const buckets = new Map<string, { tables: string[]; views: string[] }>()
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

    const arr = Array.from(buckets.entries()).map(([name, bucket]) => ({
      name,
      tables: bucket.tables.sort((a, b) => a.localeCompare(b)),
      views: bucket.views.sort((a, b) => a.localeCompare(b))
    }))

    // Filter out MySQL default/system schemas
    const mysqlSystemSchemas = new Set(['information_schema', 'mysql', 'performance_schema', 'sys'])
    const filtered = isMySQL(connId)
      ? arr.filter((s) => !mysqlSystemSchemas.has((s.name || '').toLowerCase()))
      : arr

    return filtered.sort((a, b) => {
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
    const meta = navigationStore.metadataCache[connId]?.[db]
    if (!meta) return []
    return Object.values(meta.tables || {})
      .map((t) => t.name)
      .sort((a, b) => a.localeCompare(b))
  }

  function getFlatViews(connId: string, db: string): string[] {
    const meta = navigationStore.metadataCache[connId]?.[db]
    if (!meta) return []
    return Object.values(meta.views || {})
      .map((v) => v.name)
      .sort((a, b) => a.localeCompare(b))
  }

  function isMetadataLoaded(connId: string, dbName: string): boolean {
    return !!navigationStore.metadataCache[connId]?.[dbName]
  }

  function matchesTypeFilter(conn: Connection, typeFilter: string): boolean {
    const filterLabel = typeFilter || 'All'
    const filter = filterLabel.toLowerCase()
    if (!filter || filter === 'all') return true
    const connType = (conn.type || '').toLowerCase()
    if (!connType) return false
    if (filter === 'postgresql') return connType.includes('postgres')
    if (filter === 'files') return connType.includes('file')
    return connType.includes(filter)
  }

  // Cache for table sizes: { "connId:dbName": { tableName: sizeBytes } }
  const tableSizesCache = ref<Record<string, Record<string, number>>>({})

  async function getTableSizes(connId: string, dbName: string): Promise<Record<string, number>> {
    const cacheKey = `${connId}:${dbName}`

    // Return cached if available
    if (tableSizesCache.value[cacheKey]) {
      return tableSizesCache.value[cacheKey]
    }

    // Fetch from database overview
    try {
      const overview = await connections.getDatabaseOverview(connId, dbName, { refresh: false })

      // Build map of table name -> size
      const sizesMap: Record<string, number> = {}
      overview.allTablesBySize.forEach((table) => {
        sizesMap[table.name] = table.sizeBytes
      })

      // Cache it
      tableSizesCache.value[cacheKey] = sizesMap
      return sizesMap
    } catch (e) {
      console.warn('Failed to fetch table sizes:', e)
      return {}
    }
  }

  return {
    isFileConnection,
    getDbLogoForType,
    isMySQL,
    isPostgres,
    isSnowflake,
    hasSchemas,
    getSchemas,
    getFlatTables,
    getFlatViews,
    isMetadataLoaded,
    matchesTypeFilter,
    getTableSizes
  }
}
