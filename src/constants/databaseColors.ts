/**
 * Database Color Constants
 * Tailwind CSS color classes for database type badges and UI elements
 */

import { DATABASE_TYPES } from './databaseTypes'

/**
 * Color scheme for a database type
 */
export interface DatabaseColorScheme {
  /** Background color class */
  bg: string
  /** Ring/border color class */
  ring: string
  /** Text color class (optional, for icons/text) */
  text?: string
}

/**
 * Database-specific color mappings
 * Used for badges, icons, and other UI elements
 */
export const DATABASE_COLORS: Record<string, DatabaseColorScheme> = {
  // PostgreSQL - Blue
  [DATABASE_TYPES.POSTGRESQL]: {
    bg: 'bg-blue-100',
    ring: 'ring-blue-200/50',
    text: 'text-blue-600'
  },
  postgres: {
    bg: 'bg-blue-100',
    ring: 'ring-blue-200/50',
    text: 'text-blue-600'
  },

  // MySQL - Orange
  [DATABASE_TYPES.MYSQL]: {
    bg: 'bg-orange-100',
    ring: 'ring-orange-200/50',
    text: 'text-orange-600'
  },
  mysql: {
    bg: 'bg-orange-100',
    ring: 'ring-orange-200/50',
    text: 'text-orange-600'
  },

  // MariaDB - Orange (similar to MySQL)
  [DATABASE_TYPES.MARIADB]: {
    bg: 'bg-orange-100',
    ring: 'ring-orange-200/50',
    text: 'text-orange-600'
  },
  mariadb: {
    bg: 'bg-orange-100',
    ring: 'ring-orange-200/50',
    text: 'text-orange-600'
  },

  // MongoDB - Green
  [DATABASE_TYPES.MONGODB]: {
    bg: 'bg-green-100',
    ring: 'ring-green-200/50',
    text: 'text-green-600'
  },
  mongo: {
    bg: 'bg-green-100',
    ring: 'ring-green-200/50',
    text: 'text-green-600'
  },
  mongodb: {
    bg: 'bg-green-100',
    ring: 'ring-green-200/50',
    text: 'text-green-600'
  },

  // Redis - Red
  [DATABASE_TYPES.REDIS]: {
    bg: 'bg-red-100',
    ring: 'ring-red-200/50',
    text: 'text-red-600'
  },
  redis: {
    bg: 'bg-red-100',
    ring: 'ring-red-200/50',
    text: 'text-red-600'
  },

  // SQLite - Gray
  [DATABASE_TYPES.SQLITE]: {
    bg: 'bg-gray-100',
    ring: 'ring-gray-200/50',
    text: 'text-gray-600'
  },
  sqlite: {
    bg: 'bg-gray-100',
    ring: 'ring-gray-200/50',
    text: 'text-gray-600'
  },

  // SQL Server / MSSQL - Blue
  [DATABASE_TYPES.SQL_SERVER]: {
    bg: 'bg-blue-100',
    ring: 'ring-blue-200/50',
    text: 'text-blue-600'
  },
  [DATABASE_TYPES.MSSQL]: {
    bg: 'bg-blue-100',
    ring: 'ring-blue-200/50',
    text: 'text-blue-600'
  },
  sqlserver: {
    bg: 'bg-blue-100',
    ring: 'ring-blue-200/50',
    text: 'text-blue-600'
  },
  mssql: {
    bg: 'bg-blue-100',
    ring: 'ring-blue-200/50',
    text: 'text-blue-600'
  },

  // Oracle - Red
  [DATABASE_TYPES.ORACLE]: {
    bg: 'bg-red-100',
    ring: 'ring-red-200/50',
    text: 'text-red-600'
  },
  oracle: {
    bg: 'bg-red-100',
    ring: 'ring-red-200/50',
    text: 'text-red-600'
  },

  // Cassandra - Purple
  [DATABASE_TYPES.CASSANDRA]: {
    bg: 'bg-purple-100',
    ring: 'ring-purple-200/50',
    text: 'text-purple-600'
  },
  cassandra: {
    bg: 'bg-purple-100',
    ring: 'ring-purple-200/50',
    text: 'text-purple-600'
  },

  // Elasticsearch - Yellow
  [DATABASE_TYPES.ELASTICSEARCH]: {
    bg: 'bg-yellow-100',
    ring: 'ring-yellow-200/50',
    text: 'text-yellow-600'
  },
  elasticsearch: {
    bg: 'bg-yellow-100',
    ring: 'ring-yellow-200/50',
    text: 'text-yellow-600'
  },

  // ClickHouse - Yellow
  [DATABASE_TYPES.CLICKHOUSE]: {
    bg: 'bg-yellow-100',
    ring: 'ring-yellow-200/50',
    text: 'text-yellow-600'
  },
  clickhouse: {
    bg: 'bg-yellow-100',
    ring: 'ring-yellow-200/50',
    text: 'text-yellow-600'
  },

  // Snowflake - Indigo
  [DATABASE_TYPES.SNOWFLAKE]: {
    bg: 'bg-indigo-100',
    ring: 'ring-indigo-200/50',
    text: 'text-indigo-600'
  },
  snowflake: {
    bg: 'bg-indigo-100',
    ring: 'ring-indigo-200/50',
    text: 'text-indigo-600'
  }
}

/**
 * Default color scheme for unknown database types
 */
export const DEFAULT_DATABASE_COLOR: DatabaseColorScheme = {
  bg: 'bg-gray-100',
  ring: 'ring-gray-200/50',
  text: 'text-gray-600'
}

/**
 * Get color scheme for a database type
 */
export function getDatabaseColors(type: string): DatabaseColorScheme {
  const normalized = type.toLowerCase()
  return DATABASE_COLORS[normalized] || DEFAULT_DATABASE_COLOR
}

/**
 * Get background color class for a database type
 */
export function getDatabaseBgColor(type: string): string {
  return getDatabaseColors(type).bg
}

/**
 * Get ring color class for a database type
 */
export function getDatabaseRingColor(type: string): string {
  return getDatabaseColors(type).ring
}

/**
 * Get text color class for a database type
 */
export function getDatabaseTextColor(type: string): string {
  return getDatabaseColors(type).text || DEFAULT_DATABASE_COLOR.text!
}

/**
 * Muted Icon Color Scheme for Connection Tree Root Icons
 * Desaturated, subtle colors for cognitive grouping without visual overload
 * Applied only to root connection icons, not nested elements
 */
export interface IconColorScheme {
  /** Background color for icon container */
  iconBg: string
  /** Ring/border color for icon container */
  iconRing: string
  /** Icon filter/tint color (optional) */
  iconTint?: string
}

/**
 * Icon-specific color mappings for connection chips.
 * Tuned for dark sidebars so each connection family reads distinctly at a glance.
 */
export const DATABASE_ICON_COLORS: Record<string, IconColorScheme> = {
  // PostgreSQL - Deeper slate blue
  [DATABASE_TYPES.POSTGRESQL]: {
    iconBg: 'bg-[#dce6f7] dark:bg-[#23385A]',
    iconRing: 'ring-[#bed0ea] dark:ring-[#456A9E]/50',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },
  postgresql: {
    iconBg: 'bg-[#dce6f7] dark:bg-[#23385A]',
    iconRing: 'ring-[#bed0ea] dark:ring-[#456A9E]/50',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },
  postgres: {
    iconBg: 'bg-[#dce6f7] dark:bg-[#23385A]',
    iconRing: 'ring-[#bed0ea] dark:ring-[#456A9E]/50',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },
  pg: {
    iconBg: 'bg-[#dce6f7] dark:bg-[#23385A]',
    iconRing: 'ring-[#bed0ea] dark:ring-[#456A9E]/50',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },

  // MySQL - Teal blue so it stops blending into PostgreSQL
  [DATABASE_TYPES.MYSQL]: {
    iconBg: 'bg-[#d7e7eb] dark:bg-[#113B49]',
    iconRing: 'ring-[#b7cfd5] dark:ring-[#1F5E74]/55',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },
  mysql: {
    iconBg: 'bg-[#d7e7eb] dark:bg-[#113B49]',
    iconRing: 'ring-[#b7cfd5] dark:ring-[#1F5E74]/55',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },

  // MariaDB - Same family as MySQL
  [DATABASE_TYPES.MARIADB]: {
    iconBg: 'bg-[#d7e7eb] dark:bg-[#113B49]',
    iconRing: 'ring-[#b7cfd5] dark:ring-[#1F5E74]/55',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },
  mariadb: {
    iconBg: 'bg-[#d7e7eb] dark:bg-[#113B49]',
    iconRing: 'ring-[#b7cfd5] dark:ring-[#1F5E74]/55',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },

  // MongoDB - Forest green
  [DATABASE_TYPES.MONGODB]: {
    iconBg: 'bg-[#d9ede1] dark:bg-[#123d2b]',
    iconRing: 'ring-[#bdddc9] dark:ring-[#2c7a55]/50',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },
  mongo: {
    iconBg: 'bg-[#d9ede1] dark:bg-[#123d2b]',
    iconRing: 'ring-[#bdddc9] dark:ring-[#2c7a55]/50',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },
  mongodb: {
    iconBg: 'bg-[#d9ede1] dark:bg-[#123d2b]',
    iconRing: 'ring-[#bdddc9] dark:ring-[#2c7a55]/50',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },

  // Redis - Brick red
  [DATABASE_TYPES.REDIS]: {
    iconBg: 'bg-[#f3dfe1] dark:bg-[#522127]',
    iconRing: 'ring-[#e7c2c6] dark:ring-[#a74254]/45',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },
  redis: {
    iconBg: 'bg-[#f3dfe1] dark:bg-[#522127]',
    iconRing: 'ring-[#e7c2c6] dark:ring-[#a74254]/45',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },

  // SQLite - Neutral graphite
  [DATABASE_TYPES.SQLITE]: {
    iconBg: 'bg-[#e8eaed] dark:bg-[#34383f]',
    iconRing: 'ring-[#cfd5dd] dark:ring-[#59606a]/55',
    iconTint: 'brightness-100 saturate-75 dark:invert'
  },
  sqlite: {
    iconBg: 'bg-[#e8eaed] dark:bg-[#34383f]',
    iconRing: 'ring-[#cfd5dd] dark:ring-[#59606a]/55',
    iconTint: 'brightness-100 saturate-75 dark:invert'
  },

  // SQL Server / MSSQL - Steel blue
  [DATABASE_TYPES.SQL_SERVER]: {
    iconBg: 'bg-[#dde8f1] dark:bg-[#1d3f53]',
    iconRing: 'ring-[#bfd2e1] dark:ring-[#3f7597]/50',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },
  [DATABASE_TYPES.MSSQL]: {
    iconBg: 'bg-[#dde8f1] dark:bg-[#1d3f53]',
    iconRing: 'ring-[#bfd2e1] dark:ring-[#3f7597]/50',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },
  sqlserver: {
    iconBg: 'bg-[#dde8f1] dark:bg-[#1d3f53]',
    iconRing: 'ring-[#bfd2e1] dark:ring-[#3f7597]/50',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },
  mssql: {
    iconBg: 'bg-[#dde8f1] dark:bg-[#1d3f53]',
    iconRing: 'ring-[#bfd2e1] dark:ring-[#3f7597]/50',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },

  // Oracle - Burnt amber
  [DATABASE_TYPES.ORACLE]: {
    iconBg: 'bg-[#f2e3ce] dark:bg-[#50391d]',
    iconRing: 'ring-[#e2caab] dark:ring-[#9c6d29]/50',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },
  oracle: {
    iconBg: 'bg-[#f2e3ce] dark:bg-[#50391d]',
    iconRing: 'ring-[#e2caab] dark:ring-[#9c6d29]/50',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },

  // Cassandra - Plum
  [DATABASE_TYPES.CASSANDRA]: {
    iconBg: 'bg-[#ece2f4] dark:bg-[#47315f]',
    iconRing: 'ring-[#d9c6e8] dark:ring-[#8d63b8]/45',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },
  cassandra: {
    iconBg: 'bg-[#ece2f4] dark:bg-[#47315f]',
    iconRing: 'ring-[#d9c6e8] dark:ring-[#8d63b8]/45',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },

  // Elasticsearch - Mustard
  [DATABASE_TYPES.ELASTICSEARCH]: {
    iconBg: 'bg-[#f5edc8] dark:bg-[#4e4516]',
    iconRing: 'ring-[#e8dc98] dark:ring-[#9b8a26]/50',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },
  elasticsearch: {
    iconBg: 'bg-[#f5edc8] dark:bg-[#4e4516]',
    iconRing: 'ring-[#e8dc98] dark:ring-[#9b8a26]/50',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },

  // ClickHouse - Warm gold
  [DATABASE_TYPES.CLICKHOUSE]: {
    iconBg: 'bg-[#f4e8c4] dark:bg-[#544116]',
    iconRing: 'ring-[#e4d39d] dark:ring-[#a78424]/50',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },
  clickhouse: {
    iconBg: 'bg-[#f4e8c4] dark:bg-[#544116]',
    iconRing: 'ring-[#e4d39d] dark:ring-[#a78424]/50',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },

  // Snowflake - Cool cyan
  [DATABASE_TYPES.SNOWFLAKE]: {
    iconBg: 'bg-[#d9edf3] dark:bg-[#0F4656]',
    iconRing: 'ring-[#b9d9e3] dark:ring-[#19839F]/50',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },
  snowflake: {
    iconBg: 'bg-[#d9edf3] dark:bg-[#0F4656]',
    iconRing: 'ring-[#b9d9e3] dark:ring-[#19839F]/50',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },

  // File Types - Neutral graphite
  [DATABASE_TYPES.FILES]: {
    iconBg: 'bg-[#ececef] dark:bg-[#2B2D31]',
    iconRing: 'ring-[#d5d7db] dark:ring-[#4B5058]/55',
    iconTint: 'brightness-95 saturate-50 dark:invert'
  },
  file: {
    iconBg: 'bg-[#ececef] dark:bg-[#2B2D31]',
    iconRing: 'ring-[#d5d7db] dark:ring-[#4B5058]/55',
    iconTint: 'brightness-95 saturate-50 dark:invert'
  },
  files: {
    iconBg: 'bg-[#ececef] dark:bg-[#2B2D31]',
    iconRing: 'ring-[#d5d7db] dark:ring-[#4B5058]/55',
    iconTint: 'brightness-95 saturate-50 dark:invert'
  },

  // S3 / Object storage - Green-leaning teal
  [DATABASE_TYPES.S3]: {
    iconBg: 'bg-[#d9ece6] dark:bg-[#12473D]',
    iconRing: 'ring-[#bcd9d1] dark:ring-[#1E6B5A]/55',
    iconTint: 'dark:brightness-0 dark:invert dark:opacity-80'
  },
  s3: {
    iconBg: 'bg-[#d9ece6] dark:bg-[#12473D]',
    iconRing: 'ring-[#bcd9d1] dark:ring-[#1E6B5A]/55',
    iconTint: 'dark:brightness-0 dark:invert dark:opacity-80'
  },

  // Other object stores - stay in the storage family with distinct hues
  gcs: {
    iconBg: 'bg-[#dce7f6] dark:bg-[#1d365d]',
    iconRing: 'ring-[#c2d3eb] dark:ring-[#4b6ea7]/50',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },
  azure: {
    iconBg: 'bg-[#deebf4] dark:bg-[#153d57]',
    iconRing: 'ring-[#c6d9e7] dark:ring-[#2f6e97]/50',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },
  duckdb: {
    iconBg: 'bg-[#f2e4c8] dark:bg-[#4B3A14]',
    iconRing: 'ring-[#e3cea4] dark:ring-[#7B5F1C]/55',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  },
  db2: {
    iconBg: 'bg-[#dfe6f4] dark:bg-[#2d3d61]',
    iconRing: 'ring-[#c8d2e8] dark:ring-[#5b76ab]/50',
    iconTint: 'brightness-100 saturate-90 dark:invert'
  }
}

/**
 * Default icon color scheme for unknown types
 */
export const DEFAULT_ICON_COLOR: IconColorScheme = {
  iconBg: 'bg-[#ececef] dark:bg-[#2B2D31]',
  iconRing: 'ring-[#d5d7db] dark:ring-[#4B5058]/55',
  iconTint: 'brightness-95 saturate-50 dark:invert'
}

/**
 * Get muted icon color scheme for a database type (for root connection icons)
 */
export function getDatabaseIconColors(type: string): IconColorScheme {
  const normalized = type.toLowerCase()
  return DATABASE_ICON_COLORS[normalized] || DEFAULT_ICON_COLOR
}

/**
 * Get icon background color class for a database type
 */
export function getDatabaseIconBgColor(type: string): string {
  return getDatabaseIconColors(type).iconBg
}

/**
 * Get icon ring color class for a database type
 */
export function getDatabaseIconRingColor(type: string): string {
  return getDatabaseIconColors(type).iconRing
}

/**
 * Get icon tint/filter class for a database type
 */
export function getDatabaseIconTint(type: string): string | undefined {
  return getDatabaseIconColors(type).iconTint
}
