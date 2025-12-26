<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ChevronDown, Link, Link2Off } from 'lucide-vue-next'
import { Menu, MenuButton, MenuItems, MenuItem, Switch } from '@headlessui/vue'
import type { SortModelItem } from 'ag-grid-community'
import AGGridDataView from '@/components/database/AGGridDataView.vue'
import AGGridFileDataView from '@/components/files/AGGridFileDataView.vue'
import SchemaComparisonPanel from './SchemaComparisonPanel.vue'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useDatabaseOverviewStore } from '@/stores/databaseOverview'
import { useMonitoringStore } from '@/stores/monitoring'
import { normalizeDataType } from '@/constants/databaseTypes'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection } from '@/types/connections'
import type { SQLTableMeta } from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { FileMetadata } from '@/types/files'
import * as files from '@/api/files'
import type { FileFormat } from '@/utils/fileFormat'

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

const props = defineProps<{
  stream: StreamConfig
  source: Connection
  target: Connection
}>()

const navigationStore = useExplorerNavigationStore()
const overviewStore = useDatabaseOverviewStore()
const monitoringStore = useMonitoringStore()

// Selected table from stream config
const selectedTable = ref<string>('')

// Source and target metadata
const sourceTableMeta = ref<SQLTableMeta | null>(null)
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
  if (!selectedTable.value || !sourceDatabase.value) return 0
  return overviewStore.getTableRowCount(selectedTable.value, props.source.id, sourceDatabase.value)
})

const targetApproxRows = computed(() => {
  if (!selectedTable.value || !targetDatabase.value || isFileTarget.value) return 0
  return overviewStore.getTableRowCount(selectedTable.value, props.target.id, targetDatabase.value)
})

// Check if target is file-based
// Only 'files' is a valid file connection type now (legacy csv/jsonl/parquet removed)
const isFileTarget = computed(() => {
  return props.target.type?.toLowerCase() === 'files'
})

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
  if (!targetFileFormat.value) return selectedTable.value
  const ext = getBaseExtensionForFormat(targetFileFormat.value)
  return ext ? `${selectedTable.value}${ext}` : selectedTable.value
})

// Get list of tables from stream config (tables are now per-connection)
const tablesList = computed(() => {
  const firstConn = props.stream.source?.connections?.[0]
  return (firstConn?.tables || []).map((t) => t.name)
})

const sourceDatabase = computed(() => props.stream.source?.connections?.[0]?.database || undefined)
const targetDatabase = computed(() => {
  const spec = props.stream.target?.spec
  if (spec?.database?.database) return spec.database.database
  if (spec?.snowflake?.database) return spec.snowflake.database
  return undefined
})
const sourceSchema = computed(() => props.stream.source?.connections?.[0]?.schema || undefined)
const targetSchema = computed(() => {
  const spec = props.stream.target?.spec
  if (spec?.database?.schema) return spec.database.schema
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

// Initialize with first table
onMounted(async () => {
  if (tablesList.value.length > 0) {
    selectedTable.value = tablesList.value[0]
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
    if (!sourceDatabase.value) {
      return
    }

    // Ensure metadata is loaded
    await navigationStore.ensureMetadata(props.source.id, sourceDatabase.value)

    // Fetch database overview to get row counts
    try {
      await overviewStore.fetchOverview(props.source.id, sourceDatabase.value)
    } catch (e) {
      console.warn('Failed to fetch source database overview:', e)
    }

    // For MySQL, don't pass schema (database IS the schema)
    // For PostgreSQL, use schema if provided, otherwise default to 'public'
    let schema: string | undefined
    if (props.source.type === 'mysql') {
      schema = undefined // MySQL doesn't use separate schemas
    } else {
      schema = sourceSchema.value || 'public'
    }

    const meta = navigationStore.findTableMeta(
      props.source.id,
      sourceDatabase.value,
      selectedTable.value,
      schema
    )
    sourceTableMeta.value = meta || null
  } catch (error) {
    console.error('Failed to load source table metadata:', error)
  }
}

async function loadTargetTable() {
  try {
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

    // For MySQL, don't pass schema (database IS the schema)
    // For PostgreSQL, use schema if provided, otherwise default to 'public'
    let schema: string | undefined
    if (props.target.type === 'mysql') {
      schema = undefined // MySQL doesn't use separate schemas
    } else {
      schema = targetSchema.value || 'public'
    }

    // Find the table metadata
    const meta = navigationStore.findTableMeta(
      props.target.id,
      targetDatabase.value,
      selectedTable.value,
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

    const tableFolderPath = joinPaths(targetRootPath.value, streamId, selectedTable.value)

    // Instead of loading individual files, we need to pass the FOLDER to DuckDB
    // DuckDB will automatically query all part-*.ext files in the folder
    const detectedFormat = targetFileFormat.value

    if (!detectedFormat) {
      targetFileError.value = `File format not configured for this stream`
      return
    }

    // Create a FileSystemEntry for the folder itself (not individual files)
    // DuckDB will use wildcard patterns like "folder/*.csv.zst" to read all files
    const folderEntry: FileSystemEntry = {
      name: selectedTable.value,
      path: tableFolderPath,
      type: 'dir',
      isTable: true,
      format: detectedFormat
    }

    targetFileEntry.value = folderEntry

    // Get metadata for the entire folder (DuckDB aggregates across all files)
    // Pass target connection ID for S3 credential configuration
    const metadata = await files.getFileMetadata(
      tableFolderPath,
      detectedFormat,
      true,
      props.target.id
    )
    targetFileMetadata.value = metadata
  } catch (error) {
    console.error('Failed to load target file:', error)
    targetFileError.value =
      error instanceof Error ? error.message : 'Failed to load target file metadata'
  }
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
          <Menu as="div" class="relative">
            <MenuButton
              class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {{ selectedTable || 'Select a table' }}
              <ChevronDown class="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </MenuButton>
            <MenuItems
              class="absolute left-0 z-10 mt-1 w-56 origin-top-left rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-white/10 border border-gray-200 dark:border-gray-700 focus:outline-none"
            >
              <div class="py-1">
                <MenuItem
                  v-for="table in tablesList"
                  :key="table"
                  v-slot="{ active }"
                  @click="selectTable(table)"
                >
                  <button
                    :class="[
                      active ? 'bg-gray-100 dark:bg-gray-800' : '',
                      selectedTable === table
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium'
                        : '',
                      'block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200'
                    ]"
                  >
                    {{ table }}
                  </button>
                </MenuItem>
              </div>
            </MenuItems>
          </Menu>

          <!-- Sync Views Toggle -->
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
      :source-connection-type="source.type"
      :target-connection-type="target.type"
      :source-dialect="source.type"
      :target-dialect="target.type"
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
              <span class="text-xs text-gray-600 dark:text-gray-400">{{ source.name }}</span>
            </div>
            <div class="text-xs text-gray-600 dark:text-gray-400">
              {{ sourceDatabase }}
              <span v-if="sourceSchema && sourceSchema !== 'public'"> / {{ sourceSchema }} </span>
              / {{ selectedTable }}
            </div>
          </div>
        </div>

        <!-- Source Data View -->
        <div class="flex-1 overflow-auto p-4">
          <div
            v-if="sourceTableMeta && sourceDatabase"
            class="h-full transition-all duration-300"
            :class="{ 'ring-2 ring-blue-400 ring-opacity-50': syncFlashSource }"
          >
            <AGGridDataView
              :key="`compare-source-${stream.id}-${selectedTable}`"
              ref="sourceGridRef"
              :table-meta="sourceTableMeta"
              :connection-id="source.id"
              :database="sourceDatabase"
              :is-view="false"
              :approx-rows="sourceApproxRows"
              :object-key="`compare-source-${stream.id}-${selectedTable}`"
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
                {{ targetFileDisplayName || `${selectedTable}.${target.type}` }}
              </template>
              <template v-else>
                {{ targetDatabase }}
                <span v-if="targetSchema && targetSchema !== 'public'"> / {{ targetSchema }} </span>
                / {{ selectedTable }}
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
            />
          </div>

          <div
            v-else-if="targetFileError"
            class="h-full flex items-center justify-center text-center text-sm text-red-600 dark:text-red-400 px-4"
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
