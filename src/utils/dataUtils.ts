/**
 * Utility functions for data formatting and processing
 */

/**
 * Checks if a database field type represents binary/blob data
 */
function isBinaryFieldType(dataType: string): boolean {
  if (!dataType || typeof dataType !== 'string') {
    return false
  }

  const lowerType = dataType.toLowerCase()
  const binaryTypes = [
    'blob',
    'binary',
    'varbinary',
    'bytea',
    'longblob',
    'mediumblob',
    'tinyblob',
    'image',
    'picture',
    'photo'
  ]

  return binaryTypes.some((type) => lowerType.includes(type))
}

/**
 * Gets the appropriate data type indicator for binary fields
 */
function getDataTypeIndicator(dataType: string): string {
  if (!isBinaryFieldType(dataType)) {
    return ''
  }

  const lowerType = dataType.toLowerCase()

  // More specific indicators based on field name patterns
  if (lowerType.includes('image') || lowerType.includes('picture') || lowerType.includes('photo')) {
    return '<IMAGE>'
  }

  if (lowerType.includes('blob')) {
    return '<BLOB>'
  }

  // Default for any binary type
  return '<BINARY>'
}

/**
 * Checks if a value is a DuckDB DECIMAL object
 */
function isDuckDBDecimal(value: unknown): value is { Width: number; Scale: number; Value: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'Width' in value &&
    'Scale' in value &&
    'Value' in value
  )
}

/**
 * Formats a DuckDB DECIMAL object to a readable number string
 */
function formatDecimal(decimal: { Width: number; Scale: number; Value: number }): string {
  const { Scale, Value } = decimal
  // Convert the raw value by dividing by 10^Scale
  const divisor = Math.pow(10, Scale)
  const actualValue = Value / divisor
  return actualValue.toFixed(Scale)
}

/**
 * Formats a value for table display, showing data type indicators for binary fields
 */
export function formatTableValue(value: unknown, dataType?: string): string {
  // Handle null/undefined values
  if (value === null) {
    return 'NULL'
  }

  if (value === undefined) {
    return ''
  }

  // Handle DuckDB DECIMAL objects (e.g., { Width: 10, Scale: 2, Value: 7170 } -> "71.70")
  if (isDuckDBDecimal(value)) {
    return formatDecimal(value)
  }

  // Check if this is a binary field type and show indicator instead of raw data
  if (dataType && isBinaryFieldType(dataType)) {
    const indicator = getDataTypeIndicator(dataType)
    if (indicator) {
      return indicator
    }
  }

  // Convert to string for non-binary fields
  return String(value)
}
