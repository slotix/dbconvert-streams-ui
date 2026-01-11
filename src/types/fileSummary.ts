import type { FileFormat } from '@/utils/fileFormat'
import type { ColumnSummary, TableSummaryResponse } from '@/types/tableSummary'

/**
 * Request payload for file summary API
 */
export interface FileSummaryRequest {
  path: string
  format: FileFormat
  samplePercent?: number
  connectionId?: string
}

/**
 * Response from file summary API
 */
export interface FileSummaryResponse {
  path: string
  format: FileFormat
  rowCount: number
  columnCount: number
  columns: ColumnSummary[]
  executionTimeMs: number
  sampled: boolean
  samplePercent?: number
  status: string
}

/**
 * Union type for summary responses (table or file).
 * Discriminated by the presence of 'table' (TableSummaryResponse) vs 'path' (FileSummaryResponse).
 */
export type SummaryResponse = TableSummaryResponse | FileSummaryResponse

/**
 * Type guard to check if a summary response is a table summary.
 */
export function isTableSummary(summary: SummaryResponse): summary is TableSummaryResponse {
  return 'table' in summary
}

/**
 * Type guard to check if a summary response is a file summary.
 */
export function isFileSummary(summary: SummaryResponse): summary is FileSummaryResponse {
  return 'path' in summary
}
