import { defineStore } from 'pinia'
import { ref } from 'vue'
import connections from '@/api/connections'
import type { DatabaseOverview } from '@/types/overview'

/**
 * Store for database overview data
 * Note: Caching is handled by the backend API (30s TTL)
 * Frontend simply fetches fresh data on demand
 */
export const useDatabaseOverviewStore = defineStore('databaseOverview', () => {
  const currentOverview = ref<DatabaseOverview | undefined>(undefined)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch database overview from API
   * Backend handles caching with 30s TTL
   */
  async function fetchOverview(connId: string, dbName: string): Promise<DatabaseOverview> {
    isLoading.value = true
    error.value = null

    try {
      const data = await connections.getDatabaseOverview(connId, dbName, { refresh: false })
      currentOverview.value = data
      return data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch overview'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get current overview data (may be undefined if not yet loaded)
   */
  function getOverview(): DatabaseOverview | undefined {
    return currentOverview.value
  }

  /**
   * Get approximate row count for a specific table
   */
  function getTableRowCount(tableName: string): number | undefined {
    if (!currentOverview.value?.allTablesByRows) return undefined
    const table = currentOverview.value.allTablesByRows.find((t) => t.name === tableName)
    return table?.approxRows
  }

  /**
   * Get size in bytes for a specific table
   */
  function getTableSize(tableName: string): number | undefined {
    if (!currentOverview.value?.allTablesBySize) return undefined
    const table = currentOverview.value.allTablesBySize.find((t) => t.name === tableName)
    return table?.sizeBytes
  }

  /**
   * Get all table sizes as a map (table name -> size in bytes)
   */
  function getAllTableSizes(): Record<string, number> {
    if (!currentOverview.value?.allTablesBySize) return {}

    const sizesMap: Record<string, number> = {}
    currentOverview.value.allTablesBySize.forEach((table) => {
      sizesMap[table.name] = table.sizeBytes
    })
    return sizesMap
  }

  /**
   * Clear the current overview data
   */
  function clearOverview(): void {
    currentOverview.value = undefined
    error.value = null
  }

  return {
    currentOverview,
    isLoading,
    error,
    fetchOverview,
    getOverview,
    getTableRowCount,
    getTableSize,
    getAllTableSizes,
    clearOverview
  }
})
