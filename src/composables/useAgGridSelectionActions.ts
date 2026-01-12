import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { GridApi } from 'ag-grid-community'
import { formatRowsForClipboard, type CopyFormat } from '@/utils/agGridClipboard'
import { exportData, type ExportFormat } from '@/composables/useDataExport'
import { useStreamExport, type StreamExportFormat } from '@/composables/useStreamExport'
import type { SqlDialect } from '@/types/specs'

type ToastLike = {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

export type UseAgGridSelectionActionsOptions = {
  gridApi: Ref<GridApi | null>
  selectedRows: Ref<Record<string, unknown>[]>
  selectedRowCount: ComputedRef<number>
  allColumnNames: ComputedRef<string[]>

  isTableEditable: ComputedRef<boolean>
  toast: ToastLike
  copyToClipboard: (text: string) => Promise<boolean>

  // Pending edits support (for revert action)
  pendingEdits: Ref<Record<string, { changes?: Record<string, unknown> }>>
  revertRowField: (rowId: string, field: string) => void

  // Delete staging
  stageDeleteRow: (row: Record<string, unknown>) => string

  // Export
  objectName: ComputedRef<string>

  // Stream export
  connectionId: ComputedRef<string>
  database: ComputedRef<string>
  objectSchema: ComputedRef<string | null>
  objectKey: ComputedRef<string>
  dialect: ComputedRef<SqlDialect>
}

export function useAgGridSelectionActions(options: UseAgGridSelectionActionsOptions) {
  const selectionMenuOpen = ref(false)
  const selectionMenuX = ref(0)
  const selectionMenuY = ref(0)

  const contextRowId = ref<string | null>(null)
  const contextField = ref<string | null>(null)

  const canCopySelection = computed(() => options.selectedRowCount.value > 0)

  function openSelectionMenu(event: unknown) {
    const e = event as {
      event?: MouseEvent
      node?: { id?: string }
      colDef?: { field?: string }
      column?: { getColId?: () => string }
    }
    const nativeEvent = e.event
    if (!nativeEvent) return
    nativeEvent.preventDefault()
    nativeEvent.stopPropagation()

    contextRowId.value = e.node?.id || null
    contextField.value = e.colDef?.field || e.column?.getColId?.() || null

    selectionMenuX.value = nativeEvent.clientX
    selectionMenuY.value = nativeEvent.clientY
    selectionMenuOpen.value = true
  }

  function selectAllOnCurrentPage() {
    const api = options.gridApi.value
    if (!api) return

    const pageSize = api.paginationGetPageSize()
    const currentPage = api.paginationGetCurrentPage()
    const startRow = currentPage * pageSize
    const endRow = startRow + pageSize

    for (let i = startRow; i < endRow; i++) {
      const node = api.getDisplayedRowAtIndex(i)
      if (node) node.setSelected(true)
    }
  }

  function deselectAll() {
    options.gridApi.value?.deselectAll()
  }

  async function copySelectedRows(format: CopyFormat) {
    const api = options.gridApi.value
    if (!api) return

    if (options.selectedRowCount.value === 0) {
      options.toast.info('Select one or more rows to copy')
      return
    }

    const columns = options.allColumnNames.value

    const text = formatRowsForClipboard({
      rows: options.selectedRows.value,
      columns,
      format
    })

    const ok = await options.copyToClipboard(text)
    if (!ok) {
      options.toast.error('Failed to copy to clipboard')
      return
    }

    options.toast.success('Copied')
  }

  const canRevertContextCell = computed(() => {
    if (!options.isTableEditable.value) return false
    const rowId = contextRowId.value
    const field = contextField.value
    if (!rowId || !field) return false
    const edit = options.pendingEdits.value[rowId]
    return Boolean(edit?.changes && Object.prototype.hasOwnProperty.call(edit.changes, field))
  })

  function revertContextCell() {
    if (!options.isTableEditable.value) return
    const rowId = contextRowId.value
    const field = contextField.value
    if (!rowId || !field) return

    options.revertRowField(rowId, field)
  }

  function deleteSelectedRows() {
    const api = options.gridApi.value
    if (!api) return
    if (!options.isTableEditable.value) return

    if (options.selectedRowCount.value === 0) {
      options.toast.info('Select one or more rows to delete')
      return
    }

    const stagedRowIds: string[] = []
    for (const row of options.selectedRows.value) {
      stagedRowIds.push(options.stageDeleteRow(row))
    }

    api.deselectAll()

    const stagedNodes = stagedRowIds
      .map((rowId) => api.getRowNode(rowId))
      .filter((n): n is NonNullable<typeof n> => Boolean(n))

    if (stagedNodes.length > 0) {
      api.refreshCells({ rowNodes: stagedNodes, force: true })
      api.redrawRows({ rowNodes: stagedNodes })
    } else {
      api.redrawRows()
    }
  }

  function getVisibleData(): { columns: string[]; rows: Record<string, unknown>[] } {
    const api = options.gridApi.value
    if (!api) return { columns: [], rows: [] }

    const columns: string[] = []
    const displayedColumns = api.getAllDisplayedColumns()
    for (const col of displayedColumns) {
      const colId = col.getColId()
      if (colId) columns.push(colId)
    }

    const rows: Record<string, unknown>[] = []
    const pageSize = api.paginationGetPageSize()
    const currentPage = api.paginationGetCurrentPage()
    const startRow = currentPage * pageSize
    const endRow = startRow + pageSize

    for (let i = startRow; i < endRow; i++) {
      const node = api.getDisplayedRowAtIndex(i)
      if (node && node.data) rows.push(node.data)
    }

    return { columns, rows }
  }

  function handleExport(format: ExportFormat) {
    const { columns, rows } = getVisibleData()
    if (rows.length === 0) return

    exportData(format, {
      columns,
      rows,
      filename: options.objectName.value || 'table-data',
      tableName: options.objectName.value
    })
  }

  const { exportTable, isExporting: isStreamExporting } = useStreamExport()

  async function handleStreamExport(format: StreamExportFormat) {
    await exportTable({
      connectionId: options.connectionId.value,
      database: options.database.value,
      schema: options.objectSchema.value || undefined,
      table: options.objectName.value,
      format,
      objectKey: options.objectKey.value,
      dialect: options.dialect.value
    })
  }

  return {
    selectionMenuOpen,
    selectionMenuX,
    selectionMenuY,
    contextRowId,
    contextField,

    canCopySelection,
    openSelectionMenu,
    selectAllOnCurrentPage,
    deselectAll,
    copySelectedRows,

    canRevertContextCell,
    revertContextCell,

    handleExport,
    handleStreamExport,
    isStreamExporting,

    deleteSelectedRows
  }
}
