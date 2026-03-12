/**
 * Service Status Constants
 * Health status values for backend services (API, NATS, Consul, Vault, etc.)
 */

/**
 * Service health status values
 */
export const SERVICE_STATUS = {
  /** Service is healthy and operational */
  PASSING: 'passing',
  /** Service is down or not responding */
  CRITICAL: 'critical',
  /** Service status is unknown or cannot be determined */
  UNKNOWN: 'unknown',
  /** Service is starting up */
  INITIALIZING: 'initializing',
  /** Service is in a warning state (degraded but operational) */
  WARNING: 'warning'
} as const

/**
 * Type for service status values
 */
export type ServiceStatus = (typeof SERVICE_STATUS)[keyof typeof SERVICE_STATUS]

/**
 * Human-readable labels for service statuses
 */
const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  [SERVICE_STATUS.PASSING]: 'Healthy',
  [SERVICE_STATUS.CRITICAL]: 'Down',
  [SERVICE_STATUS.UNKNOWN]: 'Unknown',
  [SERVICE_STATUS.INITIALIZING]: 'Starting',
  [SERVICE_STATUS.WARNING]: 'Warning'
}

/**
 * Get label for service status
 */
export function getServiceStatusLabel(status: ServiceStatus): string {
  return SERVICE_STATUS_LABELS[status] || 'Unknown'
}
