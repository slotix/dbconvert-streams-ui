<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { AgGridVue } from 'ag-grid-vue3'
import type { ColDef } from 'ag-grid-community'
import { type SQLTableMeta, type SQLViewMeta } from '@/types/metadata'
import connections from '@/api/connections'
import { formatTableValue } from '@/utils/dataUtils'
import { useCopyToClipboard } from '@/composables/useCopyToClipboard'
import { formatRowsForClipboard, type CopyFormat } from '@/utils/agGridClipboard'
import { useToast } from 'vue-toastification'
import { useObjectTabStateStore } from '@/stores/objectTabState'
import { useConnectionsStore } from '@/stores/connections'
import { useConfirmDialogStore } from '@/stores/confirmDialog'
import { isWailsContext } from '@/composables/useWailsEvents'
import ColumnContextMenu from './ColumnContextMenu.vue'
import DataFilterPanel from './DataFilterPanel.vue'
import ExportToolbar from '@/components/common/ExportToolbar.vue'
import SelectionContextMenu from '@/components/common/SelectionContextMenu.vue'
import { exportData, type ExportFormat } from '@/composables/useDataExport'
import { useStreamExport, type StreamExportFormat } from '@/composables/useStreamExport'
import { getConnectionTypeLabel, getSqlDialectFromConnection } from '@/types/specs'
import {
  useBaseAGGridView,
  type FetchDataParams,
  type FetchDataResult
} from '@/composables/useBaseAGGridView'

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

const confirmDialog = useConfirmDialogStore()

const selectionMenuOpen = ref(false)
const selectionMenuX = ref(0)
const selectionMenuY = ref(0)

type PendingEdit = {
  keys: Record<string, unknown>
  changes: Record<string, unknown>
  original: Record<string, unknown>
}

const pendingEdits = ref<Record<string, PendingEdit>>({})
const pendingEditCount = computed(() => Object.keys(pendingEdits.value).length)

const hasUnsavedChanges = computed(() => pendingEditCount.value > 0)

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
  return confirmDialog.confirm({
    title: 'Unsaved changes',
    description: 'You have unsaved changes. Discard them and leave?',
    confirmLabel: 'Discard changes',
    cancelLabel: 'Stay',
    danger: true
  })
})

// Exact row count state for views
const isCountingRows = ref(false)
const exactRowCount = ref<number | null>(null)
const countError = ref<string | null>(null)

// Cache for exact counts (persists across table switches within same context)
const exactCountCache = ref<Map<string, number>>(new Map())

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

function valuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return String(a) === String(b)
  }
}

type ColumnEditorKind = 'integer' | 'number' | 'date' | 'datetime' | 'text'

function normalizeSqlType(sqlType: string): string {
  return sqlType.trim().toLowerCase()
}

function inferEditorKind(sqlType: string): ColumnEditorKind {
  const t = normalizeSqlType(sqlType)

  // Common numeric families across MySQL/Postgres/Snowflake.
  if (t.includes('int') || t.includes('serial')) return 'integer'
  if (
    t.includes('decimal') ||
    t.includes('numeric') ||
    t.includes('number') ||
    t.includes('float') ||
    t.includes('double') ||
    t.includes('real')
  ) {
    return 'number'
  }

  // Date/time.
  if (t === 'date' || t.startsWith('date(')) return 'date'
  if (t.includes('timestamp') || t.includes('datetime') || t.includes('timestamptz'))
    return 'datetime'

  return 'text'
}

function emptyToNullIfNullable(value: unknown, isNullable: boolean): unknown {
  if (!isNullable) return value
  if (value === '' || value === null || value === undefined) return null
  return value
}

function parseNumberInput(raw: unknown, kind: 'integer' | 'number', isNullable: boolean): unknown {
  const normalized = emptyToNullIfNullable(raw, isNullable)
  if (normalized === null) return null
  if (typeof normalized === 'number') return normalized

  const s = String(normalized).trim()
  if (s === '') return isNullable ? null : raw

  const n = kind === 'integer' ? Number.parseInt(s, 10) : Number.parseFloat(s)
  if (Number.isNaN(n)) return raw
  return n
}

function normalizeDateString(raw: unknown, isNullable: boolean): unknown {
  const normalized = emptyToNullIfNullable(raw, isNullable)
  if (normalized === null) return null
  const s = String(normalized).trim()
  if (s === '') return isNullable ? null : raw

  // Best-effort: accept YYYY-MM-DD or ISO timestamps and keep YYYY-MM-DD.
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : s
}

function normalizeDateTimeString(raw: unknown, isNullable: boolean): unknown {
  const normalized = emptyToNullIfNullable(raw, isNullable)
  if (normalized === null) return null
  const s = String(normalized).trim()
  if (s === '') return isNullable ? null : raw

  // Accept common inputs and normalize to "YYYY-MM-DD HH:mm:ss".
  // - "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss" -> space + ensure seconds
  // - "YYYY-MM-DD HH:mm" or "YYYY-MM-DD HH:mm:ss" -> ensure seconds
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
    const [datePart, timePartRaw] = s.split('T')
    const timePart = timePartRaw?.slice(0, 8) || ''
    const withSeconds = timePart.length === 5 ? `${timePart}:00` : timePart
    return withSeconds ? `${datePart} ${withSeconds}` : s
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) {
    const [datePart, timePartRaw] = s.split(' ')
    const timePart = timePartRaw?.slice(0, 8) || ''
    const withSeconds = timePart.length === 5 ? `${timePart}:00` : timePart
    return withSeconds ? `${datePart} ${withSeconds}` : s
  }

  return s
}

// Generate column definitions from table metadata
// Note: sortable and filter are disabled - Query Filter Panel is the single source of truth
const columnDefs = computed<ColDef[]>(() => {
  const meta = props.tableMeta
  if (!meta || !meta.columns) return []

  const editable = isTableEditable.value
  const keyCols = new Set(editKeyColumns.value)

  return meta.columns.map((col) => {
    const kind = inferEditorKind(col.dataType)
    const isKey = keyCols.has(col.name)
    const isCellEditable = editable && !isKey

    const valueParser = (p: { newValue: unknown; oldValue: unknown }) => {
      switch (kind) {
        case 'integer':
        case 'number':
          return parseNumberInput(p.newValue, kind, col.isNullable)
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
      if (kind === 'integer' || kind === 'number') return 'agNumberCellEditor'
      if (kind === 'date') return 'agDateStringCellEditor'
      return 'agTextCellEditor'
    })()

    const cellEditorParams = (() => {
      if (kind !== 'integer' && kind !== 'number') return undefined
      const scale = col.scale?.Valid ? Number(col.scale.Int64 ?? 0) : 0
      const step = kind === 'integer' ? 1 : scale > 0 ? 1 / Math.pow(10, scale) : 1
      return {
        step
      }
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
      valueFormatter: (params) => formatTableValue(params.value),
      headerTooltip: `${col.dataType}${col.isNullable ? '' : ' NOT NULL'} - Use Query Filter panel to sort/filter`,
      wrapText: false,
      autoHeight: false,
      editable: isCellEditable,
      cellClass: isCellEditable ? 'ag-cell-editable' : undefined,
      valueParser,
      cellEditor,
      cellEditorParams
    }
  })
})

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
    // Reset exact count for views when filters change
    exactRowCount.value = null
    countError.value = null
  }
})

function onCellValueChanged(event: {
  data: Record<string, unknown>
  colDef: { field?: string }
  oldValue: unknown
  newValue: unknown
}) {
  if (!isTableEditable.value) return
  const field = event.colDef.field
  if (!field) return
  if (editKeyColumns.value.includes(field)) return

  const row = event.data
  const rowId = makeRowId(row)

  const current = pendingEdits.value[rowId]
  const original = current?.original
    ? current.original
    : (() => {
        const snapshot = { ...row }
        snapshot[field] = event.oldValue
        return snapshot
      })()

  const nextChanges = { ...(current?.changes || {}) }
  if (valuesEqual(original[field], event.newValue)) {
    delete nextChanges[field]
  } else {
    nextChanges[field] = event.newValue
  }

  if (Object.keys(nextChanges).length === 0) {
    const next = { ...pendingEdits.value }
    delete next[rowId]
    pendingEdits.value = next
    return
  }

  pendingEdits.value = {
    ...pendingEdits.value,
    [rowId]: {
      keys: current?.keys || getKeyValues(row),
      changes: nextChanges,
      original
    }
  }
}

function cancelEdits() {
  const api = baseGrid.gridApi.value
  if (api) {
    api.stopEditing(true)
    for (const [rowId, edit] of Object.entries(pendingEdits.value)) {
      const node = api.getRowNode(rowId)
      if (node) {
        node.setData(edit.original)
      }
    }
  }
  pendingEdits.value = {}
}

async function saveEdits() {
  const api = baseGrid.gridApi.value
  if (!api) return
  if (!isTableEditable.value) return

  const objectName = getObjectName(props.tableMeta)
  const objectSchema = getObjectSchema(props.tableMeta)

  const entries = Object.entries(pendingEdits.value)
  if (entries.length === 0) return

  try {
    const resp = await connections.updateTableRows(props.connectionId, props.database, objectName, {
      schema: objectSchema || undefined,
      edits: entries.map(([, edit]) => ({ keys: edit.keys, changes: edit.changes }))
    })

    if (!resp.rows || resp.rows.length !== entries.length) {
      throw new Error('Unexpected response from server')
    }

    for (let i = 0; i < entries.length; i++) {
      const [rowId] = entries[i]
      const row = resp.rows[i]
      const node = api.getRowNode(rowId)
      if (node && row) {
        node.setData(row)
      }
    }

    pendingEdits.value = {}
    toast.success('Saved')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to save edits'
    toast.error(msg)
  }
}

async function deleteSelectedRows() {
  const api = baseGrid.gridApi.value
  if (!api) return
  if (!isTableEditable.value) return
  if (baseGrid.selectedRowCount.value === 0) {
    toast.info('Select one or more rows to delete')
    return
  }

  const selectedRows = baseGrid.selectedRows.value
  const deletes = selectedRows.map((row) => ({ keys: getKeyValues(row) }))
  const rowCount = deletes.length

  const confirmed = await confirmDialog.confirm({
    title: 'Delete rows',
    description: `Are you sure you want to delete ${rowCount} row${rowCount === 1 ? '' : 's'}? This action cannot be undone.`,
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    danger: true
  })

  if (!confirmed) return

  try {
    const objectName = getObjectName(props.tableMeta)
    const objectSchema = getObjectSchema(props.tableMeta)

    const resp = await connections.deleteTableRows(props.connectionId, props.database, objectName, {
      schema: objectSchema || undefined,
      deletes
    })

    toast.success(`Deleted ${resp.deleted} row${resp.deleted === 1 ? '' : 's'}`)

    api.deselectAll()

    if (baseGrid.totalRowCount.value > 0) {
      baseGrid.totalRowCount.value = Math.max(0, baseGrid.totalRowCount.value - resp.deleted)
    }
    if (exactRowCount.value !== null) {
      exactRowCount.value = Math.max(0, exactRowCount.value - resp.deleted)
    }

    api.purgeInfiniteCache()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to delete rows'
    toast.error(msg)
  }
}

// Determine if the current count is exact (vs approximate)
// Count is exact if:
// 1. User manually calculated it (exactRowCount is set), OR
// 2. Backend auto-calculated it for small tables (≤10k rows)
const isCountExact = computed(() => {
  if (exactRowCount.value !== null) return true // User manually calculated
  if (props.approxRows && props.approxRows <= 10000) return true // Backend auto-calculated
  return false
})

// Watch for approxRows prop changes and update totalRowCount
// Only update if we don't have an exact count saved
watch(
  () => props.approxRows,
  (newApproxRows) => {
    // Check if we have a saved exact count - if so, don't overwrite with approx
    const savedState = tabStateStore.getAGGridDataState(props.objectKey)

    if (savedState && savedState.exactRowCount !== null) {
      // Use the saved exact count
      baseGrid.totalRowCount.value = savedState.exactRowCount
      exactRowCount.value = savedState.exactRowCount
      return
    }

    // Otherwise use approxRows
    if (newApproxRows && newApproxRows > 0) {
      baseGrid.totalRowCount.value = newApproxRows
    } else if (newApproxRows === -1) {
      // -1 indicates unknown count (for views)
      baseGrid.totalRowCount.value = -1
    } else if (newApproxRows === undefined) {
      // Reset count when switching to a table not in top tables list
      baseGrid.totalRowCount.value = 0
    }

    // Recreate datasource so AG Grid knows about the updated totalRowCount
    if (baseGrid.gridApi.value && !baseGrid.gridApi.value.isDestroyed()) {
      baseGrid.gridApi.value.setGridOption('datasource', baseGrid.createDatasource())
    }
  },
  { immediate: true }
)

// Watch for table changes and restore state from store or reset
watch(
  () => props.tableMeta,
  () => {
    const savedState = tabStateStore.getAGGridDataState(props.objectKey)

    if (savedState) {
      // Restore state from store
      exactRowCount.value = savedState.exactRowCount || null

      // Restore panel filters if saved
      if (savedState.panelWhereSQL || (savedState.sortModel && savedState.sortModel.length > 0)) {
        baseGrid.setPanelFilters(savedState.panelWhereSQL || '', savedState.sortModel || [])
      }
    } else {
      // Reset to default state
      countError.value = null

      // Check if we have a cached exact count for this table
      const cacheKey = getCacheKey()
      const cachedCount = exactCountCache.value.get(cacheKey)
      if (cachedCount !== undefined) {
        exactRowCount.value = cachedCount
        baseGrid.totalRowCount.value = cachedCount
      } else {
        exactRowCount.value = null
      }
    }

    // Recreate datasource to ensure AG Grid knows about the (potentially updated) totalRowCount
    if (baseGrid.gridApi.value) {
      baseGrid.gridApi.value.setGridOption('datasource', baseGrid.createDatasource())
    }
  },
  { deep: true }
)

// Auto-calculate exact count when backend returns unknown count (-1)
// and no filters/limits are applied
watch(
  () => baseGrid.totalRowCount.value,
  (newCount) => {
    // Auto-calculate exact count if:
    // 1. Backend returned -1 (unknown count)
    // 2. We don't have an exact count yet
    // 3. No WHERE clause is applied (baseGrid.whereClause is empty)
    // 4. Not currently counting
    // 5. No error from previous count attempt
    if (
      newCount === -1 &&
      exactRowCount.value === null &&
      !baseGrid.whereClause.value &&
      !isCountingRows.value &&
      !countError.value
    ) {
      // Automatically calculate exact count for better UX
      // This avoids showing "1 to 20 of more" when we can get the exact count
      calculateExactCount()
    }
  }
)

// Save exact row count to store when it changes
watch(
  () => exactRowCount.value,
  (exactCount) => {
    tabStateStore.setAGGridDataState(props.objectKey, {
      sortModel: baseGrid.panelSortModel.value,
      panelWhereSQL: baseGrid.panelWhereSQL.value,
      filterModel: {},
      totalRowCount: baseGrid.totalRowCount.value,
      exactRowCount: exactCount
    })
  }
)

// Calculate exact row count for tables and views (on-demand)
async function calculateExactCount() {
  isCountingRows.value = true
  countError.value = null

  try {
    const objectName = getObjectName(props.tableMeta)
    const objectSchema = getObjectSchema(props.tableMeta)

    if (!objectName) throw new Error(`${props.isView ? 'View' : 'Table'} name is undefined`)

    // Build parameters
    const params: { schema?: string; where?: string; tabId?: string } = {}
    if (objectSchema && objectSchema !== 'public' && objectSchema !== '') {
      params.schema = objectSchema
    }
    if (baseGrid.whereClause.value) {
      params.where = baseGrid.whereClause.value
    }
    params.tabId = objectName

    // Call appropriate API based on whether it's a view or table
    const result = props.isView
      ? await connections.getViewExactCount(props.connectionId, props.database, objectName, params)
      : await connections.getTableExactCount(props.connectionId, props.database, objectName, params)

    exactRowCount.value = result.count
    baseGrid.totalRowCount.value = result.count

    // Cache the exact count (only if no filters applied)
    if (!baseGrid.whereClause.value) {
      const cacheKey = getCacheKey()
      exactCountCache.value.set(cacheKey, result.count)
    }

    // Trigger cache purge to immediately update pagination
    if (baseGrid.gridApi.value) {
      baseGrid.gridApi.value.purgeInfiniteCache()
    }
  } catch (err) {
    console.error('Error calculating exact count:', err)
    countError.value = err instanceof Error ? err.message : 'Failed to calculate count'
  } finally {
    isCountingRows.value = false
  }
}

// Database-specific clear all filters wrapper
function clearAllFilters() {
  // Use the base clearing
  baseGrid.clearAllFilters()

  // Reset exact count for views
  exactRowCount.value = null
  countError.value = null
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

  // Reset exact count since filters changed
  exactRowCount.value = null
  countError.value = null

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

// Initialize and restore state on mount
onMounted(() => {
  const savedState = tabStateStore.getAGGridDataState(props.objectKey)

  if (savedState) {
    // Restore exact row count
    exactRowCount.value = savedState.exactRowCount || null
  }
})

// Export visible grid data
function getVisibleData(): { columns: string[]; rows: Record<string, unknown>[] } {
  const api = baseGrid.gridApi.value
  if (!api) return { columns: [], rows: [] }

  const columns: string[] = []
  const displayedColumns = api.getAllDisplayedColumns()
  for (const col of displayedColumns) {
    const colId = col.getColId()
    if (colId) columns.push(colId)
  }

  const rows: Record<string, unknown>[] = []
  // Get rows from current page
  const pageSize = api.paginationGetPageSize()
  const currentPage = api.paginationGetCurrentPage()
  const startRow = currentPage * pageSize
  const endRow = startRow + pageSize

  for (let i = startRow; i < endRow; i++) {
    const node = api.getDisplayedRowAtIndex(i)
    if (node && node.data) {
      rows.push(node.data)
    }
  }

  return { columns, rows }
}

// Handle export request
function handleExport(format: ExportFormat) {
  const { columns, rows } = getVisibleData()
  if (rows.length === 0) {
    console.warn('No data to export')
    return
  }

  const objectName = getObjectName(props.tableMeta)
  exportData(format, {
    columns,
    rows,
    filename: objectName || 'table-data',
    tableName: objectName
  })
}

// Stream export for full table
const { exportTable, isExporting: isStreamExporting } = useStreamExport()

// Handle stream export request (full table via stream)
async function handleStreamExport(format: StreamExportFormat) {
  const objectName = getObjectName(props.tableMeta)
  const objectSchema = getObjectSchema(props.tableMeta)

  await exportTable({
    connectionId: props.connectionId,
    database: props.database,
    schema: objectSchema || undefined,
    table: objectName,
    format,
    objectKey: props.objectKey,
    dialect: connectionDialect.value
  })
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

const canCopySelection = computed(() => baseGrid.selectedRowCount.value > 0)

function openSelectionMenu(event: unknown) {
  // AG Grid passes a complex event object; the native mouse event is at event.event.
  const nativeEvent = (event as { event?: MouseEvent }).event
  if (!nativeEvent) return
  nativeEvent.preventDefault()
  nativeEvent.stopPropagation()

  selectionMenuX.value = nativeEvent.clientX
  selectionMenuY.value = nativeEvent.clientY
  selectionMenuOpen.value = true
}

function selectAllOnCurrentPage() {
  const api = baseGrid.gridApi.value
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
  baseGrid.gridApi.value?.deselectAll()
}

async function copySelectedRows(format: CopyFormat) {
  const api = baseGrid.gridApi.value
  if (!api) return

  if (baseGrid.selectedRowCount.value === 0) {
    toast.info('Select one or more rows to copy')
    return
  }

  const columns = allColumnNames.value

  const text = formatRowsForClipboard({
    rows: baseGrid.selectedRows.value,
    columns,
    format
  })

  const ok = await copyToClipboard(text)
  if (!ok) {
    toast.error('Failed to copy to clipboard')
    return
  }

  toast.success('Copied')
}

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
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 dark:text-gray-400">Right-click for actions</span>

          <div class="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700"></div>

          <template v-if="pendingEditCount > 0">
            <button
              type="button"
              class="text-xs rounded-md px-2.5 py-1 border border-teal-600 bg-teal-600 text-white hover:bg-teal-700 hover:border-teal-700 disabled:opacity-50 disabled:cursor-not-allowed dark:border-teal-500 dark:bg-teal-600 dark:hover:bg-teal-700"
              title="Save pending edits"
              @click="saveEdits"
            >
              Save
            </button>
            <button
              type="button"
              class="text-xs rounded-md px-2.5 py-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Discard pending edits"
              @click="cancelEdits"
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
        style="width: 100%; height: 100%"
        @grid-ready="baseGrid.onGridReady"
        @cell-context-menu="openSelectionMenu"
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
      @close="selectionMenuOpen = false"
      @select-all="selectAllOnCurrentPage"
      @deselect-all="deselectAll"
      @copy="copySelectedRows"
      @delete="deleteSelectedRows"
    />

    <!-- Row count controls below table -->
    <div class="mt-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <!-- Approximate count hint -->
        <span
          v-if="!isView && baseGrid.totalRowCount.value > 0 && !isCountExact"
          class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"
        >
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clip-rule="evenodd"
            />
          </svg>
          <span>Count (~{{ baseGrid.totalRowCount.value.toLocaleString() }}) is approximate</span>
        </span>

        <!-- Error display -->
        <span
          v-if="countError"
          class="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          {{ countError }}
        </span>
      </div>

      <!-- Calculate Exact Count link -->
      <button
        v-if="!isCountExact"
        type="button"
        :disabled="isCountingRows"
        class="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-800/30 rounded-full px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 w-fit"
        :title="`Execute COUNT(*) query to get exact ${isView ? 'row' : 'total'} count`"
        @click="calculateExactCount"
      >
        <svg
          v-if="!isCountingRows"
          class="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
        <svg v-else class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
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
        <span>{{ isCountingRows ? 'Counting...' : 'Calculate exact count' }}</span>
      </button>
    </div>

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
</style>
