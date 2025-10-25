/**
 * Database Type Constants
 * Centralized database type identifiers used throughout the application
 */

/**
 * Primary database types supported by the application
 */
export const DATABASE_TYPES = {
  POSTGRESQL: 'PostgreSQL',
  MYSQL: 'MySQL',
  SNOWFLAKE: 'Snowflake',
  FILES: 'Files',
  LOCAL_FILES: 'LocalFiles',
  ORACLE: 'Oracle',
  SQL_SERVER: 'SQLServer',
  DB2: 'DB2',
  MONGODB: 'MongoDB',
  REDIS: 'Redis',
  SQLITE: 'SQLite',
  MARIADB: 'MariaDB',
  MSSQL: 'MSSQL',
  CASSANDRA: 'Cassandra',
  ELASTICSEARCH: 'Elasticsearch',
  CLICKHOUSE: 'ClickHouse'
} as const

/**
 * Type for database type values
 */
export type DatabaseType = (typeof DATABASE_TYPES)[keyof typeof DATABASE_TYPES]

/**
 * Database type aliases - maps alternative names to standard names
 */
export const DATABASE_TYPE_ALIASES = {
  postgres: DATABASE_TYPES.POSTGRESQL,
  pg: DATABASE_TYPES.POSTGRESQL,
  mysql: DATABASE_TYPES.MYSQL,
  snowflake: DATABASE_TYPES.SNOWFLAKE,
  files: DATABASE_TYPES.FILES,
  localfiles: DATABASE_TYPES.LOCAL_FILES,
  oracle: DATABASE_TYPES.ORACLE,
  sqlserver: DATABASE_TYPES.SQL_SERVER,
  mssql: DATABASE_TYPES.MSSQL,
  db2: DATABASE_TYPES.DB2,
  mongo: DATABASE_TYPES.MONGODB,
  mongodb: DATABASE_TYPES.MONGODB,
  redis: DATABASE_TYPES.REDIS,
  sqlite: DATABASE_TYPES.SQLITE,
  mariadb: DATABASE_TYPES.MARIADB,
  cassandra: DATABASE_TYPES.CASSANDRA,
  elasticsearch: DATABASE_TYPES.ELASTICSEARCH,
  clickhouse: DATABASE_TYPES.CLICKHOUSE
} as const

/**
 * SQL databases (support standard SQL operations)
 */
export const SQL_DATABASES = [
  DATABASE_TYPES.POSTGRESQL,
  DATABASE_TYPES.MYSQL,
  DATABASE_TYPES.SNOWFLAKE,
  DATABASE_TYPES.ORACLE,
  DATABASE_TYPES.SQL_SERVER,
  DATABASE_TYPES.MSSQL,
  DATABASE_TYPES.DB2,
  DATABASE_TYPES.SQLITE,
  DATABASE_TYPES.MARIADB
] as const

/**
 * NoSQL databases
 */
export const NOSQL_DATABASES = [
  DATABASE_TYPES.MONGODB,
  DATABASE_TYPES.REDIS,
  DATABASE_TYPES.CASSANDRA,
  DATABASE_TYPES.ELASTICSEARCH
] as const

/**
 * File-based connections
 */
export const FILE_BASED_CONNECTIONS = [DATABASE_TYPES.FILES, DATABASE_TYPES.LOCAL_FILES] as const

/**
 * Check if a database type is SQL-based
 */
export function isSQLDatabase(type: string): boolean {
  const normalized = normalizeDatabaseType(type)
  return SQL_DATABASES.includes(normalized as any)
}

/**
 * Check if a database type is NoSQL
 */
export function isNoSQLDatabase(type: string): boolean {
  const normalized = normalizeDatabaseType(type)
  return NOSQL_DATABASES.includes(normalized as any)
}

/**
 * Check if a connection type is file-based
 */
export function isFileBasedConnection(type: string): boolean {
  const normalized = normalizeDatabaseType(type)
  return FILE_BASED_CONNECTIONS.includes(normalized as any)
}

/**
 * Normalize database type string to standard name
 */
export function normalizeDatabaseType(type: string): DatabaseType {
  const lower = type.toLowerCase()
  return (
    DATABASE_TYPE_ALIASES[lower as keyof typeof DATABASE_TYPE_ALIASES] || (type as DatabaseType)
  )
}

/**
 * Get display name for a database type
 */
export function getDatabaseDisplayName(type: string): string {
  return normalizeDatabaseType(type)
}
