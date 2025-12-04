import type { Status } from '@/constants'

/**
 * Table-level statistics extracted from stream logs
 */
export interface TableStat {
  /** Table name */
  table: string
  /** Transfer status */
  status: Status
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

/**
 * S3 upload progress for a single table
 */
export interface S3UploadStat {
  /** Table name */
  table: string
  /** Upload status: UPLOADING, FINISHED, FAILED */
  status: Status
  /** Total number of files to upload */
  filesTotal: number
  /** Number of files uploaded */
  filesUploaded: number
  /** Total bytes to upload */
  bytesTotal: number
  /** Bytes uploaded so far */
  bytesUploaded: number
  /** S3 bucket name */
  bucket: string
  /** Upload rate in bytes/sec */
  rate: number
  /** Elapsed time in seconds */
  elapsed: number
  /** Timestamp of last update */
  timestamp: number
}

/**
 * Grouped S3 upload statistics by status
 */
export interface S3UploadStatsGroup {
  /** Tables that finished uploading */
  completed: S3UploadStat[]
  /** Tables currently uploading */
  uploading: S3UploadStat[]
  /** Tables that failed to upload */
  failed: S3UploadStat[]
  /** Total number of tables with upload activity */
  total: number
  /** Aggregate stats across all tables */
  aggregate: {
    filesTotal: number
    filesUploaded: number
    bytesTotal: number
    bytesUploaded: number
    rate: number
  }
}
