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
  DEBUG: 'debug'
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
 * Stat log status values
 * Indicates the state of a table/stream processing operation
 */
export const STAT_STATUS = {
  RUNNING: 'RUNNING',
  FINISHED: 'FINISHED',
  FAILED: 'FAILED',
  STOPPED: 'STOPPED',
  PAUSED: 'PAUSED'
} as const

export type StatStatus = (typeof STAT_STATUS)[keyof typeof STAT_STATUS]

/**
 * SQL query purposes
 * Categorizes what the SQL query is doing
 */
export const QUERY_PURPOSE = {
  SCHEMA_INTROSPECTION: 'SCHEMA_INTROSPECTION',
  DATA_QUERY: 'DATA_QUERY',
  COUNT_QUERY: 'COUNT_QUERY',
  PLAN_ANALYSIS: 'PLAN_ANALYSIS',
  SCHEMA_CHANGE: 'SCHEMA_CHANGE',
  DML_OPERATION: 'DML_OPERATION',
  SYSTEM_TASK: 'SYSTEM_TASK',
  UTILITY: 'UTILITY'
} as const

export type QueryPurpose = (typeof QUERY_PURPOSE)[keyof typeof QUERY_PURPOSE]

/**
 * Human-readable labels for log levels
 */
export const LOG_LEVEL_LABELS: Record<LogLevel, string> = {
  [LOG_LEVELS.DEBUG]: 'Debug',
  [LOG_LEVELS.INFO]: 'Info',
  [LOG_LEVELS.WARN]: 'Warning',
  [LOG_LEVELS.ERROR]: 'Error'
}

/**
 * Human-readable labels for log categories
 */
export const LOG_CATEGORY_LABELS: Record<LogCategory, string> = {
  [LOG_CATEGORIES.GENERAL]: 'General',
  [LOG_CATEGORIES.PROGRESS]: 'Progress',
  [LOG_CATEGORIES.STAT]: 'Statistics',
  [LOG_CATEGORIES.TABLE_METADATA]: 'Table Metadata',
  [LOG_CATEGORIES.SQL]: 'SQL',
  [LOG_CATEGORIES.ERROR]: 'Error',
  [LOG_CATEGORIES.DEBUG]: 'Debug'
}

/**
 * Log categories that should be filtered together as "progress & stats"
 */
export const STREAM_PROGRESS_CATEGORIES: LogCategory[] = [
  LOG_CATEGORIES.PROGRESS,
  LOG_CATEGORIES.STAT
]

/**
 * Log categories for terminal/end-of-stream messages
 * These typically have final stats and elapsed time
 */
export const TERMINAL_LOG_CATEGORIES: LogCategory[] = [LOG_CATEGORIES.STAT, LOG_CATEGORIES.PROGRESS]

/**
 * Node type display names
 */
export const NODE_TYPE_DISPLAY: Record<NodeType, string> = {
  [NODE_TYPES.API]: 'API',
  [NODE_TYPES.SOURCE]: 'SOURCE',
  [NODE_TYPES.TARGET]: 'TARGET'
}

/**
 * Stat status display with emoji
 */
export const STAT_STATUS_DISPLAY: Record<StatStatus, string> = {
  [STAT_STATUS.RUNNING]: '→ RUNNING',
  [STAT_STATUS.FINISHED]: '✓ FINISHED',
  [STAT_STATUS.FAILED]: '✗ FAILED',
  [STAT_STATUS.STOPPED]: '◼ STOPPED',
  [STAT_STATUS.PAUSED]: '⏸ PAUSED'
}

/**
 * Status emoji only (for compact display)
 */
export const STAT_STATUS_EMOJI: Record<StatStatus, string> = {
  [STAT_STATUS.RUNNING]: '→',
  [STAT_STATUS.FINISHED]: '✓',
  [STAT_STATUS.FAILED]: '✗',
  [STAT_STATUS.STOPPED]: '◼',
  [STAT_STATUS.PAUSED]: '⏸'
}
