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
 * Standard HTTP headers
 */
export const HTTP_HEADERS = {
  /** Content type of the request/response body */
  CONTENT_TYPE: 'Content-Type',

  /** Authorization header for bearer tokens */
  AUTHORIZATION: 'Authorization',

  /** Accept header for response format */
  ACCEPT: 'Accept',

  /** Cache control directives */
  CACHE_CONTROL: 'Cache-Control'
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

/**
 * Type for API header names
 */
export type ApiHeader = (typeof API_HEADERS)[keyof typeof API_HEADERS]

/**
 * Type for HTTP header names
 */
export type HttpHeader = (typeof HTTP_HEADERS)[keyof typeof HTTP_HEADERS]

/**
 * Type for content type values
 */
export type ContentType = (typeof CONTENT_TYPES)[keyof typeof CONTENT_TYPES]
