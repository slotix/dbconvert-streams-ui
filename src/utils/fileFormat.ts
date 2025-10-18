export type FileFormat = 'csv' | 'json' | 'jsonl' | 'parquet'

const COMPRESSION_EXTENSIONS = ['.gz', '.gzip']

function stripCompressionExtension(filename: string): string {
  let base = filename.toLowerCase()
  let changed = true
  while (changed) {
    changed = false
    for (const ext of COMPRESSION_EXTENSIONS) {
      if (base.endsWith(ext)) {
        base = base.slice(0, -ext.length)
        changed = true
      }
    }
  }
  return base
}

export function getFileFormat(filename: string): FileFormat | null {
  const cleanName = stripCompressionExtension(filename)

  if (cleanName.endsWith('.csv')) return 'csv'
  if (cleanName.endsWith('.jsonl') || cleanName.endsWith('.ndjson')) return 'jsonl'
  if (cleanName.endsWith('.json')) return 'json'
  if (cleanName.endsWith('.parquet')) return 'parquet'

  return null
}

export function isSupportedFile(filename: string): boolean {
  return getFileFormat(filename) !== null
}

// Get icon color class for file format
export function getFileFormatColor(format: FileFormat | null): string {
  switch (format) {
    case 'csv':
      return 'text-green-600'
    case 'json':
    case 'jsonl':
      return 'text-blue-600'
    case 'parquet':
      return 'text-purple-600'
    default:
      return 'text-gray-400'
  }
}

// Get icon SVG path for file format
export function getFileFormatIconPath(format: FileFormat | null): string {
  switch (format) {
    case 'csv':
      // Table/spreadsheet icon
      return 'M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z'
    case 'json':
    case 'jsonl':
      // Code brackets icon
      return 'M9 3L5 7l4 4V8h6v3l4-4-4-4v3H9V3zm0 18l-4-4 4-4v3h6v-3l4 4-4 4v-3H9v3z'
    case 'parquet':
      // Database/cylinder icon
      return 'M12 2C6.48 2 2 4.24 2 7v10c0 2.76 4.48 5 10 5s10-2.24 10-5V7c0-2.76-4.48-5-10-5zm0 2c4.41 0 8 1.79 8 3s-3.59 3-8 3-8-1.79-8-3 3.59-3 8-3zm0 16c-4.41 0-8-1.79-8-3v-2.17c1.52 1.27 4.48 2.17 8 2.17s6.48-.9 8-2.17V17c0 1.21-3.59 3-8 3zm0-6c-4.41 0-8-1.79-8-3V8.83C5.52 10.1 8.48 11 12 11s6.48-.9 8-2.17V11c0 1.21-3.59 3-8 3z'
    default:
      // Generic document icon
      return 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z'
  }
}
