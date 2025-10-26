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

// Get logo image path for file format
export function getFileFormatLogoPath(format: FileFormat | null): string {
  switch (format) {
    case 'csv':
      return '/images/db-logos/csv.svg'
    case 'json':
    case 'jsonl':
      return '/images/db-logos/json.svg'
    case 'parquet':
      return '/images/db-logos/parquet.svg'
    default:
      return '/images/db-logos/file.svg'
  }
}
