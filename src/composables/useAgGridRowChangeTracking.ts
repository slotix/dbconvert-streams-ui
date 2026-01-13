import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { GridApi } from 'ag-grid-community'
import { inferEditorKind, parseNumberInput, valuesEqualForSqlType } from '@/utils/agGridEditing'

export type PendingEdit = {
  keys: Record<string, unknown>
  changes: Record<string, unknown>
  original: Record<string, unknown>
}

export type PendingDelete = {
  keys: Record<string, unknown>
  original: Record<string, unknown>
}

export type PendingInsert = {
  id: string
  createdAt: number
  values: Record<string, unknown>
}

export type RowChangePayload = {
  inserts: Array<{ values: Record<string, unknown> }>
  edits: Array<{ keys: Record<string, unknown>; changes: Record<string, unknown> }>
  deletes: Array<{ keys: Record<string, unknown> }>
}

export type RowChangeResult = {
  rows?: Record<string, unknown>[]
  inserted?: number
  updated?: number
  deleted?: number
}

export type RowChangeAdapter = {
  applyChanges?: (payload: RowChangePayload) => Promise<RowChangeResult>
  insertRows?: (payload: { inserts: Array<{ values: Record<string, unknown> }> }) => Promise<{
    inserted: number
  }>
  updateRows?: (payload: {
    edits: Array<{ keys: Record<string, unknown>; changes: Record<string, unknown> }>
  }) => Promise<{ rows?: Record<string, unknown>[] }>
  deleteRows?: (payload: { deletes: Array<{ keys: Record<string, unknown> }> }) => Promise<{
    deleted: number
  }>
  forceRefreshAfterSave?: boolean
}

type ToastLike = {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

export type UseAgGridRowChangeTrackingOptions = {
  isTableEditable: ComputedRef<boolean>
  editKeyColumns: ComputedRef<string[]>
  makeRowId: (row: Record<string, unknown>) => string
  getKeyValues: (row: Record<string, unknown>) => Record<string, unknown>
  columnMetaByName: ComputedRef<
    Map<
      string,
      {
        dataType?: string
        isNullable?: boolean
        scale?: number
        isPrimaryKey?: boolean
        autoIncrement?: boolean
        hasDefault?: boolean
      }
    >
  >
  gridApi: Ref<GridApi | null>
  toast: ToastLike
  rowOps: RowChangeAdapter

  onDeletedRowsApplied?: (deletedCount: number) => void
}

export function useAgGridRowChangeTracking(options: UseAgGridRowChangeTrackingOptions) {
  const pendingEdits = ref<Record<string, PendingEdit>>({})
  const pendingDeletes = ref<Record<string, PendingDelete>>({})
  const pendingInserts = ref<Record<string, PendingInsert>>({})

  const pendingEditCount = computed(() => Object.keys(pendingEdits.value).length)
  const pendingDeleteCount = computed(() => Object.keys(pendingDeletes.value).length)
  const pendingInsertCount = computed(() => Object.keys(pendingInserts.value).length)

  const showChangesGutter = computed(
    () => pendingEditCount.value > 0 || pendingInsertCount.value > 0
  )
  const hasUnsavedChanges = computed(
    () => pendingInsertCount.value > 0 || pendingEditCount.value > 0 || pendingDeleteCount.value > 0
  )

  function makePendingInsertId(): string {
    // Small, dependency-free unique-ish id for client-side staging.
    return `ins_${Date.now()}_${Math.random().toString(16).slice(2)}`
  }

  const pinnedTopRowData = computed(() => {
    const rows = Object.values(pendingInserts.value)
    // Show newest staged rows first.
    rows.sort((a, b) => b.createdAt - a.createdAt)
    return rows.map((ins) => ({
      ...ins.values,
      __pendingInsertId: ins.id
    }))
  })

  function syncPinnedInsertsToGrid() {
    const api = options.gridApi.value
    if (!api || api.isDestroyed()) return
    api.setGridOption('pinnedTopRowData', pinnedTopRowData.value)
  }

  function isRowPendingDelete(rowId: string | undefined): boolean {
    if (!rowId) return false
    return Boolean(pendingDeletes.value[rowId])
  }

  function isPendingInsertRow(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false
    return Boolean((data as Record<string, unknown>).__pendingInsertId)
  }

  const rowClassRules = computed(() => ({
    'row-pending-delete': (params: { node?: { id?: string } }) =>
      isRowPendingDelete(params.node?.id),
    'row-pending-insert': (params: { data?: Record<string, unknown> }) =>
      isPendingInsertRow(params.data)
  }))

  function removePendingInsert(id: string) {
    if (!pendingInserts.value[id]) return
    const next = { ...pendingInserts.value }
    delete next[id]
    pendingInserts.value = next
    syncPinnedInsertsToGrid()
  }

  function upsertPendingInsert(values: Record<string, unknown>, existingId?: string): string {
    const id = existingId || makePendingInsertId()

    const createdAt =
      existingId && pendingInserts.value[existingId]
        ? pendingInserts.value[existingId].createdAt
        : Date.now()

    pendingInserts.value = {
      ...pendingInserts.value,
      [id]: { id, createdAt, values: { ...values } }
    }
    syncPinnedInsertsToGrid()
    return id
  }

  function stageDeleteRow(row: Record<string, unknown>): string {
    const insertId = row.__pendingInsertId
    if (typeof insertId === 'string' && insertId.length > 0) {
      // Deleting a staged insert should simply remove it from the pending insert set.
      removePendingInsert(insertId)
      return insertId
    }

    const rowId = options.makeRowId(row)

    if (pendingDeletes.value[rowId]) return rowId

    // If the row has pending edits, deleting it supersedes edits.
    if (pendingEdits.value[rowId]) {
      const nextEdits = { ...pendingEdits.value }
      delete nextEdits[rowId]
      pendingEdits.value = nextEdits
    }

    pendingDeletes.value = {
      ...pendingDeletes.value,
      [rowId]: {
        keys: options.getKeyValues(row),
        original: { ...row }
      }
    }

    return rowId
  }

  function revertRowField(rowId: string, field: string) {
    const api = options.gridApi.value
    if (!api) return
    if (!options.isTableEditable.value) return

    const edit = pendingEdits.value[rowId]
    if (!edit?.changes || !Object.prototype.hasOwnProperty.call(edit.changes, field)) return

    const node = api.getRowNode(rowId)
    if (!node) return

    node.setDataValue(field, edit.original?.[field])
    api.refreshCells({ rowNodes: [node], columns: [field], force: true })
  }

  function clearAllPending() {
    pendingEdits.value = {}
    pendingDeletes.value = {}
    pendingInserts.value = {}
  }

  function cancelChanges() {
    const api = options.gridApi.value
    const editsToRestore = pendingEdits.value
    const deleteRowIds = Object.keys(pendingDeletes.value)

    // Capture current pinned rows so we can re-style/refresh properly after clearing.
    const hadPinnedInserts = pinnedTopRowData.value.length > 0

    // Clear state first so rowClassRules evaluates to "not deleted" on redraw.
    clearAllPending()

    if (!api) return

    api.stopEditing(true)

    if (hadPinnedInserts) {
      api.setGridOption('pinnedTopRowData', [])
    }

    // Restore edited rows
    for (const [rowId, edit] of Object.entries(editsToRestore)) {
      const node = api.getRowNode(rowId)
      if (node) node.setData(edit.original)
    }

    // Refresh styling for previously-deleted rows (data was never removed).
    const deleteNodes = deleteRowIds
      .map((rowId) => api.getRowNode(rowId))
      .filter((n): n is NonNullable<typeof n> => Boolean(n))

    if (deleteNodes.length > 0) {
      api.refreshCells({ rowNodes: deleteNodes, force: true })
      api.redrawRows({ rowNodes: deleteNodes })
    }
  }

  async function saveChanges() {
    const api = options.gridApi.value
    if (!api) return
    if (!options.isTableEditable.value) return

    const insertEntries = Object.values(pendingInserts.value)
    const editEntries = Object.entries(pendingEdits.value)
    const deleteEntries = Object.entries(pendingDeletes.value)

    if (insertEntries.length === 0 && editEntries.length === 0 && deleteEntries.length === 0) {
      return
    }

    let editSuccess = false
    let deleteSuccess = false
    let insertedCount = 0
    let deletedCount = 0

    const isGeneratedInsertColumn = (colName: string): boolean => {
      const meta = options.columnMetaByName.value.get(colName)
      if (!meta) return false
      return Boolean(meta.autoIncrement) || (Boolean(meta.isPrimaryKey) && Boolean(meta.hasDefault))
    }

    const scrubGenerated = (values: Record<string, unknown>): Record<string, unknown> => {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(values || {})) {
        if (isGeneratedInsertColumn(k)) continue
        out[k] = v
      }
      return out
    }

    const insertPayload = insertEntries.map((ins) => ({ values: scrubGenerated(ins.values) }))
    const editPayload = editEntries.map(([, edit]) => ({ keys: edit.keys, changes: edit.changes }))
    const deletePayload = deleteEntries.map(([, del]) => ({ keys: del.keys }))

    if (options.rowOps.applyChanges) {
      try {
        const resp = await options.rowOps.applyChanges({
          inserts: insertPayload,
          edits: editPayload,
          deletes: deletePayload
        })

        insertedCount = resp.inserted ?? insertEntries.length
        deletedCount = resp.deleted ?? deleteEntries.length

        pendingInserts.value = {}
        pendingEdits.value = {}
        pendingDeletes.value = {}
        api.setGridOption('pinnedTopRowData', [])

        const shouldRefresh =
          options.rowOps.forceRefreshAfterSave ||
          insertEntries.length > 0 ||
          deleteEntries.length > 0 ||
          !resp.rows ||
          resp.rows.length !== editEntries.length

        if (!shouldRefresh && resp.rows) {
          for (let i = 0; i < editEntries.length; i++) {
            const [rowId] = editEntries[i]
            const row = resp.rows[i]
            const node = api.getRowNode(rowId)
            if (node && row) node.setData(row)
          }
        } else {
          api.purgeInfiniteCache()
        }

        editSuccess = true
        deleteSuccess = true
        options.onDeletedRowsApplied?.(deletedCount)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to save rows'
        options.toast.error(msg)
        return
      }
    } else {
      // First apply inserts
      if (insertEntries.length > 0) {
        if (!options.rowOps.insertRows) {
          options.toast.error('Insert is not supported')
          return
        }
        try {
          const resp = await options.rowOps.insertRows({ inserts: insertPayload })

          insertedCount = resp.inserted
          pendingInserts.value = {}
          api.setGridOption('pinnedTopRowData', [])

          // Refresh grid so newly inserted rows can appear if they fall into current page/sort.
          api.purgeInfiniteCache()
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to insert rows'
          options.toast.error(msg)
          return // Don't continue if inserts failed
        }
      }

      // Then apply edits
      if (editEntries.length > 0) {
        if (!options.rowOps.updateRows) {
          options.toast.error('Update is not supported')
          return
        }
        try {
          const resp = await options.rowOps.updateRows({ edits: editPayload })

          const shouldRefresh =
            options.rowOps.forceRefreshAfterSave ||
            !resp.rows ||
            resp.rows.length !== editEntries.length

          if (!shouldRefresh && resp.rows) {
            for (let i = 0; i < editEntries.length; i++) {
              const [rowId] = editEntries[i]
              const row = resp.rows[i]
              const node = api.getRowNode(rowId)
              if (node && row) node.setData(row)
            }
          } else {
            api.purgeInfiniteCache()
          }

          pendingEdits.value = {}
          editSuccess = true
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to save edits'
          options.toast.error(msg)
          return // Don't continue to deletes if edits failed
        }
      } else {
        editSuccess = true
      }

      // Then apply deletes
      if (deleteEntries.length > 0) {
        if (!options.rowOps.deleteRows) {
          options.toast.error('Delete is not supported')
          return
        }
        try {
          const resp = await options.rowOps.deleteRows({ deletes: deletePayload })

          deletedCount = resp.deleted
          pendingDeletes.value = {}
          deleteSuccess = true

          options.onDeletedRowsApplied?.(deletedCount)

          // Refresh the grid to remove deleted rows
          api.purgeInfiniteCache()
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to delete rows'
          options.toast.error(msg)
        }
      } else {
        deleteSuccess = true
      }
    }

    if (editSuccess && deleteSuccess) {
      const parts: string[] = []
      if (insertedCount > 0) parts.push(`${insertedCount} inserted`)
      if (editEntries.length > 0) parts.push(`${editEntries.length} edited`)
      if (deletedCount > 0) parts.push(`${deletedCount} deleted`)
      options.toast.success(parts.length > 0 ? `Saved: ${parts.join(', ')}` : 'Saved')
    }
  }

  function onCellValueChanged(event: {
    data: Record<string, unknown>
    colDef: { field?: string }
    oldValue: unknown
    newValue: unknown
  }) {
    if (!options.isTableEditable.value) return

    const api = options.gridApi.value
    const field = event.colDef.field
    if (!field) return
    if (options.editKeyColumns.value.includes(field)) return

    const row = event.data
    const rowId = options.makeRowId(row)

    const current = pendingEdits.value[rowId]

    const original =
      current?.original ||
      (() => {
        const snapshot = { ...row }

        const meta = options.columnMetaByName.value.get(field)
        const kind = inferEditorKind(meta?.dataType || '')
        if (kind === 'integer' || kind === 'number') {
          snapshot[field] = parseNumberInput(
            event.oldValue,
            kind,
            Boolean(meta?.isNullable),
            event.oldValue,
            meta?.scale
          )
        } else {
          snapshot[field] = event.oldValue
        }

        return snapshot
      })()

    const nextChanges = { ...(current?.changes || {}) }

    const meta = options.columnMetaByName.value.get(field)
    const equal = valuesEqualForSqlType(
      event.newValue,
      original[field],
      meta?.dataType,
      meta?.scale
    )

    if (equal) {
      delete nextChanges[field]
    } else {
      nextChanges[field] = event.newValue
    }

    if (Object.keys(nextChanges).length === 0) {
      const next = { ...pendingEdits.value }
      delete next[rowId]
      pendingEdits.value = next

      if (api) {
        const node = api.getRowNode(rowId)
        if (node) {
          api.refreshCells({ rowNodes: [node], columns: ['__changes__', field], force: true })
        }
      }
      return
    }

    pendingEdits.value = {
      ...pendingEdits.value,
      [rowId]: {
        keys: current?.keys || options.getKeyValues(row),
        changes: nextChanges,
        original
      }
    }

    if (api) {
      const node = api.getRowNode(rowId)
      if (node) {
        api.refreshCells({ rowNodes: [node], columns: ['__changes__', field], force: true })
      }
    }
  }

  return {
    pendingEdits,
    pendingDeletes,
    pendingInserts,
    pendingEditCount,
    pendingDeleteCount,
    pendingInsertCount,
    showChangesGutter,
    hasUnsavedChanges,
    rowClassRules,

    pinnedTopRowData,

    upsertPendingInsert,
    removePendingInsert,

    stageDeleteRow,
    revertRowField,
    onCellValueChanged,
    cancelChanges,
    saveChanges
  }
}
