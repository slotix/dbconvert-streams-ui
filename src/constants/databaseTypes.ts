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
  S3: 'S3',
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
  s3: DATABASE_TYPES.S3,
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
export const FILE_BASED_CONNECTIONS = [DATABASE_TYPES.FILES] as const

/**
 * Check if a database type is SQL-based
 */
export function isSQLDatabase(type: string): boolean {
  const normalized = normalizeDatabaseType(type)
  return SQL_DATABASES.includes(normalized as (typeof SQL_DATABASES)[number])
}

/**
 * Check if a database type is NoSQL
 */
export function isNoSQLDatabase(type: string): boolean {
  const normalized = normalizeDatabaseType(type)
  return NOSQL_DATABASES.includes(normalized as (typeof NOSQL_DATABASES)[number])
}

/**
 * Check if a connection type is file-based
 */
export function isFileBasedConnection(type: string): boolean {
  const normalized = normalizeDatabaseType(type)
  return FILE_BASED_CONNECTIONS.includes(normalized as (typeof FILE_BASED_CONNECTIONS)[number])
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

/**
 * Data type mapping between different database systems
 * Used for schema comparison to normalize equivalent types across databases
 *
 * Maps various database-specific types to their standardized equivalents
 * Primarily focuses on MySQL → PostgreSQL equivalents
 */
export const DATABASE_TYPE_MAPPING: Record<string, string> = {
  INT: 'INTEGER',
  TINYINT: 'SMALLINT',
  BIGINT: 'BIGINT',
  DOUBLE: 'DOUBLE PRECISION',
  FLOAT: 'REAL',
  DATETIME: 'TIMESTAMP',
  TEXT: 'TEXT',
  BLOB: 'BYTEA',
  VARCHAR: 'VARCHAR',
  'CHARACTER VARYING': 'VARCHAR', // PostgreSQL verbose form
  CHAR: 'CHAR',
  DECIMAL: 'NUMERIC',
  BOOLEAN: 'BOOLEAN',
  BOOL: 'BOOLEAN'
} as const

/**
 * Normalize a database data type for comparison
 * Extracts base type (removes length/precision) and maps to standard equivalent
 *
 * @param type - The database type to normalize (e.g., "VARCHAR(255)", "INT", "DATETIME")
 * @returns Normalized type for comparison (e.g., "VARCHAR", "INTEGER", "TIMESTAMP")
 *
 * @example
 * normalizeDataType('VARCHAR(255)') // Returns 'VARCHAR'
 * normalizeDataType('INT') // Returns 'INTEGER'
 * normalizeDataType('DATETIME') // Returns 'TIMESTAMP'
 */
export function normalizeDataType(type: string): string {
  const normalized = type.toUpperCase().trim()

  // Extract base type (e.g., "VARCHAR(255)" → "VARCHAR")
  const baseType = normalized.split('(')[0].trim()

  return DATABASE_TYPE_MAPPING[baseType] || baseType
}
