<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { AgGridVue } from 'ag-grid-vue3'
import { type SQLTableMeta, type SQLViewMeta } from '@/types/metadata'
import connections from '@/api/connections'
import { formatTableValue } from '@/utils/dataUtils'
import { useCopyToClipboard } from '@/composables/useCopyToClipboard'
import { useToast } from 'vue-toastification'
import { useObjectTabStateStore } from '@/stores/objectTabState'
import { useConnectionsStore } from '@/stores/connections'
import { isWailsContext } from '@/composables/useWailsEvents'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import ColumnContextMenu from './ColumnContextMenu.vue'
import DataFilterPanel from './DataFilterPanel.vue'
import SelectionContextMenu from '@/components/common/SelectionContextMenu.vue'
import { getConnectionTypeLabel, getSqlDialectFromConnection } from '@/types/specs'
import {
  useBaseAGGridView,
  type FetchDataParams,
  type FetchDataResult
} from '@/composables/useBaseAGGridView'

import { useAgGridDataViewColumnDefs } from '@/composables/useAgGridDataViewColumnDefs'
import AGGridRowChangesPanel from '@/components/database/aggrid/AGGridRowChangesPanel.vue'
import AGGridInsertRowPanel from '@/components/database/aggrid/AGGridInsertRowPanel.vue'
import AGGridRowCountControls from '@/components/database/aggrid/AGGridRowCountControls.vue'
import { useAgGridRowChangeTracking } from '@/composables/useAgGridRowChangeTracking'
import { useExactRowCount } from '@/composables/useExactRowCount'
import { useAgGridSelectionActions } from '@/composables/useAgGridSelectionActions'
import { Check, Pencil, Plus, Trash2, Download, ChevronDown } from 'lucide-vue-next'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import { useLucideIcons } from '@/composables/useLucideIcons'

const props = defineProps<{
  tableMeta: SQLTableMeta | SQLViewMeta
  connectionId: string
  database: string
  isView?: boolean
  approxRows?: number // Optional approximate row count from database overview
  objectKey: string // Unique key for this table/view tab (from paneTabs store)
}>()

// Store for persisting tab state including AG Grid data state
const tabStateStore = useObjectTabStateStore()

// Connections store to get database type
const connectionsStore = useConnectionsStore()

const connection = computed(() => connectionsStore.connectionByID(props.connectionId))
const connectionType = computed(
  () => getConnectionTypeLabel(connection.value?.spec, connection.value?.type) || ''
)
const connectionDialect = computed(() =>
  getSqlDialectFromConnection(connection.value?.spec, connection.value?.type)
)

const toast = useToast()
const { copy: copyToClipboard } = useCopyToClipboard()
const { confirmDiscardUnsavedChanges } = useUnsavedChangesGuard()
const { strokeWidth: iconStroke } = useLucideIcons()

const rowChangesPanelOpen = ref(false)
const rowChangesRowId = ref<string | null>(null)

const insertRowPanelOpen = ref(false)
const insertEditingId = ref<string | null>(null)
const insertInitialValues = ref<Record<string, unknown>>({})

// Generate cache key for current table/view
const getCacheKey = () => {
  const objectName = getObjectName(props.tableMeta)
  const objectSchema = getObjectSchema(props.tableMeta)
  return `${props.objectKey}:${props.connectionId}:${props.database}:${objectSchema || ''}:${objectName}`
}

function getObjectName(meta: SQLTableMeta | SQLViewMeta): string {
  return props.isView ? (meta as SQLViewMeta).name : (meta as SQLTableMeta).name
}

function getObjectSchema(meta: SQLTableMeta | SQLViewMeta): string {
  return props.isView ? (meta as SQLViewMeta).schema : (meta as SQLTableMeta).schema
}

const isTableEditable = computed(() => {
  if (props.isView) return false
  const meta = props.tableMeta as SQLTableMeta
  return Boolean(meta.isEditable)
})

const editKeyColumns = computed<string[]>(() => {
  if (props.isView) return []
  const meta = props.tableMeta as SQLTableMeta
  if (Array.isArray(meta.editKeyColumns) && meta.editKeyColumns.length > 0) {
    return meta.editKeyColumns
  }
  // Back-compat fallback: compute locally from existing PK/index metadata.
  if (Array.isArray(meta.primaryKeys) && meta.primaryKeys.length > 0) return meta.primaryKeys
  const unique = (meta.indexes || []).find((i) => i.isUnique && i.columns?.length)
  return unique?.columns || []
})

const editDisabledReason = computed(() => {
  if (props.isView) return 'Views are read-only'
  const meta = props.tableMeta as SQLTableMeta
  if (meta.isEditable) return ''
  return meta.editabilityReason || 'Table has no primary key or unique index'
})

function makeRowId(row: Record<string, unknown>): string {
  const pendingInsertId = row.__pendingInsertId
  if (typeof pendingInsertId === 'string' && pendingInsertId.length > 0) {
    return `__pending_insert__=${pendingInsertId}`
  }

  const parts = editKeyColumns.value.map((k) => {
    const v = row[k]
    let s = ''
    if (v === null || v === undefined) s = ''
    else if (typeof v === 'string') s = v
    else {
      try {
        s = JSON.stringify(v)
      } catch {
        s = String(v)
      }
    }
    return `${k}=${encodeURIComponent(s)}`
  })
  return parts.join('|')
}

function getKeyValues(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of editKeyColumns.value) out[k] = row[k]
  return out
}

const columnMetaByName = computed(() => {
  const meta = props.tableMeta
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
  for (const c of meta?.columns || []) {
    const scale = c.scale?.Valid ? Number(c.scale.Int64 ?? 0) : undefined
    out.set(c.name, {
      dataType: c.dataType,
      isNullable: c.isNullable,
      scale,
      isPrimaryKey: c.isPrimaryKey,
      autoIncrement: c.autoIncrement,
      hasDefault: Boolean(c.defaultValue?.Valid)
    })
  }
  return out
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

const columnsForDefs = computed(() => {
  const meta = props.tableMeta
  if (!meta?.columns) return []
  return meta.columns.map((c) => ({
    name: c.name,
    dataType: c.dataType,
    isNullable: Boolean(c.isNullable),
    scale: c.scale?.Valid ? Number(c.scale.Int64 ?? 0) : undefined
  }))
})

let exactRowCount = ref<number | null>(null)

// Data fetching callback for base composable
async function fetchData(params: FetchDataParams): Promise<FetchDataResult> {
  const objectName = getObjectName(props.tableMeta)
  const objectSchema = getObjectSchema(props.tableMeta)

  if (!objectName) throw new Error('Table/View name is undefined')

  // Build comma-separated order_by and order_dir for multi-column sorting
  let orderBy: string | undefined
  let orderDir: string | undefined

  if (params.sortModel.length > 0) {
    orderBy = params.sortModel.map((s) => s.colId).join(',')
    orderDir = params.sortModel.map((s) => s.sort?.toUpperCase() || 'ASC').join(',')
  }

  const queryParams: {
    limit: number
    offset: number
    skip_count: boolean
    schema?: string
    order_by?: string
    order_dir?: string
    where?: string
    tabId?: string
    max_rows?: number
  } = {
    limit: params.limit,
    offset: params.offset,
    // Skip count if we already have one (either approximate or exact)
    skip_count:
      (params.offset > 0 && baseGrid.totalRowCount.value > 0) ||
      (exactRowCount.value !== null && !params.whereClause)
  }

  // Add optional parameters only if they have values
  if (objectSchema && objectSchema !== 'public' && objectSchema !== '') {
    queryParams.schema = objectSchema
  }
  if (orderBy) {
    queryParams.order_by = orderBy
  }
  if (orderDir) {
    queryParams.order_dir = orderDir
  }
  if (params.whereClause) {
    queryParams.where = params.whereClause
  }
  // Add tabId for query grouping
  if (objectName) {
    queryParams.tabId = objectName
  }
  // Add max_rows limit if specified
  if (params.maxRows && params.maxRows > 0) {
    queryParams.max_rows = params.maxRows
  }

  const data = props.isView
    ? await connections.getViewData(props.connectionId, props.database, objectName, queryParams)
    : await connections.getTableData(props.connectionId, props.database, objectName, queryParams)

  // Convert rows array to objects with column names as keys
  const convertedRowData = data.rows.map((row) => {
    const obj: Record<string, unknown> = {}
    data.columns.forEach((colName, idx) => {
      obj[colName] = row[idx]
    })
    return obj
  })

  return {
    rows: convertedRowData,
    columns: data.columns,
    totalCount: data.total_count
  }
}

// Initialize base AG Grid composable
const baseGrid = useBaseAGGridView({
  objectKey: computed(() => props.objectKey),
  connectionType,
  initialTotalRowCount: computed(() => props.approxRows || 0),
  fetchData,
  getRowId:
    !props.isView && editKeyColumns.value.length > 0
      ? (p: { data: Record<string, unknown> }) => makeRowId(p.data)
      : undefined,
  onFilterChanged: () => {
    resetExactCount()
  }
})

let resetExactCount = () => {}

function recreateDatasource() {
  const api = baseGrid.gridApi.value
  if (!api || api.isDestroyed()) return
  api.setGridOption('datasource', baseGrid.createDatasource())
}

const exactCount = useExactRowCount({
  objectKey: computed(() => props.objectKey),
  isView: computed(() => Boolean(props.isView)),
  approxRows: computed(() => props.approxRows),

  connectionId: computed(() => props.connectionId),
  database: computed(() => props.database),
  objectName: computed(() => getObjectName(props.tableMeta)),
  objectSchema: computed(() => getObjectSchema(props.tableMeta) || null),

  whereClause: baseGrid.whereClause,
  totalRowCount: baseGrid.totalRowCount,
  gridApi: baseGrid.gridApi,

  recreateDatasource,

  panelWhereSQL: baseGrid.panelWhereSQL,
  panelSortModel: baseGrid.panelSortModel,
  setPanelFilters: baseGrid.setPanelFilters,

  getCacheKey
})

exactRowCount = exactCount.exactRowCount
resetExactCount = exactCount.resetOnFilterChange

const isCountingRows = exactCount.isCountingRows
const countError = exactCount.countError
const isCountExact = exactCount.isCountExact
const calculateExactCount = exactCount.calculateExactCount

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

  connectionId: computed(() => props.connectionId),
  database: computed(() => props.database),
  objectName: computed(() => getObjectName(props.tableMeta)),
  objectSchema: computed(() => getObjectSchema(props.tableMeta) || null),

  onDeletedRowsApplied: exactCount.applyDeletedCount
})

watch(
  () => baseGrid.gridApi.value,
  (api) => {
    if (!api) return
    // Ensure pinned inserts show up even if staged before grid was ready.
    api.setGridOption('pinnedTopRowData', pinnedTopRowData.value)
  },
  { immediate: true }
)

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
  // Keep panel open and reset draft
  insertEditingId.value = null
  insertInitialValues.value = {}
  insertRowPanelOpen.value = true
}

function onRowClicked(event: { data?: Record<string, unknown> }) {
  const id = event.data?.__pendingInsertId
  if (typeof id !== 'string' || id.length === 0) return
  openInsertRowPanelForExisting(id)
}

function getEditedCellTooltip(rowId: string, field: string, dataType?: string): string | null {
  const edit = pendingEdits.value[rowId]
  if (!edit?.changes || !Object.prototype.hasOwnProperty.call(edit.changes, field)) return null

  const oldValue = formatTableValue(edit.original?.[field], dataType)
  const newValue = formatTableValue(edit.changes[field], dataType)
  return `Old: ${oldValue}\nNew: ${newValue}`
}

const rowChangeItems = computed(() => {
  const rowId = rowChangesRowId.value
  if (!rowId) return [] as Array<{ field: string; oldValue: string; newValue: string }>
  const edit = pendingEdits.value[rowId]
  if (!edit?.changes) return [] as Array<{ field: string; oldValue: string; newValue: string }>

  return Object.keys(edit.changes)
    .sort()
    .map((field) => {
      const dataType = columnMetaByName.value.get(field)?.dataType
      return {
        field,
        oldValue: formatTableValue(edit.original?.[field], dataType),
        newValue: formatTableValue(edit.changes[field], dataType)
      }
    })
})

function onCellClicked(event: { column?: { getColId: () => string }; node?: { id?: string } }) {
  const colId = event.column?.getColId?.()
  if (colId !== '__changes__') return
  const rowId = event.node?.id
  if (!rowId) return
  if (!pendingEdits.value[rowId]) return
  openRowChangesPanel(rowId)
}

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!hasUnsavedChanges.value) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => {
  // In browsers, custom dialogs can't reliably replace the native beforeunload prompt.
  // In Wails desktop mode, we use a styled confirm dialog via the backend close hook.
  if (!isWailsContext()) {
    window.addEventListener('beforeunload', onBeforeUnload)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)

  // Clear shared dirty state when this tab unmounts
  tabStateStore.setHasUnsavedChanges(props.objectKey, false)
})

// Publish dirty state for pane-tab switching guards
watch(
  hasUnsavedChanges,
  (dirty) => {
    tabStateStore.setHasUnsavedChanges(props.objectKey, dirty)
  },
  { immediate: true }
)

onBeforeRouteLeave(() => {
  if (!hasUnsavedChanges.value) return true
  return confirmDiscardUnsavedChanges({
    description: 'You have unsaved changes. Discard them and leave?'
  })
})

const { columnDefs } = useAgGridDataViewColumnDefs({
  columns: columnsForDefs,
  isTableEditable,
  editKeyColumns,
  pendingDeletes: pendingDeletes as unknown as typeof pendingDeletes,
  pendingEdits: pendingEdits as unknown as typeof pendingEdits,
  showChangesGutter,
  makeRowId,
  getEditedCellTooltip
})

watch(
  () => ({ api: baseGrid.gridApi.value, visible: showChangesGutter.value }),
  ({ api, visible }) => {
    if (!api) return
    api.setColumnsVisible(['__changes__'], visible)
  },
  { immediate: true }
)

// Database-specific clear all filters wrapper
function clearAllFilters() {
  // Use the base clearing
  baseGrid.clearAllFilters()

  exactCount.resetOnFilterChange()
}

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

  exactCount.resetOnFilterChange()
  recreateDatasource()
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

// Check if there's data available for export
const hasDataForExport = computed(() => {
  const api = baseGrid.gridApi.value
  if (!api) return false
  return baseGrid.totalRowCount.value > 0
})

const allColumnNames = computed(() => {
  const meta = props.tableMeta
  if (!meta?.columns) return []
  return meta.columns.map((c) => c.name)
})

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

  objectName: computed(() => getObjectName(props.tableMeta)),

  connectionId: computed(() => props.connectionId),
  database: computed(() => props.database),
  objectSchema: computed(() => getObjectSchema(props.tableMeta) || null),
  objectKey: computed(() => props.objectKey),
  dialect: connectionDialect
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
  revertContextCell,
  handleExport,
  handleStreamExport,
  isStreamExporting
} = selectionActions

// Expose methods to parent
defineExpose({
  refresh: baseGrid.refresh,
  getGridState: baseGrid.getGridState,
  applyGridState: baseGrid.applyGridState,
  filterPanelRef
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Toolbar with Filter Panel and Export -->
    <div class="flex flex-col">
      <!-- Data Filter Panel (replaces SQL Query Banner) -->
      <DataFilterPanel
        ref="filterPanelRef"
        :columns="columnDefs"
        :dialect="connectionDialect"
        :table-name="getObjectName(tableMeta)"
        :object-key="objectKey"
        @apply="onFilterPanelApply"
        @clear="clearAllFilters"
        @columns-change="onColumnsChange"
      />

      <!-- Grid Actions Toolbar (container for responsive badges) -->
      <div
        class="toolbar-container flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700"
      >
        <!-- Left side: Status badges -->
        <div class="flex items-center gap-2">
          <!-- Selection count -->
          <span
            v-if="baseGrid.selectedRowCount.value > 0"
            class="stat-badge stat-badge-gray"
            title="Selected rows"
          >
            {{ baseGrid.selectedRowCount.value }}
            <span class="badge-text">selected</span>
          </span>

          <!-- Read-only warning -->
          <span
            v-if="!isView && !isTableEditable"
            class="stat-badge stat-badge-amber"
            :title="editDisabledReason"
          >
            <span class="badge-text">Read-only</span>
            <span class="badge-text-short">RO</span>
          </span>

          <!-- Editable indicator -->
          <span
            v-else-if="!isView && isTableEditable"
            class="stat-badge stat-badge-teal"
            title="Double-click a cell to edit. Changes require Save."
          >
            <Check class="h-3 w-3" :stroke-width="iconStroke" />
            <span class="badge-text">Editable</span>
          </span>

          <!-- Edited count -->
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

          <!-- New count -->
          <span
            v-if="pendingInsertCount > 0"
            class="stat-badge stat-badge-sky"
            title="Rows staged for insert until Save"
          >
            <Plus class="h-3 w-3" :stroke-width="iconStroke" />
            {{ pendingInsertCount }}
            <span class="badge-text">new</span>
          </span>

          <!-- Deleted count -->
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

        <!-- Right side: Actions -->
        <div class="flex items-center gap-2">
          <button
            v-if="!isView && isTableEditable"
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

          <!-- Export dropdown -->
          <Menu v-if="hasDataForExport" as="div" class="relative">
            <MenuButton
              class="text-xs rounded-md px-2.5 py-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-1"
              :disabled="isStreamExporting"
            >
              <Download class="h-3.5 w-3.5" :stroke-width="iconStroke" />
              <span class="badge-text">Export</span>
              <ChevronDown class="h-3 w-3" :stroke-width="iconStroke" />
            </MenuButton>
            <transition
              enter-active-class="transition duration-100 ease-out"
              enter-from-class="transform scale-95 opacity-0"
              enter-to-class="transform scale-100 opacity-100"
              leave-active-class="transition duration-75 ease-in"
              leave-from-class="transform scale-100 opacity-100"
              leave-to-class="transform scale-95 opacity-0"
            >
              <MenuItems
                class="absolute right-0 mt-1 w-36 origin-top-right rounded-md bg-white dark:bg-gray-850 shadow-lg ring-1 ring-black/5 dark:ring-white/10 focus:outline-none z-50"
              >
                <div class="py-1">
                  <MenuItem v-slot="{ active }">
                    <button
                      :class="[
                        active ? 'bg-gray-100 dark:bg-gray-700' : '',
                        'w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200'
                      ]"
                      @click="handleExport('csv')"
                    >
                      CSV
                    </button>
                  </MenuItem>
                  <MenuItem v-slot="{ active }">
                    <button
                      :class="[
                        active ? 'bg-gray-100 dark:bg-gray-700' : '',
                        'w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200'
                      ]"
                      @click="handleExport('json')"
                    >
                      JSON
                    </button>
                  </MenuItem>
                  <MenuItem v-slot="{ active }">
                    <button
                      :class="[
                        active ? 'bg-gray-100 dark:bg-gray-700' : '',
                        'w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200'
                      ]"
                      @click="handleExport('excel')"
                    >
                      Excel
                    </button>
                  </MenuItem>
                  <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                  <MenuItem v-slot="{ active }">
                    <button
                      :class="[
                        active ? 'bg-gray-100 dark:bg-gray-700' : '',
                        'w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200',
                        isStreamExporting ? 'opacity-50 cursor-not-allowed' : ''
                      ]"
                      :disabled="isStreamExporting"
                      @click="handleStreamExport('csv')"
                    >
                      {{ isStreamExporting ? 'Exporting...' : 'Stream Export' }}
                    </button>
                  </MenuItem>
                </div>
              </MenuItems>
            </transition>
          </Menu>
        </div>
      </div>
    </div>

    <!-- Error message -->
    <div
      v-if="baseGrid.error.value"
      class="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md text-sm text-red-700 dark:text-red-300"
    >
      {{ baseGrid.error.value }}
    </div>

    <!-- AG Grid -->
    <div
      :ref="(el) => (baseGrid.gridContainerRef.value = el as HTMLElement)"
      class="ag-theme-alpine select-none"
      :style="{
        width: '100%',
        height: '750px'
      }"
    >
      <AgGridVue
        :columnDefs="columnDefs"
        :gridOptions="baseGrid.gridOptions.value"
        :rowClassRules="rowClassRules"
        style="width: 100%; height: 100%"
        @grid-ready="baseGrid.onGridReady"
        @row-clicked="onRowClicked"
        @cell-context-menu="openSelectionMenu"
        @cell-clicked="onCellClicked"
        @cell-value-changed="onCellValueChanged"
        @column-pinned="saveColumnState"
        @column-moved="saveColumnState"
        @column-resized="saveColumnState"
      />
    </div>

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
      :table-label="getObjectName(tableMeta)"
      :columns="tableMeta.columns"
      :initial-values="insertInitialValues"
      :existing-insert-id="insertEditingId"
      @close="closeInsertRowPanel"
      @insert="onInsertRow"
      @insert-and-add-another="onInsertRowAndAddAnother"
    />

    <AGGridRowCountControls
      :is-view="Boolean(isView)"
      :total-row-count="baseGrid.totalRowCount.value"
      :is-count-exact="isCountExact"
      :count-error="countError"
      :is-counting="isCountingRows"
      @calculate="calculateExactCount"
    />

    <!-- Custom Context Menu -->
    <ColumnContextMenu
      v-if="baseGrid.showContextMenu.value"
      :x="baseGrid.contextMenuX.value"
      :y="baseGrid.contextMenuY.value"
      :column="baseGrid.contextMenuColumn.value"
      :grid-api="baseGrid.gridApi.value"
      @close="baseGrid.closeContextMenu"
    />
  </div>
</template>

<style scoped>
:deep(.ag-cell-wrap-text) {
  white-space: normal;
  line-height: 1.5;
  padding: 8px;
}

/* Pending delete: just a subtle red tint + strike-through (no gutter/dots) */
:deep(.ag-row.row-pending-delete),
:deep(.ag-row.row-pending-delete .ag-cell) {
  background-color: rgba(220, 38, 38, 0.06);
}

/* Pending insert: sky tint (no left border for consistency with other row types) */
:deep(.ag-row.row-pending-insert),
:deep(.ag-row.row-pending-insert .ag-cell) {
  background-color: rgba(14, 165, 233, 0.1); /* sky-500/10 */
}

:deep(.ag-row.row-pending-delete .ag-cell),
:deep(.ag-row.row-pending-delete .ag-cell-value) {
  text-decoration: line-through;
}

/* Pending edit: highlight edited cells and show old/new values */
:deep(.ag-cell.cell-pending-edit) {
  background-color: rgba(13, 148, 136, 0.08); /* teal tint */
  box-shadow: inset 0 0 0 1px rgba(13, 148, 136, 0.9);
}

/* Row change gutter - clickable indicator */
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

/* When the row is selected, keep selection background and only show the edited outline */
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

/* Show full text on wider containers (> 700px) */
@container toolbar (min-width: 700px) {
  .badge-text {
    display: inline;
  }
  .badge-text-short {
    display: none;
  }
}

/* Status badge styles */
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

/* Dark mode badge styles (class-based dark mode) */
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
