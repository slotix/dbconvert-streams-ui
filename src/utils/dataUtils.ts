/**
 * Utility functions for data formatting and processing
 */

/**
 * Checks if a string appears to be base64 encoded
 */
function isBase64(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false
  }

  // Base64 strings should be at least 4 characters and divisible by 4 (with padding)
  if (str.length < 4) {
    return false
  }

  // Allow for base64 strings without padding (common in some APIs)
  if (str.length % 4 !== 0) {
    // Try with padding added
    const padded = str + '='.repeat(4 - (str.length % 4))
    if (padded.length % 4 !== 0) {
      return false
    }
  }

  // Check if string contains only valid base64 characters
  const base64Regex = /^[A-Za-z0-9+/]*={0,3}$/
  return base64Regex.test(str)
}

/**
 * Attempts to decode a base64 string safely
 */
function tryDecodeBase64(str: string): string {
  if (!str || typeof str !== 'string') {
    return str
  }

  try {
    // Only attempt decoding if it looks like base64
    if (isBase64(str)) {
      // Add padding if necessary for proper base64 decoding
      let paddedStr = str
      while (paddedStr.length % 4 !== 0) {
        paddedStr += '='
      }

      const decoded = atob(paddedStr)

      // Check if the decoded string contains readable text
      // If it's binary data, it might not be suitable for display
      if (isPrintableText(decoded)) {
        return decoded
      }
    }
    return str
  } catch (error) {
    // If decoding fails, return original string
    if (import.meta.env.DEV) {
      console.debug('[DataUtils] Base64 decode failed:', error)
    }
    return str
  }
}

/**
 * Checks if a string contains mostly printable text
 */
function isPrintableText(str: string): boolean {
  if (!str) return true

  // Count printable characters (space to ~, plus common whitespace)
  const printableCount = str.split('').filter((char) => {
    const code = char.charCodeAt(0)
    return (code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13
  }).length

  // If more than 80% of characters are printable, consider it text
  return printableCount / str.length > 0.8
}

/**
 * Formats a value for table display, handling base64 decoding and null values
 */
export function formatTableValue(value: any): string {
  // Handle null/undefined values
  if (value === null) {
    return 'NULL'
  }

  if (value === undefined) {
    return ''
  }

  // Convert to string if not already
  const stringValue = String(value)

  // Debug logging for development mode only
  if (import.meta.env.DEV && stringValue.length > 20 && isBase64(stringValue)) {
    console.log('[DataUtils] Attempting to decode base64:', {
      original: stringValue.substring(0, 50) + (stringValue.length > 50 ? '...' : ''),
      isBase64: isBase64(stringValue),
      length: stringValue.length
    })
  }

  // Try to decode if it looks like base64
  const result = tryDecodeBase64(stringValue)

  // Log if decoding was successful (development only)
  if (import.meta.env.DEV && result !== stringValue) {
    console.log('[DataUtils] Successfully decoded base64:', {
      original: stringValue.substring(0, 50) + (stringValue.length > 50 ? '...' : ''),
      decoded: result.substring(0, 100) + (result.length > 100 ? '...' : '')
    })
  }

  return result
}

/**
 * Formats an entire row of table data
 */
export function formatTableRow(row: any[]): string[] {
  return row.map(formatTableValue)
}

/**
 * Formats table data for display
 */
export function formatTableData(data: { columns: string[]; rows: any[][] }): {
  columns: string[]
  rows: string[][]
} {
  return {
    columns: data.columns,
    rows: data.rows.map(formatTableRow)
  }
}
