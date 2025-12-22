/**
 * LocalStorage Keys
 * Centralized key names for localStorage/sessionStorage to prevent typos and conflicts
 */

/**
 * LocalStorage key names used throughout the application
 */
export const STORAGE_KEYS = {
  /** User's API key for authentication */
  API_KEY: 'dbconvert-api-key',

  /** Selected view type (cards/table) for connections list */
  VIEW_TYPE: 'viewType',

  /** User preferences and settings */
  USER_PREFERENCES: 'user-preferences',

  /** Last selected connection ID in explorer */
  LAST_CONNECTION: 'last-connection',

  /** Recent connections list */
  RECENT_CONNECTIONS: 'recent-connections',

  /** Sidebar visibility state */
  SIDEBAR_VISIBLE: 'sidebar-visible',

  /** Sidebar width percentage */
  SIDEBAR_WIDTH: 'sidebar-width',

  /** Explorer pane layout state */
  EXPLORER_LAYOUT: 'explorer-layout',

  /** Stream wizard progress */
  STREAM_WIZARD_DRAFT: 'stream-wizard-draft',

  /** Object tab states (Data/Structure selection) */
  OBJECT_TAB_STATES: 'object-tab-states',

  /** Always open new tab preference */
  ALWAYS_OPEN_NEW_TAB: 'explorer.alwaysOpenNewTab',

  /** Last opened route in desktop app */
  DESKTOP_LAST_ROUTE: 'desktop-last-route',

  /** UI zoom level for desktop app */
  DESKTOP_UI_ZOOM: 'desktop-ui-zoom'
} as const

/**
 * Type for storage key values
 */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

/**
 * SessionStorage key names (for temporary, session-only data)
 */
export const SESSION_KEYS = {
  /** Current stream monitoring data */
  STREAM_MONITOR_STATE: 'stream-monitor-state',

  /** Temporary form data */
  FORM_DRAFT: 'form-draft'
} as const

/**
 * Type for session key values
 */
export type SessionKey = (typeof SESSION_KEYS)[keyof typeof SESSION_KEYS]

/**
 * Helper to get typed localStorage value
 */
export function getStorageValue<T>(key: StorageKey, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Helper to set localStorage value
 */
export function setStorageValue<T>(key: StorageKey, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Failed to save to localStorage: ${key}`, error)
  }
}

/**
 * Helper to remove localStorage value
 */
export function removeStorageValue(key: StorageKey): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`Failed to remove from localStorage: ${key}`, error)
  }
}
