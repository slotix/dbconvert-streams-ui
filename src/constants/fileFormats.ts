/**
 * Centralized file format constants
 * This ensures consistency across the application and makes it easy to update supported formats
 */

interface SupportedFormat {
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
