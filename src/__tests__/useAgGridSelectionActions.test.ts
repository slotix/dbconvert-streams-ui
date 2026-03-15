import { describe, expect, it } from 'vitest'
import { canEditGridContextCell } from '@/composables/useAgGridSelectionActions'

describe('canEditGridContextCell', () => {
  it('allows editing when the current cell editable callback returns true', () => {
    const result = canEditGridContextCell({
      gridApi: {
        getRowNode: () => ({ rowIndex: 4, data: { first_name: 'John' } }),
        getColumn: () => ({
          getColDef: () => ({
            editable: ({ data }) => data.first_name === 'John'
          })
        })
      },
      rowId: 'row-4',
      field: 'first_name',
      isTableEditable: true
    })

    expect(result).toBe(true)
  })

  it('blocks editing for non-editable cells such as key columns', () => {
    const result = canEditGridContextCell({
      gridApi: {
        getRowNode: () => ({ rowIndex: 1, data: { actor_id: 1 } }),
        getColumn: () => ({
          getColDef: () => ({
            editable: () => false
          })
        })
      },
      rowId: 'row-1',
      field: 'actor_id',
      isTableEditable: true
    })

    expect(result).toBe(false)
  })

  it('blocks editing for special gutter cells', () => {
    const result = canEditGridContextCell({
      gridApi: {
        getRowNode: () => ({ rowIndex: 1, data: {} }),
        getColumn: () => ({
          getColDef: () => ({
            editable: true
          })
        })
      },
      rowId: 'row-1',
      field: '__changes__',
      isTableEditable: true
    })

    expect(result).toBe(false)
  })
})
