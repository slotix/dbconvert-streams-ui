/**
 * Table Summary API Service
 * Fetches column-level statistics using DuckDB SUMMARIZE
 */
import axios, { type AxiosResponse } from 'axios'
import { apiClient, validateApiKey } from './apiClient'
import { useCommonStore } from '@/stores/common'
import { handleApiError } from '@/utils/errorHandler'
import { API_HEADERS, API_TIMEOUTS } from '@/constants'
import type { TableSummaryRequest, TableSummaryResponse } from '@/types/tableSummary'

/**
 * Fetch table summary statistics
 * Uses DuckDB SUMMARIZE to get column-level statistics (min, max, null%, distinct count, etc.)
 * @param request - The summary request parameters
 * @param signal - Optional AbortSignal for cancellation
 */
export async function getTableSummary(
  request: TableSummaryRequest,
  signal?: AbortSignal,
  options?: {
    /**
     * If true, bypasses server-side summary cache and recomputes statistics.
     * Maps to stream-api query param `?refresh=true`.
     */
    refresh?: boolean
  }
): Promise<TableSummaryResponse> {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)

  try {
    const { connectionId, database, table, schema, samplePercent } = request

    const params: Record<string, string> | undefined = (() => {
      const p: Record<string, string> = {}
      if (schema) p.schema = schema
      if (options?.refresh) p.refresh = 'true'
      return Object.keys(p).length ? p : undefined
    })()

    const response: AxiosResponse<TableSummaryResponse> = await apiClient.post(
      `/connections/${encodeURIComponent(connectionId)}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/summary`,
      typeof samplePercent === 'number' ? { samplePercent } : {},
      {
        headers: { [API_HEADERS.API_KEY]: commonStore.apiKey },
        timeout: API_TIMEOUTS.VERY_LONG, // 2 minutes for large tables
        params,
        signal // Pass abort signal for cancellation
      }
    )
    return response.data
  } catch (error) {
    // Don't treat cancellation as an error
    if (
      axios.isCancel(error) ||
      (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') ||
      (error instanceof Error && (error.name === 'CanceledError' || error.name === 'AbortError'))
    ) {
      throw error // Re-throw to let caller handle it
    }
    throw handleApiError(error)
  }
}

export default {
  getTableSummary
}
