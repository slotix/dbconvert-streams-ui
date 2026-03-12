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
 * Data type mapping between different database systems
 * Used for schema comparison to normalize equivalent types across databases
 *
 * Maps various database-specific types to their standardized equivalents
 * Primarily focuses on MySQL → PostgreSQL equivalents
 */
const DATABASE_TYPE_MAPPING: Record<string, string> = {
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
