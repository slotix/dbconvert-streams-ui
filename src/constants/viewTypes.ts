/**
 * View Type Constants
 * Defines available view modes for list displays (connections, streams, etc.)
 */

/**
 * Available view types for list/grid displays
 */
export const VIEW_TYPES = {
  /** Card-based grid view */
  CARDS: 'cards',
  /** Table-based list view */
  TABLE: 'table'
} as const

/**
 * Type for view type values
 */
export type ViewType = (typeof VIEW_TYPES)[keyof typeof VIEW_TYPES]

/**
 * Default view type
 */
export const DEFAULT_VIEW_TYPE: ViewType = VIEW_TYPES.CARDS

/**
 * Check if a view type is valid
 */
export function isValidViewType(type: string): type is ViewType {
  return Object.values(VIEW_TYPES).includes(type as ViewType)
}

/**
 * Get view type from string, with fallback to default
 */
export function getViewType(type: string | null | undefined): ViewType {
  if (type && isValidViewType(type)) {
    return type
  }
  return DEFAULT_VIEW_TYPE
}
