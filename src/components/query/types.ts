/**
 * Query Builder Types
 *
 * Reusable types for the structured query builder component
 */

/**
 * Filter condition operator types
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

/**
 * Single filter condition
 */
export interface FilterCondition {
  id: string
  column: string
  operator: FilterOperator
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
 * Query builder mode
 */
export type QueryBuilderMode = 'simple' | 'advanced'

/**
 * Props for the QueryBuilder component
 */
export interface QueryBuilderProps {
  /**
   * The table name being queried
   */
  tableName: string

  /**
   * Current query value (full SQL or empty for default)
   */
  modelValue: string

  /**
   * SQL dialect for syntax
   */
  dialect?: 'mysql' | 'pgsql' | 'sql'

  /**
   * Available columns for the table
   */
  columns?: ColumnInfo[]

  /**
   * Placeholder text
   */
  placeholder?: string

  /**
   * Component height
   */
  height?: string
}

/**
 * Emits for the QueryBuilder component
 */
export interface QueryBuilderEmits {
  (e: 'update:modelValue', value: string): void
}

/**
 * Parse a full SQL query into structured parts
 */
export interface ParsedQuery {
  selectColumns: string[] | '*'
  whereClause: string
  orderBy: SortConfig[]
  limit: number | null
  isCustom: boolean // true if query couldn't be fully parsed
}

/**
 * Operators that don't require a value
 */
export const UNARY_OPERATORS: FilterOperator[] = ['IS NULL', 'IS NOT NULL']

/**
 * Operators available for different column types
 */
export const OPERATORS_BY_TYPE: Record<string, FilterOperator[]> = {
  text: ['=', '!=', 'LIKE', 'NOT LIKE', 'IN', 'NOT IN', 'IS NULL', 'IS NOT NULL'],
  number: ['=', '!=', '>', '>=', '<', '<=', 'BETWEEN', 'IN', 'NOT IN', 'IS NULL', 'IS NOT NULL'],
  date: ['=', '!=', '>', '>=', '<', '<=', 'BETWEEN', 'IS NULL', 'IS NOT NULL'],
  boolean: ['=', '!=', 'IS NULL', 'IS NOT NULL'],
  default: ['=', '!=', '>', '>=', '<', '<=', 'LIKE', 'NOT LIKE', 'IS NULL', 'IS NOT NULL']
}

/**
 * Get operators for a column based on its type
 */
export function getOperatorsForType(dataType: string): FilterOperator[] {
  const type = dataType.toLowerCase()

  if (
    type.includes('char') ||
    type.includes('text') ||
    type.includes('varchar') ||
    type.includes('string')
  ) {
    return OPERATORS_BY_TYPE.text
  }

  if (
    type.includes('int') ||
    type.includes('decimal') ||
    type.includes('float') ||
    type.includes('double') ||
    type.includes('numeric') ||
    type.includes('real') ||
    type.includes('money')
  ) {
    return OPERATORS_BY_TYPE.number
  }

  if (
    type.includes('date') ||
    type.includes('time') ||
    type.includes('timestamp') ||
    type.includes('year')
  ) {
    return OPERATORS_BY_TYPE.date
  }

  if (type.includes('bool') || type.includes('bit')) {
    return OPERATORS_BY_TYPE.boolean
  }

  return OPERATORS_BY_TYPE.default
}

/**
 * Generate unique ID for filter conditions
 */
export function generateFilterId(): string {
  return `filter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
