/**
 * Shared utility functions for SQL log components
 */

const PURPOSE_PRESENTATION: Record<string, { label: string; classes: string }> = {
  SCHEMA_INTROSPECTION: { label: 'Schema', classes: 'bg-gray-500 text-white' },
  DATA_QUERY: { label: 'Data', classes: 'bg-green-600 text-white' },
  COUNT_QUERY: { label: 'Count', classes: 'bg-orange-500 text-white' },
  PLAN_ANALYSIS: { label: 'Plan Analysis', classes: 'bg-purple-600 text-white' },
  SCHEMA_CHANGE: { label: 'Schema Change', classes: 'bg-blue-600 text-white' },
  DML_OPERATION: { label: 'DML', classes: 'bg-indigo-600 text-white' },
  SYSTEM_TASK: { label: 'System', classes: 'bg-yellow-400 text-gray-900' },
  UTILITY: { label: 'Utility', classes: 'bg-gray-400 text-white' }
}

/**
 * Get the Tailwind CSS classes for a query purpose pill
 */
export function getPurposePillClass(purpose: string): string {
  return PURPOSE_PRESENTATION[purpose]?.classes ?? 'bg-gray-600 text-white'
}

/**
 * Get a human-readable label for a query purpose
 */
export function getPurposeLabel(purpose: string): string {
  return PURPOSE_PRESENTATION[purpose]?.label ?? purpose.replace(/_/g, ' ')
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
