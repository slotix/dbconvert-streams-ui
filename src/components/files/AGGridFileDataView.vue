<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { PanelLeftOpen, Plus, Trash2, Filter } from 'lucide-vue-next'
import { type FileSystemEntry } from '@/api/fileSystem'
import { type FileMetadata } from '@/types/files'
import type { SQLColumnMeta } from '@/types/metadata'
import { getFileFormat } from '@/utils/fileFormat'
import { getFileEditBlockedToastMessage } from '@/utils/fileEditingMessages'
import filesApi from '@/api/files'
import ColumnContextMenu from '../database/ColumnContextMenu.vue'
import DataFilterPanel from '../database/DataFilterPanel.vue'
import UnsupportedFileMessage from './UnsupportedFileMessage.vue'
import {
  useBaseAGGridView,
  type FetchDataParams,
  type FetchDataResult
} from '@/composables/useBaseAGGridView'
import { useObjectTabStateStore } from '@/stores/objectTabState'
import { useConnectionsStore } from '@/stores/connections'
import { useCopyToClipboard } from '@/composables/useCopyToClipboard'
import { useToast } from 'vue-toastification'
import SelectionContextMenu from '@/components/common/SelectionContextMenu.vue'
import { useAgGridRowChangeTracking } from '@/composables/useAgGridRowChangeTracking'
import { useAgGridDataViewColumnDefs } from '@/composables/useAgGridDataViewColumnDefs'
import { useAgGridSelectionActions } from '@/composables/useAgGridSelectionActions'
import { buildRowChangeRows } from '@/utils/rowChangeRows'
import AGGridRowChangesPanel from '@/components/database/aggrid/AGGridRowChangesPanel.vue'
import AGGridInsertRowPanel from '@/components/database/aggrid/AGGridInsertRowPanel.vue'
import { useLucideIcons } from '@/composables/useLucideIcons'
import { useAgGridChangesGutter } from '@/composables/useAgGridChangesGutter'
import { useAgGridUnsavedChangesLifecycle } from '@/composables/useAgGridUnsavedChangesLifecycle'

const props = withDefaults(
  defineProps<{
    entry: FileSystemEntry
    metadata: FileMetadata | null
    connectionId: string
    objectKey: string
    showToolbarActions?: boolean
    readOnly?: boolean
  }>(),
  {
    showToolbarActions: true,
    readOnly: false
  }
)

const tabStateStore = useObjectTabStateStore()
const connectionsStore = useConnectionsStore()
const connection = computed(() => connectionsStore.connectionByID(props.connectionId))

const toast = useToast()
const { copy: copyToClipboard } = useCopyToClipboard()

// Component-specific state
const isInitialLoading = ref(true)
const isRefreshing = ref(false)
const warnings = ref<string[]>([])
const lastBlockedEditToastAt = ref(0)
// Columns derived from data response when metadata is not yet available
const derivedColumns = ref<Array<{ name: string; type: string }>>([])
// Flag to force S3 cache invalidation on next fetch (set by refresh button)
const forceRefresh = ref(false)

const fileFormat = computed(() => props.entry.format || getFileFormat(props.entry.name))

// Check if file format is supported
const isUnsupportedFile = computed(() => fileFormat.value === null)

const ROW_ID_COLUMN = '__rowid'
const { strokeWidth: iconStroke } = useLucideIcons()

const isTableFolder = computed(() => props.entry.type === 'dir' && props.entry.isTable)
const isTableEditable = computed(
  () => !props.readOnly && !isUnsupportedFile.value && !isTableFolder.value
)

const editKeyColumns = computed(() => (isTableEditable.value ? [ROW_ID_COLUMN] : []))

const fileColumns = computed(() => {
  if (isInitialLoading.value) return []
  const cols = props.metadata?.columns || derivedColumns.value
  if (!cols || cols.length === 0) return []
  return cols
    .filter((c) => c.name !== ROW_ID_COLUMN)
    .map((c) => ({
      name: c.name,
      dataType: c.type,
      isNullable: 'nullable' in c ? Boolean(c.nullable) : true
    }))
})

const allColumnNames = computed(() => fileColumns.value.map((c) => c.name))

const columnMetaByName = computed(() => {
  const out = new Map<
    string,
    {
      dataType?: string
      isNullable?: boolean
      scale?: number
      isPrimaryKey?: boolean
      autoIncrement?: boolean
      hasDefault?: boolean
    }
  >()
  for (const col of fileColumns.value) {
    out.set(col.name, {
      dataType: col.dataType,
      isNullable: col.isNullable,
      scale: undefined,
      isPrimaryKey: false,
      autoIncrement: false,
      hasDefault: false
    })
  }
  return out
})

const insertColumns = computed<SQLColumnMeta[]>(() =>
  fileColumns.value.map((col) => ({
    name: col.name,
    dataType: col.dataType || 'string',
    isNullable: col.isNullable,
    defaultValue: { String: null, Valid: false },
    isPrimaryKey: false,
    isUnique: false,
    length: { Int64: null, Valid: false },
    precision: { Int64: null, Valid: false },
    scale: { Int64: null, Valid: false },
    comment: { String: null, Valid: false },
    autoIncrement: false
  }))
)

function makeRowId(row: Record<string, unknown>): string {
  const pendingInsertId = row.__pendingInsertId
  if (typeof pendingInsertId === 'string' && pendingInsertId.length > 0) {
    return `__pending_insert__=${pendingInsertId}`
  }

  const raw = row[ROW_ID_COLUMN]
  if (raw === null || raw === undefined) return ''
  return `${ROW_ID_COLUMN}=${encodeURIComponent(String(raw))}`
}

function getKeyValues(row: Record<string, unknown>): Record<string, unknown> {
  return { [ROW_ID_COLUMN]: row[ROW_ID_COLUMN] }
}

// Watch for metadata warnings
watch(
  () => props.metadata?.warnings,
  (newWarnings) => {
    if (newWarnings && newWarnings.length > 0) {
      warnings.value = [...newWarnings]
    }
  },
  { immediate: true }
)

// Data fetching callback for base composable
async function fetchData(params: FetchDataParams): Promise<FetchDataResult> {
  if (!fileFormat.value) {
    throw new Error('Unsupported file format')
  }

  // Build comma-separated order_by and order_dir for multi-column sorting
  let orderBy: string | undefined
  let orderDir: string | undefined

  if (params.sortModel.length > 0) {
    orderBy = params.sortModel.map((s) => s.colId).join(',')
    orderDir = params.sortModel.map((s) => s.sort?.toUpperCase() || 'ASC').join(',')
  }

  // Check if we should force refresh (invalidate S3 cache)
  // Only apply on first page request to trigger cache invalidation once
  const shouldRefresh = forceRefresh.value && params.offset === 0
  if (shouldRefresh) {
    forceRefresh.value = false // Reset after using
  }

  // Skip COUNT(*) only on pagination (offset > 0) since we already have the count
  // For first page (offset === 0) or refresh, always get count - data is cached locally so it's fast
  const skipCount = params.offset > 0

  const response = await filesApi.getFileData(
    props.entry.path,
    fileFormat.value,
    {
      limit: params.limit,
      offset: params.offset,
      skipCount,
      order_by: orderBy,
      order_dir: orderDir,
      where: params.whereClause || undefined,
      max_rows: params.maxRows,
      refresh: shouldRefresh
    },
    props.connectionId
  )

  // Convert data to row format expected by AG Grid
  const rows = response.data.map((row) => {
    const gridRow: Record<string, unknown> = {}
    Object.entries(row).forEach(([key, value]) => {
      gridRow[key] = value
    })
    return gridRow
  })

  // If we don't have metadata columns yet, derive them from the data response schema
  // This allows the grid to display data immediately while metadata loads in background
  if (!props.metadata?.columns && response.schema && response.schema.length > 0) {
    derivedColumns.value = response.schema.map((field) => ({
      name: field.name,
      type: field.type || 'unknown'
    }))
  }

  // Merge warnings from data response with existing metadata warnings
  const dataWarnings = response.warnings || []
  const metadataWarnings = props.metadata?.warnings || []
  const allWarnings = new Set([...metadataWarnings, ...dataWarnings])
  warnings.value = Array.from(allWarnings)

  // Mark loading as complete on successful fetch
  if (isInitialLoading.value) {
    isInitialLoading.value = false
  }
  if (isRefreshing.value) {
    isRefreshing.value = false
  }

  return {
    rows,
    columns: response.schema.map((field) => field.name),
    totalCount: response.total
  }
}

// Initialize base AG Grid composable
const baseGrid = useBaseAGGridView({
  objectKey: computed(() => props.objectKey),
  connectionType: computed(() => 'duckdb'),
  initialTotalRowCount: computed(() => props.metadata?.rowCount ?? 0),
  fetchData,
  getRowId: (p: { data: Record<string, unknown> }) => makeRowId(p.data),
  onGridReady: () => {
    // Don't set up grid for unsupported files
    if (isUnsupportedFile.value) {
      isInitialLoading.value = false
    }
  }
})

const rowChangesPanelOpen = ref(false)

const insertRowPanelOpen = ref(false)
const insertEditingId = ref<string | null>(null)
const insertInitialValues = ref<Record<string, unknown>>({})

const rowOps = {
  applyChanges: async (payload: {
    inserts: Array<{ values: Record<string, unknown> }>
    edits: Array<{ keys: Record<string, unknown>; changes: Record<string, unknown> }>
    deletes: Array<{ keys: Record<string, unknown> }>
  }) => {
    const format = fileFormat.value
    if (!format) {
      throw new Error('Unsupported file format')
    }

    const toRowID = (keys: Record<string, unknown>): number => {
      const raw = keys[ROW_ID_COLUMN]
      const id = typeof raw === 'number' ? raw : Number(raw)
      if (!Number.isFinite(id)) {
        throw new Error('Missing row identifier')
      }
      return id
    }

    return await filesApi.applyFileRowChanges({
      path: props.entry.path,
      format,
      connectionId: props.connectionId,
      edits: payload.edits.map((edit) => ({
        rowId: toRowID(edit.keys),
        changes: edit.changes
      })),
      inserts: payload.inserts.map((ins) => ({ values: ins.values })),
      deletes: payload.deletes.map((del) => ({ rowId: toRowID(del.keys) }))
    })
  },
  forceRefreshAfterSave: true
}

const {
  pendingEdits,
  pendingDeletes,
  pendingInserts,
  pendingEditCount,
  pendingDeleteCount,
  pendingInsertCount,
  showChangesGutter,
  hasUnsavedChanges,
  isSaving,
  rowClassRules,
  pinnedTopRowData,
  upsertPendingInsert,
  removePendingInsert,
  removePendingDelete,
  stageDeleteRow,
  revertRowField,
  onCellValueChanged,
  cancelChanges,
  saveChanges
} = useAgGridRowChangeTracking({
  isTableEditable,
  editKeyColumns,
  makeRowId,
  getKeyValues,
  columnMetaByName,
  gridApi: baseGrid.gridApi,
  toast,
  rowOps
})

function getEditedCellTooltip(rowId: string, field: string, _dataType?: string): string | null {
  const edit = pendingEdits.value[rowId]
  if (!edit?.changes || !Object.prototype.hasOwnProperty.call(edit.changes, field)) return null

  const oldValue = edit.original?.[field]
  const newValue = edit.changes[field]
  return `Old: ${String(oldValue)}\nNew: ${String(newValue)}`
}

const { columnDefs } = useAgGridDataViewColumnDefs({
  columns: fileColumns,
  isTableEditable,
  editKeyColumns,
  pendingDeletes: pendingDeletes as unknown as typeof pendingDeletes,
  pendingEdits: pendingEdits as unknown as typeof pendingEdits,
  showChangesGutter,
  makeRowId,
  getEditedCellTooltip
})

const rowChangeRows = computed(() =>
  buildRowChangeRows({
    pendingEdits: pendingEdits.value,
    pendingInserts: pendingInserts.value,
    pendingDeletes: pendingDeletes.value,
    formatValue: (value) => String(value)
  })
)

function openRowChangesPanel() {
  rowChangesPanelOpen.value = true
}

function openFirstEditedRowPanel() {
  if (hasUnsavedChanges.value) {
    openRowChangesPanel()
  }
}

function closeRowChangesPanel() {
  rowChangesPanelOpen.value = false
}

function revertRow(rowId: string) {
  const row = rowChangeRows.value.find((r) => r.rowId === rowId)
  if (!row) return

  if (row.kind === 'insert') {
    removePendingInsert(rowId)
    return
  }

  if (row.kind === 'delete') {
    removePendingDelete(rowId)
    return
  }

  row.items.forEach((item) => revertRowField(rowId, item.field))
}

async function applyAndClose() {
  await saveChanges()
  if (!hasUnsavedChanges.value) closeRowChangesPanel()
}

function discardAndClose() {
  cancelChanges()
  closeRowChangesPanel()
}

function discardChangesByKind(kind: 'insert' | 'edit' | 'delete') {
  if (kind === 'insert') {
    for (const rowId of Object.keys(pendingInserts.value)) {
      removePendingInsert(rowId)
    }
    return
  }

  if (kind === 'delete') {
    for (const rowId of Object.keys(pendingDeletes.value)) {
      removePendingDelete(rowId)
    }
    return
  }

  for (const rowId of Object.keys(pendingEdits.value)) {
    const edit = pendingEdits.value[rowId]
    if (!edit) continue
    for (const field of Object.keys(edit.changes)) {
      revertRowField(rowId, field)
    }
  }
}

function onCellClicked(event: { column?: { getColId: () => string }; node?: { id?: string } }) {
  const colId = event.column?.getColId?.()
  if (colId !== '__changes__') return
  const rowId = event.node?.id
  if (!rowId) return
  if (!pendingEdits.value[rowId] && !pendingDeletes.value[rowId]) return
  openRowChangesPanel()
}

function onCellDoubleClicked(event: {
  column?: { getColId: () => string }
  node?: { rowPinned?: string | null }
}) {
  if (isTableEditable.value) {
    return
  }

  if (event.column?.getColId?.() === '__changes__' || event.node?.rowPinned) {
    return
  }

  const message = getFileEditBlockedToastMessage(props.entry)
  if (!message) {
    return
  }

  const now = Date.now()
  if (now - lastBlockedEditToastAt.value < 1500) {
    return
  }

  lastBlockedEditToastAt.value = now
  toast.info(message)
}

function openInsertRowPanelForNew() {
  insertEditingId.value = null
  insertInitialValues.value = {}
  insertRowPanelOpen.value = true
}

function openInsertRowPanelForExisting(id: string) {
  const existing = pendingInserts.value[id]
  if (!existing) return
  insertEditingId.value = id
  insertInitialValues.value = { ...existing.values }
  insertRowPanelOpen.value = true
}

function closeInsertRowPanel() {
  insertRowPanelOpen.value = false
  insertEditingId.value = null
  insertInitialValues.value = {}
}

function onInsertRow(values: Record<string, unknown>, existingId?: string | null) {
  upsertPendingInsert(values, existingId || undefined)
  toast.info('Row staged. Click Save to commit.')
  closeInsertRowPanel()
}

function onInsertRowAndAddAnother(values: Record<string, unknown>, existingId?: string | null) {
  upsertPendingInsert(values, existingId || undefined)
  toast.info('Row staged. Click Save to commit.')
  insertEditingId.value = null
  insertInitialValues.value = {}
  insertRowPanelOpen.value = true
}

function onRowClicked(event: { data?: Record<string, unknown> }) {
  const id = event.data?.__pendingInsertId
  if (typeof id !== 'string' || id.length === 0) return
  openInsertRowPanelForExisting(id)
}

const selectionActions = useAgGridSelectionActions({
  gridApi: baseGrid.gridApi,
  selectedRows: baseGrid.selectedRows,
  selectedRowCount: baseGrid.selectedRowCount,
  allColumnNames,

  isTableEditable,
  toast,
  copyToClipboard,

  pendingEdits: pendingEdits as unknown as typeof pendingEdits,
  revertRowField,
  stageDeleteRow,

  objectName: computed(() => props.entry.name),
  connectionId: computed(() => props.connectionId),
  database: computed(() => ''),
  objectSchema: computed(() => null),
  objectKey: computed(() => props.objectKey),
  dialect: computed(() => 'sql')
})

const {
  selectionMenuOpen,
  selectionMenuX,
  selectionMenuY,
  canCopySelection,
  openSelectionMenu,
  selectAllOnCurrentPage,
  deselectAll,
  copySelectedRows,
  canEditContextCell,
  editContextCell,
  deleteSelectedRows,
  canRevertContextCell,
  revertContextCell
} = selectionActions

watch(
  () => baseGrid.gridApi.value,
  (api) => {
    if (!api) return
    api.setGridOption('pinnedTopRowData', pinnedTopRowData.value)
  },
  { immediate: true }
)

useAgGridChangesGutter({
  gridApi: baseGrid.gridApi,
  visible: showChangesGutter
})

useAgGridUnsavedChangesLifecycle({
  hasUnsavedChanges,
  objectKey: computed(() => props.objectKey),
  setHasUnsavedChanges: (objectKey, dirty) => tabStateStore.setHasUnsavedChanges(objectKey, dirty)
})

// Sync grid state from store on mount
function syncGridStateFromStore() {
  const savedState = tabStateStore.getAGGridDataState(props.objectKey)

  if (savedState) {
    // Restore panel filters from saved state
    if (savedState.panelWhereSQL || (savedState.sortModel && savedState.sortModel.length > 0)) {
      baseGrid.setPanelFilters(savedState.panelWhereSQL || '', savedState.sortModel || [])
    }
  }

  return savedState
}

onMounted(() => {
  syncGridStateFromStore()
})

// Watch for objectKey changes (tab switches)
watch(
  () => props.objectKey,
  () => {
    const savedState = syncGridStateFromStore()

    if (!baseGrid.gridApi.value) return

    if (savedState) {
      baseGrid.applyGridState({
        sortModel: savedState.sortModel,
        whereClause: savedState.panelWhereSQL
      })
    }

    baseGrid.gridApi.value.setGridOption('datasource', baseGrid.createDatasource())
  }
)

// Reload data when entry changes
watch(
  () => props.entry,
  () => {
    if (baseGrid.gridApi.value) {
      // Reset derived columns and reload - don't reset isInitialLoading
      // as it would clear columnDefs causing empty grid
      derivedColumns.value = []
      baseGrid.gridApi.value.setGridOption('datasource', baseGrid.createDatasource())
    }
  },
  { deep: true }
)

// Reload when metadata SCHEMA changes (but not when only rowCount changes)
// Skip if we already have derived columns from the first data fetch
watch(
  () => props.metadata?.columns,
  (newCols, oldCols) => {
    // Skip if we already derived columns from data response - no need to refetch
    if (derivedColumns.value.length > 0) {
      return
    }
    // Only refresh if schema actually changed (not just row count update)
    const schemaChanged = JSON.stringify(newCols) !== JSON.stringify(oldCols)
    if (schemaChanged && baseGrid.gridApi.value && columnDefs.value.length > 0) {
      // Refresh the grid with new datasource
      baseGrid.gridApi.value.setGridOption('datasource', baseGrid.createDatasource())
    }
  },
  { deep: true }
)

// Reference to filter panel
const filterPanelRef = ref<InstanceType<typeof DataFilterPanel> | null>(null)

function resolveMaybeRefBoolean(value: boolean | { value?: boolean } | undefined): boolean {
  if (typeof value === 'boolean') return value
  if (value && typeof value === 'object' && 'value' in value) {
    return Boolean(value.value)
  }
  return false
}

function resolveMaybeRefString(
  value: string | { value?: string } | undefined,
  fallback: string
): string {
  if (typeof value === 'string') return value || fallback
  if (value && typeof value === 'object' && 'value' in value && typeof value.value === 'string') {
    return value.value || fallback
  }
  return fallback
}

const hasAnyFilterActivity = computed(() => {
  const panel = filterPanelRef.value as
    | (InstanceType<typeof DataFilterPanel> & {
        hasActiveFilters?: boolean | { value?: boolean }
        hasActiveSorts?: boolean | { value?: boolean }
      })
    | null
  if (!panel) return false

  const activeFilters = resolveMaybeRefBoolean(panel.hasActiveFilters)
  const activeSorts = resolveMaybeRefBoolean(panel.hasActiveSorts)

  return activeFilters || activeSorts
})

const filterButtonTooltip = computed(() => {
  const panel = filterPanelRef.value as
    | (InstanceType<typeof DataFilterPanel> & {
        summaryTooltip?: string | { value?: string }
      })
    | null
  if (!panel) return 'Open data filter'

  return resolveMaybeRefString(panel.summaryTooltip, 'Open data filter')
})

function openFilterPanel() {
  filterPanelRef.value?.openPanel?.()
}

// Handle filter panel apply - applies custom WHERE/ORDER BY/LIMIT from the panel
function onFilterPanelApply(payload: {
  where: string
  orderBy: string
  orderDir: string
  limit?: number
}) {
  // Build sort model from payload
  let sortModel: { colId: string; sort: 'asc' | 'desc' }[] = []
  if (payload.orderBy) {
    const columns = payload.orderBy.split(',')
    const directions = payload.orderDir.split(',')
    sortModel = columns.map((col, i) => ({
      colId: col.trim(),
      sort: (directions[i]?.toLowerCase() || 'asc') as 'asc' | 'desc'
    }))
  }

  // Set panel filters - this is the single source of truth
  baseGrid.setPanelFilters(payload.where, sortModel, payload.limit)

  // Refresh the datasource to fetch data with new filters
  if (baseGrid.gridApi.value) {
    baseGrid.gridApi.value.setGridOption('datasource', baseGrid.createDatasource())
  }
}

// Pending column visibility (applied when grid is ready)
const pendingColumnVisibility = ref<string[] | null>(null)

// Handle column visibility changes from filter panel
function onColumnsChange(visibleColumns: string[]) {
  // Store for later if grid not ready
  pendingColumnVisibility.value = visibleColumns

  if (!baseGrid.gridApi.value) return

  applyColumnVisibility(visibleColumns)
}

// Apply column visibility to the grid
function applyColumnVisibility(visibleColumns: string[]) {
  if (!baseGrid.gridApi.value) return

  // If empty array or all columns selected, show all
  const showAll = visibleColumns.length === 0 || visibleColumns.length === columnDefs.value.length

  // Update column visibility
  columnDefs.value.forEach((col) => {
    const colId = col.field
    if (colId) {
      const isVisible = showAll || visibleColumns.includes(colId)
      baseGrid.gridApi.value?.setColumnsVisible([colId], isVisible)
    }
  })
}

// Watch for grid API to become ready and apply pending visibility
watch(
  () => baseGrid.gridApi.value,
  (api) => {
    if (api && pendingColumnVisibility.value) {
      applyColumnVisibility(pendingColumnVisibility.value)
    }
    // Restore column state (pinned, width, order) when grid is ready
    if (api) {
      const savedState = tabStateStore.getAGGridDataState(props.objectKey)
      if (savedState?.columnState) {
        api.applyColumnState({ state: savedState.columnState, applyOrder: true })
      }
    }
  }
)

// Save column state when it changes (pin, resize, reorder)
function saveColumnState() {
  if (!baseGrid.gridApi.value) return
  const columnState = baseGrid.gridApi.value.getColumnState()
  tabStateStore.setAGGridDataState(props.objectKey, { columnState })
}

// Custom refresh that invalidates S3 cache for fresh data
function refreshWithCacheInvalidation() {
  forceRefresh.value = true
  isRefreshing.value = true
  baseGrid.refresh()
}

// Expose methods to parent
defineExpose({
  refresh: refreshWithCacheInvalidation,
  getGridState: baseGrid.getGridState,
  applyGridState: baseGrid.applyGridState,
  filterPanelRef
})
</script>

<script lang="ts">
import { vTooltip } from '@/directives/tooltip'

export default {
  directives: {
    tooltip: vTooltip
  }
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- Unsupported file type message -->
    <UnsupportedFileMessage
      v-if="isUnsupportedFile"
      :file-name="entry.name"
      variant="data"
      class="h-full"
    />

    <!-- Data Filter Panel -->
    <DataFilterPanel
      v-if="!isUnsupportedFile"
      ref="filterPanelRef"
      :columns="columnDefs"
      dialect="sql"
      :table-name="entry.name"
      :object-key="objectKey"
      @apply="onFilterPanelApply"
      @clear="baseGrid.clearAllFilters"
      @columns-change="onColumnsChange"
    />

    <!-- Grid Actions Toolbar -->
    <div
      v-if="!isUnsupportedFile && props.showToolbarActions"
      class="toolbar-container ui-surface-toolbar flex flex-wrap items-start justify-between gap-2 border-b px-3 py-1.5"
    >
      <div v-if="props.showToolbarActions" class="flex items-center gap-2 min-w-0">
        <button
          v-tooltip="filterButtonTooltip"
          type="button"
          class="inline-flex shrink-0 whitespace-nowrap items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors"
          :class="
            hasAnyFilterActivity
              ? 'ui-status-warning-badge border'
              : 'ui-text-muted hover:[background-color:var(--ui-surface-muted)] border border-transparent'
          "
          @click="openFilterPanel"
        >
          <Filter class="h-3.5 w-3.5" :stroke-width="iconStroke" />
          <span class="badge-text">Filter</span>
        </button>
      </div>

      <div class="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
        <button
          v-if="isTableEditable"
          type="button"
          class="ui-accent-primary inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          title="Stage a new row for insert"
          @click="openInsertRowPanelForNew"
        >
          <Plus class="h-3.5 w-3.5" :stroke-width="iconStroke" />
          <span class="badge-text">Add row</span>
        </button>

        <button
          v-if="isTableEditable"
          type="button"
          class="ui-status-danger-badge inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="baseGrid.selectedRowCount.value === 0"
          title="Stage selected rows for delete (Delete)"
          @click="deleteSelectedRows"
        >
          <Trash2 class="h-3.5 w-3.5" :stroke-width="iconStroke" />
          <span class="badge-text">Delete</span>
        </button>

        <span
          v-if="baseGrid.selectedRowCount.value > 0"
          class="stat-badge stat-badge-gray"
          title="Selected rows"
        >
          {{ baseGrid.selectedRowCount.value }}
          <span class="badge-text">selected</span>
        </span>

        <template v-if="hasUnsavedChanges">
          <button
            type="button"
            class="ui-accent-primary text-xs rounded-md px-2.5 py-1 border disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
            title="Save pending changes"
            :disabled="isSaving"
            @click="saveChanges"
          >
            {{
              isSaving
                ? 'Saving…'
                : `Save (${pendingInsertCount + pendingEditCount + pendingDeleteCount})`
            }}
          </button>
          <button
            type="button"
            class="ui-accent-action-active text-xs rounded-md p-1.5 border inline-flex shrink-0 items-center justify-center transition-colors"
            title="Review pending changes"
            aria-label="Review pending changes"
            @click="openFirstEditedRowPanel"
          >
            <PanelLeftOpen class="h-3.5 w-3.5 shrink-0" :stroke-width="iconStroke" />
          </button>
          <button
            type="button"
            class="ui-surface-raised ui-border-default ui-text-default text-xs rounded-md px-2.5 py-1 border hover:[background-color:var(--ui-surface-muted)] disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
            title="Discard pending changes"
            :disabled="isSaving"
            @click="cancelChanges"
          >
            Cancel
          </button>
        </template>
      </div>
    </div>

    <!-- Warnings (only show when there's no error) -->
    <div
      v-if="!isUnsupportedFile && !baseGrid.error.value && warnings.length > 0"
      class="ui-status-warning-surface mb-3 rounded-md border p-3 text-sm"
    >
      <div class="font-medium mb-1">Warnings:</div>
      <ul class="list-disc list-inside">
        <li v-for="(warning, index) in warnings" :key="index">{{ warning }}</li>
      </ul>
    </div>

    <!-- Error State Placeholder -->
    <div
      v-if="!isUnsupportedFile && baseGrid.error.value"
      class="ui-surface-muted ui-border-default flex items-center justify-center rounded-md border py-12"
    >
      <div class="text-center p-8 max-w-md">
        <svg
          class="ui-status-danger-text mx-auto mb-4 h-12 w-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h3 class="ui-text-strong mb-2 text-lg font-medium">Failed to Load File</h3>
        <p class="ui-text-muted mb-4 text-sm">
          {{ baseGrid.error.value }}
        </p>
        <div class="ui-surface-raised ui-border-default ui-text-muted rounded border p-3 text-xs">
          <p class="font-semibold mb-1">Common causes:</p>
          <ul class="list-disc list-inside text-left space-y-1">
            <li>File was deleted or moved after being listed</li>
            <li>File permissions changed</li>
            <li>File is corrupted or inaccessible</li>
            <li>Network or disk I/O error</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- AG Grid (only show when no error) -->
    <div
      v-if="!isUnsupportedFile && !baseGrid.error.value"
      :ref="(el) => (baseGrid.gridContainerRef.value = el as HTMLElement)"
      class="relative ag-theme-alpine select-none flex-1 min-h-0"
      style="height: 100%; width: 100%"
    >
      <ag-grid-vue
        class="h-full w-full"
        :columnDefs="columnDefs"
        :gridOptions="baseGrid.gridOptions.value"
        :rowClassRules="rowClassRules"
        @grid-ready="baseGrid.onGridReady"
        @row-clicked="onRowClicked"
        @cell-context-menu="openSelectionMenu"
        @cell-clicked="onCellClicked"
        @cell-double-clicked="onCellDoubleClicked"
        @cell-value-changed="onCellValueChanged"
        @column-pinned="saveColumnState"
        @column-moved="saveColumnState"
        @column-resized="saveColumnState"
      ></ag-grid-vue>

      <!-- Loading overlay - fully opaque to hide empty grid -->
      <div
        v-if="isInitialLoading || isRefreshing"
        class="ui-surface-raised absolute inset-0 flex items-center justify-center z-50"
      >
        <div class="flex flex-col items-center gap-3">
          <svg
            class="ui-accent-icon animate-spin h-8 w-8"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span class="ui-text-muted text-sm">
            {{
              isRefreshing
                ? 'Refreshing data...'
                : props.entry.path.startsWith('s3://')
                  ? 'Loading data from S3...'
                  : 'Loading file data...'
            }}
          </span>
        </div>
      </div>
    </div>

    <!-- Custom Context Menu -->
    <ColumnContextMenu
      v-if="!isUnsupportedFile && baseGrid.showContextMenu.value"
      :x="baseGrid.contextMenuX.value"
      :y="baseGrid.contextMenuY.value"
      :column="baseGrid.contextMenuColumn.value"
      :grid-api="baseGrid.gridApi.value"
      @close="baseGrid.closeContextMenu"
    />

    <SelectionContextMenu
      :open="selectionMenuOpen"
      :x="selectionMenuX"
      :y="selectionMenuY"
      :has-selection="canCopySelection"
      :is-editable="isTableEditable"
      :can-edit-cell="canEditContextCell"
      :can-open-changes-panel="hasUnsavedChanges"
      :can-revert-cell="canRevertContextCell"
      @close="selectionMenuOpen = false"
      @select-all="selectAllOnCurrentPage"
      @deselect-all="deselectAll"
      @copy="copySelectedRows"
      @edit-cell="editContextCell"
      @open-changes-panel="openFirstEditedRowPanel"
      @add-row="openInsertRowPanelForNew"
      @delete="deleteSelectedRows"
      @revert-cell="revertContextCell"
    />

    <AGGridRowChangesPanel
      :open="rowChangesPanelOpen"
      :rows="rowChangeRows"
      :table-name="entry.name"
      :source-name="connection?.name"
      :saving="isSaving"
      @close="closeRowChangesPanel"
      @revert="(rowId, field) => revertRowField(rowId, field)"
      @revert-row="revertRow"
      @apply="applyAndClose"
      @discard="discardAndClose"
      @discard-kind="discardChangesByKind"
    />

    <AGGridInsertRowPanel
      :open="insertRowPanelOpen"
      :table-label="entry.name"
      :columns="insertColumns"
      :initial-values="insertInitialValues"
      :existing-insert-id="insertEditingId"
      @close="closeInsertRowPanel"
      @insert="onInsertRow"
      @insert-and-add-another="onInsertRowAndAddAnother"
    />
  </div>
</template>

<style scoped>
/* Container query for toolbar responsiveness */
.toolbar-container {
  container-type: inline-size;
  container-name: toolbar;
}

/* Badge text visibility based on container width */
.badge-text {
  display: none;
}

.badge-text-short {
  display: inline;
}

@container toolbar (min-width: 860px) {
  .badge-text {
    display: inline;
  }
  .badge-text-short {
    display: none;
  }
}

.stat-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 500;
}

.stat-badge-clickable {
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.stat-badge-clickable:hover {
  opacity: 0.8;
}

.stat-badge-gray {
  background-color: rgba(107, 114, 128, 0.1);
  color: rgb(107 114 128);
  border: 1px solid rgba(107, 114, 128, 0.2);
}

.stat-badge-teal {
  background-color: rgba(13, 148, 136, 0.1);
  color: rgb(13 148 136);
  border: 1px solid rgba(13, 148, 136, 0.2);
}

.stat-badge-sky {
  background-color: rgba(14, 165, 233, 0.1);
  color: rgb(14 165 233);
  border: 1px solid rgba(14, 165, 233, 0.2);
}

.stat-badge-red {
  background-color: rgba(220, 38, 38, 0.1);
  color: rgb(220 38 38);
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.stat-badge-amber {
  background-color: rgba(217, 119, 6, 0.1);
  color: rgb(217 119 6);
  border: 1px solid rgba(217, 119, 6, 0.2);
}

:global(.dark) .stat-badge-gray {
  background-color: rgba(156, 163, 175, 0.14);
  color: rgb(156 163 175);
  border: 1px solid rgba(156, 163, 175, 0.25);
}

:global(.dark) .stat-badge-teal {
  background-color: rgba(45, 212, 191, 0.14);
  color: rgb(45 212 191);
  border: 1px solid rgba(45, 212, 191, 0.25);
}

:global(.dark) .stat-badge-sky {
  background-color: rgba(56, 189, 248, 0.14);
  color: rgb(56 189 248);
  border: 1px solid rgba(56, 189, 248, 0.25);
}

:global(.dark) .stat-badge-red {
  background-color: rgba(248, 113, 113, 0.14);
  color: rgb(248 113 113);
  border: 1px solid rgba(248, 113, 113, 0.25);
}

:global(.dark) .stat-badge-amber {
  background-color: rgba(251, 191, 36, 0.14);
  color: rgb(251 191 36);
  border: 1px solid rgba(251, 191, 36, 0.25);
}
</style>
