/**
 * API Configuration Constants
 * Centralized timeout, retry, and connection settings for API calls
 */

/**
 * Default API request timeout in milliseconds
 * Used by the main API client for standard requests
 */
export const DEFAULT_API_TIMEOUT = 300000 // 5 minutes

/**
 * API request timeouts by operation type (in milliseconds)
 */
export const API_TIMEOUTS = {
  /** Quick operations like listing items */
  SHORT: 15000, // 15 seconds
  /** Standard operations like fetching data */
  MEDIUM: 30000, // 30 seconds
  /** Long operations like creating connections or initial data loads */
  LONG: 45000, // 45 seconds
  /** Very long operations like counting large tables */
  VERY_LONG: 120000, // 2 minutes
  /** Maximum timeout for any operation */
  MAX: 300000 // 5 minutes
} as const

/**
 * Retry configuration for API requests
 */
export const API_RETRY = {
  /** Maximum number of retry attempts */
  MAX_RETRIES: 3,
  /** Default delay between retries in milliseconds */
  DEFAULT_DELAY: 1000,
  /** Multiplier for exponential backoff */
  BACKOFF_MULTIPLIER: 2
} as const

/**
 * Health check configuration
 */
export const HEALTH_CHECK = {
  /** Maximum number of retry attempts for health checks */
  MAX_RETRIES: 2,
  /** Delay between health check retries in milliseconds */
  RETRY_DELAY: 1000,
  /** Interval for health monitoring in milliseconds */
  MONITORING_INTERVAL: 10000 // 10 seconds
} as const

/**
 * SSE (Server-Sent Events) configuration
 */
export const SSE_CONFIG = {
  /** Connection timeout in milliseconds */
  CONNECTION_TIMEOUT: 1000,
  /** Reconnection delay in milliseconds */
  RECONNECTION_DELAY: 3000
} as const

/**
 * Operation-specific timeouts
 * Maps specific operations to their recommended timeout values
 */
export const OPERATION_TIMEOUTS = {
  getConnections: API_TIMEOUTS.MEDIUM,
  createConnection: API_TIMEOUTS.LONG,
  updateConnection: API_TIMEOUTS.LONG,
  deleteConnection: API_TIMEOUTS.MEDIUM,
  testConnection: API_TIMEOUTS.LONG,
  getDatabases: API_TIMEOUTS.SHORT,
  getDatabaseOverview: API_TIMEOUTS.SHORT,
  getTableData: API_TIMEOUTS.MEDIUM,
  getTableExactCount: API_TIMEOUTS.VERY_LONG,
  getViewExactCount: API_TIMEOUTS.VERY_LONG,
  getFileData: API_TIMEOUTS.MEDIUM,
  getFileMetadata: API_TIMEOUTS.MEDIUM
} as const

/**
 * Helper to get timeout for an operation
 */
export function getOperationTimeout(operation: keyof typeof OPERATION_TIMEOUTS): number {
  return OPERATION_TIMEOUTS[operation] || DEFAULT_API_TIMEOUT
}
