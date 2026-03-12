/**
 * API Header Constants
 * Standard HTTP header names used in API requests
 */

/**
 * Custom API headers
 */
export const API_HEADERS = {
  /** Custom header for API key authentication */
  API_KEY: 'X-API-Key',

  /** Custom header for install ID */
  INSTALL_ID: 'X-Install-ID',

  /** Custom header for cache control information */
  CACHE: 'X-Cache',

  /** Custom header for request ID tracking */
  REQUEST_ID: 'X-Request-ID'
} as const

/**
 * Common content type values
 */
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  URL_ENCODED: 'application/x-www-form-urlencoded',
  TEXT: 'text/plain',
  HTML: 'text/html'
} as const
