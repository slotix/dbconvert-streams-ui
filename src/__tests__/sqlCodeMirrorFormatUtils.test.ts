import { describe, expect, it } from 'vitest'

import {
  formatDuckDBSqlDocument,
  isDuckDBFormattingContext
} from '@/components/codemirror/sqlCodeMirrorFormatUtils'

describe('sqlCodeMirrorFormatUtils', () => {
  it('recognizes duckdb formatting contexts', () => {
    expect(isDuckDBFormattingContext({ provider: 'duckdb' })).toBe(true)
    expect(isDuckDBFormattingContext({ provider: 'sqls' })).toBe(false)
    expect(isDuckDBFormattingContext()).toBe(false)
  })

  it('formats duckdb sql using the editor dialect', () => {
    expect(formatDuckDBSqlDocument('select a from t', 'sql')).toBe(
      'SELECT\n  a\nFROM\n  t'
    )
  })

  it('uses mysql/postgresql formatter variants when requested', () => {
    expect(formatDuckDBSqlDocument('select `id` from `actor`', 'mysql')).toContain('SELECT')
    expect(formatDuckDBSqlDocument('select "id" from public.actor', 'postgresql')).toContain(
      'FROM'
    )
  })

  it('returns null for empty input', () => {
    expect(formatDuckDBSqlDocument('   ', 'sql')).toBeNull()
  })
})
