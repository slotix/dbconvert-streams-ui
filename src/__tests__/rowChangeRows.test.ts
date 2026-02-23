import { describe, it, expect } from 'vitest'
import { buildRowChangeRows } from '@/utils/rowChangeRows'

describe('rowChangeRows', () => {
  it('builds edit, insert, and delete rows with expected markers', () => {
    const rows = buildRowChangeRows({
      pendingEdits: {
        'id=1': {
          keys: { id: 1 },
          changes: { last_name: 'DAVISS', first_name: 'JENNIFER' },
          original: { id: 1, first_name: 'JENNIFER', last_name: 'DAVIS' }
        }
      },
      pendingInserts: {
        ins_1: {
          id: 'ins_1',
          createdAt: 1,
          values: { first_name: 'JOHNNY', last_name: 'DOE' }
        }
      },
      pendingDeletes: {
        'id=2': {
          keys: { id: 2 },
          original: { id: 2, first_name: 'CHRISTIAN' }
        }
      },
      formatValue: (value, field) => `${field}:${String(value)}`
    })

    expect(rows).toHaveLength(3)

    const editRow = rows.find((r) => r.kind === 'edit')
    expect(editRow).toBeTruthy()
    expect(editRow?.label).toBe('id=1')
    expect(editRow?.items).toEqual([
      {
        field: 'first_name',
        oldValue: 'first_name:JENNIFER',
        newValue: 'first_name:JENNIFER'
      },
      {
        field: 'last_name',
        oldValue: 'last_name:DAVIS',
        newValue: 'last_name:DAVISS'
      }
    ])

    const insertRow = rows.find((r) => r.kind === 'insert')
    expect(insertRow).toBeTruthy()
    expect(insertRow?.label).toBe('__pending_insert__=ins_1')
    expect(insertRow?.items).toEqual([
      {
        field: 'first_name',
        oldValue: '—',
        newValue: 'first_name:JOHNNY'
      },
      {
        field: 'last_name',
        oldValue: '—',
        newValue: 'last_name:DOE'
      }
    ])

    const deleteRow = rows.find((r) => r.kind === 'delete')
    expect(deleteRow).toBeTruthy()
    expect(deleteRow?.label).toBe('id=2')
    expect(deleteRow?.items).toEqual([
      {
        field: 'id',
        oldValue: 'id:2',
        newValue: '(deleted)'
      }
    ])
  })

  it('sorts field items alphabetically for stable rendering', () => {
    const rows = buildRowChangeRows({
      pendingEdits: {
        'id=3': {
          keys: { id: 3 },
          changes: { c_col: 'c', a_col: 'a', b_col: 'b' },
          original: { id: 3, a_col: 'A', b_col: 'B', c_col: 'C' }
        }
      },
      pendingInserts: {},
      pendingDeletes: {},
      formatValue: (value) => String(value)
    })

    expect(rows).toHaveLength(1)
    expect(rows[0].items.map((i) => i.field)).toEqual(['a_col', 'b_col', 'c_col'])
  })
})
