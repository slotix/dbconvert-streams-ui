export type CopyFormat = 'tsv' | 'csv' | 'json'

function normalizeCellValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function escapeDelimited(value: string, delimiter: string): string {
  const needsQuotes =
    value.includes('"') || value.includes('\n') || value.includes('\r') || value.includes(delimiter)
  if (!needsQuotes) return value
  return `"${value.replaceAll('"', '""')}"`
}

export function formatRowsForClipboard(opts: {
  rows: Array<Record<string, unknown>>
  columns: string[]
  format: CopyFormat
}): string {
  const { rows, columns, format } = opts

  if (format === 'json') {
    const jsonRows = rows.map((row) => {
      const out: Record<string, unknown> = {}
      for (const col of columns) out[col] = row[col]
      return out
    })
    return JSON.stringify(jsonRows, null, 2)
  }

  const delimiter = format === 'csv' ? ',' : '\t'
  const header = columns.map((c) => escapeDelimited(c, delimiter)).join(delimiter)
  const lines = [header]

  for (const row of rows) {
    const line = columns
      .map((col) => escapeDelimited(normalizeCellValue(row[col]), delimiter))
      .join(delimiter)
    lines.push(line)
  }

  return lines.join('\n')
}
