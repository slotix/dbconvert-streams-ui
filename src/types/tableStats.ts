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
  /** Transfer rate (formatted string, e.g., "3.77 MB/s") */
  rate: string
  /** Duration in seconds */
  elapsed: number
  /** Timestamp of last update */
  timestamp: number
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
  /** Total number of tables */
  total: number
}
