/**
 * Types for Table Summary API
 * Column-level statistics using DuckDB SUMMARIZE
 */

/**
 * Summary statistics for a single column
 */
export interface ColumnSummary {
  name: string
  type: string
  min: string | number | null
  max: string | number | null
  approxUnique: number
  avg?: string | number | null
  std?: string | number | null
  q25?: string | number | null
  q50?: string | number | null
  q75?: string | number | null
  count: number
  nullPercentage: number
}

/**
 * Request payload for table summary API
 */
export interface TableSummaryRequest {
  connectionId: string
  database: string
  schema?: string
  table: string
  samplePercent?: number
}

/**
 * Response from table summary API
 */
export interface TableSummaryResponse {
  table: string
  schema?: string
  database?: string
  rowCount: number
  columnCount: number
  columns: ColumnSummary[]
  executionTimeMs: number
  sampled: boolean
  samplePercent?: number
  status: string
}
