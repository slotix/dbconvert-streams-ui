/**
 * Icon Size Constants
 * Defines standardized icon sizes using Tailwind CSS classes
 * Used with Heroicons throughout the application
 */

/**
 * Standard icon size classes
 * Uses Tailwind's h-X w-X utility classes for consistent sizing
 */
export const ICON_SIZES = {
  /** Extra small - 12px - Used for spinners, badges, and tight spaces */
  XS: 'h-3 w-3',
  /** Small - 14px - Used for search fields and compact UI elements */
  SM: 'h-3.5 w-3.5',
  /** Base/Default - 16px - Used for table actions, form inputs, context menus (MOST COMMON) */
  BASE: 'h-4 w-4',
  /** Medium - 20px - Used for primary buttons, navigation headers, modal controls */
  MD: 'h-5 w-5',
  /** Large - 24px - Used for sidebar navigation, important UI elements */
  LG: 'h-6 w-6',
  /** Extra large - 32px - Used for large loading spinners */
  XL: 'h-8 w-8',
  /** 2X large - 48px - Used for placeholders and empty states */
  XXL: 'h-12 w-12',
  /** 3X large - 64px - Used for hero sections and large illustrations */
  XXXL: 'h-16 w-16'
} as const

/**
 * Icon spacing constants for when icons appear with text
 */
export const ICON_SPACING = {
  /** Standard margin - 8px - Default spacing between icon and text */
  DEFAULT: 'mr-2',
  /** Tight margin - 4px - For compact layouts */
  TIGHT: 'mr-1',
  /** Loose margin - 12px - For spacious layouts */
  LOOSE: 'mr-3',
  /** No margin - For icons that don't need spacing */
  NONE: ''
} as const

/**
 * Type for icon size keys
 */
export type IconSizeKey = keyof typeof ICON_SIZES

/**
 * Type for icon size values (the actual Tailwind classes)
 */
export type IconSize = (typeof ICON_SIZES)[IconSizeKey]

/**
 * Type for icon spacing keys
 */
export type IconSpacingKey = keyof typeof ICON_SPACING

/**
 * Type for icon spacing values
 */
export type IconSpacing = (typeof ICON_SPACING)[IconSpacingKey]

/**
 * Default icon size
 */
export const DEFAULT_ICON_SIZE: IconSize = ICON_SIZES.BASE

/**
 * Icon size usage recommendations by context
 */
export const ICON_SIZE_USAGE = {
  /** Table action buttons (sort, copy, delete) */
  TABLE_ACTIONS: ICON_SIZES.BASE,
  /** Form input icons (search, filter) */
  FORM_INPUTS: ICON_SIZES.BASE,
  /** Context menu items */
  CONTEXT_MENU: ICON_SIZES.BASE,
  /** Primary action buttons (Create, Add, Play, Stop) */
  PRIMARY_BUTTONS: ICON_SIZES.MD,
  /** Navigation headers */
  NAVIGATION_HEADERS: ICON_SIZES.MD,
  /** Modal close buttons */
  MODAL_CLOSE: ICON_SIZES.MD,
  /** Sidebar menu items */
  SIDEBAR_MENU: ICON_SIZES.LG,
  /** Loading spinners (small) */
  SPINNER_SMALL: ICON_SIZES.XS,
  /** Loading spinners (default) */
  SPINNER_DEFAULT: ICON_SIZES.BASE,
  /** Loading spinners (large) */
  SPINNER_LARGE: ICON_SIZES.XL,
  /** Empty state placeholders */
  EMPTY_STATE: ICON_SIZES.XXL,
  /** Hero section icons */
  HERO: ICON_SIZES.XXXL
} as const

/**
 * Check if a string is a valid icon size key
 */
export function isValidIconSizeKey(key: string): key is IconSizeKey {
  return key in ICON_SIZES
}

/**
 * Get icon size class by key, with fallback to default
 */
export function getIconSize(key: IconSizeKey | string | null | undefined): IconSize {
  if (key && isValidIconSizeKey(key)) {
    return ICON_SIZES[key]
  }
  return DEFAULT_ICON_SIZE
}

/**
 * Combine icon size with spacing
 */
export function getIconClasses(
  size: IconSizeKey | IconSize = 'BASE',
  spacing: IconSpacingKey | IconSpacing = 'DEFAULT'
): string {
  const sizeClass = isValidIconSizeKey(size) ? ICON_SIZES[size] : size
  const spacingClass = spacing in ICON_SPACING ? ICON_SPACING[spacing as IconSpacingKey] : spacing
  return spacingClass ? `${sizeClass} ${spacingClass}` : sizeClass
}
