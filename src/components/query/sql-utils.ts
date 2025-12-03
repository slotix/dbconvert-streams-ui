/**
 * SQL Utility Functions
 *
 * Shared utilities for SQL generation across query builder components
 */

export type SqlDialect = 'mysql' | 'pgsql' | 'sql'

// Operators that don't need a value
const UNARY_OPERATORS = ['IS NULL', 'IS NOT NULL']

/**
 * Check if an operator is unary (doesn't require a value)
 */
export function isUnaryOperator(op: string): boolean {
  return UNARY_OPERATORS.includes(op)
}

/**
 * Quote an identifier based on SQL dialect
 * Handles schema.table format for PostgreSQL
 */
export function quoteIdentifier(identifier: string, dialect: SqlDialect = 'mysql'): string {
  if (dialect === 'pgsql') {
    // PostgreSQL: quote with double quotes, handle schema.table
    if (identifier.includes('.')) {
      const parts = identifier.split('.')
      return parts.map((p) => '"' + p + '"').join('.')
    }
    return `"${identifier}"`
  }
  if (dialect === 'mysql') {
    return `\`${identifier}\``
  }
  return identifier
}

/**
 * Convert a filter operator and value to a SQL condition string
 *
 * Handles dialect-specific syntax:
 * - PostgreSQL: Uses ILIKE for case-insensitive matching and CAST for non-text types
 * - MySQL: Uses standard LIKE
 */
export function operatorToSql(
  column: string,
  operator: string,
  value: string,
  dialect: SqlDialect = 'mysql',
  quoteColumn: boolean = true
): string {
  const col = quoteColumn ? quoteIdentifier(column, dialect) : column

  // For PostgreSQL, use CAST to text for LIKE operations to handle non-text types
  const likeCol = dialect === 'pgsql' ? `CAST(${col} AS TEXT)` : col
  const likeOp = dialect === 'pgsql' ? 'ILIKE' : 'LIKE'
  const notLikeOp = dialect === 'pgsql' ? 'NOT ILIKE' : 'NOT LIKE'

  switch (operator) {
    case 'IS NULL':
      return `${col} IS NULL`
    case 'IS NOT NULL':
      return `${col} IS NOT NULL`
    case 'CONTAINS':
      return `${likeCol} ${likeOp} '%${value}%'`
    case 'NOT_CONTAINS':
      return `${likeCol} ${notLikeOp} '%${value}%'`
    case 'STARTS_WITH':
      return `${likeCol} ${likeOp} '${value}%'`
    case 'ENDS_WITH':
      return `${likeCol} ${likeOp} '%${value}'`
    case 'LIKE':
      return `${likeCol} ${likeOp} '${value}'`
    case 'NOT LIKE':
      return `${likeCol} ${notLikeOp} '${value}'`
    case 'IN':
    case 'NOT IN': {
      const values = value
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v)
        .map((v) => (isNaN(Number(v)) ? `'${v}'` : v))
        .join(', ')
      return `${col} ${operator} (${values})`
    }
    case 'BETWEEN': {
      const [start, end] = value.split(',').map((v) => v.trim())
      const startVal = isNaN(Number(start)) ? `'${start}'` : start
      const endVal = isNaN(Number(end)) ? `'${end}'` : end
      return `${col} BETWEEN ${startVal} AND ${endVal}`
    }
    default: {
      const val = isNaN(Number(value)) ? `'${value}'` : value
      return `${col} ${operator} ${val}`
    }
  }
}
