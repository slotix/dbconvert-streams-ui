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
