<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ChevronDown, ExternalLink } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import type { SortModelItem } from 'ag-grid-community'
import AGGridDataView from '@/components/database/AGGridDataView.vue'
import AGGridFileDataView from '@/components/files/AGGridFileDataView.vue'
import SchemaComparisonPanel from './SchemaComparisonPanel.vue'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useExplorerViewStateStore } from '@/stores/explorerViewState'
import { usePaneTabsStore } from '@/stores/paneTabs'
import { useDatabaseOverviewStore } from '@/stores/databaseOverview'
import { useMonitoringStore } from '@/stores/monitoring'
import { useConnectionsStore } from '@/stores/connections'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { normalizeDataType } from '@/constants/databaseTypes'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection } from '@/types/connections'
import type { SQLTableMeta } from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { FileMetadata } from '@/types/files'
import * as files from '@/api/files'
import { executeFederatedQuery, type ConnectionMapping } from '@/api/federated'
import type { FileFormat } from '@/utils/fileFormat'
import { parseTableName, toFederatedConnectionMappings } from '@/utils/federatedUtils'
import {
  applySourceAlias,
  computeLocalFileSelectionTableName,
  computeS3ObjectTableName,
  computeS3PrefixTableName
} from '@/utils/fileSelectionTableName'
import {
  getConnectionKindFromSpec,
  getConnectionTypeLabel,
  getSqlDialectFromConnection,
  isFileBasedKind
} from '@/types/specs'
import { findFileEntryByPath } from '@/utils/fileEntryUtils'
import type { SqlDialect } from '@/types/specs'

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
  sourcePath?: string
}

interface PendingFileCompareItem {
  connectionId?: string
  alias?: string
  sourcePath: string
  tableName: string
}

const props = defineProps<{
  stream: StreamConfig
  source: Connection
  target: Connection
}>()

const router = useRouter()
const navigationStore = useExplorerNavigationStore()
const explorerViewStateStore = useExplorerViewStateStore()
const paneTabsStore = usePaneTabsStore()
const overviewStore = useDatabaseOverviewStore()
const monitoringStore = useMonitoringStore()
const connectionsStore = useConnectionsStore()
const fileExplorerStore = useFileExplorerStore()

function getCompareSelectionStorageKey(streamId?: string): string {
  return `stream-compare-selected-table:${streamId || 'unknown'}`
}

function readPersistedSelectedTable(streamId?: string): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(getCompareSelectionStorageKey(streamId)) || ''
  } catch {
    return ''
  }
}

function persistSelectedTable(streamId: string | undefined, tableValue: string) {
  if (typeof window === 'undefined') return
  try {
    const key = getCompareSelectionStorageKey(streamId)
    if (!tableValue) {
      window.localStorage.removeItem(key)
      return
    }
    window.localStorage.setItem(key, tableValue)
  } catch {
    // Ignore storage errors.
  }
}

// Selected table/query from stream config
const selectedTable = ref<string>(readPersistedSelectedTable(props.stream.id))
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
const targetDialect = computed(() =>
  getSqlDialectFromConnection(props.target.spec, props.target.type)
)

const reportedCompareTableNames = computed<string[]>(() => {
  const names: string[] = []
  const seen = new Set<string>()
  const currentStreamId = monitoringStore.streamID

  const pushName = (value?: string) => {
    const normalized = value?.trim()
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    names.push(normalized)
  }

  for (const log of monitoringStore.logs) {
    if (
      log.streamId !== currentStreamId ||
      log.category !== 'stat' ||
      log.type !== 'target' ||
      !log.table
    ) {
      continue
    }

    const normalized = log.table.trim().toLowerCase()
    if (normalized === 'total' || normalized === 'summary') continue
    pushName(log.table)
  }

  for (const tableName of monitoringStore.tableMetadata.keys()) {
    pushName(tableName)
  }

  return names
})

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
    outputName =
      targetDialect.value === 'mysql'
        ? `${parsed.schema}__${parsed.table}`
        : `${parsed.schema}.${parsed.table}`
  }

  if (trimmedAlias && !outputName.startsWith(`${trimmedAlias}_`)) {
    outputName = `${trimmedAlias}_${outputName}`
  }
  return outputName
}

const compareItems = computed<CompareItem[]>(() => {
  const items: CompareItem[] = []
  const pendingFileItems: PendingFileCompareItem[] = []

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
          isFederated.value ? alias : '',
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

    // File-backed sources derive compare items directly from saved selections.
    // Reported table names are only used when they align 1:1 with those selections.
    const aliasPrefix = isFederated.value ? alias : ''
    const s3Bucket = conn.s3?.bucket
    const localExistingNames = new Set<string>()

    for (const prefix of conn.s3?.prefixes || []) {
      if (!prefix.replace(/\/+$/, '')) continue
      pendingFileItems.push({
        connectionId: conn.connectionId,
        alias,
        sourcePath: s3Bucket ? `s3://${s3Bucket}/${prefix}` : prefix,
        tableName: applySourceAlias(computeS3PrefixTableName(prefix), aliasPrefix)
      })
    }
    for (const obj of conn.s3?.objects || []) {
      const trimmed = obj.trim()
      if (!trimmed) continue
      pendingFileItems.push({
        connectionId: conn.connectionId,
        alias,
        sourcePath: s3Bucket ? `s3://${s3Bucket}/${trimmed}` : trimmed,
        tableName: applySourceAlias(computeS3ObjectTableName(trimmed), aliasPrefix)
      })
    }
    const filesBasePath = conn.files?.basePath
    for (const filePath of conn.files?.paths || []) {
      const trimmed = filePath.trim()
      if (!trimmed) continue
      const unaliasedTableName = computeLocalFileSelectionTableName(trimmed, localExistingNames)
      localExistingNames.add(unaliasedTableName)
      pendingFileItems.push({
        connectionId: conn.connectionId,
        alias,
        sourcePath: filesBasePath ? joinPaths(filesBasePath, trimmed) : trimmed,
        tableName: applySourceAlias(unaliasedTableName, aliasPrefix)
      })
    }
  }

  const existingTargetNames = new Set(items.map((item) => item.targetObjectName))
  const reportedFileTableNames = reportedCompareTableNames.value.filter(
    (tableName) => !existingTargetNames.has(tableName)
  )
  const resolvedFileTableNames =
    reportedFileTableNames.length === pendingFileItems.length
      ? reportedFileTableNames
      : pendingFileItems.map((item) => item.tableName)

  pendingFileItems.forEach((item, index) => {
    const tableName = resolvedFileTableNames[index]
    if (!tableName) return

    items.push({
      value: tableName,
      label: tableName,
      kind: 'table',
      connectionId: item.connectionId,
      alias: item.alias,
      targetObjectName: tableName,
      sourcePath: item.sourcePath
    })
  })

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
function resolveSchemaForDialect(
  dialect: SqlDialect,
  ...candidates: Array<string | undefined>
): string | undefined {
  if (dialect !== 'pgsql') return undefined
  for (const candidate of candidates) {
    const value = candidate?.trim()
    if (value) return value
  }
  return undefined
}

// Check if source is file-based (S3, local files)
const sourceKind = computed(() => getConnectionKindFromSpec(selectedSourceConnection.value?.spec))
const isFileSource = computed(() => isFileBasedKind(sourceKind.value))

// Source file state (for file-based sources: S3, local files)
const sourceFileEntry = ref<FileSystemEntry | null>(null)
const sourceFileMetadata = ref<FileMetadata | null>(null)
const sourceFileError = ref<string | null>(null)

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

const canOpenSourceInExplorer = computed(() => {
  if (isFileSource.value) {
    return Boolean(selectedSourceConnectionId.value && sourceFileEntry.value)
  }
  return (
    selectedCompareItem.value?.kind === 'table' &&
    Boolean(
      selectedSourceConnectionId.value && sourceDatabase.value && selectedSourceTableName.value
    )
  )
})

const canOpenTargetInExplorer = computed(() => {
  if (isFileTarget.value) {
    return Boolean(props.target.id && targetFileEntry.value)
  }
  return (
    selectedCompareItem.value?.kind === 'table' &&
    Boolean(props.target.id && targetDatabase.value && selectedTargetParsed.value.table)
  )
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
      sourceFileEntry.value = null
      sourceFileMetadata.value = null
      sourceFileError.value = null
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

watch(
  () => selectedTable.value,
  (value) => {
    persistSelectedTable(props.stream.id, value)
  }
)

watch(
  () => props.stream.id,
  (streamId) => {
    selectedTable.value = readPersistedSelectedTable(streamId)
  }
)

// Load source and target table/file data in parallel
async function loadTableData() {
  if (!selectedTable.value) return

  // Load source and target simultaneously for better performance
  const sourceLoader = isFileSource.value ? loadSourceFile() : loadSourceTable()
  const targetLoader = isFileTarget.value ? loadTargetFile() : loadTargetTable()
  await Promise.all([sourceLoader, targetLoader])
}

async function loadSourceTable() {
  try {
    // Clear source file state when loading database source
    sourceFileEntry.value = null
    sourceFileMetadata.value = null
    sourceFileError.value = null

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

    const schema = resolveSchemaForDialect(sourceDialect.value, schemaFromName)

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

async function loadSourceFile() {
  try {
    sourceFileError.value = null
    sourceFileEntry.value = null
    sourceFileMetadata.value = null
    sourceTableMeta.value = null
    sourceQueryPreview.value = null
    sourceQueryError.value = null
    isLoadingSourceQuery.value = false

    const sourcePath = selectedCompareItem.value?.sourcePath
    if (!sourcePath) {
      sourceFileError.value = 'No source file path available for this item.'
      return
    }

    const connectionId = selectedSourceConnectionId.value

    // Reuse fileExplorerStore — same code path as Data Explorer and stream wizard.
    // It loads S3/local entries, detects format from actual filenames, and provides metadata.
    await fileExplorerStore.loadEntries(connectionId)

    // The tree is lazy-loaded: only top-level entries are loaded initially.
    // Walk down the path, loading each ancestor folder to reach the target entry
    // (same approach as openTargetInExplorer uses for the sidebar).
    const entry = await resolveFileEntry(connectionId, sourcePath)

    if (!entry) {
      sourceFileError.value = `Source path not found: ${sourcePath}`
      return
    }

    // For table folders (directories with uniform data files), the entry already has
    // format detected from actual filenames — same as the Data Explorer tree shows.
    const metadata = await fileExplorerStore.loadFileMetadata(entry, true, connectionId)
    if (!metadata) {
      sourceFileError.value = 'Failed to load file metadata for source.'
      return
    }

    sourceFileEntry.value = entry
    sourceFileMetadata.value = metadata
  } catch (error) {
    console.error('Failed to load source file:', error)
    sourceFileError.value =
      error instanceof Error ? error.message : 'Failed to load source file metadata'
  }
}

// Walk down the S3/file tree, loading folder contents at each level to find the target entry.
// Paths may include trailing slashes for directories (e.g., "s3://bucket/sakila/customer/").
async function resolveFileEntry(
  connectionId: string,
  targetPath: string
): Promise<FileSystemEntry | null> {
  const normalized = targetPath.replace(/\/+$/, '')
  const entries = fileExplorerStore.getEntries(connectionId)

  // Try direct lookup first (works if parent was already loaded).
  let entry =
    findFileEntryByPath(entries, normalized) || findFileEntryByPath(entries, normalized + '/')
  if (entry) return entry

  // Walk ancestors from the root down, loading each unloaded folder.
  const segments = normalized.split('/')
  for (let i = 3; i < segments.length; i++) {
    // For s3://bucket/a/b/c, start from i=3 → "s3://bucket/a"
    const ancestorPath = segments.slice(0, i).join('/')
    const refreshed = fileExplorerStore.getEntries(connectionId)
    const ancestor =
      findFileEntryByPath(refreshed, ancestorPath) ||
      findFileEntryByPath(refreshed, ancestorPath + '/')
    if (ancestor && ancestor.type === 'dir' && !ancestor.isLoaded) {
      await fileExplorerStore.loadFolderContents(connectionId, ancestor.path)
    }
  }

  // Final lookup after all ancestors are loaded.
  const final = fileExplorerStore.getEntries(connectionId)
  return findFileEntryByPath(final, normalized) || findFileEntryByPath(final, normalized + '/')
}

async function loadSourceQueryPreview() {
  sourceQueryPreview.value = null
  sourceQueryError.value = null

  const querySql = selectedCompareItem.value?.query?.trim()
  if (!querySql) {
    sourceQueryError.value = 'Query text is empty.'
    return
  }

  const queryConnections: ConnectionMapping[] = toFederatedConnectionMappings(
    sourceConnections.value
  )

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
    const schema = resolveSchemaForDialect(
      targetDialect.value,
      schemaFromName,
      targetTableMeta.value?.schema,
      targetSchema.value
    )

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
    // The file structure is: <outputRoot>/<streamID>/<table>/
    const streamId = monitoringStore.streamID
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

async function openSourceInExplorer() {
  if (!canOpenSourceInExplorer.value) return

  const connectionId = selectedSourceConnectionId.value
  if (!connectionId) return

  // File-based source: open in file browser
  if (isFileSource.value) {
    const entry = sourceFileEntry.value
    if (!entry) return

    const targetPane = paneTabsStore.activePane || 'left'

    navigationStore.setActiveConnectionId(connectionId)
    connectionsStore.setCurrentConnection(connectionId)
    navigationStore.expandConnection(connectionId)

    await fileExplorerStore.loadEntries(connectionId, false)

    // Walk from shallowest to deepest ancestor so lazy-loaded folders are expanded in order
    const targetPath = entry.path
    const pathSegments = targetPath.split('/')

    for (let i = 1; i < pathSegments.length; i++) {
      const ancestorPath = pathSegments.slice(0, i).join('/')
      if (!ancestorPath) continue
      const refreshed = fileExplorerStore.getEntries(connectionId)
      const ancestorEntry =
        findFileEntryByPath(refreshed, ancestorPath) ||
        findFileEntryByPath(refreshed, ancestorPath + '/')
      if (ancestorEntry && ancestorEntry.type === 'dir') {
        fileExplorerStore.expandFolder(connectionId, ancestorEntry.path)
        if (!ancestorEntry.isLoaded) {
          await fileExplorerStore.loadFolderContents(connectionId, ancestorEntry.path)
        }
      }
    }

    fileExplorerStore.clearAllSelectionsExcept(connectionId)
    fileExplorerStore.setSelectedPath(connectionId, targetPath)

    if (targetPane === 'left') {
      explorerViewStateStore.selectFile(connectionId, entry.path)
    }

    const tabId = `file:${connectionId}:${entry.path}`
    paneTabsStore.addTab(
      targetPane,
      {
        id: tabId,
        connectionId,
        name: entry.name,
        filePath: entry.path,
        fileEntry: entry,
        fileMetadata: sourceFileMetadata.value,
        fileType: entry.type,
        tabType: 'file'
      },
      'preview'
    )

    await router.push({ name: 'DatabaseExplorer' })
    return
  }

  // Database source: open in table view
  const targetPane = paneTabsStore.activePane || 'left'
  const database = sourceDatabase.value
  const tableName = selectedSourceTableName.value
  const schemaName = resolveSchemaForDialect(sourceDialect.value, sourceSchema.value)

  if (!database || !tableName) return

  navigationStore.setActiveConnectionId(connectionId)
  connectionsStore.setCurrentConnection(connectionId)
  navigationStore.expandConnection(connectionId)
  navigationStore.expandDatabase(`${connectionId}:${database}`)
  if (schemaName) {
    navigationStore.expandSchema(`${connectionId}:${database}:${schemaName}`)
  }
  await navigationStore.ensureMetadata(connectionId, database)

  navigationStore.selectObject(connectionId, database, schemaName, 'table', tableName)

  if (targetPane === 'left') {
    explorerViewStateStore.selectTable(connectionId, database, 'table', tableName, schemaName)
  } else if (explorerViewStateStore.viewType !== 'table-data') {
    explorerViewStateStore.selectDatabaseTabView(connectionId, database)
  }

  paneTabsStore.addTab(
    targetPane,
    {
      id: `${connectionId}:${database}:${schemaName || ''}:${tableName}:table`,
      connectionId,
      database,
      schema: schemaName,
      name: tableName,
      type: 'table',
      tabType: 'database'
    },
    'preview'
  )

  await router.push({
    name: 'DatabaseExplorer',
    query: {
      details: 'true',
      db: database
    }
  })
}

async function openTargetInExplorer() {
  if (!canOpenTargetInExplorer.value) return

  const connectionId = props.target.id

  // File-based target: open in file browser
  if (isFileTarget.value) {
    const entry = targetFileEntry.value
    if (!connectionId || !entry) return

    const targetPane = paneTabsStore.activePane || 'left'

    navigationStore.setActiveConnectionId(connectionId)
    connectionsStore.setCurrentConnection(connectionId)
    navigationStore.expandConnection(connectionId)

    // Load file tree entries for the connection so the sidebar can show the file
    await fileExplorerStore.loadEntries(connectionId, false)

    // Walk up from the target path to find and expand each ancestor folder in the tree.
    // Tree entries have full paths (e.g., "/exports/stream_xxx") - we match against them,
    // not against blind path splits.
    const entries = fileExplorerStore.getEntries(connectionId)
    const targetPath = entry.path
    const pathSegments = targetPath.split('/')

    for (let i = pathSegments.length - 1; i > 0; i--) {
      const ancestorPath = pathSegments.slice(0, i).join('/')
      if (!ancestorPath) continue
      const ancestorEntry = findFileEntryByPath(entries, ancestorPath)
      if (ancestorEntry && ancestorEntry.type === 'dir') {
        fileExplorerStore.expandFolder(connectionId, ancestorPath)
        if (!ancestorEntry.isLoaded) {
          await fileExplorerStore.loadFolderContents(connectionId, ancestorPath)
        }
      }
    }

    fileExplorerStore.clearAllSelectionsExcept(connectionId)
    fileExplorerStore.setSelectedPath(connectionId, targetPath)

    if (targetPane === 'left') {
      explorerViewStateStore.selectFile(connectionId, entry.path)
    }

    const tabId = `file:${connectionId}:${entry.path}`
    paneTabsStore.addTab(
      targetPane,
      {
        id: tabId,
        connectionId,
        name: entry.name,
        filePath: entry.path,
        fileEntry: entry,
        fileMetadata: targetFileMetadata.value,
        fileType: entry.type,
        tabType: 'file'
      },
      'preview'
    )

    await router.push({ name: 'DatabaseExplorer' })
    return
  }

  // Database target: open in table view
  const targetPane = paneTabsStore.activePane || 'left'
  const database = targetDatabase.value
  const tableName = selectedTargetParsed.value.table
  const schemaName = resolveSchemaForDialect(
    targetDialect.value,
    selectedTargetParsed.value.schema,
    targetTableMeta.value?.schema,
    targetSchema.value
  )

  if (!connectionId || !database || !tableName) return

  navigationStore.setActiveConnectionId(connectionId)
  connectionsStore.setCurrentConnection(connectionId)
  navigationStore.expandConnection(connectionId)
  navigationStore.expandDatabase(`${connectionId}:${database}`)
  if (schemaName) {
    navigationStore.expandSchema(`${connectionId}:${database}:${schemaName}`)
  }
  await navigationStore.ensureMetadata(connectionId, database)

  navigationStore.selectObject(connectionId, database, schemaName, 'table', tableName)

  if (targetPane === 'left') {
    explorerViewStateStore.selectTable(connectionId, database, 'table', tableName, schemaName)
  } else if (explorerViewStateStore.viewType !== 'table-data') {
    explorerViewStateStore.selectDatabaseTabView(connectionId, database)
  }

  paneTabsStore.addTab(
    targetPane,
    {
      id: `${connectionId}:${database}:${schemaName || ''}:${tableName}:table`,
      connectionId,
      database,
      schema: schemaName,
      name: tableName,
      type: 'table',
      tabType: 'database'
    },
    'preview'
  )

  await router.push({
    name: 'DatabaseExplorer',
    query: {
      details: 'true',
      db: database
    }
  })
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
    const sourceMeta = isFileSource.value ? sourceFileMetadata.value : sourceTableMeta.value
    const mappedState = mapGridState(sourceState, sourceMeta, targetMeta)

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
    const sourceMeta = isFileSource.value ? sourceFileMetadata.value : sourceTableMeta.value
    const mappedState = mapGridState(targetState, targetMeta, sourceMeta)

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
    <div class="ui-surface-toolbar ui-border-default shrink-0 border-b px-6 py-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-200">Compare Table:</span>
          <Menu as="div" class="relative z-1200">
            <MenuButton
              class="ui-surface-raised ui-border-default inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium text-gray-900 transition-colors hover:[background-color:var(--ui-surface-muted)] dark:text-gray-100"
            >
              {{ selectedCompareItem?.label || 'Select a table' }}
              <ChevronDown class="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </MenuButton>
            <MenuItems
              class="ui-surface-floating absolute left-0 top-full z-1300 mt-1 w-56 origin-top-left rounded-md border text-gray-900 dark:text-gray-100 focus:outline-none"
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
                      active ? 'ui-surface-muted' : '',
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
      <div class="ui-border-default flex-1 flex flex-col overflow-hidden border-r">
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
            <div class="flex items-center gap-2">
              <div class="text-xs text-gray-600 dark:text-gray-400">
                <template v-if="isFileSource">
                  {{ selectedCompareItem?.label || selectedTable }}
                </template>
                <template v-else>
                  {{ sourceDatabase }}
                  <span v-if="sourceSchema && sourceSchema !== 'public'">
                    / {{ sourceSchema }}
                  </span>
                  /
                  {{
                    selectedCompareItem?.kind === 'table'
                      ? selectedSourceTableName
                      : selectedCompareItem?.label
                  }}
                </template>
              </div>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-md border border-blue-300/70 dark:border-blue-700/60 px-2 py-1 text-[11px] font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100/70 dark:hover:bg-blue-900/35 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!canOpenSourceInExplorer"
                :title="
                  isFileSource
                    ? 'Open source file in Data Explorer'
                    : 'Open current source table in Data Explorer'
                "
                @click="openSourceInExplorer"
              >
                <ExternalLink class="h-3.5 w-3.5" />
                Explorer
              </button>
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
              class="ui-border-default overflow-auto rounded-md border"
            >
              <table class="w-full text-xs">
                <thead class="ui-surface-muted sticky top-0 z-10">
                  <tr>
                    <th
                      v-for="col in sourceQueryPreview.columns"
                      :key="col"
                      class="ui-border-default whitespace-nowrap border-b px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400"
                    >
                      {{ col }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--ui-border-default)]">
                  <tr
                    v-for="(row, idx) in sourceQueryPreview.rows"
                    :key="idx"
                    class="hover:[background-color:var(--ui-surface-muted)]"
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
          <!-- File Source -->
          <div
            v-else-if="isFileSource && sourceFileEntry"
            class="h-full transition-all duration-300"
            :class="{ 'ring-2 ring-blue-400 ring-opacity-50': syncFlashSource }"
          >
            <AGGridFileDataView
              :key="`compare-source-file-${stream.id}-${selectedTable}`"
              ref="sourceGridRef"
              :entry="sourceFileEntry"
              :metadata="sourceFileMetadata"
              :connection-id="selectedSourceConnectionId"
              :object-key="`compare-source-file-${stream.id}-${selectedTable}`"
              :show-toolbar-actions="false"
              read-only
            />
          </div>
          <div
            v-else-if="isFileSource && sourceFileError"
            class="h-full flex items-center justify-center text-center text-sm text-red-600 dark:text-red-300 px-4"
          >
            {{ sourceFileError }}
          </div>
          <!-- Database Source -->
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
            Loading source {{ isFileSource ? 'file' : 'table' }}...
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
            <div class="flex items-center gap-2">
              <div class="text-xs text-gray-600 dark:text-gray-400">
                <template v-if="isFileTarget">
                  {{ targetFileDisplayName || `${selectedTargetObjectName}.${target.type}` }}
                </template>
                <template v-else>
                  {{ targetDatabase }}
                  <span v-if="targetSchema && targetSchema !== 'public'">
                    / {{ targetSchema }}
                  </span>
                  / {{ selectedTargetObjectName }}
                </template>
              </div>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-md border border-emerald-300/70 dark:border-emerald-700/60 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/35 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!canOpenTargetInExplorer"
                :title="
                  isFileTarget
                    ? 'Open target file in Data Explorer'
                    : 'Open current target table in Data Explorer'
                "
                @click="openTargetInExplorer"
              >
                <ExternalLink class="h-3.5 w-3.5" />
                Explorer
              </button>
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
