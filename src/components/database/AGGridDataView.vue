<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { AgGridVue } from 'ag-grid-vue3'
import type { ColDef, ITooltipParams, ValueFormatterParams } from 'ag-grid-community'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { X } from 'lucide-vue-next'
import { type SQLTableMeta, type SQLViewMeta } from '@/types/metadata'
import connections from '@/api/connections'
import { formatTableValue } from '@/utils/dataUtils'
import { useCopyToClipboard } from '@/composables/useCopyToClipboard'
import { formatRowsForClipboard, type CopyFormat } from '@/utils/agGridClipboard'
import { useToast } from 'vue-toastification'
import { useObjectTabStateStore } from '@/stores/objectTabState'
import { useConnectionsStore } from '@/stores/connections'
import { useConfirmDialogStore } from '@/stores/confirmDialog'
import { useLucideIcons } from '@/composables/useLucideIcons'
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
const { strokeWidth: iconStroke } = useLucideIcons()

const confirmDialog = useConfirmDialogStore()

const selectionMenuOpen = ref(false)
const selectionMenuX = ref(0)
const selectionMenuY = ref(0)

const contextRowId = ref<string | null>(null)
const contextField = ref<string | null>(null)

const rowChangesPanelOpen = ref(false)
const rowChangesRowId = ref<string | null>(null)

type PendingEdit = {
  keys: Record<string, unknown>
  changes: Record<string, unknown>
  original: Record<string, unknown>
}

type PendingDelete = {
  keys: Record<string, unknown>
  original: Record<string, unknown>
}

const pendingEdits = ref<Record<string, PendingEdit>>({})
const pendingDeletes = ref<Record<string, PendingDelete>>({})

const pendingEditCount = computed(() => Object.keys(pendingEdits.value).length)
const pendingDeleteCount = computed(() => Object.keys(pendingDeletes.value).length)

const showChangesGutter = computed(() => pendingEditCount.value > 0)

const hasUnsavedChanges = computed(() => pendingEditCount.value > 0 || pendingDeleteCount.value > 0)

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

function isRowPendingDelete(rowId: string | undefined): boolean {
  if (!rowId) return false
  return Boolean(pendingDeletes.value[rowId])
}

const rowClassRules = computed(() => ({
  'row-pending-delete': (params: { node?: { id?: string } }) => isRowPendingDelete(params.node?.id)
}))

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

function getEditedCellTooltip(rowId: string, field: string, dataType?: string): string | null {
  const edit = pendingEdits.value[rowId]
  if (!edit?.changes || !Object.prototype.hasOwnProperty.call(edit.changes, field)) return null

  const oldValue = formatTableValue(edit.original?.[field], dataType)
  const newValue = formatTableValue(edit.changes[field], dataType)
  return `Old: ${oldValue}\nNew: ${newValue}`
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

function isNumericType(sqlType: string | undefined): boolean {
  if (!sqlType) return false
  const t = normalizeSqlType(sqlType)
  return (
    t.includes('decimal') ||
    t.includes('numeric') ||
    t.includes('number') ||
    t.includes('float') ||
    t.includes('double') ||
    t.includes('real')
  )
}

function numbersEqual(a: unknown, b: unknown, scale?: number): boolean {
  if (a === null || a === undefined) return b === null || b === undefined
  if (b === null || b === undefined) return false

  const toNum = (v: unknown): number | null => {
    if (typeof v === 'number') return v
    const s = String(v).trim().replace(',', '.')
    if (s === '') return null
    const n = Number.parseFloat(s)
    return Number.isNaN(n) ? null : n
  }

  const na = toNum(a)
  const nb = toNum(b)
  if (na === null || nb === null) return false

  if (typeof scale === 'number' && scale >= 0) {
    const factor = Math.pow(10, scale)
    return Math.round(na * factor) === Math.round(nb * factor)
  }

  return Object.is(na, nb)
}

function valuesEqualForField(field: string, a: unknown, b: unknown): boolean {
  const meta = columnMetaByName.value.get(field)
  if (isNumericType(meta?.dataType)) return numbersEqual(a, b, meta?.scale)
  return valuesEqual(a, b)
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

function openRowChangesPanel(rowId: string) {
  rowChangesRowId.value = rowId
  rowChangesPanelOpen.value = true
}

function closeRowChangesPanel() {
  rowChangesPanelOpen.value = false
  rowChangesRowId.value = null
}

function revertRowField(rowId: string, field: string) {
  const api = baseGrid.gridApi.value
  if (!api) return
  if (!isTableEditable.value) return
  const edit = pendingEdits.value[rowId]
  if (!edit?.changes || !Object.prototype.hasOwnProperty.call(edit.changes, field)) return

  const node = api.getRowNode(rowId)
  if (!node) return

  node.setDataValue(field, edit.original?.[field])
  api.refreshCells({ rowNodes: [node], columns: [field], force: true })
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

function parseNumberInput(
  raw: unknown,
  kind: 'integer' | 'number',
  isNullable: boolean,
  oldValue: unknown,
  scale?: number
): unknown {
  const normalized = emptyToNullIfNullable(raw, isNullable)
  if (normalized === null) return null
  if (typeof normalized === 'number') {
    if (kind === 'integer') return normalized
    if (typeof scale === 'number' && scale >= 0) {
      const factor = Math.pow(10, scale)
      return Math.round(normalized * factor) / factor
    }
    return normalized
  }

  const s = String(normalized).trim().replace(',', '.')

  // If the editor gives us an empty/invalid string for a NOT NULL column, keep the old value
  // rather than turning the cell into an empty string.
  if (s === '') return isNullable ? null : oldValue

  // Avoid transient invalid states that can happen mid-edit.
  if (s === '-' || s === '+' || s === '.' || s === '-.' || s === '+.') return oldValue

  const n = kind === 'integer' ? Number.parseInt(s, 10) : Number.parseFloat(s)
  if (Number.isNaN(n)) return oldValue

  if (kind === 'number' && typeof scale === 'number' && scale >= 0) {
    const factor = Math.pow(10, scale)
    return Math.round(n * factor) / factor
  }

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

  const dataCols = meta.columns.map((col) => {
    const kind = inferEditorKind(col.dataType)
    const isKey = keyCols.has(col.name)
    const isCellEditable = editable && !isKey

    const scale = col.scale?.Valid ? Number(col.scale.Int64 ?? 0) : undefined

    const valueParser = (p: { newValue: unknown; oldValue: unknown }) => {
      switch (kind) {
        case 'integer':
        case 'number':
          return parseNumberInput(p.newValue, kind, col.isNullable, p.oldValue, scale)
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
        return getEditedCellTooltip(rowId, field, col.dataType) || undefined
      },
      headerTooltip: `${col.dataType}${col.isNullable ? '' : ' NOT NULL'} - Use Query Filter panel to sort/filter`,
      wrapText: false,
      autoHeight: false,
      editable: (p: { data: Record<string, unknown> }) => {
        if (!isCellEditable) return false
        const rowId = makeRowId(p.data)
        return !pendingDeletes.value[rowId]
      },
      cellClass: isCellEditable ? 'ag-cell-editable' : undefined,
      cellClassRules: {
        'cell-pending-edit': (p: {
          node?: { id?: string }
          colDef?: { field?: string }
          data?: Record<string, unknown>
        }) => {
          const rowId = p.node?.id
          const field = p.colDef?.field
          if (!rowId || !field) return false
          const edit = pendingEdits.value[rowId]
          return Boolean(edit?.changes && Object.prototype.hasOwnProperty.call(edit.changes, field))
        }
      },
      valueParser,
      cellEditor,
      cellEditorParams
    }
  })

  if (!editable) return dataCols

  const changesCol: ColDef = {
    colId: '__changes__',
    headerName: '',
    hide: !showChangesGutter.value,
    pinned: 'left',
    lockPinned: true,
    suppressMovable: true,
    resizable: false,
    sortable: false,
    filter: false,
    floatingFilter: false,
    suppressHeaderMenuButton: true,
    suppressHeaderFilterButton: true,
    width: 54,
    minWidth: 54,
    maxWidth: 54,
    cellClass: 'row-change-gutter',
    cellRenderer: (p: { node?: { id?: string } }) => {
      const rowId = p.node?.id
      if (!rowId) return ''
      const edit = pendingEdits.value[rowId]
      const changeCount = edit?.changes ? Object.keys(edit.changes).length : 0
      if (!edit || changeCount === 0) return ''

      const label = changeCount === 1 ? '1 change' : `${changeCount} changes`

      if (changeCount === 1) {
        return `
          <span class="row-change-badge" title="${label}">
            <span class="row-change-dot"></span>
          </span>
        `
      }

      const displayCount = changeCount > 9 ? '9+' : String(changeCount)
      return `
        <span class="row-change-badge" title="${label}">
          <span class="row-change-dot"></span>
          <span class="row-change-count">${displayCount}</span>
        </span>
      `
    }
  }

  return [changesCol, ...dataCols]
})

function onCellClicked(event: { column?: { getColId: () => string }; node?: { id?: string } }) {
  const colId = event.column?.getColId?.()
  if (colId !== '__changes__') return
  const rowId = event.node?.id
  if (!rowId) return
  if (!pendingEdits.value[rowId]) return
  openRowChangesPanel(rowId)
}

const canRevertContextCell = computed(() => {
  if (!isTableEditable.value) return false
  const rowId = contextRowId.value
  const field = contextField.value
  if (!rowId || !field) return false
  const edit = pendingEdits.value[rowId]
  return Boolean(edit?.changes && Object.prototype.hasOwnProperty.call(edit.changes, field))
})

function revertContextCell() {
  const api = baseGrid.gridApi.value
  if (!api) return
  if (!isTableEditable.value) return
  const rowId = contextRowId.value
  const field = contextField.value
  if (!rowId || !field) return

  const edit = pendingEdits.value[rowId]
  if (!edit?.changes || !Object.prototype.hasOwnProperty.call(edit.changes, field)) return

  const node = api.getRowNode(rowId)
  if (!node) return

  // Let onCellValueChanged reconcile pendingEdits by setting the original value back.
  node.setDataValue(field, edit.original?.[field])
  api.refreshCells({ rowNodes: [node], columns: [field], force: true })
}

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

watch(
  () => ({ api: baseGrid.gridApi.value, visible: showChangesGutter.value }),
  ({ api, visible }) => {
    if (!api) return
    api.setColumnsVisible(['__changes__'], visible)
  },
  { immediate: true }
)

function onCellValueChanged(event: {
  data: Record<string, unknown>
  colDef: { field?: string }
  oldValue: unknown
  newValue: unknown
}) {
  if (!isTableEditable.value) return
  const api = baseGrid.gridApi.value
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

        const meta = columnMetaByName.value.get(field)
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
  if (valuesEqualForField(field, original[field], event.newValue)) {
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
      if (node) api.refreshCells({ rowNodes: [node], columns: ['__changes__', field], force: true })
    }
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

  if (api) {
    const node = api.getRowNode(rowId)
    if (node) api.refreshCells({ rowNodes: [node], columns: ['__changes__', field], force: true })
  }
}

function cancelChanges() {
  const api = baseGrid.gridApi.value
  const editsToRestore = pendingEdits.value
  const deleteRowIds = Object.keys(pendingDeletes.value)

  // Clear state first so rowClassRules evaluates to "not deleted" on redraw.
  pendingEdits.value = {}
  pendingDeletes.value = {}

  if (!api) return

  api.stopEditing(true)

  // Restore edited rows
  for (const [rowId, edit] of Object.entries(editsToRestore)) {
    const node = api.getRowNode(rowId)
    if (node) {
      node.setData(edit.original)
    }
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
  const api = baseGrid.gridApi.value
  if (!api) return
  if (!isTableEditable.value) return

  const objectName = getObjectName(props.tableMeta)
  const objectSchema = getObjectSchema(props.tableMeta)

  const editEntries = Object.entries(pendingEdits.value)
  const deleteEntries = Object.entries(pendingDeletes.value)

  if (editEntries.length === 0 && deleteEntries.length === 0) return

  let editSuccess = false
  let deleteSuccess = false
  let deletedCount = 0

  // First apply edits
  if (editEntries.length > 0) {
    try {
      const resp = await connections.updateTableRows(
        props.connectionId,
        props.database,
        objectName,
        {
          schema: objectSchema || undefined,
          edits: editEntries.map(([, edit]) => ({ keys: edit.keys, changes: edit.changes }))
        }
      )

      if (!resp.rows || resp.rows.length !== editEntries.length) {
        throw new Error('Unexpected response from server')
      }

      for (let i = 0; i < editEntries.length; i++) {
        const [rowId] = editEntries[i]
        const row = resp.rows[i]
        const node = api.getRowNode(rowId)
        if (node && row) {
          node.setData(row)
        }
      }

      pendingEdits.value = {}
      editSuccess = true
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save edits'
      toast.error(msg)
      return // Don't continue to deletes if edits failed
    }
  } else {
    editSuccess = true
  }

  // Then apply deletes
  if (deleteEntries.length > 0) {
    try {
      const resp = await connections.deleteTableRows(
        props.connectionId,
        props.database,
        objectName,
        {
          schema: objectSchema || undefined,
          deletes: deleteEntries.map(([, del]) => ({ keys: del.keys }))
        }
      )

      deletedCount = resp.deleted
      pendingDeletes.value = {}
      deleteSuccess = true

      // Update row counts
      if (baseGrid.totalRowCount.value > 0) {
        baseGrid.totalRowCount.value = Math.max(0, baseGrid.totalRowCount.value - deletedCount)
      }
      if (exactRowCount.value !== null) {
        exactRowCount.value = Math.max(0, exactRowCount.value - deletedCount)
      }

      // Refresh the grid to remove deleted rows
      api.purgeInfiniteCache()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete rows'
      toast.error(msg)
    }
  } else {
    deleteSuccess = true
  }

  // Show success message
  if (editSuccess && deleteSuccess) {
    const parts: string[] = []
    if (editEntries.length > 0) parts.push(`${editEntries.length} edited`)
    if (deletedCount > 0) parts.push(`${deletedCount} deleted`)
    toast.success(parts.length > 0 ? `Saved: ${parts.join(', ')}` : 'Saved')
  }
}

function deleteSelectedRows() {
  const api = baseGrid.gridApi.value
  if (!api) return
  if (!isTableEditable.value) return
  if (baseGrid.selectedRowCount.value === 0) {
    toast.info('Select one or more rows to delete')
    return
  }

  const selectedRows = baseGrid.selectedRows.value

  const stagedRowIds: string[] = []

  // Stage each selected row for deletion
  for (const row of selectedRows) {
    const rowId = makeRowId(row)
    // Don't re-add if already pending delete
    if (pendingDeletes.value[rowId]) continue

    // If the row has pending edits, deleting it supersedes edits.
    if (pendingEdits.value[rowId]) {
      const nextEdits = { ...pendingEdits.value }
      delete nextEdits[rowId]
      pendingEdits.value = nextEdits
    }

    pendingDeletes.value = {
      ...pendingDeletes.value,
      [rowId]: {
        keys: getKeyValues(row),
        original: { ...row }
      }
    }

    stagedRowIds.push(rowId)
  }

  // Deselect rows and redraw to show pending delete styling
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

    <!-- Row Changes Panel (DataGrip-style) -->
    <TransitionRoot as="template" :show="rowChangesPanelOpen">
      <Dialog as="div" class="relative z-50" @close="closeRowChangesPanel">
        <TransitionChild
          as="template"
          enter="ease-out duration-200"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="ease-in duration-150"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-black/40" />
        </TransitionChild>

        <div class="fixed inset-0 overflow-hidden">
          <div class="absolute inset-0 overflow-hidden">
            <div class="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <TransitionChild
                as="template"
                enter="transform transition ease-in-out duration-200"
                enter-from="translate-x-full"
                enter-to="translate-x-0"
                leave="transform transition ease-in-out duration-150"
                leave-from="translate-x-0"
                leave-to="translate-x-full"
              >
                <DialogPanel
                  class="pointer-events-auto w-screen max-w-md bg-white dark:bg-gray-850 shadow-2xl dark:shadow-gray-900/50 border-l border-gray-200 dark:border-gray-700"
                >
                  <div class="h-full flex flex-col">
                    <div
                      class="px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between"
                    >
                      <div class="min-w-0">
                        <DialogTitle class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Changes in this row
                        </DialogTitle>
                        <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          {{ rowChangeItems.length }} field{{
                            rowChangeItems.length === 1 ? '' : 's'
                          }}
                          changed
                        </p>
                      </div>
                      <button
                        type="button"
                        class="ml-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                        @click="closeRowChangesPanel"
                      >
                        <X class="h-5 w-5" :stroke-width="iconStroke" />
                        <span class="sr-only">Close</span>
                      </button>
                    </div>

                    <div class="flex-1 overflow-y-auto px-4 py-4">
                      <div
                        v-if="rowChangeItems.length === 0"
                        class="text-sm text-gray-600 dark:text-gray-400"
                      >
                        No pending edits for this row.
                      </div>

                      <div v-else class="space-y-3">
                        <div
                          v-for="item in rowChangeItems"
                          :key="item.field"
                          class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 p-3"
                        >
                          <div class="flex items-center justify-between gap-3">
                            <div
                              class="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate"
                            >
                              {{ item.field }}
                            </div>
                            <button
                              type="button"
                              class="text-xs text-teal-700 dark:text-teal-300 hover:underline"
                              @click="
                                rowChangesRowId && revertRowField(rowChangesRowId, item.field)
                              "
                            >
                              Revert
                            </button>
                          </div>
                          <div class="mt-2 text-xs text-gray-700 dark:text-gray-300">
                            <span class="line-through opacity-70">{{ item.oldValue }}</span>
                            <span class="mx-2 opacity-70">→</span>
                            <span class="font-semibold">{{ item.newValue }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>

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
