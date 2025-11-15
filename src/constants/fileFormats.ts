/**
 * Centralized file format constants
 * This ensures consistency across the application and makes it easy to update supported formats
 */

export interface SupportedFormat {
  name: string
  extensions: string[]
  description?: string
}

/**
 * List of all supported file formats
 * Update this list when adding new format support
 */
export const SUPPORTED_FILE_FORMATS: SupportedFormat[] = [
  {
    name: 'CSV',
    extensions: ['.csv', '.csv.gz', '.csv.zst'],
    description: 'Comma-separated values'
  },
  {
    name: 'JSON',
    extensions: ['.json', '.json.gz', '.json.zst'],
    description: 'JavaScript Object Notation'
  },
  {
    name: 'JSONL',
    extensions: ['.jsonl', '.ndjson', '.jsonl.gz', '.jsonl.zst'],
    description: 'JSON Lines (newline-delimited JSON)'
  },
  {
    name: 'Parquet',
    extensions: ['.parquet'],
    description: 'Apache Parquet columnar format'
  }
]

/**
 * Get a formatted string of extensions for a specific format
 */
export function getFormatExtensions(formatName: string): string {
  const format = SUPPORTED_FILE_FORMATS.find((f) => f.name === formatName)
  return format ? format.extensions.join(', ') : ''
}

/**
 * Get all supported extensions as a flat array
 */
export function getAllSupportedExtensions(): string[] {
  return SUPPORTED_FILE_FORMATS.flatMap((f) => f.extensions)
}
