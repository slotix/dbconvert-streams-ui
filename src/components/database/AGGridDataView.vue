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
import ExportToolbar from '@/components/common/ExportToolbar.vue'
import SelectionContextMenu from '@/components/common/SelectionContextMenu.vue'
import { getConnectionTypeLabel, getSqlDialectFromConnection } from '@/types/specs'
import {
  useBaseAGGridView,
  type FetchDataParams,
  type FetchDataResult
} from '@/composables/useBaseAGGridView'

import { useAgGridDataViewColumnDefs } from '@/composables/useAgGridDataViewColumnDefs'
import AGGridRowChangesPanel from '@/components/database/aggrid/AGGridRowChangesPanel.vue'
import AGGridRowCountControls from '@/components/database/aggrid/AGGridRowCountControls.vue'
import { useAgGridRowChangeTracking } from '@/composables/useAgGridRowChangeTracking'
import { useExactRowCount } from '@/composables/useExactRowCount'
import { useAgGridSelectionActions } from '@/composables/useAgGridSelectionActions'

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

const rowChangesPanelOpen = ref(false)
const rowChangesRowId = ref<string | null>(null)

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
  const out = new Map<string, { dataType?: string; isNullable?: boolean; scale?: number }>()
  for (const c of meta?.columns || []) {
    const scale = c.scale?.Valid ? Number(c.scale.Int64 ?? 0) : undefined
    out.set(c.name, { dataType: c.dataType, isNullable: c.isNullable, scale })
  }
  return out
})

function openRowChangesPanel(rowId: string) {
  rowChangesRowId.value = rowId
  rowChangesPanelOpen.value = true
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
  pendingEditCount,
  pendingDeleteCount,
  showChangesGutter,
  hasUnsavedChanges,
  rowClassRules,
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

      <!-- Grid Actions Toolbar -->
      <div
        class="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700"
      >
        <div class="flex items-center gap-3">
          <span class="text-xs text-gray-500 dark:text-gray-400">
            {{
              baseGrid.selectedRowCount.value > 0
                ? `${baseGrid.selectedRowCount.value} selected`
                : 'Select rows to copy'
            }}
          </span>

          <span
            v-if="!isView && !isTableEditable"
            class="text-xs text-amber-700 dark:text-amber-300"
            :title="editDisabledReason"
          >
            Read-only: {{ editDisabledReason }}
          </span>

          <span
            v-else-if="!isView && isTableEditable"
            class="text-xs text-teal-700 dark:text-teal-300"
            title="Double-click a cell to edit. Changes require Save."
          >
            Editable
          </span>

          <span v-if="pendingEditCount > 0" class="text-xs text-teal-700 dark:text-teal-300">
            {{ pendingEditCount }} row{{ pendingEditCount === 1 ? '' : 's' }} edited
          </span>

          <span
            v-if="pendingDeleteCount > 0"
            class="text-xs text-red-600 dark:text-red-400"
            title="Rows are staged for deletion until Save"
          >
            {{ pendingDeleteCount }} row{{ pendingDeleteCount === 1 ? '' : 's' }} deleted
          </span>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 dark:text-gray-400">Right-click for actions</span>

          <div class="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700"></div>

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

          <ExportToolbar
            v-if="hasDataForExport"
            :show-stream-export="true"
            :is-exporting="isStreamExporting"
            @export="handleExport"
            @stream-export="handleStreamExport"
          />
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

:deep(.ag-row.row-pending-delete .ag-cell),
:deep(.ag-row.row-pending-delete .ag-cell-value) {
  text-decoration: line-through;
}

/* Pending edit: highlight edited cells and show old/new values */
:deep(.ag-cell.cell-pending-edit) {
  background-color: rgba(13, 148, 136, 0.08); /* teal tint */
  box-shadow: inset 0 0 0 1px rgba(13, 148, 136, 0.9);
}

/* Row change gutter (DataGrip-style summary trigger) */
:deep(.ag-cell.row-change-gutter) {
  display: flex;
  align-items: center;
  padding-left: 10px;
  padding-right: 6px;
}

:deep(.ag-cell.row-change-gutter .row-change-badge) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
}

:deep(.ag-cell.row-change-gutter .row-change-dot) {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background-color: rgb(13 148 136);
  box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.16);
}

:deep(.ag-cell.row-change-gutter .row-change-count) {
  min-width: 18px;
  height: 16px;
  padding: 0 6px;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  line-height: 1;
  color: rgb(13 148 136);
  background-color: rgba(13, 148, 136, 0.12);
  border: 1px solid rgba(13, 148, 136, 0.28);
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

  :deep(.ag-cell.cell-pending-edit) {
    background-color: rgba(45, 212, 191, 0.14);
    box-shadow: inset 0 0 0 1px rgba(45, 212, 191, 0.95);
  }

  :deep(.ag-cell.row-change-gutter .row-change-badge) {
    color: rgb(45 212 191);
  }

  :deep(.ag-cell.row-change-gutter .row-change-dot) {
    background-color: rgb(45 212 191);
    box-shadow: 0 0 0 2px rgba(45, 212, 191, 0.18);
  }

  :deep(.ag-cell.row-change-gutter .row-change-count) {
    color: rgb(45 212 191);
    background-color: rgba(45, 212, 191, 0.14);
    border: 1px solid rgba(45, 212, 191, 0.28);
  }

  :deep(.ag-row.ag-row-selected .ag-cell.cell-pending-edit) {
    background-color: transparent;
    box-shadow: inset 0 0 0 2px rgba(45, 212, 191, 1);
  }
}
</style>
