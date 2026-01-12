import { computed, type ComputedRef, type Ref } from 'vue'
import type { ColDef, ITooltipParams, ValueFormatterParams } from 'ag-grid-community'
import { formatTableValue } from '@/utils/dataUtils'
import {
  emptyToNullIfNullable,
  inferEditorKind,
  normalizeDateString,
  normalizeDateTimeString,
  parseNumberInput
} from '@/utils/agGridEditing'

export type ColumnMeta = {
  name: string
  dataType?: string
  isNullable: boolean
  scale?: number
}

export type UseAgGridDataViewColumnDefsOptions = {
  columns: ComputedRef<ColumnMeta[]>
  isTableEditable: ComputedRef<boolean>
  editKeyColumns: ComputedRef<string[]>
  pendingDeletes: Ref<Record<string, unknown>>
  pendingEdits: Ref<Record<string, { changes?: Record<string, unknown> }>>
  showChangesGutter: ComputedRef<boolean>
  makeRowId: (row: Record<string, unknown>) => string
  getEditedCellTooltip: (rowId: string, field: string, dataType?: string) => string | null
}

// Generate column definitions from table metadata.
// Note: sortable and filter are disabled - Query Filter Panel is the single source of truth.
export function useAgGridDataViewColumnDefs(options: UseAgGridDataViewColumnDefsOptions) {
  const columnDefs = computed<ColDef[]>(() => {
    const columns = options.columns.value
    if (!columns || columns.length === 0) return []

    const editable = options.isTableEditable.value
    const keyCols = new Set(options.editKeyColumns.value)

    const dataCols = columns.map((col) => {
      const kind = inferEditorKind(col.dataType || '')
      const isKey = keyCols.has(col.name)
      const isCellEditable = editable && !isKey

      const valueParser = (p: { newValue: unknown; oldValue: unknown }) => {
        switch (kind) {
          case 'integer':
          case 'number':
            return parseNumberInput(p.newValue, kind, col.isNullable, p.oldValue, col.scale)
          case 'date':
            return normalizeDateString(p.newValue, col.isNullable)
          case 'datetime':
            return normalizeDateTimeString(p.newValue, col.isNullable)
          default:
            return emptyToNullIfNullable(p.newValue, col.isNullable)
        }
      }

      const cellEditor = (() => {
        if (!isCellEditable) return undefined
        // Decimal types (numeric/decimal/etc) can hit browser step-mismatch validation in <input type="number">
        // which causes AG Grid to hand us an empty string on commit. Use a text editor and parse ourselves.
        if (kind === 'integer') return 'agNumberCellEditor'
        if (kind === 'number') return 'agTextCellEditor'
        if (kind === 'date') return 'agDateStringCellEditor'
        return 'agTextCellEditor'
      })()

      const cellEditorParams = (() => {
        if (kind !== 'integer') return undefined
        return { step: 1 }
      })()

      return {
        field: col.name,
        headerName: col.name,
        // Disable AG-Grid native sorting/filtering - Query Filter Panel is the single source of truth
        sortable: false,
        filter: false,
        floatingFilter: false,
        suppressHeaderMenuButton: false,
        suppressHeaderFilterButton: true,
        resizable: true,
        flex: 1,
        minWidth: 120,
        valueFormatter: (params: ValueFormatterParams) =>
          formatTableValue(params.value, col.dataType),
        tooltipValueGetter: (p: ITooltipParams) => {
          const rowId = p.node?.id
          const field = (p.colDef as unknown as { field?: string } | null)?.field
          if (!rowId || !field) return undefined
          return options.getEditedCellTooltip(rowId, field, col.dataType) || undefined
        },
        headerTooltip: `${col.dataType}${col.isNullable ? '' : ' NOT NULL'} - Use Query Filter panel to sort/filter`,
        wrapText: false,
        autoHeight: false,
        editable: (p: { data: Record<string, unknown>; node?: { rowPinned?: string | null } }) => {
          if (!isCellEditable) return false
          if (p.node?.rowPinned) return false
          const rowId = options.makeRowId(p.data)
          return !options.pendingDeletes.value[rowId]
        },
        cellClass: isCellEditable ? 'ag-cell-editable' : undefined,
        cellClassRules: {
          'cell-pending-edit': (p: { node?: { id?: string }; colDef?: { field?: string } }) => {
            const rowId = p.node?.id
            const field = p.colDef?.field
            if (!rowId || !field) return false
            const edit = options.pendingEdits.value[rowId]
            return Boolean(
              edit?.changes && Object.prototype.hasOwnProperty.call(edit.changes, field)
            )
          }
        },
        valueParser,
        cellEditor,
        cellEditorParams
      } satisfies ColDef
    })

    if (!editable) return dataCols

    const changesCol: ColDef = {
      colId: '__changes__',
      headerName: '',
      hide: !options.showChangesGutter.value,
      pinned: 'left',
      lockPinned: true,
      suppressMovable: true,
      resizable: false,
      sortable: false,
      filter: false,
      floatingFilter: false,
      suppressHeaderMenuButton: true,
      suppressHeaderFilterButton: true,
      width: 36,
      minWidth: 36,
      maxWidth: 36,
      cellClass: 'row-change-gutter',
      cellRenderer: (p: { node?: { id?: string }; data?: Record<string, unknown> }) => {
        const rowId = p.node?.id
        if (!rowId) return ''

        // Check if this is a pending insert row (new row)
        const isPendingInsert = Boolean(p.data?.__pendingInsertId)
        if (isPendingInsert) {
          return `<span class="row-action-indicator row-action-insert" title="Click to edit new row">
            <svg class="indicator-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </span>`
        }

        // Check if this is an edited row
        const edit = options.pendingEdits.value[rowId]
        const changeCount = edit?.changes ? Object.keys(edit.changes).length : 0
        if (!edit || changeCount === 0) return ''

        const label = changeCount === 1 ? '1 change' : `${changeCount} changes`
        return `<span class="row-action-indicator row-action-edit" title="${label} - Click to view">
          <svg class="indicator-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </span>`
      }
    }

    return [changesCol, ...dataCols]
  })

  return { columnDefs }
}
