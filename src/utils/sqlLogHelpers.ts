/**
 * Unified utility functions for both System and SQL log components
 *
 * This module provides shared styling and formatting utilities for logs
 * to ensure consistent look and feel across both System Logs and SQL Logs.
 */

// ============================================================================
// Icon Imports
// ============================================================================

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  Cog6ToothIcon,
  EyeIcon
} from '@heroicons/vue/24/outline'

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
// System Log Category Presentation (icons instead of badges)
// ============================================================================

type IconComponent = typeof CheckCircleIcon

const CATEGORY_PRESENTATION: Record<
  string,
  { label: string; icon: IconComponent; iconColorClass: string }
> = {
  progress: { label: 'Progress', icon: CheckCircleIcon, iconColorClass: 'text-blue-600' },
  stat: { label: 'Statistics', icon: EyeIcon, iconColorClass: 'text-indigo-600' },
  error: { label: 'Error', icon: ExclamationCircleIcon, iconColorClass: 'text-red-600' },
  warn: { label: 'Warning', icon: ExclamationTriangleIcon, iconColorClass: 'text-yellow-600' },
  debug: { label: 'Debug', icon: Cog6ToothIcon, iconColorClass: 'text-purple-600' },
  info: { label: 'Info', icon: InformationCircleIcon, iconColorClass: 'text-gray-600' }
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
 * Format a timestamp string to HH:MM:SS.mmm format (in local timezone)
 */
export function formatTime(timestamp: string): string {
  const date = new Date(timestamp)

  // Get hours, minutes, seconds in local timezone using toLocaleTimeString
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  }).formatToParts(date)

  const hours = parts.find((p) => p.type === 'hour')?.value || '00'
  const minutes = parts.find((p) => p.type === 'minute')?.value || '00'
  const seconds = parts.find((p) => p.type === 'second')?.value || '00'
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0')

  return `${hours}:${minutes}:${seconds}.${milliseconds}`
}

// ============================================================================
// Unified Helpers for Both Log Types
// ============================================================================

/**
 * Get icon and color for system log categories and severity levels
 * Returns icon component and color class for rendering as icons instead of badges
 */
export function getCategoryIcon(
  type: 'category' | 'level',
  value: string
): {
  icon: IconComponent
  colorClass: string
} {
  const key = type === 'category' ? value : value.toLowerCase()
  const presentation = CATEGORY_PRESENTATION[key]

  if (presentation) {
    return {
      icon: presentation.icon,
      colorClass: presentation.iconColorClass
    }
  }

  return {
    icon: InformationCircleIcon,
    colorClass: 'text-gray-600'
  }
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
 * Returns format: HH:MM:SS.mmm for millisecond precision
 */
export function formatLogTimestamp(timestamp: number): string {
  const timestampInMs = timestamp < 1e12 ? timestamp * 1000 : timestamp
  const date = new Date(timestampInMs)
  const timeString = date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0')
  return `${timeString}.${milliseconds}`
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
