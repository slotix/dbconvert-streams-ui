/**
 * Stream Status Constants
 * Defines all possible states for a stream throughout its lifecycle
 */

/**
 * Stream status enum values
 * These correspond to backend stream states
 */
export const STREAM_STATUS = {
  UNDEFINED: 0,
  READY: 1,
  RUNNING: 2,
  PAUSED: 3,
  FAILED: 4,
  TIME_LIMIT_REACHED: 5,
  EVENT_LIMIT_REACHED: 6,
  STOPPED: 7,
  FINISHED: 8
} as const

/**
 * Type for stream status values
 */
export type StreamStatus = (typeof STREAM_STATUS)[keyof typeof STREAM_STATUS]

/**
 * Human-readable labels for stream statuses
 */
export const STREAM_STATUS_LABELS: Record<StreamStatus, string> = {
  [STREAM_STATUS.UNDEFINED]: 'Undefined',
  [STREAM_STATUS.READY]: 'Ready',
  [STREAM_STATUS.RUNNING]: 'Running',
  [STREAM_STATUS.PAUSED]: 'Paused',
  [STREAM_STATUS.FAILED]: 'Failed',
  [STREAM_STATUS.TIME_LIMIT_REACHED]: 'Time Limit Reached',
  [STREAM_STATUS.EVENT_LIMIT_REACHED]: 'Event Limit Reached',
  [STREAM_STATUS.STOPPED]: 'Stopped',
  [STREAM_STATUS.FINISHED]: 'Finished'
}

/**
 * Stream status categories for styling and logic
 */
export const STREAM_STATUS_CATEGORIES = {
  ACTIVE: [STREAM_STATUS.RUNNING],
  SUCCESS: [STREAM_STATUS.FINISHED],
  ERROR: [STREAM_STATUS.FAILED],
  STOPPED: [STREAM_STATUS.STOPPED, STREAM_STATUS.PAUSED],
  COMPLETED: [
    STREAM_STATUS.FINISHED,
    STREAM_STATUS.TIME_LIMIT_REACHED,
    STREAM_STATUS.EVENT_LIMIT_REACHED
  ],
  PENDING: [STREAM_STATUS.UNDEFINED, STREAM_STATUS.READY]
} as const

/**
 * Check if stream is actively running
 */
export function isStreamRunning(status: StreamStatus): boolean {
  return STREAM_STATUS_CATEGORIES.ACTIVE.includes(status)
}

/**
 * Check if stream has completed successfully
 */
export function isStreamCompleted(status: StreamStatus): boolean {
  return STREAM_STATUS_CATEGORIES.COMPLETED.includes(status)
}

/**
 * Check if stream has failed
 */
export function isStreamFailed(status: StreamStatus): boolean {
  return STREAM_STATUS_CATEGORIES.ERROR.includes(status)
}

/**
 * Check if stream is stopped or paused
 */
export function isStreamStopped(status: StreamStatus): boolean {
  return STREAM_STATUS_CATEGORIES.STOPPED.includes(status)
}

/**
 * Check if stream is in pending state
 */
export function isStreamPending(status: StreamStatus): boolean {
  return STREAM_STATUS_CATEGORIES.PENDING.includes(status)
}

/**
 * Get label for stream status
 */
export function getStreamStatusLabel(status: StreamStatus): string {
  return STREAM_STATUS_LABELS[status] || 'Unknown'
}

/**
 * Get CSS color class for stream status
 */
export function getStreamStatusColor(status: StreamStatus): string {
  if (isStreamRunning(status)) return 'text-blue-600'
  if (isStreamCompleted(status)) return 'text-green-600'
  if (isStreamFailed(status)) return 'text-red-600'
  if (isStreamStopped(status)) return 'text-gray-600'
  return 'text-gray-400'
}

/**
 * Get badge color class for stream status
 */
export function getStreamStatusBadgeColor(status: StreamStatus): string {
  if (isStreamRunning(status)) return 'bg-blue-100 text-blue-800'
  if (isStreamCompleted(status)) return 'bg-green-100 text-green-800'
  if (isStreamFailed(status)) return 'bg-red-100 text-red-800'
  if (isStreamStopped(status)) return 'bg-gray-100 text-gray-800'
  return 'bg-gray-100 text-gray-600'
}
