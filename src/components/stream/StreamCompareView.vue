<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import type { SortModelItem } from 'ag-grid-community'
import AGGridDataView from '@/components/database/AGGridDataView.vue'
import AGGridFileDataView from '@/components/files/AGGridFileDataView.vue'
import SchemaComparisonPanel from './SchemaComparisonPanel.vue'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useDatabaseOverviewStore } from '@/stores/databaseOverview'
import { useMonitoringStore } from '@/stores/monitoring'
import { useConnectionsStore } from '@/stores/connections'
import { normalizeDataType } from '@/constants/databaseTypes'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection } from '@/types/connections'
import type { SQLTableMeta } from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { FileMetadata } from '@/types/files'
import * as files from '@/api/files'
import { executeFederatedQuery, type ConnectionMapping } from '@/api/federated'
import type { FileFormat } from '@/utils/fileFormat'
import { parseTableName } from '@/utils/federatedUtils'
import {
  getConnectionKindFromSpec,
  getConnectionTypeLabel,
  getSqlDialectFromConnection,
  isFileBasedKind
} from '@/types/specs'

interface GridState {
  sortModel?: SortModelItem[]
  filterModel?: Record<string, unknown>
  sqlBannerExpanded?: boolean
}

interface SchemaDifference {
  icon: string
  label: string
  type: 'match' | 'type-diff' | 'missing' | 'new'
}

interface SchemaComparison {
  matching: number
  typeDiff: number
  missingInTarget: number
  newInTarget: number
  sourceDiffs: Record<string, SchemaDifference>
  targetDiffs: Record<string, SchemaDifference>
}

interface CompareItem {
  value: string
  label: string
  kind: 'table' | 'query'
  connectionId?: string
  database?: string
  tableName?: string
  schema?: string
  alias?: string
  query?: string
  targetObjectName: string
}

const props = defineProps<{
  stream: StreamConfig
  source: Connection
  target: Connection
}>()

const navigationStore = useExplorerNavigationStore()
const overviewStore = useDatabaseOverviewStore()
const monitoringStore = useMonitoringStore()
const connectionsStore = useConnectionsStore()

// Selected table/query from stream config
const selectedTable = ref<string>('')
const sourceConnections = computed(() => props.stream.source?.connections || [])
const isFederated = computed(() => sourceConnections.value.length > 1)
const hasAnyTables = computed(() =>
  sourceConnections.value.some((conn) => (conn.tables || []).length > 0)
)
const hasAnyQueries = computed(() =>
  sourceConnections.value.some((conn) =>
    (conn.queries || []).some((q) => !!q.name && !!q.query?.trim())
  )
)

function buildTargetObjectNameForTable(
  tableName: string,
  alias: string,
  useQueryNaming: boolean
): string {
  const trimmedTable = tableName.trim()
  const trimmedAlias = alias.trim()

  // Legacy query-table naming:
  // SELECT * FROM <alias>.<table> -> output name is dot-to-underscore.
  // Keep this path available for backward-compatibility with older stream runs.
  if (useQueryNaming) {
    const qualified = trimmedAlias ? `${trimmedAlias}.${trimmedTable}` : trimmedTable
    return qualified.replaceAll('.', '_')
  }

  // Table-only mode follows target/shared/GetOutputTableName behavior.
  const parsed = parseTableName(trimmedTable, false)
  let outputName = parsed.table
  if (parsed.schema && parsed.schema.toLowerCase() !== 'public') {
    outputName = `${parsed.schema}.${parsed.table}`
  }

  if (trimmedAlias && !outputName.startsWith(`${trimmedAlias}_`)) {
    outputName = `${trimmedAlias}_${outputName}`
  }
  return outputName
}

const compareItems = computed<CompareItem[]>(() => {
  const items: CompareItem[] = []

  for (const conn of sourceConnections.value) {
    const alias = (conn.alias || '').trim()
    const database = conn.database

    for (const table of conn.tables || []) {
      const rawName = table.name
      const parsed = parseTableName(rawName, false)
      const value = isFederated.value && alias ? `${alias}.${rawName}` : rawName

      items.push({
        value,
        label: value,
        kind: 'table',
        connectionId: conn.connectionId,
        database,
        tableName: rawName,
        schema: parsed.schema,
        alias,
        targetObjectName: buildTargetObjectNameForTable(
          rawName,
          alias,
          hasAnyQueries.value && !hasAnyTables.value
        )
      })
    }

    for (const query of conn.queries || []) {
      if (!query.name || !query.query?.trim()) continue
      items.push({
        value: query.name,
        label: query.name,
        kind: 'query',
        connectionId: conn.connectionId,
        database,
        alias,
        query: query.query,
        targetObjectName: query.name
      })
    }
  }

  return items
})

const selectedCompareItem = computed<CompareItem | null>(
  () => compareItems.value.find((item) => item.value === selectedTable.value) || null
)

const selectedSourceConnection = computed<Connection>(() => {
  const connectionId = selectedCompareItem.value?.connectionId
  return (connectionId ? connectionsStore.connectionByID(connectionId) : undefined) || props.source
})

const selectedSourceConnectionId = computed(
  () => selectedSourceConnection.value?.id || props.source.id
)
const selectedSourceDatabase = computed(
  () => selectedCompareItem.value?.database || sourceConnections.value[0]?.database || undefined
)
const selectedSourceSchema = computed(() => {
  if (selectedCompareItem.value?.kind !== 'table') return undefined
  return (
    selectedCompareItem.value.schema ||
    sourceConnections.value.find((c) => c.connectionId === selectedCompareItem.value?.connectionId)
      ?.schema ||
    undefined
  )
})

const selectedSourceTableName = computed(() => {
  if (selectedCompareItem.value?.kind !== 'table') return ''
  return parseTableName(selectedCompareItem.value.tableName || '', false).table
})

const selectedTargetObjectName = computed(
  () => selectedCompareItem.value?.targetObjectName || selectedTable.value
)
const selectedTargetParsed = computed(() =>
  parseTableName(selectedTargetObjectName.value || '', false)
)

// Source and target metadata
const sourceTableMeta = ref<SQLTableMeta | null>(null)
const sourceQueryPreview = ref<{ columns: string[]; rows: Record<string, unknown>[] } | null>(null)
const sourceQueryError = ref<string | null>(null)
const isLoadingSourceQuery = ref(false)
const targetTableMeta = ref<SQLTableMeta | null>(null)
const targetFileEntry = ref<FileSystemEntry | null>(null)
const targetFileMetadata = ref<FileMetadata | null>(null)
const targetFileError = ref<string | null>(null)

// Refs to grid components for sync functionality
const sourceGridRef = ref<InstanceType<typeof AGGridDataView> | null>(null)
const targetGridRef = ref<
  InstanceType<typeof AGGridDataView> | InstanceType<typeof AGGridFileDataView> | null
>(null)

// Sync state management
const syncEnabled = ref(true) // Default: ON (sync enabled by default)
const isSyncing = ref(false) // Prevent circular updates
const syncFlashSource = ref(false) // Visual feedback for source grid
const syncFlashTarget = ref(false) // Visual feedback for target grid

// Get approximate row counts from store for both source and target
const sourceApproxRows = computed(() => {
  if (selectedCompareItem.value?.kind !== 'table') return 0
  if (!selectedSourceDatabase.value || !selectedSourceTableName.value) return 0
  const direct = overviewStore.getTableRowCount(
    selectedSourceTableName.value,
    selectedSourceConnectionId.value,
    selectedSourceDatabase.value
  )
  if (direct !== undefined) return direct
  const fullName = selectedCompareItem.value?.tableName || ''
  if (fullName && fullName !== selectedSourceTableName.value) {
    return (
      overviewStore.getTableRowCount(
        fullName,
        selectedSourceConnectionId.value,
        selectedSourceDatabase.value
      ) ?? 0
    )
  }
  return 0
})

const targetApproxRows = computed(() => {
  if (!selectedTargetObjectName.value || !targetDatabase.value || isFileTarget.value) return 0
  const direct = overviewStore.getTableRowCount(
    selectedTargetObjectName.value,
    props.target.id,
    targetDatabase.value
  )
  if (direct !== undefined) return direct
  const parsed = selectedTargetParsed.value.table
  if (parsed && parsed !== selectedTargetObjectName.value) {
    return overviewStore.getTableRowCount(parsed, props.target.id, targetDatabase.value) ?? 0
  }
  return 0
})

const sourceTypeLabel = computed(
  () =>
    getConnectionTypeLabel(
      selectedSourceConnection.value?.spec,
      selectedSourceConnection.value?.type
    ) || ''
)
const targetTypeLabel = computed(
  () => getConnectionTypeLabel(props.target.spec, props.target.type) || ''
)
const sourceDialect = computed(() =>
  getSqlDialectFromConnection(
    selectedSourceConnection.value?.spec,
    selectedSourceConnection.value?.type
  )
)
const targetDialect = computed(() =>
  getSqlDialectFromConnection(props.target.spec, props.target.type)
)

// Check if target is file-based - spec is the ONLY source of truth
const targetKind = computed(() => getConnectionKindFromSpec(props.target.spec))
const isFileTarget = computed(() => isFileBasedKind(targetKind.value))

const targetFileFormat = computed<FileFormat | undefined>(() => {
  const spec = props.stream.target?.spec
  if (!spec) return undefined
  if (spec.files?.fileFormat) return spec.files.fileFormat as FileFormat
  if (spec.s3?.fileFormat) return spec.s3.fileFormat as FileFormat
  if (spec.gcs?.fileFormat) return spec.gcs.fileFormat as FileFormat
  if (spec.azure?.fileFormat) return spec.azure.fileFormat as FileFormat
  if (spec.snowflake?.staging?.fileFormat) {
    return spec.snowflake.staging.fileFormat as FileFormat
  }
  return undefined
})

const targetRootPath = computed(() => {
  const connSpec = props.target.spec
  const streamTargetSpec = props.stream.target?.spec

  // Stream references connection via target.id (props.target).
  // - Connection stores: credentials, region, default scope
  // - Stream target spec stores: stream-specific bucket/prefix override
  // Priority: stream spec > connection defaults
  const s3Bucket = streamTargetSpec?.s3?.upload?.bucket || connSpec?.s3?.scope?.bucket

  if (s3Bucket) {
    const prefix = streamTargetSpec?.s3?.upload?.prefix || connSpec?.s3?.scope?.prefix || ''
    return buildS3BasePath(s3Bucket, prefix)
  }

  // For local file connections, use spec.files.basePath from the CONNECTION
  // Do NOT use the stream's target.spec.files.outputDirectory as it contains the absolute path
  return connSpec?.files?.basePath || ''
})

const targetFileDisplayName = computed(() => {
  if (targetFileEntry.value?.name) {
    // For folder entries (multiple files), just show the table name
    if (targetFileEntry.value.type === 'dir') {
      return `${targetFileEntry.value.name}/ (${targetFileMetadata.value?.rowCount?.toLocaleString() || 0} rows)`
    }
    return targetFileEntry.value.name
  }
  if (!selectedTable.value) return ''
  if (!targetFileFormat.value) return selectedTargetObjectName.value
  const ext = getBaseExtensionForFormat(targetFileFormat.value)
  return ext ? `${selectedTargetObjectName.value}${ext}` : selectedTargetObjectName.value
})

const sourceDatabase = computed(() => selectedSourceDatabase.value)
const targetDatabase = computed(() => {
  const spec = props.stream.target?.spec
  if (spec?.db?.database) return spec.db.database
  if (spec?.snowflake?.database) return spec.snowflake.database
  return undefined
})
const sourceSchema = computed(() => selectedSourceSchema.value)
const targetSchema = computed(() => {
  const spec = props.stream.target?.spec
  if (spec?.db?.schema) return spec.db.schema
  if (spec?.snowflake?.schema) return spec.snowflake.schema
  return undefined
})

// Schema comparison (only for database targets, not files)
const schemaComparison = computed((): SchemaComparison | null => {
  // Only compare schemas for database-to-database transfers
  if (isFileTarget.value) return null
  if (!sourceTableMeta.value?.columns || !targetTableMeta.value?.columns) return null

  const sourceColumns = sourceTableMeta.value.columns
  const targetColumns = targetTableMeta.value.columns

  const sourceColMap = new Map(sourceColumns.map((c) => [c.name.toLowerCase(), c]))
  const targetColMap = new Map(targetColumns.map((c) => [c.name.toLowerCase(), c]))

  const comparison: SchemaComparison = {
    matching: 0,
    typeDiff: 0,
    missingInTarget: 0,
    newInTarget: 0,
    sourceDiffs: {},
    targetDiffs: {}
  }

  // Check source columns
  for (const sourceCol of sourceColumns) {
    const name = sourceCol.name.toLowerCase()
    const targetCol = targetColMap.get(name)

    if (!targetCol) {
      // Column exists in source but not in target
      comparison.missingInTarget++
      comparison.sourceDiffs[sourceCol.name] = {
        icon: 'minus',
        label: 'Removed',
        type: 'missing'
      }
    } else if (normalizeDataType(sourceCol.dataType) !== normalizeDataType(targetCol.dataType)) {
      // Column exists but type changed
      comparison.typeDiff++
      comparison.sourceDiffs[sourceCol.name] = {
        icon: 'warning',
        label: `→ ${targetCol.dataType}`,
        type: 'type-diff'
      }
      comparison.targetDiffs[targetCol.name] = {
        icon: 'warning',
        label: `← ${sourceCol.dataType}`,
        type: 'type-diff'
      }
    } else {
      // Column matches
      comparison.matching++
      comparison.sourceDiffs[sourceCol.name] = {
        icon: 'check',
        label: 'Match',
        type: 'match'
      }
      comparison.targetDiffs[targetCol.name] = {
        icon: 'check',
        label: 'Match',
        type: 'match'
      }
    }
  }

  // Check for new columns in target
  for (const targetCol of targetColumns) {
    const name = targetCol.name.toLowerCase()
    if (!sourceColMap.has(name)) {
      comparison.newInTarget++
      comparison.targetDiffs[targetCol.name] = {
        icon: 'plus',
        label: 'New',
        type: 'new'
      }
    }
  }

  return comparison
})

// Keep selected item valid when stream config changes
watch(
  compareItems,
  async (items) => {
    if (items.length === 0) {
      selectedTable.value = ''
      sourceTableMeta.value = null
      sourceQueryPreview.value = null
      sourceQueryError.value = null
      isLoadingSourceQuery.value = false
      targetTableMeta.value = null
      targetFileEntry.value = null
      targetFileMetadata.value = null
      targetFileError.value = null
      return
    }

    if (!items.some((item) => item.value === selectedTable.value)) {
      selectedTable.value = items[0].value
      await loadTableData()
    }
  },
  { immediate: true }
)

onMounted(async () => {
  if (selectedTable.value) {
    await loadTableData()
  }
})

// Load source and target table/file data in parallel
async function loadTableData() {
  if (!selectedTable.value) return

  // Load source and target simultaneously for better performance
  await Promise.all([loadSourceTable(), isFileTarget.value ? loadTargetFile() : loadTargetTable()])
}

async function loadSourceTable() {
  try {
    if (selectedCompareItem.value?.kind === 'query') {
      sourceTableMeta.value = null
      await loadSourceQueryPreview()
      return
    }

    sourceQueryPreview.value = null
    sourceQueryError.value = null
    isLoadingSourceQuery.value = false

    if (selectedCompareItem.value?.kind !== 'table') {
      sourceTableMeta.value = null
      return
    }

    if (!selectedSourceDatabase.value) {
      sourceTableMeta.value = null
      return
    }

    // Ensure metadata is loaded
    await navigationStore.ensureMetadata(
      selectedSourceConnectionId.value,
      selectedSourceDatabase.value
    )

    // Fetch database overview to get row counts
    try {
      await overviewStore.fetchOverview(
        selectedSourceConnectionId.value,
        selectedSourceDatabase.value
      )
    } catch (e) {
      console.warn('Failed to fetch source database overview:', e)
    }

    const tableName = selectedSourceTableName.value
    const schemaFromName = selectedSourceSchema.value

    // For MySQL, don't pass schema (database IS the schema)
    // For PostgreSQL, use schema if provided, otherwise default to 'public'
    let schema: string | undefined
    const sourceKind = getConnectionKindFromSpec(selectedSourceConnection.value.spec)
    if (sourceKind === 'database' && sourceTypeLabel.value === 'mysql') {
      schema = undefined // MySQL doesn't use separate schemas
    } else {
      schema = schemaFromName || 'public'
    }

    const meta = navigationStore.findTableMeta(
      selectedSourceConnectionId.value,
      selectedSourceDatabase.value,
      tableName,
      schema
    )
    sourceTableMeta.value = meta || null
  } catch (error) {
    console.error('Failed to load source table metadata:', error)
  }
}

async function loadSourceQueryPreview() {
  sourceQueryPreview.value = null
  sourceQueryError.value = null

  const querySql = selectedCompareItem.value?.query?.trim()
  if (!querySql) {
    sourceQueryError.value = 'Query text is empty.'
    return
  }

  const queryConnections: ConnectionMapping[] = sourceConnections.value
    .map((conn) => {
      const alias = (conn.alias || '').trim()
      if (!alias || !conn.connectionId) return null

      const database = conn.database?.trim()
      const scopePath = conn.files?.basePath?.trim()
      return {
        alias,
        connectionId: conn.connectionId,
        ...(database ? { database } : {}),
        ...(scopePath ? { scopePath } : {})
      } as ConnectionMapping
    })
    .filter((conn): conn is ConnectionMapping => conn !== null)

  if (queryConnections.length === 0) {
    sourceQueryError.value = 'No source connections available for query preview.'
    return
  }

  isLoadingSourceQuery.value = true
  try {
    const result = await executeFederatedQuery({
      query: querySql,
      connections: queryConnections
    })

    const columns = result.columns || []
    const rows = (result.rows || []).map((row) => {
      const rowObject: Record<string, unknown> = {}
      columns.forEach((col, idx) => {
        rowObject[col] = row[idx]
      })
      return rowObject
    })

    sourceQueryPreview.value = { columns, rows }
  } catch (error) {
    sourceQueryError.value =
      error instanceof Error ? error.message : 'Failed to load source query preview.'
  } finally {
    isLoadingSourceQuery.value = false
  }
}

function formatSourceQueryCellValue(value: unknown): string {
  if (value === null) return 'NULL'
  if (value === undefined) return ''
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

async function loadTargetTable() {
  try {
    targetFileError.value = null
    targetFileEntry.value = null
    targetFileMetadata.value = null

    if (!targetDatabase.value) return

    // Force refresh metadata to ensure we get latest tables after stream completion
    // This ensures newly created tables are visible immediately
    await navigationStore.ensureMetadata(props.target.id, targetDatabase.value, true)

    // Fetch database overview to get row counts
    try {
      await overviewStore.fetchOverview(props.target.id, targetDatabase.value)
    } catch (e) {
      console.warn('Failed to fetch target database overview:', e)
    }

    const tableName = selectedTargetParsed.value.table
    const schemaFromName = selectedTargetParsed.value.schema

    // For MySQL, don't pass schema (database IS the schema)
    // For PostgreSQL, use schema if provided, otherwise default to 'public'
    let schema: string | undefined
    const targetKind = getConnectionKindFromSpec(props.target.spec)
    if (targetKind === 'database' && targetTypeLabel.value === 'mysql') {
      schema = undefined // MySQL doesn't use separate schemas
    } else {
      schema = schemaFromName || targetSchema.value || 'public'
    }

    // Find the table metadata
    const meta = navigationStore.findTableMeta(
      props.target.id,
      targetDatabase.value,
      tableName,
      schema
    )
    targetTableMeta.value = meta || null
  } catch (error) {
    console.error('Failed to load target table metadata:', error)
  }
}

async function loadTargetFile() {
  try {
    targetFileError.value = null
    targetFileEntry.value = null
    targetFileMetadata.value = null
    targetTableMeta.value = null

    if (targetKind.value === 'gcs' || targetKind.value === 'azure') {
      targetFileError.value = 'Target compare view does not support GCS or Azure yet.'
      return
    }

    if (!targetRootPath.value) {
      targetFileError.value = 'Target connection has no output directory configured'
      return
    }

    // Get the stream execution ID from monitoring store
    // The new file structure is: <outputRoot>/<streamID>/<table>/
    const streamId = monitoringStore.streamID || monitoringStore.lastStreamId
    if (!streamId) {
      targetFileError.value = 'No stream execution ID available. Please run the stream first.'
      return
    }

    // Instead of loading individual files, pass the table folder to DuckDB.
    // File CDC output path is deterministic: <outputRoot>/<streamID>/<baseTableName>/
    const detectedFormat = targetFileFormat.value

    if (!detectedFormat) {
      targetFileError.value = `File format not configured for this stream`
      return
    }

    const tableFolderNames = buildTargetTableFolderCandidates()
    let metadata: FileMetadata | null = null
    let tableFolderPath = ''
    let resolvedFolderName = ''
    let lastError: unknown = null

    // Try canonical naming first, then legacy naming for backward-compatibility.
    for (const folderName of tableFolderNames) {
      const candidatePath = joinPaths(targetRootPath.value, streamId, folderName)
      try {
        metadata = await files.getFileMetadata(candidatePath, detectedFormat, true, props.target.id)
        tableFolderPath = candidatePath
        resolvedFolderName = folderName
        break
      } catch (error) {
        lastError = error
      }
    }

    if (!metadata || !tableFolderPath) {
      throw lastError instanceof Error
        ? lastError
        : new Error('Failed to load target file metadata')
    }

    // Create a FileSystemEntry for the folder itself (not individual files).
    // DuckDB will use wildcard patterns like "folder/*.csv.zst" to read all files.
    targetFileEntry.value = {
      name: resolvedFolderName || selectedTargetObjectName.value,
      path: tableFolderPath,
      type: 'dir',
      isTable: true,
      format: detectedFormat
    }
    targetFileMetadata.value = metadata
  } catch (error) {
    console.error('Failed to load target file:', error)
    targetFileError.value =
      error instanceof Error ? error.message : 'Failed to load target file metadata'
  }
}

function buildTargetTableFolderName(): string {
  return selectedTargetObjectName.value?.trim() || selectedTable.value?.trim() || ''
}

function buildTargetTableFolderCandidates(): string[] {
  const candidates: string[] = []
  const pushCandidate = (value?: string) => {
    const normalized = value?.trim()
    if (!normalized || candidates.includes(normalized)) return
    candidates.push(normalized)
  }

  // Preferred candidate (current backend naming).
  pushCandidate(buildTargetTableFolderName())

  // For table comparisons, also consider both naming strategies so Compare
  // keeps working for historical runs created before mixed-mode routing changes.
  if (selectedCompareItem.value?.kind === 'table') {
    const rawName = selectedCompareItem.value.tableName || ''
    const alias = selectedCompareItem.value.alias || ''
    pushCandidate(buildTargetObjectNameForTable(rawName, alias, false))
    pushCandidate(buildTargetObjectNameForTable(rawName, alias, true))
  }

  return candidates
}

function joinPaths(basePath: string, ...segments: (string | undefined)[]): string {
  let current = basePath
  for (const segment of segments) {
    if (!segment) continue
    if (!current) {
      current = segment
      continue
    }
    const separator = current.includes('\\') ? '\\' : '/'
    const trimmedBase = current.replace(/[\\/]+$/, '')
    const trimmedSegment = segment.replace(/^[\\/]+/, '')
    current = `${trimmedBase}${separator}${trimmedSegment}`
  }
  return current
}

function buildS3BasePath(bucket?: string, prefix?: string): string {
  if (!bucket) return ''
  const normalizedPrefix = prefix ? prefix.replace(/^\/+|\/+$/g, '') : ''
  return normalizedPrefix ? `s3://${bucket}/${normalizedPrefix}` : `s3://${bucket}`
}

function getBaseExtensionForFormat(format?: FileFormat | null): string | null {
  if (!format) return null
  switch (format) {
    case 'csv':
      return '.csv'
    case 'json':
      return '.json'
    case 'jsonl':
      return '.jsonl'
    case 'parquet':
      return '.parquet'
    default:
      return null
  }
}

// Visual feedback helper - triggers a brief flash effect
function triggerSyncFlash(target: 'source' | 'target') {
  if (target === 'source') {
    syncFlashSource.value = true
    setTimeout(() => {
      syncFlashSource.value = false
    }, 300)
  } else {
    syncFlashTarget.value = true
    setTimeout(() => {
      syncFlashTarget.value = false
    }, 300)
  }
}

// Map grid state between source and target (handle column name differences)
function mapGridState(
  fromState: GridState,
  fromMeta: SQLTableMeta | FileMetadata | null,
  toMeta: SQLTableMeta | FileMetadata | null
): GridState {
  if (!fromMeta || !toMeta) return fromState

  const mappedState: GridState = {
    sqlBannerExpanded: fromState.sqlBannerExpanded
  }

  // Get column names for mapping (case-insensitive)
  const toColumns = 'columns' in toMeta ? toMeta.columns.map((c) => c.name.toLowerCase()) : []

  // Map sort model - only include columns that exist in target
  if (fromState.sortModel && Array.isArray(fromState.sortModel)) {
    mappedState.sortModel = fromState.sortModel.filter((sort) => {
      return Boolean(sort.colId) && toColumns.includes(sort.colId.toLowerCase())
    })
  }

  // Map filter model - only include columns that exist in target
  if (fromState.filterModel && typeof fromState.filterModel === 'object') {
    const filteredModel: Record<string, unknown> = {}
    Object.entries(fromState.filterModel).forEach(([colId, filter]) => {
      if (toColumns.includes(colId.toLowerCase())) {
        filteredModel[colId] = filter
      }
    })
    mappedState.filterModel = filteredModel
  }

  return mappedState
}

// Sync from source to target
async function syncToTarget(sourceState: GridState) {
  if (!syncEnabled.value || isSyncing.value || !targetGridRef.value) return

  isSyncing.value = true
  try {
    // Map state based on target type (database or file)
    const targetMeta = isFileTarget.value ? targetFileMetadata.value : targetTableMeta.value
    const mappedState = mapGridState(sourceState, sourceTableMeta.value, targetMeta)

    // Apply to target grid
    await targetGridRef.value.applyGridState(mappedState)

    // Visual feedback
    triggerSyncFlash('target')
  } catch (error) {
    console.error('Error syncing to target:', error)
  } finally {
    isSyncing.value = false
  }
}

// Sync from target to source
async function syncToSource(targetState: GridState) {
  if (!syncEnabled.value || isSyncing.value || !sourceGridRef.value) return

  isSyncing.value = true
  try {
    // Map state
    const targetMeta = isFileTarget.value ? targetFileMetadata.value : targetTableMeta.value
    const mappedState = mapGridState(targetState, targetMeta, sourceTableMeta.value)

    // Apply to source grid
    await sourceGridRef.value.applyGridState(mappedState)

    // Visual feedback
    triggerSyncFlash('source')
  } catch (error) {
    console.error('Error syncing to source:', error)
  } finally {
    isSyncing.value = false
  }
}

// Watch source grid state changes and sync to target
watch(
  () => sourceGridRef.value?.getGridState(),
  (newState: GridState | undefined) => {
    if (newState && syncEnabled.value && !isSyncing.value) {
      syncToTarget(newState)
    }
  },
  { deep: true }
)

// Watch target grid state changes and sync to source
watch(
  () => targetGridRef.value?.getGridState(),
  (newState: GridState | undefined) => {
    if (newState && syncEnabled.value && !isSyncing.value) {
      syncToSource(newState)
    }
  },
  { deep: true }
)

// Handle table selection change
async function selectTable(tableName: string) {
  selectedTable.value = tableName
  await loadTableData()
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Table Selector -->
    <div
      class="px-6 py-3 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700 shrink-0"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-200">Compare Table:</span>
          <Menu as="div" class="relative z-1200">
            <MenuButton
              class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {{ selectedCompareItem?.label || 'Select a table' }}
              <ChevronDown class="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </MenuButton>
            <MenuItems
              class="absolute left-0 z-1300 mt-1 w-56 origin-top-left rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-white/10 border border-gray-200 dark:border-gray-700 focus:outline-none"
            >
              <div class="py-1">
                <MenuItem
                  v-for="item in compareItems"
                  :key="item.value"
                  v-slot="{ active }"
                  @click="selectTable(item.value)"
                >
                  <button
                    :class="[
                      active ? 'bg-gray-100 dark:bg-gray-800' : '',
                      selectedTable === item.value
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium'
                        : '',
                      'block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200'
                    ]"
                  >
                    {{ item.label }}
                  </button>
                </MenuItem>
              </div>
            </MenuItems>
          </Menu>

          <!-- Sync Views Toggle (disabled for now)
          <div
            class="flex items-center gap-2 ml-4 pl-4 border-l border-gray-300 dark:border-gray-700"
          >
            <Switch
              v-model="syncEnabled"
              class="relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-300 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              :class="[
                syncEnabled ? 'bg-gray-600 dark:bg-gray-500' : 'bg-gray-400 dark:bg-gray-600'
              ]"
            >
              <span class="sr-only">Sync view options between source and target</span>
              <span
                aria-hidden="true"
                class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 shadow-md ring-0 transition duration-200 ease-in-out"
                :class="[syncEnabled ? 'translate-x-5' : 'translate-x-0']"
              />
            </Switch>
            <component
              :is="syncEnabled ? Link : Link2Off"
              class="h-4 w-4"
              :class="{
                'text-gray-600 dark:text-gray-200': syncEnabled,
                'text-gray-400 dark:text-gray-500': !syncEnabled
              }"
            />
            <span
              class="text-sm text-gray-700 dark:text-gray-200"
              :class="{ 'font-medium text-emerald-700 dark:text-emerald-300': syncEnabled }"
            >
              Sync Views
            </span>
          </div>
          -->
        </div>
      </div>
    </div>

    <!-- Schema Comparison Panel -->
    <SchemaComparisonPanel
      v-if="!isFileTarget && sourceTableMeta && targetTableMeta"
      :source-columns="sourceTableMeta.columns"
      :target-columns="targetTableMeta.columns"
      :comparison="schemaComparison"
      :source-ddl="sourceTableMeta.ddl"
      :target-ddl="targetTableMeta.ddl"
      :source-connection-type="sourceTypeLabel"
      :target-connection-type="targetTypeLabel"
      :source-dialect="sourceDialect"
      :target-dialect="targetDialect"
    />

    <!-- Split View -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Source Pane (Left) - Blue Theme -->
      <div
        class="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-800 overflow-hidden"
      >
        <!-- Source Header -->
        <div
          class="px-4 py-3 border-b border-blue-100 dark:border-blue-800/60 bg-linear-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900/20 shrink-0"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <img src="/images/steps/source-step.svg" alt="Source" class="w-6 h-6" />
              <span
                class="text-sm font-semibold bg-linear-to-r from-blue-600 to-blue-500 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent"
              >
                Source
              </span>
              <span class="text-xs text-gray-600 dark:text-gray-400">{{
                selectedSourceConnection.name
              }}</span>
            </div>
            <div class="text-xs text-gray-600 dark:text-gray-400">
              {{ sourceDatabase }}
              <span v-if="sourceSchema && sourceSchema !== 'public'"> / {{ sourceSchema }} </span>
              /
              {{
                selectedCompareItem?.kind === 'table'
                  ? selectedSourceTableName
                  : selectedCompareItem?.label
              }}
            </div>
          </div>
        </div>

        <!-- Source Data View -->
        <div class="flex-1 overflow-auto p-4">
          <div v-if="selectedCompareItem?.kind === 'query'" class="h-full overflow-auto">
            <div
              v-if="isLoadingSourceQuery"
              class="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm"
            >
              Loading source query preview...
            </div>
            <div
              v-else-if="sourceQueryError"
              class="p-4 text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/35 border border-red-200 dark:border-red-700/70 rounded-md"
            >
              {{ sourceQueryError }}
            </div>
            <div
              v-else-if="sourceQueryPreview && sourceQueryPreview.rows.length > 0"
              class="rounded-md border border-gray-200 dark:border-gray-700 overflow-auto"
            >
              <table class="w-full text-xs">
                <thead class="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                  <tr>
                    <th
                      v-for="col in sourceQueryPreview.columns"
                      :key="col"
                      class="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap"
                    >
                      {{ col }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                  <tr
                    v-for="(row, idx) in sourceQueryPreview.rows"
                    :key="idx"
                    class="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td
                      v-for="col in sourceQueryPreview.columns"
                      :key="col"
                      class="px-3 py-2 text-gray-900 dark:text-gray-100 whitespace-nowrap max-w-[260px] truncate"
                      :title="formatSourceQueryCellValue(row[col])"
                    >
                      {{ formatSourceQueryCellValue(row[col]) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div
              v-else
              class="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm"
            >
              Query returned no rows.
            </div>
          </div>
          <div
            v-else-if="sourceTableMeta && sourceDatabase"
            class="h-full transition-all duration-300"
            :class="{ 'ring-2 ring-blue-400 ring-opacity-50': syncFlashSource }"
          >
            <AGGridDataView
              :key="`compare-source-${stream.id}-${selectedTable}`"
              ref="sourceGridRef"
              :table-meta="sourceTableMeta"
              :connection-id="selectedSourceConnectionId"
              :database="sourceDatabase"
              :is-view="false"
              :approx-rows="sourceApproxRows"
              :object-key="`compare-source-${stream.id}-${selectedTable}`"
              :show-toolbar-actions="false"
              read-only
            />
          </div>
          <div
            v-else
            class="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm"
          >
            Loading source table...
          </div>
        </div>
      </div>

      <!-- Target Pane (Right) - Emerald Theme -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Target Header -->
        <div
          class="px-4 py-3 border-b border-emerald-100 dark:border-emerald-800/60 bg-linear-to-r from-emerald-50 to-white dark:from-emerald-900/20 dark:to-gray-900/20 shrink-0"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <img src="/images/steps/target-step.svg" alt="Target" class="w-6 h-6" />
              <span
                class="text-sm font-semibold bg-linear-to-r from-emerald-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300 bg-clip-text text-transparent"
              >
                Target
              </span>
              <span class="text-xs text-gray-600 dark:text-gray-400">{{ target.name }}</span>
            </div>
            <div class="text-xs text-gray-600 dark:text-gray-400">
              <template v-if="isFileTarget">
                {{ targetFileDisplayName || `${selectedTargetObjectName}.${target.type}` }}
              </template>
              <template v-else>
                {{ targetDatabase }}
                <span v-if="targetSchema && targetSchema !== 'public'"> / {{ targetSchema }} </span>
                / {{ selectedTargetObjectName }}
              </template>
            </div>
          </div>
        </div>

        <!-- Target Data View -->
        <div class="flex-1 overflow-auto p-4">
          <!-- Database Target -->
          <div
            v-if="!isFileTarget && targetTableMeta && targetDatabase"
            class="h-full transition-all duration-300"
            :class="{ 'ring-2 ring-blue-400 ring-opacity-50': syncFlashTarget }"
          >
            <AGGridDataView
              :key="`compare-target-${stream.id}-${selectedTable}`"
              ref="targetGridRef"
              :table-meta="targetTableMeta"
              :connection-id="target.id"
              :database="targetDatabase"
              :is-view="false"
              :approx-rows="targetApproxRows"
              :object-key="`compare-target-${stream.id}-${selectedTable}`"
              :show-toolbar-actions="false"
              read-only
            />
          </div>

          <!-- File Target -->
          <div
            v-else-if="isFileTarget && targetFileEntry && targetFileMetadata"
            class="h-full transition-all duration-300"
            :class="{ 'ring-2 ring-blue-400 ring-opacity-50': syncFlashTarget }"
          >
            <AGGridFileDataView
              ref="targetGridRef"
              :entry="targetFileEntry"
              :metadata="targetFileMetadata"
              :connection-id="target.id"
              :object-key="`compare-target-file-${stream.id}-${targetFileEntry.path}`"
              :show-toolbar-actions="false"
              read-only
            />
          </div>

          <div
            v-else-if="targetFileError"
            class="h-full flex items-center justify-center text-center text-sm text-red-600 dark:text-red-300 px-4"
          >
            {{ targetFileError }}
          </div>

          <!-- Loading/Error State -->
          <div
            v-else
            class="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm"
          >
            Loading target {{ isFileTarget ? 'file' : 'table' }}...
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
