/**
 * SQL Keywords, Functions, and Snippets for Monaco Editor Autocomplete
 *
 * Organized by category and dialect for intelligent SQL editing
 */

// Common SQL Keywords (work across all dialects)
export const SQL_KEYWORDS = [
  // Query keywords
  'SELECT',
  'FROM',
  'WHERE',
  'GROUP BY',
  'HAVING',
  'ORDER BY',
  'LIMIT',
  'OFFSET',

  // Join keywords
  'JOIN',
  'INNER JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'FULL JOIN',
  'CROSS JOIN',
  'ON',

  // Set operations
  'UNION',
  'UNION ALL',
  'INTERSECT',
  'EXCEPT',

  // DML keywords
  'INSERT INTO',
  'UPDATE',
  'DELETE FROM',
  'VALUES',
  'SET',

  // DDL keywords
  'CREATE TABLE',
  'ALTER TABLE',
  'DROP TABLE',
  'CREATE INDEX',
  'DROP INDEX',

  // Conditions
  'AND',
  'OR',
  'NOT',
  'IN',
  'EXISTS',
  'BETWEEN',
  'LIKE',
  'IS NULL',
  'IS NOT NULL',

  // Aggregation
  'DISTINCT',
  'ALL',
  'AS',

  // Other
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END'
]

// Common SQL Functions (work across most dialects)
export const SQL_FUNCTIONS = [
  // Aggregate functions
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',

  // String functions
  'CONCAT',
  'SUBSTRING',
  'LENGTH',
  'UPPER',
  'LOWER',
  'TRIM',
  'REPLACE',

  // Date functions
  'NOW',
  'CURRENT_DATE',
  'CURRENT_TIME',
  'CURRENT_TIMESTAMP',
  'DATE',
  'YEAR',
  'MONTH',
  'DAY',

  // Conversion functions
  'CAST',
  'CONVERT',
  'COALESCE',
  'NULLIF',

  // Mathematical functions
  'ROUND',
  'FLOOR',
  'CEIL',
  'ABS',
  'MOD'
]

// MySQL-specific keywords and functions
export const MYSQL_SPECIFIC = {
  keywords: ['REGEXP', 'RLIKE', 'FORCE INDEX', 'USE INDEX', 'IGNORE INDEX'],
  functions: [
    'GROUP_CONCAT',
    'CONCAT_WS',
    'IFNULL',
    'IF',
    'DATE_FORMAT',
    'STR_TO_DATE',
    'UNIX_TIMESTAMP',
    'FROM_UNIXTIME'
  ]
}

// PostgreSQL-specific keywords and functions
export const POSTGRESQL_SPECIFIC = {
  keywords: ['ILIKE', 'RETURNING', '~~', '~~*', '!~~', '!~~*'],
  functions: [
    'ARRAY_AGG',
    'STRING_AGG',
    'ARRAY_TO_STRING',
    'UNNEST',
    'GENERATE_SERIES',
    'TO_CHAR',
    'TO_DATE',
    'TO_TIMESTAMP',
    'EXTRACT',
    'AGE',
    'JUSTIFY_DAYS',
    'JUSTIFY_HOURS'
  ]
}

// DuckDB-specific keywords and functions (used in file/federated SQL consoles)
export const DUCKDB_SPECIFIC = {
  keywords: ['DESCRIBE', 'SUMMARIZE', 'QUALIFY', 'PIVOT', 'UNPIVOT', 'USING SAMPLE'],
  functions: [
    'READ_PARQUET',
    'READ_CSV_AUTO',
    'READ_CSV',
    'READ_JSON_AUTO',
    'READ_JSON',
    'PARQUET_METADATA',
    'PARQUET_SCHEMA',
    'PARQUET_FILE_METADATA',
    'GLOB',
    'SNIFF_CSV',
    'CURRENT_SETTING'
  ]
}

// SQL Snippets with placeholders
export interface SqlSnippet {
  label: string
  description: string
  insertText: string
}

export const SQL_SNIPPETS: SqlSnippet[] = [
  {
    label: 'select',
    description: 'SELECT * FROM table',
    insertText: 'SELECT *\nFROM ${1:table_name}\nWHERE ${2:condition}'
  },
  {
    label: 'selcol',
    description: 'SELECT columns FROM table',
    insertText: 'SELECT ${1:columns}\nFROM ${2:table_name}\nWHERE ${3:condition}'
  },
  {
    label: 'sellimit',
    description: 'SELECT with LIMIT',
    insertText: 'SELECT ${1:columns}\nFROM ${2:table_name}\nLIMIT ${3:1000}'
  },
  {
    label: 'join',
    description: 'INNER JOIN',
    insertText:
      'INNER JOIN ${1:table_name}\n  ON ${2:table1}.${3:column} = ${1:table_name}.${4:column}'
  },
  {
    label: 'leftjoin',
    description: 'LEFT JOIN',
    insertText:
      'LEFT JOIN ${1:table_name}\n  ON ${2:table1}.${3:column} = ${1:table_name}.${4:column}'
  },
  {
    label: 'groupby',
    description: 'GROUP BY with aggregate',
    insertText:
      'SELECT ${1:column}, COUNT(*)\nFROM ${2:table_name}\nGROUP BY ${1:column}\nHAVING COUNT(*) > ${3:1}'
  },
  {
    label: 'orderby',
    description: 'ORDER BY clause',
    insertText: 'ORDER BY ${1:column} ${2|ASC,DESC|}'
  },
  {
    label: 'where',
    description: 'WHERE clause with condition',
    insertText: 'WHERE ${1:column} ${2|=,!=,>,<,>=,<=,LIKE,IN|} ${3:value}'
  },
  {
    label: 'case',
    description: 'CASE expression',
    insertText:
      'CASE\n  WHEN ${1:condition} THEN ${2:result}\n  WHEN ${3:condition} THEN ${4:result}\n  ELSE ${5:default}\nEND'
  },
  {
    label: 'insert',
    description: 'INSERT INTO statement',
    insertText: 'INSERT INTO ${1:table_name} (${2:columns})\nVALUES (${3:values})'
  },
  {
    label: 'update',
    description: 'UPDATE statement',
    insertText: 'UPDATE ${1:table_name}\nSET ${2:column} = ${3:value}\nWHERE ${4:condition}'
  },
  {
    label: 'delete',
    description: 'DELETE statement',
    insertText: 'DELETE FROM ${1:table_name}\nWHERE ${2:condition}'
  },
  {
    label: 'count',
    description: 'COUNT aggregate',
    insertText: 'COUNT(${1|*,DISTINCT column|})'
  },
  {
    label: 'subquery',
    description: 'Subquery in WHERE',
    insertText:
      'WHERE ${1:column} IN (\n  SELECT ${2:column}\n  FROM ${3:table_name}\n  WHERE ${4:condition}\n)'
  }
]

/**
 * Get dialect-specific keywords and functions
 */
export function getDialectSpecifics(dialect: 'mysql' | 'pgsql' | 'sql') {
  switch (dialect) {
    case 'mysql':
      return MYSQL_SPECIFIC
    case 'pgsql':
      return POSTGRESQL_SPECIFIC
    case 'sql': // DuckDB / generic SQL in app file & federated consoles
      return DUCKDB_SPECIFIC
    default:
      return { keywords: [], functions: [] }
  }
}

/**
 * Get all keywords for a specific dialect
 */
export function getAllKeywords(dialect: 'mysql' | 'pgsql' | 'sql'): string[] {
  const specific = getDialectSpecifics(dialect)
  return [...SQL_KEYWORDS, ...specific.keywords]
}

/**
 * Get all functions for a specific dialect
 */
export function getAllFunctions(dialect: 'mysql' | 'pgsql' | 'sql'): string[] {
  const specific = getDialectSpecifics(dialect)
  return [...SQL_FUNCTIONS, ...specific.functions]
}
