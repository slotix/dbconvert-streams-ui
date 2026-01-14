/**
 * AG Grid configuration constants
 */

// =============================================================================
// Pagination
// =============================================================================

/** Available page size options for AG Grid pagination */
export const PAGE_SIZE_OPTIONS = [25, 50, 100, 250] as const

/** Default page size for AG Grid pagination */
export const DEFAULT_PAGE_SIZE = 50

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

export function isPageSizeOption(value: number): value is PageSizeOption {
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(value)
}

// =============================================================================
// Layout
// =============================================================================

/** Standard header height for AG Grid */
export const GRID_HEADER_HEIGHT = 40

/** Default row height for data grids (compact) */
export const GRID_ROW_HEIGHT = 32

/** Row height for tables with more content (e.g., history) */
export const GRID_ROW_HEIGHT_LARGE = 48
