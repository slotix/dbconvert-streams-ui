/**
 * AG Grid filter conversion utilities
 * Shared functions for converting AG Grid filter models to SQL WHERE clauses
 */

/**
 * Escape single quotes in string values to prevent SQL injection
 */
function escapeValue(val: any): string {
  if (typeof val === 'string') {
    return val.replace(/'/g, "''")
  }
  return String(val)
}

/**
 * Build a single filter clause for a column
 * Handles both simple filters and compound filters (AND/OR)
 *
 * @param column - Column name
 * @param filter - AG Grid filter object
 * @returns SQL clause string or null if invalid
 */
export function buildFilterClause(column: string, filter: any): string | null {
  // Handle combined conditions (AND/OR)
  if (filter.operator) {
    console.log(`Building compound filter for ${column}:`, filter)

    // AG Grid uses 'conditions' array (newer versions) or 'condition1'/'condition2' (older versions)
    let condition1: string | null = null
    let condition2: string | null = null

    if (filter.conditions && Array.isArray(filter.conditions)) {
      // New format: conditions array
      condition1 = filter.conditions[0] ? buildFilterClause(column, filter.conditions[0]) : null
      condition2 = filter.conditions[1] ? buildFilterClause(column, filter.conditions[1]) : null
    } else {
      // Old format: condition1 and condition2 properties
      condition1 = filter.condition1 ? buildFilterClause(column, filter.condition1) : null
      condition2 = filter.condition2 ? buildFilterClause(column, filter.condition2) : null
    }

    console.log(`  Condition1: ${condition1}, Condition2: ${condition2}`)

    if (condition1 && condition2) {
      return `(${condition1} ${filter.operator} ${condition2})`
    }
    return condition1 || condition2
  }

  const filterValue = filter.filter

  // Skip if filter value is missing
  if (filterValue === undefined || filterValue === null || filterValue === '') {
    console.log(`Skipping filter for ${column}: no value`)
    return null
  }

  // Build SQL based on filter type
  switch (filter.type) {
    case 'equals':
      return `${column} = '${escapeValue(filterValue)}'`
    case 'notEqual':
      return `${column} != '${escapeValue(filterValue)}'`
    case 'contains':
      return `${column} LIKE '%${escapeValue(filterValue)}%'`
    case 'notContains':
      return `${column} NOT LIKE '%${escapeValue(filterValue)}%'`
    case 'startsWith':
      return `${column} LIKE '${escapeValue(filterValue)}%'`
    case 'endsWith':
      return `${column} LIKE '%${escapeValue(filterValue)}'`
    case 'lessThan':
      return `${column} < ${filterValue}`
    case 'lessThanOrEqual':
      return `${column} <= ${filterValue}`
    case 'greaterThan':
      return `${column} > ${filterValue}`
    case 'greaterThanOrEqual':
      return `${column} >= ${filterValue}`
    case 'inRange':
      return `${column} BETWEEN ${filter.filter} AND ${filter.filterTo}`
    case 'blank':
      return `(${column} IS NULL OR ${column} = '')`
    case 'notBlank':
      return `(${column} IS NOT NULL AND ${column} != '')`
    default:
      return null
  }
}

/**
 * Convert AG Grid filter model to SQL WHERE clause
 *
 * @param filterModel - AG Grid filter model object
 * @returns SQL WHERE clause string (without WHERE keyword)
 */
export function convertFilterModelToSQL(filterModel: Record<string, any>): string {
  const whereClauses: string[] = []

  for (const [column, filter] of Object.entries(filterModel)) {
    if (!filter) continue

    const clause = buildFilterClause(column, filter)
    if (clause) {
      whereClauses.push(clause)
    }
  }

  return whereClauses.join(' AND ')
}

/**
 * Determine filter type based on column data type
 *
 * @param dataType - SQL data type string
 * @returns AG Grid filter type string
 */
export function determineFilterType(dataType: string): string | boolean {
  if (!dataType) return 'agTextColumnFilter'

  const type = dataType.toLowerCase()
  if (
    type.includes('int') ||
    type.includes('float') ||
    type.includes('double') ||
    type.includes('decimal') ||
    type.includes('numeric') ||
    type.includes('bigint')
  ) {
    return 'agNumberColumnFilter'
  } else if (type.includes('date') || type.includes('time')) {
    return 'agDateColumnFilter'
  }

  return 'agTextColumnFilter'
}
