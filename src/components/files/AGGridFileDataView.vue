<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { AgGridVue } from 'ag-grid-vue3'
import { Check, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { type FileSystemEntry } from '@/api/fileSystem'
import { type FileMetadata } from '@/types/files'
import type { SQLColumnMeta } from '@/types/metadata'
import { getFileFormat } from '@/utils/fileFormat'
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
import { useCopyToClipboard } from '@/composables/useCopyToClipboard'
import { useToast } from 'vue-toastification'
import SelectionContextMenu from '@/components/common/SelectionContextMenu.vue'
import { useAgGridRowChangeTracking } from '@/composables/useAgGridRowChangeTracking'
import { useAgGridDataViewColumnDefs } from '@/composables/useAgGridDataViewColumnDefs'
import { useAgGridSelectionActions } from '@/composables/useAgGridSelectionActions'
import AGGridRowChangesPanel from '@/components/database/aggrid/AGGridRowChangesPanel.vue'
import AGGridInsertRowPanel from '@/components/database/aggrid/AGGridInsertRowPanel.vue'
import { useLucideIcons } from '@/composables/useLucideIcons'
import { isWailsContext } from '@/composables/useWailsEvents'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'

const props = defineProps<{
  entry: FileSystemEntry
  metadata: FileMetadata | null
  connectionId: string
  objectKey: string
}>()

const tabStateStore = useObjectTabStateStore()

const toast = useToast()
const { copy: copyToClipboard } = useCopyToClipboard()

// Component-specific state
const isInitialLoading = ref(true)
const isRefreshing = ref(false)
const warnings = ref<string[]>([])
// Columns derived from data response when metadata is not yet available
const derivedColumns = ref<Array<{ name: string; type: string }>>([])
// Flag to force S3 cache invalidation on next fetch (set by refresh button)
const forceRefresh = ref(false)

const fileFormat = computed(() => props.entry.format || getFileFormat(props.entry.name))

// Check if file format is supported
const isUnsupportedFile = computed(() => fileFormat.value === null)

const ROW_ID_COLUMN = '__rowid'
const { strokeWidth: iconStroke } = useLucideIcons()
const { confirmDiscardUnsavedChanges } = useUnsavedChangesGuard()

const isTableFolder = computed(() => props.entry.type === 'dir' && props.entry.isTable)
const isTableEditable = computed(() => !isUnsupportedFile.value && !isTableFolder.value)

const editDisabledReason = computed(() => {
  if (isUnsupportedFile.value) return 'Unsupported file type'
  if (isTableFolder.value) return 'Table folders are read-only. Edit a single file.'
  return ''
})

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
const rowChangesRowId = ref<string | null>(null)

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
  rowClassRules,
  pinnedTopRowData,
  upsertPendingInsert,
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

function getEditedCellTooltip(rowId: string, field: string, dataType?: string): string | null {
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

const rowChangeItems = computed(() => {
  const rowId = rowChangesRowId.value
  if (!rowId) return [] as Array<{ field: string; oldValue: string; newValue: string }>
  const edit = pendingEdits.value[rowId]
  if (!edit?.changes) return [] as Array<{ field: string; oldValue: string; newValue: string }>

  return Object.keys(edit.changes)
    .sort()
    .map((field) => {
      return {
        field,
        oldValue: String(edit.original?.[field]),
        newValue: String(edit.changes[field])
      }
    })
})

function openRowChangesPanel(rowId: string) {
  rowChangesRowId.value = rowId
  rowChangesPanelOpen.value = true
}

function openFirstEditedRowPanel() {
  const firstEditedRowId = Object.keys(pendingEdits.value)[0]
  if (firstEditedRowId) {
    openRowChangesPanel(firstEditedRowId)
  }
}

function closeRowChangesPanel() {
  rowChangesPanelOpen.value = false
  rowChangesRowId.value = null
}

function onCellClicked(event: { column?: { getColId: () => string }; node?: { id?: string } }) {
  const colId = event.column?.getColId?.()
  if (colId !== '__changes__') return
  const rowId = event.node?.id
  if (!rowId) return
  if (!pendingEdits.value[rowId]) return
  openRowChangesPanel(rowId)
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

watch(
  () => ({ api: baseGrid.gridApi.value, visible: showChangesGutter.value }),
  ({ api, visible }) => {
    if (!api) return
    api.setColumnsVisible(['__changes__'], visible)
  },
  { immediate: true }
)

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!hasUnsavedChanges.value) return
  event.preventDefault()
  event.returnValue = ''
}

watch(
  hasUnsavedChanges,
  (dirty) => {
    tabStateStore.setHasUnsavedChanges(props.objectKey, dirty)
  },
  { immediate: true }
)

onMounted(() => {
  if (!isWailsContext()) {
    window.addEventListener('beforeunload', onBeforeUnload)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
  tabStateStore.setHasUnsavedChanges(props.objectKey, false)
})

onBeforeRouteLeave(() => {
  if (!hasUnsavedChanges.value) return true
  return confirmDiscardUnsavedChanges({
    description: 'You have unsaved changes. Discard them and leave?'
  })
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
      v-if="!isUnsupportedFile"
      class="toolbar-container flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center gap-2">
        <span
          v-if="baseGrid.selectedRowCount.value > 0"
          class="stat-badge stat-badge-gray"
          title="Selected rows"
        >
          {{ baseGrid.selectedRowCount.value }}
          <span class="badge-text">selected</span>
        </span>

        <span
          v-if="!isTableEditable"
          class="stat-badge stat-badge-amber"
          :title="editDisabledReason"
        >
          <span class="badge-text">Read-only</span>
          <span class="badge-text-short">RO</span>
        </span>

        <span
          v-if="isTableFolder"
          class="stat-badge stat-badge-gray"
          title="Folder groups multiple files. Open a specific file to edit."
        >
          <span class="badge-text">Table folder</span>
          <span class="badge-text-short">Folder</span>
        </span>

        <span
          v-else-if="isTableEditable"
          class="stat-badge stat-badge-teal"
          title="Double-click a cell to edit. Changes require Save."
        >
          <Check class="h-3 w-3" :stroke-width="iconStroke" />
          <span class="badge-text">Editable</span>
        </span>

        <button
          v-if="pendingEditCount > 0"
          type="button"
          class="stat-badge stat-badge-teal stat-badge-clickable"
          title="Click to view edited rows"
          @click="openFirstEditedRowPanel"
        >
          <Pencil class="h-3 w-3" :stroke-width="iconStroke" />
          {{ pendingEditCount }}
          <span class="badge-text">edited</span>
        </button>

        <span
          v-if="pendingInsertCount > 0"
          class="stat-badge stat-badge-sky"
          title="Rows staged for insert until Save"
        >
          <Plus class="h-3 w-3" :stroke-width="iconStroke" />
          {{ pendingInsertCount }}
          <span class="badge-text">new</span>
        </span>

        <span
          v-if="pendingDeleteCount > 0"
          class="stat-badge stat-badge-red"
          title="Rows staged for deletion until Save"
        >
          <Trash2 class="h-3 w-3" :stroke-width="iconStroke" />
          {{ pendingDeleteCount }}
          <span class="badge-text">deleted</span>
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="isTableEditable"
          type="button"
          class="text-xs rounded-md px-2.5 py-1 border border-sky-400 bg-sky-50 text-sky-900 hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-sky-400/50 dark:bg-sky-900/20 dark:text-sky-100 dark:hover:bg-sky-900/30 inline-flex items-center gap-1"
          title="Stage a new row for insert"
          @click="openInsertRowPanelForNew"
        >
          <Plus class="h-3.5 w-3.5" :stroke-width="iconStroke" />
          <span class="badge-text">Add row</span>
        </button>

        <template v-if="hasUnsavedChanges">
          <button
            type="button"
            class="text-xs rounded-md px-2.5 py-1 border border-teal-600 bg-teal-600 text-white hover:bg-teal-700 hover:border-teal-700 disabled:opacity-50 disabled:cursor-not-allowed dark:border-teal-500 dark:bg-teal-600 dark:hover:bg-teal-700"
            title="Save pending changes"
            @click="saveChanges"
          >
            Save
          </button>
          <button
            type="button"
            class="text-xs rounded-md px-2.5 py-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Discard pending changes"
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
      class="mb-3 p-3 bg-yellow-50 dark:bg-amber-900 border border-yellow-200 dark:border-amber-700 rounded-md text-sm text-yellow-700 dark:text-amber-300"
    >
      <div class="font-medium mb-1">Warnings:</div>
      <ul class="list-disc list-inside">
        <li v-for="(warning, index) in warnings" :key="index">{{ warning }}</li>
      </ul>
    </div>

    <!-- Error State Placeholder -->
    <div
      v-if="!isUnsupportedFile && baseGrid.error.value"
      class="flex items-center justify-center py-12 bg-gray-50 dark:bg-gray-900/40 rounded-md border border-gray-200 dark:border-gray-700"
    >
      <div class="text-center p-8 max-w-md">
        <svg
          class="mx-auto h-12 w-12 text-red-400 dark:text-red-500 mb-4"
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
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Failed to Load File
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {{ baseGrid.error.value }}
        </p>
        <div
          class="text-xs text-gray-500 dark:text-gray-500 bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700"
        >
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
        @cell-value-changed="onCellValueChanged"
        @column-pinned="saveColumnState"
        @column-moved="saveColumnState"
        @column-resized="saveColumnState"
      ></ag-grid-vue>

      <!-- Loading overlay - fully opaque to hide empty grid -->
      <div
        v-if="isInitialLoading || isRefreshing"
        class="absolute inset-0 bg-white dark:bg-gray-850 flex items-center justify-center z-50"
      >
        <div class="flex flex-col items-center gap-3">
          <svg
            class="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400"
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
          <span class="text-sm text-gray-600 dark:text-gray-300">
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
      :can-revert-cell="canRevertContextCell"
      @close="selectionMenuOpen = false"
      @select-all="selectAllOnCurrentPage"
      @deselect-all="deselectAll"
      @copy="copySelectedRows"
      @delete="deleteSelectedRows"
      @revert-cell="revertContextCell"
    />

    <AGGridRowChangesPanel
      :open="rowChangesPanelOpen"
      :items="rowChangeItems"
      @close="closeRowChangesPanel"
      @revert="(field) => rowChangesRowId && revertRowField(rowChangesRowId, field)"
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
/* Pending delete: subtle red tint + strike-through */
:deep(.ag-row.row-pending-delete),
:deep(.ag-row.row-pending-delete .ag-cell) {
  background-color: rgba(220, 38, 38, 0.06);
}

/* Pending insert: sky tint */
:deep(.ag-row.row-pending-insert),
:deep(.ag-row.row-pending-insert .ag-cell) {
  background-color: rgba(14, 165, 233, 0.1);
}

:deep(.ag-row.row-pending-delete .ag-cell),
:deep(.ag-row.row-pending-delete .ag-cell-value) {
  text-decoration: line-through;
}

/* Pending edit: highlight edited cells */
:deep(.ag-cell.cell-pending-edit) {
  background-color: rgba(13, 148, 136, 0.08);
  box-shadow: inset 0 0 0 1px rgba(13, 148, 136, 0.9);
}

/* Row change gutter indicator */
:deep(.ag-cell.row-change-gutter) {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

:deep(.ag-cell.row-change-gutter .row-action-indicator) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

:deep(.ag-cell.row-change-gutter .row-action-indicator .indicator-icon) {
  width: 12px;
  height: 12px;
}

:deep(.ag-cell.row-change-gutter .row-action-edit) {
  background-color: rgba(13, 148, 136, 0.15);
  color: rgb(13 148 136);
}

:deep(.ag-cell.row-change-gutter .row-action-edit:hover) {
  background-color: rgba(13, 148, 136, 0.25);
}

:deep(.ag-cell.row-change-gutter .row-action-insert) {
  background-color: rgba(14, 165, 233, 0.15);
  color: rgb(14 165 233);
}

:deep(.ag-cell.row-change-gutter .row-action-insert:hover) {
  background-color: rgba(14, 165, 233, 0.25);
}

/* Selected row + edited cell */
:deep(.ag-row.ag-row-selected .ag-cell.cell-pending-edit) {
  background-color: transparent;
  box-shadow: inset 0 0 0 2px rgba(13, 148, 136, 1);
}

@media (prefers-color-scheme: dark) {
  :deep(.ag-row.row-pending-delete),
  :deep(.ag-row.row-pending-delete .ag-cell) {
    background-color: rgba(248, 113, 113, 0.12);
  }

  :deep(.ag-row.row-pending-insert),
  :deep(.ag-row.row-pending-insert .ag-cell) {
    background-color: rgba(56, 189, 248, 0.14);
  }

  :deep(.ag-cell.cell-pending-edit) {
    background-color: rgba(45, 212, 191, 0.14);
    box-shadow: inset 0 0 0 1px rgba(45, 212, 191, 0.95);
  }

  :deep(.ag-cell.row-change-gutter .row-action-edit) {
    background-color: rgba(45, 212, 191, 0.2);
    color: rgb(45 212 191);
  }

  :deep(.ag-cell.row-change-gutter .row-action-edit:hover) {
    background-color: rgba(45, 212, 191, 0.3);
  }

  :deep(.ag-cell.row-change-gutter .row-action-insert) {
    background-color: rgba(56, 189, 248, 0.2);
    color: rgb(56 189 248);
  }

  :deep(.ag-cell.row-change-gutter .row-action-insert:hover) {
    background-color: rgba(56, 189, 248, 0.3);
  }

  :deep(.ag-row.ag-row-selected .ag-cell.cell-pending-edit) {
    background-color: transparent;
    box-shadow: inset 0 0 0 2px rgba(45, 212, 191, 1);
  }
}

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

@container toolbar (min-width: 700px) {
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
