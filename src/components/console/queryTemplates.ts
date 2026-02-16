/**
 * Query template generators for SQL consoles.
 * Pure utility functions that generate SQL templates based on context.
 */

export interface QueryTemplate {
  name: string
  query: string
}

export interface FileTemplateOptions {
  /** Base path prefix for file references */
  prefix: string
}

export interface DatabaseTemplateOptions {
  /** SQL dialect: 'pgsql' | 'mysql' | 'sql' */
  dialect: string
  /** Database name if scoped to a specific database */
  database?: string
  /** Table context from active tab */
  tableContext?: {
    tableName: string
    schema?: string
  }
}

/**
 * Generates templates for federated (cross-database) queries.
 * Templates use connection aliases to reference tables from different sources.
 */
export function getFederatedTemplates(aliases: string[]): QueryTemplate[] {
  const pg1 = aliases.find((a) => a.startsWith('pg')) || 'pg1'
  const my1 = aliases.find((a) => a.startsWith('my')) || 'my1'
  // Find S3 aliases (common patterns: aws, do, s3, minio)
  const s3Aliases = aliases.filter((a) =>
    ['aws', 'do', 's3', 'minio', 'gcs', 'azure'].some(
      (prefix) => a.toLowerCase().startsWith(prefix) || a.toLowerCase().includes('s3')
    )
  )
  const aws = s3Aliases.find((a) => a.toLowerCase().startsWith('aws')) || 'aws'
  const doAlias = s3Aliases.find((a) => a.toLowerCase().startsWith('do')) || 'do'

  return [
    {
      name: 'List attached sources',
      query: `-- Multi-source mode: list attached aliases in this query session
SHOW DATABASES;`
    },
    {
      name: 'List source namespaces',
      query: `-- Multi-source mode: inspect schemas/databases exposed per alias
SELECT DISTINCT
  database_name AS source_alias,
  schema_name
FROM duckdb_tables()
ORDER BY source_alias, schema_name;`
    },
    {
      name: 'List tables for alias',
      query: `-- Multi-source mode: replace '${pg1}' with any alias chip above
SELECT
  schema_name,
  table_name
FROM duckdb_tables()
WHERE database_name = '${pg1}'
ORDER BY schema_name, table_name;`
    },
    {
      name: 'Cross-database JOIN',
      query: `-- Join tables from different databases
SELECT a.*, b.*
FROM ${pg1}.public.table1 a
JOIN ${my1}.database.table2 b ON a.id = b.id
LIMIT 100;`
    },
    {
      name: 'PostgreSQL query',
      query: `-- Query PostgreSQL connection
SELECT * FROM ${pg1}.public.table_name LIMIT 100;`
    },
    {
      name: 'MySQL query',
      query: `-- Query MySQL connection
SELECT * FROM ${my1}.database.table_name LIMIT 100;`
    },
    {
      name: 'Query S3 with alias',
      query: `-- Query S3 using connection alias (select an S3 connection first)
-- Alias becomes the URL scheme: aws://bucket/path
SELECT * FROM read_parquet('${aws}://bucket-name/path/*.parquet') LIMIT 100;`
    },
    {
      name: 'JOIN across S3 providers',
      query: `-- Join data from different S3 providers (AWS + DigitalOcean)
SELECT a.*, b.*
FROM read_parquet('${aws}://bucket/data_a.parquet') a
JOIN read_parquet('${doAlias}://bucket/data_b.parquet') b ON a.id = b.id
LIMIT 100;`
    },
    {
      name: 'Database + S3 JOIN',
      query: `-- Join database table with S3 data
SELECT db.*, s3.*
FROM ${pg1}.public.customers db
JOIN read_parquet('${aws}://bucket/orders/*.parquet') s3
ON db.id = s3.customer_id
LIMIT 100;`
    },
    {
      name: 'Aggregate across databases',
      query: `-- Aggregate data from multiple sources
SELECT
  a.category,
  COUNT(DISTINCT b.id) as count,
  SUM(b.amount) as total
FROM ${pg1}.public.categories a
JOIN ${my1}.database.orders b ON a.id = b.category_id
GROUP BY a.category
ORDER BY total DESC;`
    },
    {
      name: 'UNION from multiple sources',
      query: `-- Combine results from different databases
SELECT 'postgres' as source, name, created_at
FROM ${pg1}.public.users
UNION ALL
SELECT 'mysql' as source, name, created_at
FROM ${my1}.database.users
ORDER BY created_at DESC
LIMIT 100;`
    },
    {
      name: 'List attached schemas',
      query: `-- Backward-compatible alias-scoped schema list
SELECT DISTINCT schema_name
FROM duckdb_tables()
WHERE database_name = '${pg1}'
ORDER BY schema_name;`
    },
    {
      name: 'Query Parquet file',
      query: `-- Query local Parquet file (no connection needed)
SELECT * FROM read_parquet('/path/to/file.parquet') LIMIT 100;`
    },
    {
      name: 'Query CSV file',
      query: `-- Query local CSV file (no connection needed)
SELECT * FROM read_csv('/path/to/file.csv', header=true) LIMIT 100;`
    },
    {
      name: 'JOIN database + local file',
      query: `-- Join database table with local Parquet file
SELECT db.*, f.*
FROM ${pg1}.public.table_name db
JOIN read_parquet('/path/to/file.parquet') f ON db.id = f.id
LIMIT 100;`
    }
  ]
}

/**
 * Generates templates for file-based queries (DuckDB).
 * Templates use read_* functions for CSV, Parquet, and JSON files.
 */
export function getFileTemplates(options: FileTemplateOptions): QueryTemplate[] {
  const { prefix } = options

  const joinPath = (prefixPath: string, suffix: string) => {
    const cleanedPrefix = prefixPath.replace(/\/+$/, '')
    const cleanedSuffix = suffix.replace(/^\/+/, '')
    if (cleanedPrefix === '') return cleanedSuffix
    return `${cleanedPrefix}/${cleanedSuffix}`
  }

  return [
    {
      name: 'Select all files',
      query: `SELECT * FROM read_parquet('${joinPath(prefix, '*.parquet')}') LIMIT 100;`
    },
    {
      name: 'Select from CSV',
      query: `SELECT * FROM read_csv_auto('${joinPath(prefix, '*.csv')}') LIMIT 100;`
    },
    {
      name: 'Select from Parquet',
      query: `SELECT * FROM read_parquet('${joinPath(prefix, '*.parquet')}') LIMIT 100;`
    },
    {
      name: 'Select from JSON/JSONL',
      query: `SELECT * FROM read_json_auto('${joinPath(prefix, '*.json*')}') LIMIT 100;`
    },
    {
      name: 'Join two tables',
      query: `SELECT a.*, b.*
FROM read_parquet('${joinPath(prefix, 'table1.*')}') a
JOIN read_parquet('${joinPath(prefix, 'table2.*')}') b
  ON a.id = b.id
LIMIT 100;`
    },
    {
      name: 'Aggregate with GROUP BY',
      query: `SELECT column_name, COUNT(*) as count
FROM read_parquet('${joinPath(prefix, '*.parquet')}')
GROUP BY column_name
ORDER BY count DESC;`
    },
    {
      name: 'Count rows',
      query: `SELECT COUNT(*) as total_rows FROM read_parquet('${joinPath(prefix, '*.parquet')}');`
    },
    {
      name: 'Schema inspection',
      query: `DESCRIBE SELECT * FROM read_parquet('${joinPath(prefix, '*.parquet')}');`
    },
    {
      name: 'File metadata (Parquet)',
      query: `SELECT * FROM parquet_metadata('${joinPath(prefix, '*.parquet')}');`
    }
  ]
}

/**
 * Generates templates for database queries.
 * Templates adapt to the SQL dialect (PostgreSQL vs MySQL).
 */
export function getDatabaseTemplates(options: DatabaseTemplateOptions): QueryTemplate[] {
  const { dialect, database, tableContext } = options
  const isPostgres = dialect === 'pgsql'
  const isMysql = dialect === 'mysql'

  // Helper to quote identifiers based on dialect
  const quoteId = (name: string) => {
    if (isMysql) return `\`${name}\``
    if (isPostgres) return `"${name}"`
    return name
  }

  // Get table context from active tab if available
  const tableName = tableContext
    ? tableContext.schema
      ? `${quoteId(tableContext.schema)}.${quoteId(tableContext.tableName)}`
      : quoteId(tableContext.tableName)
    : quoteId('table_name')
  const bareTableName = tableContext?.tableName || 'table_name'

  if (database) {
    // Database-scoped SQL Console - data exploration templates
    if (isPostgres) {
      return [
        {
          name: 'List tables',
          query: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
        },
        { name: 'Select all rows', query: `SELECT * FROM ${tableName} LIMIT 100;` },
        { name: 'Count rows', query: `SELECT COUNT(*) FROM ${tableName};` },
        {
          name: 'Describe table',
          query: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${bareTableName}';`
        },
        {
          name: 'Find duplicates',
          query: `SELECT column_name, COUNT(*) as count FROM ${tableName} GROUP BY column_name HAVING COUNT(*) > 1;`
        },
        {
          name: 'Search text',
          query: `SELECT * FROM ${tableName} WHERE column_name ILIKE '%search_term%';`
        }
      ]
    } else {
      // MySQL
      return [
        { name: 'List tables', query: `SHOW TABLES;` },
        { name: 'Select all rows', query: `SELECT * FROM ${tableName} LIMIT 100;` },
        { name: 'Count rows', query: `SELECT COUNT(*) FROM ${tableName};` },
        { name: 'Describe table', query: `DESCRIBE ${tableName};` },
        {
          name: 'Find duplicates',
          query: `SELECT column_name, COUNT(*) as count FROM ${tableName} GROUP BY column_name HAVING COUNT(*) > 1;`
        },
        {
          name: 'Search text',
          query: `SELECT * FROM ${tableName} WHERE column_name LIKE '%search_term%';`
        }
      ]
    }
  } else {
    // Connection-scoped Database Console - admin templates
    if (isPostgres) {
      return [
        {
          name: 'List databases',
          query: `SELECT datname FROM pg_database WHERE datistemplate = false;`
        },
        { name: 'Create database', query: `CREATE DATABASE database_name;` },
        { name: 'Drop database', query: `DROP DATABASE database_name;` },
        { name: 'Show version', query: `SELECT version();` },
        { name: 'List users', query: `SELECT usename FROM pg_user;` },
        {
          name: 'Database size',
          query: `SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) AS size FROM pg_database;`
        },
        { name: 'Active connections', query: `SELECT * FROM pg_stat_activity;` }
      ]
    } else {
      // MySQL
      return [
        { name: 'Show databases', query: `SHOW DATABASES;` },
        { name: 'Create database', query: `CREATE DATABASE database_name;` },
        { name: 'Drop database', query: `DROP DATABASE database_name;` },
        { name: 'Show version', query: `SHOW VARIABLES LIKE '%version%';` },
        { name: 'Show users', query: `SELECT user, host FROM mysql.user;` },
        { name: 'Show processlist', query: `SHOW PROCESSLIST;` },
        { name: 'Show status', query: `SHOW STATUS;` }
      ]
    }
  }
}

/**
 * Computes the file path prefix for file templates based on context.
 */
export function computeFileTemplatePrefix(options: {
  fileContext?: { path?: string }
  basePath?: string
  connectionType?: 'files' | 's3'
}): string {
  const { fileContext, basePath, connectionType } = options

  if (fileContext?.path) {
    const actualPath = fileContext.path
    // For directory paths, keep as-is; for file paths, extract directory
    if (actualPath.includes('*')) {
      // Already a glob pattern - use the parent directory as the prefix
      const lastSlash = actualPath.lastIndexOf('/')
      return lastSlash >= 0 ? actualPath.substring(0, lastSlash) : ''
    } else if (actualPath.match(/\.(csv|parquet|json|jsonl)$/i)) {
      // Single file - extract directory
      return actualPath.substring(0, actualPath.lastIndexOf('/'))
    } else {
      // Assume it's a directory
      return actualPath
    }
  }

  const base = basePath || '/path/to'
  const isS3 = connectionType === 's3'
  return isS3 ? 's3://bucket/path' : base
}
