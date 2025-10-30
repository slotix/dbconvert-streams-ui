/**
 * Unified utility functions for both System and SQL log components
 *
 * This module provides shared styling and formatting utilities for logs
 * to ensure consistent look and feel across both System Logs and SQL Logs.
 */

// ============================================================================
// SQL Query Purpose Presentation
// ============================================================================

const PURPOSE_PRESENTATION: Record<string, { label: string; classes: string }> = {
  SCHEMA_INTROSPECTION: { label: 'Schema', classes: 'bg-slate-600 text-white' },
  DATA_QUERY: { label: 'Data', classes: 'bg-blue-600 text-white' },
  COUNT_QUERY: { label: 'Count', classes: 'bg-amber-600 text-white' },
  PLAN_ANALYSIS: { label: 'Plan Analysis', classes: 'bg-slate-500 text-white' },
  SCHEMA_CHANGE: { label: 'DDL', classes: 'bg-red-600 text-white' },
  DML_OPERATION: { label: 'DML', classes: 'bg-emerald-600 text-white' },
  SYSTEM_TASK: { label: 'System', classes: 'bg-gray-500 text-white' },
  UTILITY: { label: 'Utility', classes: 'bg-gray-400 text-white' }
}

// ============================================================================
// System Log Category Presentation (unified with SQL badges)
// ============================================================================

const CATEGORY_PRESENTATION: Record<string, { label: string; badgeClasses: string }> = {
  progress: { label: 'Progress', badgeClasses: 'bg-blue-100 text-blue-700' },
  stat: { label: 'Statistics', badgeClasses: 'bg-indigo-100 text-indigo-700' },
  error: { label: 'Error', badgeClasses: 'bg-red-100 text-red-700' },
  warn: { label: 'Warning', badgeClasses: 'bg-yellow-100 text-yellow-700' },
  debug: { label: 'Debug', badgeClasses: 'bg-purple-100 text-purple-700' },
  info: { label: 'Info', badgeClasses: 'bg-gray-100 text-gray-700' }
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

// ============================================================================
// Unified Helpers for Both Log Types
// ============================================================================

/**
 * Get badge classes for system log categories and severity levels
 * Provides unified styling across both System and SQL logs
 */
export function getCategoryBadgeClasses(type: 'category' | 'level', value: string): string {
  if (type === 'category') {
    return CATEGORY_PRESENTATION[value]?.badgeClasses ?? 'bg-gray-100 text-gray-700'
  }
  // For log levels (used as fallback when category is not available)
  return CATEGORY_PRESENTATION[value.toLowerCase()]?.badgeClasses ?? 'bg-gray-100 text-gray-700'
}

/**
 * Get human-readable label for system log category or level
 */
export function getCategoryLabel(type: 'category' | 'level', value: string): string {
  if (type === 'category') {
    return CATEGORY_PRESENTATION[value]?.label ?? value.toUpperCase()
  }
  return CATEGORY_PRESENTATION[value.toLowerCase()]?.label ?? value.toUpperCase()
}

/**
 * Format log timestamp from Unix timestamp (seconds or milliseconds)
 */
export function formatLogTimestamp(timestamp: number): string {
  const timestampInMs = timestamp < 1e12 ? timestamp * 1000 : timestamp
  const date = new Date(timestampInMs)
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '…'
}

/**
 * Get appropriate CSS class for error/warning states
 */
export function getErrorStateClass(hasError: boolean, isWarning: boolean = false): string {
  if (hasError) return 'bg-red-50 border-red-200'
  if (isWarning) return 'bg-yellow-50 border-yellow-200'
  return 'bg-white'
}

/**
 * Unified keyboard shortcuts help text for both log types
 */
export const UNIFIED_SHORTCUTS = {
  system: [
    { key: 'K', description: 'Clear logs' },
    { key: 'F / /', description: 'Focus search (when implemented)' }
  ],
  sql: [
    { key: 'F', description: 'Focus search box' },
    { key: 'G', description: 'Toggle grouped/ungrouped view' },
    { key: 'X', description: 'Toggle expand/collapse all' },
    { key: 'E', description: 'Toggle errors only' },
    { key: 'S', description: 'Toggle sort order' },
    { key: 'K', description: 'Clear logs' }
  ]
}
