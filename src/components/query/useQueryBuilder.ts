/**
 * Query Builder Composable
 *
 * Handles SQL query generation and parsing for the QueryBuilder component
 */

import { computed, ref, type Ref } from 'vue'
import {
  type FilterCondition,
  type SortConfig,
  type ColumnInfo,
  type ParsedQuery,
  UNARY_OPERATORS,
  generateFilterId
} from './types'

export interface UseQueryBuilderOptions {
  tableName: Ref<string>
  dialect: Ref<'mysql' | 'pgsql' | 'sql'>
  columns: Ref<ColumnInfo[]>
}

export function useQueryBuilder(options: UseQueryBuilderOptions) {
  const { tableName, dialect, columns } = options

  // State
  const selectedColumns = ref<string[]>([]) // Empty means all columns (*)
  const filters = ref<FilterCondition[]>([])
  const orderBy = ref<SortConfig[]>([])
  const limit = ref<number | null>(null)

  /**
   * Quote identifier based on dialect
   */
  const quoteIdentifier = (identifier: string): string => {
    switch (dialect.value) {
      case 'pgsql':
        return `"${identifier}"`
      case 'mysql':
        return `\`${identifier}\``
      default:
        return identifier
    }
  }

  /**
   * Escape string value for SQL
   */
  const escapeValue = (value: string): string => {
    return value.replace(/'/g, "''")
  }

  /**
   * Format value for SQL based on operator and value content
   */
  const formatValue = (value: string, operator: string): string => {
    if (UNARY_OPERATORS.includes(operator as (typeof UNARY_OPERATORS)[number])) {
      return ''
    }

    // Check if it's a number
    const num = Number(value)
    if (!isNaN(num) && value.trim() !== '') {
      return value.trim()
    }

    // Check for IN operator (expects comma-separated values)
    if (operator === 'IN' || operator === 'NOT IN') {
      const values = value.split(',').map((v) => {
        const trimmed = v.trim()
        const n = Number(trimmed)
        if (!isNaN(n) && trimmed !== '') {
          return trimmed
        }
        return `'${escapeValue(trimmed)}'`
      })
      return `(${values.join(', ')})`
    }

    // String value
    return `'${escapeValue(value)}'`
  }

  /**
   * Build WHERE clause from filters
   */
  const buildWhereClause = (): string => {
    if (filters.value.length === 0) return ''

    const conditions = filters.value
      .filter((f) => f.column && (UNARY_OPERATORS.includes(f.operator) || f.value))
      .map((f) => {
        const col = quoteIdentifier(f.column)

        if (f.operator === 'IS NULL') {
          return `${col} IS NULL`
        }
        if (f.operator === 'IS NOT NULL') {
          return `${col} IS NOT NULL`
        }
        if (f.operator === 'BETWEEN' && f.value && f.valueTo) {
          return `${col} BETWEEN ${formatValue(f.value, '=')} AND ${formatValue(f.valueTo, '=')}`
        }

        const val = formatValue(f.value, f.operator)
        return `${col} ${f.operator} ${val}`
      })

    return conditions.length > 0 ? conditions.join(' AND ') : ''
  }

  /**
   * Build ORDER BY clause
   */
  const buildOrderByClause = (): string => {
    if (orderBy.value.length === 0) return ''

    const parts = orderBy.value
      .filter((s) => s.column)
      .map((s) => `${quoteIdentifier(s.column)} ${s.direction}`)

    return parts.length > 0 ? parts.join(', ') : ''
  }

  /**
   * Build SELECT columns part
   */
  const buildSelectColumns = (): string => {
    if (selectedColumns.value.length === 0) return '*'
    return selectedColumns.value.map(quoteIdentifier).join(', ')
  }

  /**
   * Generate full SQL query from structured inputs (single line for storage)
   */
  const generatedQuery = computed((): string => {
    const parts: string[] = []

    // SELECT
    parts.push(`SELECT ${buildSelectColumns()}`)

    // FROM
    parts.push(`FROM ${quoteIdentifier(tableName.value)}`)

    // WHERE
    const where = buildWhereClause()
    if (where) {
      parts.push(`WHERE ${where}`)
    }

    // ORDER BY
    const order = buildOrderByClause()
    if (order) {
      parts.push(`ORDER BY ${order}`)
    }

    // LIMIT
    if (limit.value !== null && limit.value > 0) {
      parts.push(`LIMIT ${limit.value}`)
    }

    return parts.join(' ')
  })

  /**
   * Generate formatted SQL query for display (multi-line)
   */
  const formattedQuery = computed((): string => {
    const parts: string[] = []

    // SELECT
    parts.push(`SELECT ${buildSelectColumns()}`)

    // FROM
    parts.push(`FROM ${quoteIdentifier(tableName.value)}`)

    // WHERE
    const where = buildWhereClause()
    if (where) {
      parts.push(`WHERE ${where}`)
    }

    // ORDER BY
    const order = buildOrderByClause()
    if (order) {
      parts.push(`ORDER BY ${order}`)
    }

    // LIMIT
    if (limit.value !== null && limit.value > 0) {
      parts.push(`LIMIT ${limit.value}`)
    }

    return parts.join('\n')
  })

  /**
   * Check if query has any modifications from default
   */
  const hasModifications = computed((): boolean => {
    return (
      selectedColumns.value.length > 0 ||
      filters.value.length > 0 ||
      orderBy.value.length > 0 ||
      (limit.value !== null && limit.value > 0)
    )
  })

  /**
   * Generate only the clause part (WHERE, ORDER BY, LIMIT) - for compact display
   */
  const clausesOnly = computed((): string => {
    const parts: string[] = []

    const where = buildWhereClause()
    if (where) {
      parts.push(`WHERE ${where}`)
    }

    const order = buildOrderByClause()
    if (order) {
      parts.push(`ORDER BY ${order}`)
    }

    if (limit.value !== null && limit.value > 0) {
      parts.push(`LIMIT ${limit.value}`)
    }

    return parts.join('\n')
  })

  /**
   * Parse an existing SQL query into structured parts
   */
  const parseQuery = (sql: string): ParsedQuery => {
    const result: ParsedQuery = {
      selectColumns: '*',
      whereClause: '',
      orderBy: [],
      limit: null,
      isCustom: false
    }

    if (!sql || sql.trim() === '') {
      return result
    }

    const normalized = sql.trim().toUpperCase()

    // Check if it's a SELECT query
    if (!normalized.startsWith('SELECT')) {
      result.isCustom = true
      return result
    }

    try {
      // Extract LIMIT
      const limitMatch = sql.match(/LIMIT\s+(\d+)/i)
      if (limitMatch) {
        result.limit = parseInt(limitMatch[1], 10)
      }

      // Extract ORDER BY (basic)
      const orderMatch = sql.match(/ORDER\s+BY\s+([^;]+?)(?:\s+LIMIT|$)/i)
      if (orderMatch) {
        const orderParts = orderMatch[1].split(',').map((p) => p.trim())
        result.orderBy = orderParts.map((part) => {
          const match = part.match(/^([`"'\w.]+)\s*(ASC|DESC)?$/i)
          if (match) {
            const col = match[1].replace(/[`"']/g, '')
            const dir = (match[2]?.toUpperCase() || 'ASC') as 'ASC' | 'DESC'
            return { column: col, direction: dir }
          }
          return { column: part, direction: 'ASC' as const }
        })
      }

      // Extract WHERE clause (basic - between WHERE and ORDER BY/LIMIT/end)
      const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i)
      if (whereMatch) {
        result.whereClause = whereMatch[1].trim()
      }

      // Check for complex query features that we can't represent in simple mode
      const hasComplexFeatures =
        /\b(JOIN|UNION|GROUP\s+BY|HAVING|DISTINCT|SUBQUERY|\(SELECT)\b/i.test(sql) ||
        /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(sql)

      if (hasComplexFeatures) {
        result.isCustom = true
      }
    } catch {
      result.isCustom = true
    }

    return result
  }

  /**
   * Add a new filter condition
   */
  const addFilter = () => {
    const defaultColumn = columns.value.length > 0 ? columns.value[0].name : ''
    filters.value.push({
      id: generateFilterId(),
      column: defaultColumn,
      operator: '=',
      value: ''
    })
  }

  /**
   * Remove a filter condition
   */
  const removeFilter = (id: string) => {
    const index = filters.value.findIndex((f) => f.id === id)
    if (index !== -1) {
      filters.value.splice(index, 1)
    }
  }

  /**
   * Add a sort column
   */
  const addSort = () => {
    const defaultColumn = columns.value.length > 0 ? columns.value[0].name : ''
    orderBy.value.push({
      column: defaultColumn,
      direction: 'ASC'
    })
  }

  /**
   * Remove a sort column
   */
  const removeSort = (index: number) => {
    orderBy.value.splice(index, 1)
  }

  /**
   * Reset all query parameters
   */
  const reset = () => {
    selectedColumns.value = []
    filters.value = []
    orderBy.value = []
    limit.value = null
  }

  /**
   * Load from parsed query
   */
  const loadFromParsed = (parsed: ParsedQuery) => {
    // Reset first
    reset()

    // Load limit
    limit.value = parsed.limit

    // Load order by
    orderBy.value = parsed.orderBy.map((o) => ({ ...o }))

    // Note: We don't parse WHERE clause into structured filters
    // because it's complex. If there's a WHERE clause, user should use advanced mode.
  }

  return {
    // State
    selectedColumns,
    filters,
    orderBy,
    limit,

    // Computed
    generatedQuery,
    formattedQuery,
    hasModifications,
    clausesOnly,

    // Methods
    addFilter,
    removeFilter,
    addSort,
    removeSort,
    reset,
    parseQuery,
    loadFromParsed,
    quoteIdentifier,
    escapeValue
  }
}
