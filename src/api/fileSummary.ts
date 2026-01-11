/**
 * File Summary API Service
 * Fetches column-level statistics using DuckDB SUMMARIZE
 */
import axios, { type AxiosResponse } from 'axios'
import { apiClient, validateApiKey } from './apiClient'
import { useCommonStore } from '@/stores/common'
import { handleApiError } from '@/utils/errorHandler'
import { API_HEADERS, API_TIMEOUTS } from '@/constants'
import type { FileSummaryRequest, FileSummaryResponse } from '@/types/fileSummary'

/**
 * Fetch file summary statistics
 * Uses DuckDB SUMMARIZE to get column-level statistics (min, max, null%, distinct count, etc.)
 * @param request - The summary request parameters
 * @param signal - Optional AbortSignal for cancellation
 */
export async function getFileSummary(
  request: FileSummaryRequest,
  signal?: AbortSignal,
  options?: {
    /**
     * If true, bypasses server-side caches and recomputes statistics.
     * Maps to stream-api query param `?refresh=true`.
     */
    refresh?: boolean
  }
): Promise<FileSummaryResponse> {
  const commonStore = useCommonStore()
  validateApiKey(commonStore.apiKey)

  try {
    const { path, format, samplePercent, connectionId } = request

    const params: Record<string, string> | undefined = (() => {
      const p: Record<string, string> = {}
      if (options?.refresh) p.refresh = 'true'
      return Object.keys(p).length ? p : undefined
    })()

    const response: AxiosResponse<FileSummaryResponse> = await apiClient.post(
      '/files/summary',
      {
        path,
        format,
        samplePercent,
        connectionId
      },
      {
        headers: { [API_HEADERS.API_KEY]: commonStore.apiKey },
        timeout: API_TIMEOUTS.VERY_LONG,
        params,
        signal
      }
    )

    return response.data
  } catch (error) {
    if (
      axios.isCancel(error) ||
      (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') ||
      (error instanceof Error && (error.name === 'CanceledError' || error.name === 'AbortError'))
    ) {
      throw error
    }
    throw handleApiError(error)
  }
}

export default {
  getFileSummary
}
