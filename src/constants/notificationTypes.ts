/**
 * Notification Type Constants
 * Types for toast notifications and alert messages
 */

/**
 * Notification severity types
 */
export const NOTIFICATION_TYPES = {
  /** Success message - green */
  SUCCESS: 'success',
  /** Error message - red */
  ERROR: 'error',
  /** Warning message - yellow */
  WARNING: 'warning',
  /** Info message - blue */
  INFO: 'info'
} as const

/**
 * Type for notification type values
 */
export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES]

/**
 * Notification duration presets (in milliseconds)
 */
export const NOTIFICATION_DURATION = {
  /** Short duration - 3 seconds */
  SHORT: 3000,
  /** Medium duration - 5 seconds */
  MEDIUM: 5000,
  /** Long duration - 8 seconds */
  LONG: 8000,
  /** Persistent - requires manual dismissal */
  PERSISTENT: 0
} as const

/**
 * Get default duration for notification type
 */
export function getNotificationDuration(type: NotificationType): number {
  switch (type) {
    case NOTIFICATION_TYPES.ERROR:
      return NOTIFICATION_DURATION.LONG
    case NOTIFICATION_TYPES.WARNING:
      return NOTIFICATION_DURATION.MEDIUM
    case NOTIFICATION_TYPES.INFO:
      return NOTIFICATION_DURATION.MEDIUM
    case NOTIFICATION_TYPES.SUCCESS:
      return NOTIFICATION_DURATION.SHORT
    default:
      return NOTIFICATION_DURATION.MEDIUM
  }
}

/**
 * Get icon name for notification type
 */
export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case NOTIFICATION_TYPES.SUCCESS:
      return 'check-circle'
    case NOTIFICATION_TYPES.ERROR:
      return 'x-circle'
    case NOTIFICATION_TYPES.WARNING:
      return 'exclamation-triangle'
    case NOTIFICATION_TYPES.INFO:
      return 'information-circle'
    default:
      return 'bell'
  }
}

/**
 * Get CSS color classes for notification type
 */
export function getNotificationColors(type: NotificationType): {
  bg: string
  border: string
  text: string
  icon: string
} {
  switch (type) {
    case NOTIFICATION_TYPES.SUCCESS:
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        icon: 'text-green-600'
      }
    case NOTIFICATION_TYPES.ERROR:
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        icon: 'text-red-600'
      }
    case NOTIFICATION_TYPES.WARNING:
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        icon: 'text-yellow-600'
      }
    case NOTIFICATION_TYPES.INFO:
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        icon: 'text-blue-600'
      }
    default:
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-800',
        icon: 'text-gray-600'
      }
  }
}
