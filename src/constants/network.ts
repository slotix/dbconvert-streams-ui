/**
 * Network Constants
 * Common network-related values and utilities
 */

/**
 * Localhost identifiers
 */
export const LOCALHOST_ADDRESSES = ['localhost', '127.0.0.1', '::1'] as const

/**
 * Common port numbers
 */
export const COMMON_PORTS = {
  /** PostgreSQL default port */
  POSTGRESQL: 5432,
  /** MySQL default port */
  MYSQL: 3306,
  /** MongoDB default port */
  MONGODB: 27017,
  /** Redis default port */
  REDIS: 6379,
  /** SQL Server default port */
  SQL_SERVER: 1433,
  /** Oracle default port */
  ORACLE: 1521,
  /** HTTP */
  HTTP: 80,
  /** HTTPS */
  HTTPS: 443,
  /** DBConvert Streams API */
  DBCONVERT_API: 8020,
  /** DBConvert Streams UI */
  DBCONVERT_UI: 5173
} as const

/**
 * Check if a host is localhost
 */
export function isLocalhost(host: string): boolean {
  return LOCALHOST_ADDRESSES.includes(host.toLowerCase() as any)
}

/**
 * Get display name for host (mask localhost)
 */
export function getHostDisplayName(host: string): string {
  return isLocalhost(host) ? 'localhost' : host
}

/**
 * Check if a URL is local
 */
export function isLocalUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    return isLocalhost(parsedUrl.hostname)
  } catch {
    return false
  }
}

/**
 * Protocol types
 */
export const PROTOCOLS = {
  HTTP: 'http',
  HTTPS: 'https',
  WS: 'ws',
  WSS: 'wss'
} as const

/**
 * Type for protocol values
 */
export type Protocol = (typeof PROTOCOLS)[keyof typeof PROTOCOLS]
