/**
 * Query Builder Types
 *
 * Reusable types for the structured query builder component
 */

/**
 * Unified column interface that works for both AG Grid ColDef and ColumnInfo
 */
export interface ColumnDef {
  name: string
  label?: string
  type?: string
}

/**
 * Sort condition for ORDER BY clause
 */
export interface SortCondition {
  column: string
  direction: 'ASC' | 'DESC'
}

/**
 * Single filter condition
 */
export interface FilterCondition {
  id: string
  column: string
  operator: string // Can be any FilterOperator value
  value: string
  valueTo?: string // For BETWEEN operator
}

/**
 * Column information for autocomplete
 */
export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
}

/**
 * Operators that don't require a value
 */
export const UNARY_OPERATORS: string[] = ['IS NULL', 'IS NOT NULL']
