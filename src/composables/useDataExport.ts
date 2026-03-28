import ExcelJS from 'exceljs'
import { isWailsContext } from './useWailsEvents'

export type ExportFormat = 'csv' | 'json' | 'jsonl' | 'tsv' | 'sql' | 'markdown' | 'excel'

interface ExportFormatOption {
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
const secondaryExportFormats: ExportFormatOption[] = [
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

interface ExportOptions {
  /** Column names/keys in order */
  columns: string[]
  /** Row data as array of objects */
  rows: Record<string, unknown>[]
  /** Base filename without extension (default: 'export') */
  filename?: string
  /** Table name for SQL INSERT statements (default: 'exported_data') */
  tableName?: string
}

export interface ExportResult {
  format: ExportFormat
  filename: string
  extension: string
  /** Absolute path on disk (desktop mode only, undefined for browser downloads) */
  savedPath?: string
}

/**
 * Export data to Excel format using exceljs library
 */
async function exportToExcel(options: ExportOptions): Promise<void> {
  const { columns, rows, filename = 'export' } = options

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Data')

  worksheet.columns = columns.map((col) => ({ header: col, key: col }))
  rows.forEach((row) => worksheet.addRow(row))

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
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
 * Download a text file via browser
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

type WailsApp = {
  SaveFile?: (defaultFilename: string, content: string) => Promise<string>
  SaveFileBytes?: (defaultFilename: string, content: number[]) => Promise<string>
  OpenContainingFolder?: (path: string) => Promise<void>
}

function getWailsApp(): WailsApp | null {
  if (!isWailsContext()) return null
  return (
    window as unknown as {
      go?: { main?: { App?: WailsApp } }
    }
  ).go?.main?.App ?? null
}

/**
 * Export data to the specified format.
 * In desktop mode, shows a native save dialog. In browser mode, triggers a download.
 */
export async function exportData(
  format: ExportFormat,
  options: ExportOptions
): Promise<ExportResult | null> {
  const { columns, rows, filename = 'export' } = options

  if (rows.length === 0 || columns.length === 0) {
    console.warn('No data to export')
    return null
  }

  const app = getWailsApp()

  // Handle Excel separately (binary format)
  if (format === 'excel') {
    const fullFilename = `${filename}.xlsx`

    if (app?.SaveFileBytes) {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Data')
      worksheet.columns = columns.map((col) => ({ header: col, key: col }))
      rows.forEach((row) => worksheet.addRow(row))
      const buffer = await workbook.xlsx.writeBuffer()
      const bytes = Array.from(new Uint8Array(buffer as ArrayBuffer))
      const savedPath = await app.SaveFileBytes(fullFilename, bytes)
      if (!savedPath) return null // user cancelled
      return { format, filename: fullFilename, extension: 'xlsx', savedPath }
    }

    await exportToExcel(options)
    return { format, filename: fullFilename, extension: 'xlsx' }
  }

  // Generate content for text-based formats
  const { content, mimeType, extension } = generateExportContent(format, options)
  const fullFilename = `${filename}.${extension}`

  if (app?.SaveFile) {
    const savedPath = await app.SaveFile(fullFilename, content)
    if (!savedPath) return null // user cancelled
    return { format, filename: fullFilename, extension, savedPath }
  }

  downloadTextFile(content, fullFilename, mimeType)
  return { format, filename: fullFilename, extension }
}

/**
 * Open the containing folder for a saved file (desktop mode only)
 */
export async function revealExportedFile(path: string): Promise<boolean> {
  const app = getWailsApp()
  if (!app?.OpenContainingFolder) return false
  try {
    await app.OpenContainingFolder(path)
    return true
  } catch {
    return false
  }
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
