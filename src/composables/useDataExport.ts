import * as XLSX from 'xlsx'

export type ExportFormat = 'csv' | 'json' | 'jsonl' | 'tsv' | 'sql' | 'markdown' | 'excel'

export interface ExportFormatOption {
  id: ExportFormat
  label: string
}

// Primary formats shown as buttons
export const primaryExportFormats: ExportFormatOption[] = [
  { id: 'csv', label: 'CSV' },
  { id: 'json', label: 'JSON' },
  { id: 'excel', label: 'Excel' }
]

// Secondary formats shown in dropdown
export const secondaryExportFormats: ExportFormatOption[] = [
  { id: 'jsonl', label: 'JSONL' },
  { id: 'tsv', label: 'TSV' },
  { id: 'sql', label: 'SQL INSERT' },
  { id: 'markdown', label: 'Markdown' }
]

// All available formats
export const allExportFormats: ExportFormatOption[] = [
  ...primaryExportFormats,
  ...secondaryExportFormats
]

/**
 * Escape a value for CSV format
 */
function escapeCSV(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Escape a value for SQL INSERT statements
 */
function escapeSQLValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  const str = String(value)
  return `'${str.replace(/'/g, "''")}'`
}

/**
 * Escape a value for Markdown tables
 */
function escapeMarkdown(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  // Escape pipe characters
  return str.replace(/\|/g, '\\|')
}

export interface ExportOptions {
  /** Column names/keys in order */
  columns: string[]
  /** Row data as array of objects */
  rows: Record<string, unknown>[]
  /** Base filename without extension (default: 'export') */
  filename?: string
  /** Table name for SQL INSERT statements (default: 'exported_data') */
  tableName?: string
}

/**
 * Export data to Excel format using xlsx library
 */
function exportToExcel(options: ExportOptions): void {
  const { columns, rows, filename = 'export' } = options

  // Create worksheet from data
  const wsData = [columns, ...rows.map((row) => columns.map((col) => row[col]))]
  const worksheet = XLSX.utils.aoa_to_sheet(wsData)

  // Create workbook and add sheet
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, worksheet, 'Data')

  // Generate and download file
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/**
 * Generate export content for text-based formats
 */
function generateExportContent(
  format: Exclude<ExportFormat, 'excel'>,
  options: ExportOptions
): { content: string; mimeType: string; extension: string } {
  const { columns, rows, tableName = 'exported_data' } = options

  switch (format) {
    case 'csv': {
      const headers = columns.map((c) => escapeCSV(c)).join(',')
      const dataRows = rows.map((row) => columns.map((col) => escapeCSV(row[col])).join(','))
      return {
        content: [headers, ...dataRows].join('\n'),
        mimeType: 'text/csv',
        extension: 'csv'
      }
    }

    case 'json': {
      return {
        content: JSON.stringify(rows, null, 2),
        mimeType: 'application/json',
        extension: 'json'
      }
    }

    case 'jsonl': {
      // JSON Lines - one JSON object per line
      return {
        content: rows.map((row) => JSON.stringify(row)).join('\n'),
        mimeType: 'application/x-ndjson',
        extension: 'jsonl'
      }
    }

    case 'tsv': {
      // Tab-separated values
      const headers = columns.join('\t')
      const dataRows = rows.map((row) => columns.map((col) => String(row[col] ?? '')).join('\t'))
      return {
        content: [headers, ...dataRows].join('\n'),
        mimeType: 'text/tab-separated-values',
        extension: 'tsv'
      }
    }

    case 'sql': {
      // SQL INSERT statements
      const columnList = columns.join(', ')
      const inserts = rows.map((row) => {
        const values = columns.map((col) => escapeSQLValue(row[col])).join(', ')
        return `INSERT INTO ${tableName} (${columnList}) VALUES (${values});`
      })
      return {
        content: inserts.join('\n'),
        mimeType: 'application/sql',
        extension: 'sql'
      }
    }

    case 'markdown': {
      // Markdown table
      const header = `| ${columns.join(' | ')} |`
      const separator = `| ${columns.map(() => '---').join(' | ')} |`
      const dataRows = rows.map(
        (row) => `| ${columns.map((col) => escapeMarkdown(row[col])).join(' | ')} |`
      )
      return {
        content: [header, separator, ...dataRows].join('\n'),
        mimeType: 'text/markdown',
        extension: 'md'
      }
    }
  }
}

/**
 * Download a text file
 */
function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export data to the specified format
 */
export function exportData(format: ExportFormat, options: ExportOptions): void {
  const { columns, rows, filename = 'export' } = options

  if (rows.length === 0 || columns.length === 0) {
    console.warn('No data to export')
    return
  }

  // Handle Excel separately (binary format)
  if (format === 'excel') {
    exportToExcel(options)
    return
  }

  // Generate content for text-based formats
  const { content, mimeType, extension } = generateExportContent(format, options)
  downloadTextFile(content, `${filename}.${extension}`, mimeType)
}

/**
 * Composable for data export functionality
 * Provides reactive state and methods for export UI
 */
export function useDataExport() {
  return {
    primaryFormats: primaryExportFormats,
    secondaryFormats: secondaryExportFormats,
    allFormats: allExportFormats,
    exportData
  }
}
