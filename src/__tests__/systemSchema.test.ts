import { describe, it, expect } from 'vitest'
import { isSystemSchema } from '@/utils/systemSchema'

describe('systemSchema', () => {
  it('uses explicit API flags when provided', () => {
    const schemaSystemInfo = new Map<string, boolean>([
      ['public', false],
      ['pg_catalog', true]
    ])

    expect(isSystemSchema('pg_catalog', schemaSystemInfo)).toBe(true)
    expect(isSystemSchema('public', schemaSystemInfo)).toBe(false)
  })

  it('handles empty schema names', () => {
    expect(isSystemSchema(undefined)).toBe(false)
    expect(isSystemSchema(null)).toBe(false)
    expect(isSystemSchema('')).toBe(false)
    expect(isSystemSchema('   ')).toBe(false)
  })
})
