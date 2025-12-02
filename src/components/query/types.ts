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
 * Filter condition operator types
 * Includes user-friendly operators that auto-handle wildcards
 */
export type FilterOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'LIKE'
  | 'NOT LIKE'
  | 'IN'
  | 'NOT IN'
  | 'IS NULL'
  | 'IS NOT NULL'
  | 'BETWEEN'
  // User-friendly operators (auto-handle wildcards)
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'STARTS_WITH'
  | 'ENDS_WITH'

/**
 * Operator display configuration
 */
export interface OperatorConfig {
  value: FilterOperator
  label: string
}

/**
 * User-friendly operators list - ordered by common usage
 */
export const FRIENDLY_OPERATORS: OperatorConfig[] = [
  { value: 'CONTAINS', label: 'Contains (%val%)' },
  { value: 'NOT_CONTAINS', label: "Doesn't Contain" },
  { value: '=', label: 'Equals (=)' },
  { value: '!=', label: "Doesn't Equal (!=)" },
  { value: 'STARTS_WITH', label: 'Begins with (val%)' },
  { value: 'ENDS_WITH', label: 'Ends with (%val)' },
  { value: 'IS NULL', label: 'Blank (NULL)' },
  { value: 'IS NOT NULL', label: 'Not Blank' },
  { value: '<', label: 'Less than (<)' },
  { value: '<=', label: 'Less or equal (<=)' },
  { value: '>', label: 'Greater than (>)' },
  { value: '>=', label: 'Greater or equal (>=)' },
  { value: 'IN', label: 'In list (IN)' },
  { value: 'NOT IN', label: 'Not in list' }
]

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
 * Sort direction
 */
export type SortDirection = 'ASC' | 'DESC'

/**
 * Sort configuration
 */
export interface SortConfig {
  column: string
  direction: SortDirection
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

/**
 * Generate unique ID for filter conditions
 */
export function generateFilterId(): string {
  return `filter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
