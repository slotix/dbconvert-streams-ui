import { format as formatSql } from 'sql-formatter'

import type { SqlLspConnectionContext } from '@/composables/useSqlLspProviders'

function normalizeSqlFormatterLanguage(
  dialect: string
): 'mysql' | 'postgresql' | 'snowflake' | 'sql' {
  const normalized = dialect.trim().toLowerCase()
  if (normalized.includes('mysql')) return 'mysql'
  if (normalized.includes('pgsql') || normalized.includes('postgre')) return 'postgresql'
  if (normalized.includes('snowflake')) return 'snowflake'
  return 'sql'
}

export function isDuckDBFormattingContext(context?: SqlLspConnectionContext): boolean {
  return context?.provider === 'duckdb'
}

export function formatDuckDBSqlDocument(documentText: string, dialect: string): string | null {
  const source = documentText.trim()
  if (!source) {
    return null
  }

  try {
    return formatSql(documentText, {
      language: normalizeSqlFormatterLanguage(dialect),
      keywordCase: 'upper',
      newlineBeforeSemicolon: false
    })
  } catch {
    return null
  }
}
