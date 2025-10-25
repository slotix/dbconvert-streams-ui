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
export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  [SERVICE_STATUS.PASSING]: 'Healthy',
  [SERVICE_STATUS.CRITICAL]: 'Down',
  [SERVICE_STATUS.UNKNOWN]: 'Unknown',
  [SERVICE_STATUS.INITIALIZING]: 'Starting',
  [SERVICE_STATUS.WARNING]: 'Warning'
}

/**
 * Check if service is healthy
 */
export function isServiceHealthy(status: ServiceStatus): boolean {
  return status === SERVICE_STATUS.PASSING
}

/**
 * Check if service is down
 */
export function isServiceDown(status: ServiceStatus): boolean {
  return status === SERVICE_STATUS.CRITICAL
}

/**
 * Check if service status is unknown
 */
export function isServiceStatusUnknown(status: ServiceStatus): boolean {
  return status === SERVICE_STATUS.UNKNOWN
}

/**
 * Get label for service status
 */
export function getServiceStatusLabel(status: ServiceStatus): string {
  return SERVICE_STATUS_LABELS[status] || 'Unknown'
}

/**
 * Get CSS color class for service status
 */
export function getServiceStatusColor(status: ServiceStatus): string {
  switch (status) {
    case SERVICE_STATUS.PASSING:
      return 'text-green-600'
    case SERVICE_STATUS.CRITICAL:
      return 'text-red-600'
    case SERVICE_STATUS.WARNING:
      return 'text-yellow-600'
    case SERVICE_STATUS.INITIALIZING:
      return 'text-blue-600'
    default:
      return 'text-gray-400'
  }
}

/**
 * Get badge color class for service status
 */
export function getServiceStatusBadgeColor(status: ServiceStatus): string {
  switch (status) {
    case SERVICE_STATUS.PASSING:
      return 'bg-green-100 text-green-800'
    case SERVICE_STATUS.CRITICAL:
      return 'bg-red-100 text-red-800'
    case SERVICE_STATUS.WARNING:
      return 'bg-yellow-100 text-yellow-800'
    case SERVICE_STATUS.INITIALIZING:
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

/**
 * Get icon for service status
 */
export function getServiceStatusIcon(status: ServiceStatus): string {
  switch (status) {
    case SERVICE_STATUS.PASSING:
      return 'check-circle'
    case SERVICE_STATUS.CRITICAL:
      return 'x-circle'
    case SERVICE_STATUS.WARNING:
      return 'exclamation-triangle'
    case SERVICE_STATUS.INITIALIZING:
      return 'clock'
    default:
      return 'question-mark-circle'
  }
}
