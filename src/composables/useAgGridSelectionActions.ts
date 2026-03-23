import { computed, onBeforeUnmount, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { GridApi } from 'ag-grid-community'
import { formatRowsForClipboard, type CopyFormat } from '@/utils/agGridClipboard'
import { exportData, type ExportFormat } from '@/composables/useDataExport'
import { useStreamExport, type StreamExportFormat } from '@/composables/useStreamExport'
import type { SqlDialect } from '@/types/specs'

type DeleteSelectionShortcutDecisionOptions = {
  key: string
  defaultPrevented: boolean
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
  selectedRowCount: number
  isEditableTarget: boolean
}

type ToastLike = {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

type ContextRowNode = {
  rowPinned?: string | null
  rowIndex?: number | null
  data?: Record<string, unknown>
}

type ContextColumnDef = {
  editable?:
    | boolean
    | ((params: { data: Record<string, unknown>; node?: ContextRowNode }) => boolean)
}

type ContextColumn = {
  getColDef: () => ContextColumnDef
}

type ContextCellGridApi = {
  getRowNode: (id: string) => ContextRowNode | null | undefined
  getColumn: (key: string) => ContextColumn | null | undefined
}

type UseAgGridSelectionActionsOptions = {
  gridApi: Ref<GridApi | null>
  gridContainerRef: Ref<HTMLElement | null>
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

  // Callbacks
  onAddRow?: () => void
  onSave?: () => void

  // Undo support
  hasUnsavedChanges: ComputedRef<boolean>

  // Stream export
  connectionId: ComputedRef<string>
  database: ComputedRef<string>
  objectSchema: ComputedRef<string | null>
  objectKey: ComputedRef<string>
  dialect: ComputedRef<SqlDialect>
}

export function canEditGridContextCell(options: {
  gridApi: ContextCellGridApi | null
  rowId: string | null
  field: string | null
  isTableEditable: boolean
}): boolean {
  if (!options.isTableEditable) return false
  if (!options.gridApi) return false
  if (!options.rowId || !options.field || options.field === '__changes__') return false

  const rowNode = options.gridApi.getRowNode(options.rowId)
  if (!rowNode || rowNode.rowPinned) return false

  const column = options.gridApi.getColumn(options.field)
  const colDef = column?.getColDef()
  if (!colDef) return false

  if (typeof colDef.editable === 'function') {
    return Boolean(colDef.editable({ data: rowNode.data || {}, node: rowNode }))
  }

  return Boolean(colDef.editable)
}

export function shouldSuppressDeleteCellClearForRowSelection(
  options: DeleteSelectionShortcutDecisionOptions
): boolean {
  if (options.key !== 'Delete') return false
  if (options.defaultPrevented) return false
  if (options.ctrlKey || options.metaKey || options.altKey || options.shiftKey) return false
  if (options.selectedRowCount === 0) return false
  if (options.isEditableTarget) return false
  return true
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

  const canEditContextCell = computed(() =>
    canEditGridContextCell({
      gridApi: options.gridApi.value as unknown as ContextCellGridApi | null,
      rowId: contextRowId.value,
      field: contextField.value,
      isTableEditable: options.isTableEditable.value
    })
  )

  function revertContextCell() {
    if (!options.isTableEditable.value) return
    const rowId = contextRowId.value
    const field = contextField.value
    if (!rowId || !field) return

    options.revertRowField(rowId, field)
  }

  function editContextCell() {
    const api = options.gridApi.value
    const rowId = contextRowId.value
    const field = contextField.value
    if (!api || !rowId || !field || !canEditContextCell.value) return

    const rowNode = api.getRowNode(rowId)
    const rowIndex = rowNode?.rowIndex
    if (typeof rowIndex !== 'number' || rowIndex < 0) return

    api.ensureIndexVisible(rowIndex)
    api.ensureColumnVisible(field)
    api.setFocusedCell(rowIndex, field)
    api.startEditingCell({ rowIndex, colKey: field })
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

  function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    if (target.isContentEditable) return true
    const tagName = target.tagName
    return (
      tagName === 'INPUT' ||
      tagName === 'TEXTAREA' ||
      tagName === 'SELECT' ||
      target.closest('[contenteditable="true"]') !== null
    )
  }

  function isEventInOwnPane(event: KeyboardEvent): boolean {
    const container = options.gridContainerRef.value
    if (!container) return false

    // Find the pane wrapper that contains this grid
    const pane = container.closest('.ui-pane-active')
    if (!pane) return false

    // Check that the event target is within the same pane
    return pane.contains(event.target as Node)
  }

  function handleDeleteShortcut(event: KeyboardEvent) {
    if (
      !shouldSuppressDeleteCellClearForRowSelection({
        key: event.key,
        defaultPrevented: event.defaultPrevented,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        selectedRowCount: options.selectedRowCount.value,
        isEditableTarget: isEditableTarget(event.target)
      })
    ) {
      return
    }
    if (!isEventInOwnPane(event)) return
    if (!options.isTableEditable.value) return

    event.preventDefault()
    deleteSelectedRows()
  }

  function handleSelectAllShortcut(event: KeyboardEvent) {
    if (event.key !== 'a' && event.key !== 'A') return
    if (!(event.ctrlKey || event.metaKey)) return
    if (event.defaultPrevented) return
    if (!isEventInOwnPane(event)) return
    if (!options.gridApi.value) return
    if (isEditableTarget(event.target)) return

    event.preventDefault()
    selectAllOnCurrentPage()
  }

  function handleDeselectAllShortcut(event: KeyboardEvent) {
    if (event.key !== 'Escape') return
    if (event.defaultPrevented) return
    if (!isEventInOwnPane(event)) return
    if (!options.gridApi.value) return
    if (options.selectedRowCount.value === 0) return
    if (isEditableTarget(event.target)) return

    event.preventDefault()
    deselectAll()
  }

  function handleCopyShortcut(event: KeyboardEvent) {
    if (event.key !== 'c' && event.key !== 'C') return
    if (!(event.ctrlKey || event.metaKey)) return
    if (event.shiftKey || event.altKey) return
    if (event.defaultPrevented) return
    if (!isEventInOwnPane(event)) return
    if (options.selectedRowCount.value === 0) return
    if (isEditableTarget(event.target)) return

    event.preventDefault()
    copySelectedRows('tsv')
  }

  function handleAddRowShortcut(event: KeyboardEvent) {
    if (event.key !== 'i' && event.key !== 'I') return
    if (!(event.ctrlKey || event.metaKey)) return
    if (event.defaultPrevented) return
    if (!isEventInOwnPane(event)) return
    if (!options.isTableEditable.value) return
    if (!options.onAddRow) return
    if (isEditableTarget(event.target)) return

    event.preventDefault()
    options.onAddRow()
  }

  function handleSaveShortcut(event: KeyboardEvent) {
    if (event.key !== 's' && event.key !== 'S') return
    if (!(event.ctrlKey || event.metaKey)) return
    if (event.defaultPrevented) return
    if (!isEventInOwnPane(event)) return
    if (!options.isTableEditable.value) return
    if (!options.onSave) return
    if (!options.hasUnsavedChanges.value) return

    event.preventDefault()
    options.onSave()
  }

  // Undo stack: tracks cell edits in order for Ctrl+Z
  const undoStack = ref<Array<{ rowId: string; field: string }>>([])
  const MAX_UNDO = 100

  // Clear undo stack when all changes are saved or discarded
  watch(
    () => options.hasUnsavedChanges.value,
    (has) => {
      if (!has) undoStack.value = []
    }
  )

  function pushUndo(rowId: string, field: string) {
    undoStack.value.push({ rowId, field })
    if (undoStack.value.length > MAX_UNDO) {
      undoStack.value = undoStack.value.slice(-MAX_UNDO)
    }
  }

  function handleUndoShortcut(event: KeyboardEvent) {
    if (event.key !== 'z' && event.key !== 'Z') return
    if (!(event.ctrlKey || event.metaKey)) return
    if (event.shiftKey) return
    if (event.defaultPrevented) return
    if (!isEventInOwnPane(event)) return
    if (!options.isTableEditable.value) return
    if (isEditableTarget(event.target)) return
    if (undoStack.value.length === 0) return

    event.preventDefault()
    const entry = undoStack.value.pop()!
    options.revertRowField(entry.rowId, entry.field)
  }

  onMounted(() => {
    document.addEventListener('keydown', handleDeleteShortcut)
    document.addEventListener('keydown', handleSelectAllShortcut)
    document.addEventListener('keydown', handleDeselectAllShortcut)
    document.addEventListener('keydown', handleCopyShortcut)
    document.addEventListener('keydown', handleAddRowShortcut)
    document.addEventListener('keydown', handleSaveShortcut)
    document.addEventListener('keydown', handleUndoShortcut)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleDeleteShortcut)
    document.removeEventListener('keydown', handleSelectAllShortcut)
    document.removeEventListener('keydown', handleDeselectAllShortcut)
    document.removeEventListener('keydown', handleCopyShortcut)
    document.removeEventListener('keydown', handleAddRowShortcut)
    document.removeEventListener('keydown', handleSaveShortcut)
    document.removeEventListener('keydown', handleUndoShortcut)
  })

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

  async function handleExport(format: ExportFormat) {
    const { columns, rows } = getVisibleData()
    if (rows.length === 0) return

    await exportData(format, {
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

    canEditContextCell,
    editContextCell,

    canRevertContextCell,
    revertContextCell,

    handleExport,
    handleStreamExport,
    isStreamExporting,

    deleteSelectedRows,
    pushUndo
  }
}
