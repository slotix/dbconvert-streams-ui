import type { StatStatus } from '@/constants'

/**
 * Table-level statistics extracted from stream logs
 */
export interface TableStat {
  /** Table name */
  table: string
  /** Transfer status */
  status: StatStatus
  /** Number of events/rows transferred */
  events: number
  /** Data size (formatted string, e.g., "111.83 KB") */
  size: string
  /** Data size in bytes (for progress calculation) */
  sizeBytes: number
  /** Transfer rate (formatted string, e.g., "3.77 MB/s") */
  rate: string
  /** Duration in seconds */
  elapsed: number
  /** Timestamp of last update */
  timestamp: number
  /** Estimated total rows (from table metadata) */
  estimatedRows?: number
  /** Estimated total size in bytes (from table metadata) */
  estimatedSizeBytes?: number
}

/**
 * Grouped table statistics by status
 */
export interface TableStatsGroup {
  /** Tables that completed successfully */
  completed: TableStat[]
  /** Tables currently being transferred */
  running: TableStat[]
  /** Tables that failed during transfer */
  failed: TableStat[]
  /** Tables that were stopped */
  stopped: TableStat[]
  /** Tables that are paused */
  paused: TableStat[]
  /** Total number of tables */
  total: number
}

/**
 * Table metadata with size estimates (from backend)
 */
export interface TableMetadata {
  /** Table name */
  name: string
  /** Estimated row count */
  estimatedRows: number
  /** Estimated size in bytes */
  estimatedSizeBytes: number
  /** Schema name (for PostgreSQL) */
  schema?: string
}
