/**
 * Desktop Navigation Constants
 *
 * Defines navigation model for desktop vs web mode behavior.
 * Desktop mode should feel like a "serious desktop data tool" not a "SaaS page inside a window".
 */

/**
 * Desktop-specific navigation configuration
 */
export const DESKTOP_NAVIGATION = {
  /** Default route when desktop app starts (workspace, not overview) */
  defaultRoute: '/explorer',

  /** Fallback route if restoration fails */
  fallbackRoute: '/explorer',

  /** Routes that are primary workspaces */
  workspaceViews: ['/explorer', '/streams'],

  /** Routes that are informational/status views (not primary workspaces) */
  informationalViews: ['/']
} as const

/**
 * Route names for the application
 */
export const ROUTE_NAMES = {
  OVERVIEW: 'Overview',
  DATABASE_EXPLORER: 'DatabaseExplorer',
  STREAMS: 'Streams'
} as const
