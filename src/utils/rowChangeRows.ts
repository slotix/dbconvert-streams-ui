import type {
  PendingDelete,
  PendingEdit,
  PendingInsert
} from '@/composables/useAgGridRowChangeTracking'

export type RowChangeRowKind = 'edit' | 'insert' | 'delete'

export interface RowChangeRow {
  rowId: string
  kind: RowChangeRowKind
  label: string
  items: Array<{ field: string; oldValue: string; newValue: string }>
  allItems?: Array<{ field: string; oldValue: string; newValue: string }>
}

export interface BuildRowChangeRowsOptions {
  pendingEdits: Record<string, PendingEdit>
  pendingInserts: Record<string, PendingInsert>
  pendingDeletes: Record<string, PendingDelete>
  formatValue: (value: unknown, field: string) => string
}

export function buildRowChangeRows(options: BuildRowChangeRowsOptions): RowChangeRow[] {
  const editedRows = Object.entries(options.pendingEdits).map(([rowId, edit]) => ({
    rowId,
    kind: 'edit' as const,
    label: Object.entries(edit.keys)
      .map(([k, v]) => `${k}=${v}`)
      .join(', '),
    items: Object.keys(edit.changes)
      .sort()
      .map((field) => ({
        field,
        oldValue: options.formatValue(edit.original?.[field], field),
        newValue: options.formatValue(edit.changes[field], field)
      })),
    allItems: Array.from(
      new Set([...Object.keys(edit.original || {}), ...Object.keys(edit.changes)])
    )
      .sort()
      .map((field) => ({
        field,
        oldValue: options.formatValue(edit.original?.[field], field),
        newValue: Object.prototype.hasOwnProperty.call(edit.changes, field)
          ? options.formatValue(edit.changes[field], field)
          : options.formatValue(edit.original?.[field], field)
      }))
  }))

  const insertedRows = Object.entries(options.pendingInserts).map(([insertId, insert]) => ({
    rowId: insertId,
    kind: 'insert' as const,
    label: `__pending_insert__=${insertId}`,
    items: Object.keys(insert.values)
      .sort()
      .map((field) => ({
        field,
        oldValue: '—',
        newValue: options.formatValue(insert.values[field], field)
      })),
    allItems: Object.keys(insert.values)
      .sort()
      .map((field) => ({
        field,
        oldValue: '—',
        newValue: options.formatValue(insert.values[field], field)
      }))
  }))

  const deletedRows = Object.entries(options.pendingDeletes).map(([rowId, del]) => ({
    rowId,
    kind: 'delete' as const,
    label: Object.entries(del.keys)
      .map(([k, v]) => `${k}=${v}`)
      .join(', '),
    items: Object.keys(del.keys)
      .sort()
      .map((field) => ({
        field,
        oldValue: options.formatValue(del.keys[field], field),
        newValue: '(deleted)'
      })),
    allItems: Object.keys(del.original || del.keys)
      .sort()
      .map((field) => ({
        field,
        oldValue: options.formatValue((del.original || del.keys)[field], field),
        newValue: '(deleted)'
      }))
  }))

  return [...editedRows, ...insertedRows, ...deletedRows]
}
