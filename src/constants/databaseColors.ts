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
  /** Icon filter/tint color (optional) */
  iconTint?: string
}

/**
 * Muted icon-specific color mappings
 * Subtle, desaturated colors for visual grouping by source type
 * Used only on root connection icons in tree views
 */
export const DATABASE_ICON_COLORS: Record<string, IconColorScheme> = {
  // PostgreSQL - Muted Violet (more visible)
  [DATABASE_TYPES.POSTGRESQL]: {
    iconBg: 'bg-violet-100',
    iconTint: 'brightness-100 saturate-90'
  },
  postgresql: {
    iconBg: 'bg-violet-100',
    iconTint: 'brightness-100 saturate-90'
  },
  postgres: {
    iconBg: 'bg-violet-100',
    iconTint: 'brightness-100 saturate-90'
  },
  pg: {
    iconBg: 'bg-violet-100',
    iconTint: 'brightness-100 saturate-90'
  },

  // MySQL - Muted Blue-Gray (balanced with PostgreSQL)
  [DATABASE_TYPES.MYSQL]: {
    iconBg: 'bg-blue-100',
    iconTint: 'brightness-100 saturate-90'
  },
  mysql: {
    iconBg: 'bg-blue-100',
    iconTint: 'brightness-100 saturate-90'
  },

  // MariaDB - Muted Blue-Gray (similar to MySQL)
  [DATABASE_TYPES.MARIADB]: {
    iconBg: 'bg-blue-100',
    iconTint: 'brightness-100 saturate-90'
  },
  mariadb: {
    iconBg: 'bg-blue-100',
    iconTint: 'brightness-100 saturate-90'
  },

  // MongoDB - Muted Green (more visible)
  [DATABASE_TYPES.MONGODB]: {
    iconBg: 'bg-emerald-100',
    iconTint: 'brightness-100 saturate-90'
  },
  mongo: {
    iconBg: 'bg-emerald-100',
    iconTint: 'brightness-100 saturate-90'
  },
  mongodb: {
    iconBg: 'bg-emerald-100',
    iconTint: 'brightness-100 saturate-90'
  },

  // Redis - Muted Rose (more visible)
  [DATABASE_TYPES.REDIS]: {
    iconBg: 'bg-rose-100',
    iconTint: 'brightness-100 saturate-90'
  },
  redis: {
    iconBg: 'bg-rose-100',
    iconTint: 'brightness-100 saturate-90'
  },

  // SQLite - Muted Gray
  [DATABASE_TYPES.SQLITE]: {
    iconBg: 'bg-slate-100',
    iconTint: 'brightness-100 saturate-75'
  },
  sqlite: {
    iconBg: 'bg-slate-100',
    iconTint: 'brightness-100 saturate-75'
  },

  // SQL Server / MSSQL - Muted Blue (more visible)
  [DATABASE_TYPES.SQL_SERVER]: {
    iconBg: 'bg-sky-100',
    iconTint: 'brightness-100 saturate-90'
  },
  [DATABASE_TYPES.MSSQL]: {
    iconBg: 'bg-sky-100',
    iconTint: 'brightness-100 saturate-90'
  },
  sqlserver: {
    iconBg: 'bg-sky-100',
    iconTint: 'brightness-100 saturate-90'
  },
  mssql: {
    iconBg: 'bg-sky-100',
    iconTint: 'brightness-100 saturate-90'
  },

  // Oracle - Muted Amber (more visible)
  [DATABASE_TYPES.ORACLE]: {
    iconBg: 'bg-amber-100',
    iconTint: 'brightness-100 saturate-90'
  },
  oracle: {
    iconBg: 'bg-amber-100',
    iconTint: 'brightness-100 saturate-90'
  },

  // Cassandra - Muted Purple (more visible)
  [DATABASE_TYPES.CASSANDRA]: {
    iconBg: 'bg-purple-100',
    iconTint: 'brightness-100 saturate-90'
  },
  cassandra: {
    iconBg: 'bg-purple-100',
    iconTint: 'brightness-100 saturate-90'
  },

  // Elasticsearch - Muted Yellow (more visible)
  [DATABASE_TYPES.ELASTICSEARCH]: {
    iconBg: 'bg-yellow-100',
    iconTint: 'brightness-100 saturate-90'
  },
  elasticsearch: {
    iconBg: 'bg-yellow-100',
    iconTint: 'brightness-100 saturate-90'
  },

  // ClickHouse - Muted Yellow
  [DATABASE_TYPES.CLICKHOUSE]: {
    iconBg: 'bg-yellow-100',
    iconTint: 'brightness-100 saturate-90'
  },
  clickhouse: {
    iconBg: 'bg-yellow-100',
    iconTint: 'brightness-100 saturate-90'
  },

  // Snowflake - Muted Cyan (more visible)
  [DATABASE_TYPES.SNOWFLAKE]: {
    iconBg: 'bg-blue-100',
    iconTint: 'brightness-100 saturate-90'
  },
  snowflake: {
    iconBg: 'bg-blue-100',
    iconTint: 'brightness-100 saturate-90'
  },

  // File Types - Neutral Gray
  [DATABASE_TYPES.FILES]: {
    iconBg: 'bg-gray-50',
    iconTint: 'brightness-95 saturate-50'
  },
  [DATABASE_TYPES.LOCAL_FILES]: {
    iconBg: 'bg-gray-50',
    iconTint: 'brightness-95 saturate-50'
  },
  file: {
    iconBg: 'bg-gray-50',
    iconTint: 'brightness-95 saturate-50'
  },
  files: {
    iconBg: 'bg-gray-50',
    iconTint: 'brightness-95 saturate-50'
  },
  localfiles: {
    iconBg: 'bg-gray-50',
    iconTint: 'brightness-95 saturate-50'
  }
}

/**
 * Default icon color scheme for unknown types
 */
export const DEFAULT_ICON_COLOR: IconColorScheme = {
  iconBg: 'bg-gray-50',
  iconTint: 'brightness-95 saturate-50'
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
 * Get icon tint/filter class for a database type
 */
export function getDatabaseIconTint(type: string): string | undefined {
  return getDatabaseIconColors(type).iconTint
}
