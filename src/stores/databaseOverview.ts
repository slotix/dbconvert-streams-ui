import { defineStore } from 'pinia'
import { reactive, toRefs } from 'vue'
import connections from '@/api/connections'
import type { DatabaseOverview } from '@/types/overview'

/**
 * Store for database overview data
 * Note: Caching is handled by the backend API (30s TTL)
 * Frontend caches multiple overviews to support simultaneous access
 * (e.g., source and target databases in stream compare view)
 */
export const useDatabaseOverviewStore = defineStore('databaseOverview', () => {
  // Reactive state using plain objects instead of Map/Set for proper Vue reactivity
  const state = reactive<{
    overviews: Record<string, DatabaseOverview>
    loadingKeys: Record<string, boolean>
    errors: Record<string, string>
  }>({
    overviews: {},
    loadingKeys: {},
    errors: {}
  })

  /**
   * Generate cache key for a connection + database
   */
  function getCacheKey(connId: string, dbName: string): string {
    return `${connId}:${dbName}`
  }

  /**
   * Fetch database overview from API
   * Backend handles caching with 30s TTL
   * @param forceRefresh - If true, bypasses backend cache
   */
  async function fetchOverview(
    connId: string,
    dbName: string,
    forceRefresh = false
  ): Promise<DatabaseOverview> {
    const key = getCacheKey(connId, dbName)
    state.loadingKeys[key] = true
    delete state.errors[key]

    try {
      const data = await connections.getDatabaseOverview(connId, dbName, { refresh: forceRefresh })
      state.overviews[key] = data
      return data
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to fetch overview'
      state.errors[key] = errorMsg
      throw e
    } finally {
      delete state.loadingKeys[key]
    }
  }

  /**
   * Get overview data for a specific connection + database
   */
  function getOverview(connId: string, dbName: string): DatabaseOverview | undefined {
    const key = getCacheKey(connId, dbName)
    return state.overviews[key]
  }

  /**
   * Get row count for a specific table
   * Prefers exact count (for small tables ≤10k rows) over approximate count
   */
  function getTableRowCount(tableName: string, connId: string, dbName: string): number | undefined {
    const overview = getOverview(connId, dbName)
    if (!overview?.allTablesByRows) return undefined
    const table = overview.allTablesByRows.find((t) => t.name === tableName)
    // Prefer exact count (populated for small tables ≤10k rows in backend)
    // Fall back to approximate count for larger tables
    return table?.exactRows ?? table?.approxRows
  }

  /**
   * Get size in bytes for a specific table
   */
  function getTableSize(tableName: string, connId: string, dbName: string): number | undefined {
    const overview = getOverview(connId, dbName)
    if (!overview?.allTablesBySize) return undefined
    const table = overview.allTablesBySize.find((t) => t.name === tableName)
    return table?.sizeBytes
  }

  /**
   * Get all table sizes as a map (table name -> size in bytes)
   */
  function getAllTableSizes(connId: string, dbName: string): Record<string, number> {
    const overview = getOverview(connId, dbName)
    if (!overview?.allTablesBySize) return {}

    const sizesMap: Record<string, number> = {}
    overview.allTablesBySize.forEach((table) => {
      sizesMap[table.name] = table.sizeBytes
    })
    return sizesMap
  }

  /**
   * Check if a specific overview is currently loading
   */
  function isLoadingOverview(connId: string, dbName: string): boolean {
    return state.loadingKeys[getCacheKey(connId, dbName)] === true
  }

  /**
   * Get error for a specific overview
   */
  function getError(connId: string, dbName: string): string | null {
    return state.errors[getCacheKey(connId, dbName)] || null
  }

  /**
   * Clear overview for a specific connection + database
   */
  function clearOverview(connId?: string, dbName?: string): void {
    if (!connId || !dbName) {
      // Clear all overviews
      state.overviews = {}
      state.errors = {}
      state.loadingKeys = {}
      return
    }
    const key = getCacheKey(connId, dbName)
    delete state.overviews[key]
    delete state.errors[key]
    delete state.loadingKeys[key]
  }

  return {
    ...toRefs(state),
    fetchOverview,
    getOverview,
    getTableRowCount,
    getTableSize,
    getAllTableSizes,
    isLoadingOverview,
    getError,
    clearOverview
  }
})
