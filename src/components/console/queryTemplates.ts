/**
 * Query template generators for SQL consoles.
 * Pure utility functions that generate SQL templates based on context.
 */

export interface QueryTemplate {
  name: string
  query: string
  description?: string
  section?: string
  icon?: 'session' | 'database' | 'file' | 's3' | 'join'
  sourceAlias?: string
  sourceLabel?: string
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

export type FederatedTemplateSourceKind =
  | 'database'
  | 'snowflake'
  | 's3'
  | 'gcs'
  | 'azure'
  | 'files'

export interface FederatedTemplateSource {
  alias: string
  kind: FederatedTemplateSourceKind
}

/**
 * Generates templates for federated (multi-source) queries.
 * Templates are source-aware so non-database selections don't show DB-specific snippets.
 */
export function getFederatedTemplates(sources: FederatedTemplateSource[]): QueryTemplate[] {
  const makeTemplate = (
    name: string,
    query: string,
    options: {
      description: string
      section: 'Session' | 'Databases' | 'S3' | 'Files' | 'Joins'
      icon: 'session' | 'database' | 'file' | 's3' | 'join'
      sourceAlias?: string
      sourceLabel?: string
    }
  ): QueryTemplate => ({
    name,
    query,
    description: options.description,
    section: options.section,
    icon: options.icon,
    sourceAlias: options.sourceAlias,
    sourceLabel: options.sourceLabel
  })

  const dedupedSources = Array.from(
    new Map(
      sources
        .map((source) => ({ alias: source.alias?.trim(), kind: source.kind }))
        .filter((source) => Boolean(source.alias))
        .map((source) => [source.alias as string, source])
    ).values()
  )

  const dbAliases = dedupedSources
    .filter((source) => source.kind === 'database' || source.kind === 'snowflake')
    .map((source) => source.alias)
  const hasDbSources = dbAliases.length > 0

  const s3Aliases = dedupedSources
    .filter((source) => source.kind === 's3')
    .map((source) => source.alias)
  const hasS3Sources = s3Aliases.length > 0

  const hasFileSources = dedupedSources.some((source) => source.kind === 'files')

  const pg1 = dbAliases.find((a) => a.startsWith('pg')) || dbAliases[0] || 'pg1'
  const my1 = dbAliases.find((a) => a.startsWith('my')) || dbAliases[1] || dbAliases[0] || 'my1'
  const aws = s3Aliases.find((a) => a.toLowerCase().startsWith('aws')) || s3Aliases[0] || 'aws'
  const doAlias =
    s3Aliases.find((a) => a.toLowerCase().startsWith('do')) || s3Aliases[1] || s3Aliases[0] || 'do'

  const q = (value: string) => value.replace(/'/g, "''")

  const dbAliasLabel = (alias: string) => {
    const lowered = alias.toLowerCase()
    if (lowered.startsWith('pg')) return `${alias} (PostgreSQL)`
    if (lowered.startsWith('my')) return `${alias} (MySQL)`
    if (lowered.startsWith('sf')) return `${alias} (Snowflake)`
    return `${alias} (Database)`
  }

  const dbMetadataTemplates: QueryTemplate[] = dbAliases.flatMap((alias) => [
    makeTemplate(
      `List namespaces (${alias})`,
      `-- Namespaces (database/schema) visible under alias ${alias}
SELECT DISTINCT schema_name
FROM duckdb_tables()
WHERE database_name = '${q(alias)}'
ORDER BY schema_name;`,
      {
        description: `Namespaces visible under alias ${alias}`,
        section: 'Databases',
        icon: 'database',
        sourceAlias: alias,
        sourceLabel: dbAliasLabel(alias)
      }
    ),
    makeTemplate(
      `List tables (${alias})`,
      `-- Tables visible under alias ${alias}
SELECT schema_name, table_name
FROM duckdb_tables()
WHERE database_name = '${q(alias)}'
ORDER BY schema_name, table_name;`,
      {
        description: `Tables visible under alias ${alias}`,
        section: 'Databases',
        icon: 'database',
        sourceAlias: alias,
        sourceLabel: dbAliasLabel(alias)
      }
    )
  ])

  const templates: QueryTemplate[] = [
    makeTemplate(
      'List attached sources',
      `-- Multi-source mode: list attached aliases in this query session
SHOW DATABASES;`,
      {
        description: 'Shows aliases attached in this session',
        section: 'Session',
        icon: 'session'
      }
    )
  ]

  if (hasDbSources) {
    templates.push(
      makeTemplate(
        'List source namespaces',
        `-- Multi-source mode: inspect schemas/databases exposed per alias
SELECT DISTINCT
  database_name AS source_alias,
  schema_name
FROM duckdb_tables()
ORDER BY source_alias, schema_name;`,
        {
          description: 'Namespaces exposed for each attached database alias',
          section: 'Databases',
          icon: 'database'
        }
      ),
      makeTemplate(
        'List tables for alias',
        `-- Multi-source mode: replace '${pg1}' with any database alias chip above
SELECT
  schema_name,
  table_name
FROM duckdb_tables()
WHERE database_name = '${q(pg1)}'
ORDER BY schema_name, table_name;`,
        {
          description: `Lists tables for alias ${pg1}`,
          section: 'Databases',
          icon: 'database'
        }
      ),
      ...dbMetadataTemplates,
      makeTemplate(
        'PostgreSQL query',
        `-- Query PostgreSQL connection
SELECT * FROM ${pg1}.public.table_name LIMIT 100;`,
        {
          description: 'Basic query against a PostgreSQL alias',
          section: 'Databases',
          icon: 'database'
        }
      ),
      makeTemplate(
        'MySQL query',
        `-- Query MySQL connection
SELECT * FROM ${my1}.database.table_name LIMIT 100;`,
        {
          description: 'Basic query against a MySQL alias',
          section: 'Databases',
          icon: 'database'
        }
      ),
      makeTemplate(
        'List attached schemas',
        `-- Backward-compatible alias-scoped schema list
SELECT DISTINCT schema_name
FROM duckdb_tables()
WHERE database_name = '${q(pg1)}'
ORDER BY schema_name;`,
        {
          description: `Lists schemas for alias ${pg1}`,
          section: 'Databases',
          icon: 'database'
        }
      )
    )
  }

  if (dbAliases.length > 1) {
    templates.push(
      makeTemplate(
        'Cross-database JOIN',
        `-- Join tables from different databases
SELECT a.*, b.*
FROM ${pg1}.public.table1 a
JOIN ${my1}.database.table2 b ON a.id = b.id
LIMIT 100;`,
        {
          description: 'Joins tables across two database aliases',
          section: 'Joins',
          icon: 'join'
        }
      ),
      makeTemplate(
        'Aggregate across databases',
        `-- Aggregate data from multiple sources
SELECT
  a.category,
  COUNT(DISTINCT b.id) as count,
  SUM(b.amount) as total
FROM ${pg1}.public.categories a
JOIN ${my1}.database.orders b ON a.id = b.category_id
GROUP BY a.category
ORDER BY total DESC;`,
        {
          description: 'Aggregation query that spans two database aliases',
          section: 'Joins',
          icon: 'join'
        }
      ),
      makeTemplate(
        'UNION from multiple sources',
        `-- Combine results from different databases
SELECT 'postgres' as source, name, created_at
FROM ${pg1}.public.users
UNION ALL
SELECT 'mysql' as source, name, created_at
FROM ${my1}.database.users
ORDER BY created_at DESC
LIMIT 100;`,
        {
          description: 'UNION ALL pattern across two database aliases',
          section: 'Joins',
          icon: 'join'
        }
      )
    )
  }

  if (hasS3Sources) {
    templates.push(
      makeTemplate(
        'Query S3 with alias',
        `-- Query S3 using connection alias (select an S3 connection first)
-- Alias becomes the URL scheme: aws://bucket/path
SELECT * FROM read_parquet('${aws}://bucket-name/path/*.parquet') LIMIT 100;`,
        {
          description: `Reads parquet files via S3 alias ${aws}`,
          section: 'S3',
          icon: 's3'
        }
      )
    )
  }

  if (s3Aliases.length > 1) {
    templates.push(
      makeTemplate(
        'JOIN across S3 providers',
        `-- Join data from different S3 providers (AWS + DigitalOcean)
SELECT a.*, b.*
FROM read_parquet('${aws}://bucket/data_a.parquet') a
JOIN read_parquet('${doAlias}://bucket/data_b.parquet') b ON a.id = b.id
LIMIT 100;`,
        {
          description: 'Joins files from two S3 aliases/providers',
          section: 'Joins',
          icon: 'join'
        }
      )
    )
  }

  if (hasDbSources && hasS3Sources) {
    templates.push(
      makeTemplate(
        'Database + S3 JOIN',
        `-- Join database table with S3 data
SELECT db.*, s3.*
FROM ${pg1}.public.customers db
JOIN read_parquet('${aws}://bucket/orders/*.parquet') s3
ON db.id = s3.customer_id
LIMIT 100;`,
        {
          description: 'Joins a database table with S3-backed files',
          section: 'Joins',
          icon: 'join'
        }
      )
    )
  }

  if (hasFileSources || (!hasDbSources && !hasS3Sources)) {
    templates.push(
      makeTemplate(
        'Query Parquet file',
        `-- Query local Parquet files
SELECT * FROM read_parquet('/path/to/files/*.parquet') LIMIT 100;`,
        {
          description: 'Reads local parquet files with glob patterns',
          section: 'Files',
          icon: 'file'
        }
      ),
      makeTemplate(
        'Query CSV file',
        `-- Query local CSV files
SELECT * FROM read_csv_auto('/path/to/files/*.csv') LIMIT 100;`,
        {
          description: 'Reads local CSV files with auto-detected schema',
          section: 'Files',
          icon: 'file'
        }
      ),
      makeTemplate(
        'Inspect CSV schema',
        `-- Inspect inferred CSV columns and types
SELECT * FROM sniff_csv('/path/to/files/*.csv');`,
        {
          description: 'Inspects inferred schema/options for CSV files',
          section: 'Files',
          icon: 'file'
        }
      ),
      makeTemplate(
        'Query JSON/JSONL file',
        `-- Query local JSON/JSONL files
SELECT * FROM read_json_auto('/path/to/files/*.json*') LIMIT 100;`,
        {
          description: 'Reads local JSON and JSONL files',
          section: 'Files',
          icon: 'file'
        }
      )
    )
  }

  if (hasDbSources && hasFileSources) {
    templates.push(
      makeTemplate(
        'JOIN database + local file',
        `-- Join database table with local Parquet file
SELECT db.*, f.*
FROM ${pg1}.public.table_name db
JOIN read_parquet('/path/to/file.parquet') f ON db.id = f.id
LIMIT 100;`,
        {
          description: 'Joins a database table with a local parquet file',
          section: 'Joins',
          icon: 'join'
        }
      )
    )
  }

  return templates
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
      name: 'Inspect CSV schema',
      query: `SELECT * FROM sniff_csv('${joinPath(prefix, '*.csv')}');`
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
