import { defineStore } from 'pinia'
import { ref } from 'vue'
import connections from '@/api/connections'
import type { DatabaseOverview } from '@/types/overview'

interface OverviewCacheEntry {
  data: DatabaseOverview
  timestamp: number
  loading: boolean
}

export const useDatabaseOverviewStore = defineStore('databaseOverview', () => {
  const cache = ref<Record<string, OverviewCacheEntry>>({})
  const CACHE_TTL = 30000 // 30 seconds

  function getCacheKey(connId: string, dbName: string): string {
    return `${connId}:${dbName}`
  }

  /**
   * Get approximate row count for a specific table
   */
  function getTableRowCount(connId: string, dbName: string, tableName: string): number | undefined {
    const key = getCacheKey(connId, dbName)
    const entry = cache.value[key]
    if (!entry || !entry.data.allTablesByRows) return undefined

    const table = entry.data.allTablesByRows.find((t) => t.name === tableName)
    return table?.approxRows
  }

  /**
   * Get size in bytes for a specific table
   */
  function getTableSize(connId: string, dbName: string, tableName: string): number | undefined {
    const key = getCacheKey(connId, dbName)
    const entry = cache.value[key]
    if (!entry || !entry.data.allTablesBySize) return undefined

    const table = entry.data.allTablesBySize.find((t) => t.name === tableName)
    return table?.sizeBytes
  }

  /**
   * Get all table sizes as a map (table name -> size in bytes)
   */
  function getAllTableSizes(connId: string, dbName: string): Record<string, number> {
    const key = getCacheKey(connId, dbName)
    const entry = cache.value[key]
    if (!entry || !entry.data.allTablesBySize) return {}

    const sizesMap: Record<string, number> = {}
    entry.data.allTablesBySize.forEach((table) => {
      sizesMap[table.name] = table.sizeBytes
    })
    return sizesMap
  }

  /**
   * Get the full overview data for a database
   */
  function getOverview(connId: string, dbName: string): DatabaseOverview | undefined {
    const key = getCacheKey(connId, dbName)
    return cache.value[key]?.data
  }

  /**
   * Check if overview data is currently loading
   */
  function isLoading(connId: string, dbName: string): boolean {
    const key = getCacheKey(connId, dbName)
    return cache.value[key]?.loading || false
  }

  /**
   * Fetch database overview from API and cache it
   */
  async function fetchOverview(
    connId: string,
    dbName: string,
    refresh = false
  ): Promise<DatabaseOverview> {
    const key = getCacheKey(connId, dbName)
    const now = Date.now()

    // Return cached if valid and not forcing refresh
    if (!refresh && cache.value[key]) {
      const entry = cache.value[key]
      if (now - entry.timestamp < CACHE_TTL && !entry.loading) {
        return entry.data
      }
    }

    // Initialize cache entry with loading state
    if (!cache.value[key]) {
      cache.value[key] = {
        data: {} as DatabaseOverview,
        timestamp: 0,
        loading: true
      }
    } else {
      cache.value[key].loading = true
    }

    try {
      const data = await connections.getDatabaseOverview(connId, dbName, { refresh })
      cache.value[key] = {
        data,
        timestamp: now,
        loading: false
      }
      return data
    } catch (e) {
      // Set loading to false on error but keep old data if exists
      if (cache.value[key]) {
        cache.value[key].loading = false
      }
      throw e
    }
  }

  /**
   * Clear cache for specific database or all databases
   */
  function clearCache(connId?: string, dbName?: string) {
    if (connId && dbName) {
      const key = getCacheKey(connId, dbName)
      delete cache.value[key]
    } else {
      cache.value = {}
    }
  }

  /**
   * Prefetch overview data (fire and forget)
   */
  function prefetchOverview(connId: string, dbName: string) {
    fetchOverview(connId, dbName, false).catch((e) => {
      console.warn('Failed to prefetch overview:', e)
    })
  }

  return {
    cache,
    getTableRowCount,
    getTableSize,
    getAllTableSizes,
    getOverview,
    isLoading,
    fetchOverview,
    clearCache,
    prefetchOverview
  }
})
