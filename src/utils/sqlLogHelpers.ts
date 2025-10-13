/**
 * Shared utility functions for SQL log components
 */

/**
 * Get the Tailwind CSS classes for a query purpose pill
 */
export function getPurposePillClass(purpose: string): string {
  const classes: Record<string, string> = {
    USER_DATA: 'bg-blue-600 text-white',
    USER_ACTION: 'bg-blue-700 text-white',
    METADATA: 'bg-gray-500 text-white',
    PAGINATION: 'bg-orange-600 text-white',
    ESTIMATE: 'bg-teal-600 text-white',
    EXPLAIN: 'bg-purple-600 text-white'
  }
  return classes[purpose] || 'bg-gray-600 text-white'
}

/**
 * Get the Tailwind CSS color class based on query duration
 * Fast queries (< 100ms) are green, slow queries (> 1s) are red
 */
export function getDurationClass(ms: number): string {
  if (ms < 100) return 'text-green-600'
  if (ms < 500) return 'text-yellow-600'
  if (ms < 1000) return 'text-orange-600'
  return 'text-red-600'
}

/**
 * Format a timestamp string to HH:MM:SS.mmm format
 */
export function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return (
    date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) +
    '.' +
    date.getMilliseconds().toString().padStart(3, '0')
  )
}
