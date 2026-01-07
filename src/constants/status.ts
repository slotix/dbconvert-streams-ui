/**
 * Unified Status Constants
 * Consolidates stream, table, and node statuses into a single system
 * Used for both overall stream state and individual table/node execution states
 */

/**
 * Unified status values
 * String-based for easier debugging and consistency with backend logs
 */
export const STATUS = {
  // Pre-execution states
  UNDEFINED: 'UNDEFINED',
  READY: 'READY',

  // Active execution states
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',

  // Terminal states (execution completed)
  FINISHED: 'FINISHED',
  STOPPED: 'STOPPED',
  FAILED: 'FAILED',
  TIME_LIMIT_REACHED: 'TIME_LIMIT_REACHED',
  EVENT_LIMIT_REACHED: 'EVENT_LIMIT_REACHED'
} as const

export type Status = (typeof STATUS)[keyof typeof STATUS]

/**
 * Status priority for determining worst/highest priority status
 * Higher number = higher priority (worse state)
 */
export const STATUS_PRIORITY: Record<Status, number> = {
  [STATUS.FAILED]: 9,
  [STATUS.STOPPED]: 8,
  [STATUS.FINISHED]: 7,
  [STATUS.TIME_LIMIT_REACHED]: 6,
  [STATUS.EVENT_LIMIT_REACHED]: 5,
  [STATUS.PAUSED]: 4,
  [STATUS.RUNNING]: 3,
  [STATUS.READY]: 2,
  [STATUS.UNDEFINED]: 1
}

/**
 * Human-readable labels for all statuses
 */
export const STATUS_LABELS: Record<Status, string> = {
  [STATUS.UNDEFINED]: 'Undefined',
  [STATUS.READY]: 'Ready',
  [STATUS.RUNNING]: 'Running',
  [STATUS.PAUSED]: 'Paused',
  [STATUS.FINISHED]: 'Finished',
  [STATUS.STOPPED]: 'Stopped',
  [STATUS.FAILED]: 'Failed',
  [STATUS.TIME_LIMIT_REACHED]: 'Time Limit Reached',
  [STATUS.EVENT_LIMIT_REACHED]: 'Event Limit Reached'
}

/**
 * Status display with emoji
 */
export const STATUS_DISPLAY: Record<Status, string> = {
  [STATUS.UNDEFINED]: 'UNDEFINED',
  [STATUS.READY]: 'READY',
  [STATUS.RUNNING]: '→ RUNNING',
  [STATUS.PAUSED]: '⏸ PAUSED',
  [STATUS.FINISHED]: '✓ FINISHED',
  [STATUS.STOPPED]: '◼ STOPPED',
  [STATUS.FAILED]: '✗ FAILED',
  [STATUS.TIME_LIMIT_REACHED]: '⏱ TIME LIMIT',
  [STATUS.EVENT_LIMIT_REACHED]: '📊 EVENT LIMIT'
}

/**
 * Status emoji only (for compact display)
 */
export const STATUS_EMOJI: Record<Status, string> = {
  [STATUS.UNDEFINED]: '?',
  [STATUS.READY]: '○',
  [STATUS.RUNNING]: '→',
  [STATUS.PAUSED]: '⏸',
  [STATUS.FINISHED]: '✓',
  [STATUS.STOPPED]: '◼',
  [STATUS.FAILED]: '✗',
  [STATUS.TIME_LIMIT_REACHED]: '⏱',
  [STATUS.EVENT_LIMIT_REACHED]: '📊'
}

/**
 * Terminal statuses that indicate execution has ended
 */
export const TERMINAL_STATUSES = [
  STATUS.FINISHED,
  STATUS.FAILED,
  STATUS.STOPPED,
  STATUS.TIME_LIMIT_REACHED,
  STATUS.EVENT_LIMIT_REACHED
] as const

/**
 * Active statuses that indicate execution is ongoing
 */
export const ACTIVE_STATUSES = [STATUS.RUNNING, STATUS.PAUSED] as const

/**
 * Success statuses that indicate successful completion
 */
export const SUCCESS_STATUSES = [
  STATUS.FINISHED,
  STATUS.TIME_LIMIT_REACHED,
  STATUS.EVENT_LIMIT_REACHED
] as const

/**
 * Error statuses that indicate failure
 */
export const ERROR_STATUSES = [STATUS.FAILED] as const

/**
 * Stopped statuses (user-initiated stop)
 */
export const STOPPED_STATUSES = [STATUS.STOPPED, STATUS.PAUSED] as const

/**
 * Check if status is terminal (execution ended)
 */
export function isTerminalStatus(status: Status): boolean {
  return (TERMINAL_STATUSES as readonly Status[]).includes(status)
}

/**
 * Check if status is active (execution ongoing)
 */
export function isActiveStatus(status: Status): boolean {
  return (ACTIVE_STATUSES as readonly Status[]).includes(status)
}

/**
 * Check if status indicates success
 */
export function isSuccessStatus(status: Status): boolean {
  return (SUCCESS_STATUSES as readonly Status[]).includes(status)
}

/**
 * Check if status indicates failure
 */
export function isErrorStatus(status: Status): boolean {
  return (ERROR_STATUSES as readonly Status[]).includes(status)
}

/**
 * Check if status indicates user-initiated stop
 */
export function isStoppedStatus(status: Status): boolean {
  return (STOPPED_STATUSES as readonly Status[]).includes(status)
}

/**
 * Get status label
 */
export function getStatusLabel(status: Status): string {
  return STATUS_LABELS[status] || status
}

/**
 * Get status priority
 */
export function getStatusPriority(status: Status): number {
  return STATUS_PRIORITY[status] || 0
}

/**
 * Compare two statuses and return the worse one (higher priority)
 */
export function getWorstStatus(status1: Status, status2: Status): Status {
  return getStatusPriority(status1) > getStatusPriority(status2) ? status1 : status2
}

/**
 * Shared styling helpers for STOPPED stream states
 */
export const STOP_STATUS_COLORS = {
  iconBackground: 'bg-gray-100 dark:bg-gray-800',
  text: 'text-gray-700 dark:text-gray-300',
  iconColor: 'text-gray-600 dark:text-gray-300',
  badgeBackground: 'bg-gray-50 dark:bg-gray-900/40',
  badgeText: 'text-gray-800 dark:text-gray-200'
} as const
