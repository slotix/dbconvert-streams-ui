/**
 * Logging Types and Constants
 * Defines all possible log categories, levels, and stat log fields
 * These match the backend structured logging format
 */

/**
 * Log level enum values
 * Matches Zap logger levels from backend
 */
export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
} as const

export type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS]

/**
 * Log category enum values
 * Categorizes logs by type for filtering and display
 */
export const LOG_CATEGORIES = {
  GENERAL: 'general',
  PROGRESS: 'progress',
  STAT: 'stat',
  TABLE_METADATA: 'table_metadata',
  SQL: 'sql',
  ERROR: 'error',
  DEBUG: 'debug',
  S3_UPLOAD: 's3_upload'
} as const

export type LogCategory = (typeof LOG_CATEGORIES)[keyof typeof LOG_CATEGORIES]

/**
 * Node types that generate logs
 * Represents different components of the streaming pipeline
 */
export const NODE_TYPES = {
  API: 'api',
  SOURCE: 'source',
  TARGET: 'target'
} as const

export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES]

/**
 * Log categories that should be filtered together as "progress & stats"
 */
export const STREAM_PROGRESS_CATEGORIES: LogCategory[] = [
  LOG_CATEGORIES.PROGRESS,
  LOG_CATEGORIES.STAT
]
