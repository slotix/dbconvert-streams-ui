import { describe, expect, it } from 'vitest'
import { isPotentiallyDestructiveQuery } from '@/composables/useQueryExecution'

describe('isPotentiallyDestructiveQuery', () => {
  it('returns true for DROP and TRUNCATE', () => {
    expect(isPotentiallyDestructiveQuery('DROP TABLE users;')).toBe(true)
    expect(isPotentiallyDestructiveQuery('TRUNCATE TABLE users;')).toBe(true)
  })

  it('returns true for UPDATE/DELETE without WHERE', () => {
    expect(isPotentiallyDestructiveQuery('UPDATE users SET active = false;')).toBe(true)
    expect(isPotentiallyDestructiveQuery('DELETE FROM users;')).toBe(true)
  })

  it('returns false for UPDATE/DELETE with WHERE', () => {
    expect(isPotentiallyDestructiveQuery('UPDATE users SET active = false WHERE id = 1;')).toBe(
      false
    )
    expect(isPotentiallyDestructiveQuery('DELETE FROM users WHERE id = 1;')).toBe(false)
  })

  it('ignores comments while detecting destructive SQL', () => {
    const sql = `
      -- DROP TABLE users;
      /* TRUNCATE TABLE users; */
      SELECT 1;
    `
    expect(isPotentiallyDestructiveQuery(sql)).toBe(false)
  })
})
