export type FileFormat = 'csv' | 'json' | 'jsonl' | 'parquet'

const COMPRESSION_EXTENSIONS = ['.gz', '.gzip', '.zst']

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
