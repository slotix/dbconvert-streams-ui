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

const STATUS_LABELS: Record<Status, string> = {
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
 * Get status label
 */
export function getStatusLabel(status: Status): string {
  return STATUS_LABELS[status] || status
}
