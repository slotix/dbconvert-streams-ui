<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ChevronDownIcon } from '@heroicons/vue/24/outline'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import AGGridDataView from '@/components/database/AGGridDataView.vue'
import AGGridFileDataView from '@/components/files/AGGridFileDataView.vue'
import SchemaComparisonPanel from './SchemaComparisonPanel.vue'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection } from '@/types/connections'
import type { SQLTableMeta } from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { FileMetadata } from '@/types/files'
import * as files from '@/api/files'

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
const fileExplorerStore = useFileExplorerStore()

// Selected table from stream config
const selectedTable = ref<string>('')

// Source and target metadata
const sourceTableMeta = ref<SQLTableMeta | null>(null)
const targetTableMeta = ref<SQLTableMeta | null>(null)
const targetFileEntry = ref<FileSystemEntry | null>(null)
const targetFileMetadata = ref<FileMetadata | null>(null)

// Check if target is file-based
const isFileTarget = computed(() => {
  return (
    props.target.type === 'csv' || props.target.type === 'jsonl' || props.target.type === 'parquet'
  )
})

// Get list of tables from stream config
const tablesList = computed(() => {
  return (props.stream.tables || []).map((t) => t.name)
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
    } else if (normalizeType(sourceCol.dataType) !== normalizeType(targetCol.dataType)) {
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

// Normalize data types for comparison
function normalizeType(type: string): string {
  const normalized = type.toUpperCase().trim()

  // MySQL → PostgreSQL equivalents
  const typeMap: Record<string, string> = {
    INT: 'INTEGER',
    TINYINT: 'SMALLINT',
    BIGINT: 'BIGINT',
    DOUBLE: 'DOUBLE PRECISION',
    FLOAT: 'REAL',
    DATETIME: 'TIMESTAMP',
    TEXT: 'TEXT',
    BLOB: 'BYTEA',
    VARCHAR: 'VARCHAR',
    'CHARACTER VARYING': 'VARCHAR', // PostgreSQL verbose form
    CHAR: 'CHAR',
    DECIMAL: 'NUMERIC',
    BOOLEAN: 'BOOLEAN',
    BOOL: 'BOOLEAN'
  }

  // Extract base type (e.g., "VARCHAR(255)" → "VARCHAR")
  const baseType = normalized.split('(')[0].trim()

  return typeMap[baseType] || baseType
}

// Initialize with first table
onMounted(async () => {
  console.log('StreamCompareView mounted with props:', {
    streamId: props.stream.id,
    streamName: props.stream.name,
    sourceDatabase: props.stream.sourceDatabase,
    targetDatabase: props.stream.targetDatabase,
    sourceSchema: props.stream.sourceSchema,
    targetSchema: props.stream.targetSchema,
    tables: props.stream.tables,
    source: props.source,
    target: props.target
  })

  if (tablesList.value.length > 0) {
    selectedTable.value = tablesList.value[0]
    console.log('Selected first table:', selectedTable.value)
    await loadTableData()
  } else {
    console.warn('No tables in stream config')
  }
})

// Load source and target table/file data
async function loadTableData() {
  if (!selectedTable.value) return

  // Load source table metadata
  await loadSourceTable()

  // Load target (either table or file)
  if (isFileTarget.value) {
    await loadTargetFile()
  } else {
    await loadTargetTable()
  }
}

async function loadSourceTable() {
  try {
    console.log('loadSourceTable called with:', {
      sourceDatabase: props.stream.sourceDatabase,
      sourceSchema: props.stream.sourceSchema,
      selectedTable: selectedTable.value,
      sourceId: props.source.id,
      sourceType: props.source.type
    })

    if (!props.stream.sourceDatabase) {
      console.warn('No sourceDatabase in stream config')
      return
    }

    // Ensure metadata is loaded
    console.log('Calling ensureMetadata for source...')
    await navigationStore.ensureMetadata(props.source.id, props.stream.sourceDatabase)
    console.log('ensureMetadata completed for source')

    // For MySQL, don't pass schema (database IS the schema)
    // For PostgreSQL, use schema if provided, otherwise default to 'public'
    let schema: string | undefined
    if (props.source.type === 'mysql') {
      schema = undefined // MySQL doesn't use separate schemas
    } else {
      schema = props.stream.sourceSchema || 'public'
    }

    console.log('Looking for table metadata with schema:', schema)
    const meta = navigationStore.findTableMeta(
      props.source.id,
      props.stream.sourceDatabase,
      selectedTable.value,
      schema
    )
    console.log('Found source table metadata:', meta)
    sourceTableMeta.value = meta || null
  } catch (error) {
    console.error('Failed to load source table metadata:', error)
  }
}

async function loadTargetTable() {
  try {
    if (!props.stream.targetDatabase) return

    // Ensure metadata is loaded
    await navigationStore.ensureMetadata(props.target.id, props.stream.targetDatabase)

    // For MySQL, don't pass schema (database IS the schema)
    // For PostgreSQL, use schema if provided, otherwise default to 'public'
    let schema: string | undefined
    if (props.target.type === 'mysql') {
      schema = undefined // MySQL doesn't use separate schemas
    } else {
      schema = props.stream.targetSchema || 'public'
    }

    // Find the table metadata
    const meta = navigationStore.findTableMeta(
      props.target.id,
      props.stream.targetDatabase,
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
    // Load file entries if not already loaded
    await fileExplorerStore.loadEntries(props.target.id, true)

    // Find the file entry matching the table name
    const entries = fileExplorerStore.getEntries(props.target.id)
    const fileExtension = props.stream.targetFileFormat || props.target.type // csv, jsonl, or parquet
    const fileName = `${selectedTable.value}.${fileExtension}`

    targetFileEntry.value =
      entries.find((entry) => entry.name === fileName || entry.path.endsWith(fileName)) || null

    if (targetFileEntry.value && props.stream.targetFileFormat) {
      // Load file metadata from API - use full path from entry
      const metadata = await files.getFileMetadata(
        targetFileEntry.value.path,
        props.stream.targetFileFormat,
        true
      )
      targetFileMetadata.value = metadata
    }
  } catch (error) {
    console.error('Failed to load target file:', error)
  }
}

// Handle table selection change
async function selectTable(tableName: string) {
  selectedTable.value = tableName
  await loadTableData()
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Table Selector -->
    <div class="px-6 py-3 bg-gray-50 border-b border-gray-200 shrink-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-sm font-medium text-gray-700">Compare Table:</span>
          <Menu as="div" class="relative">
            <MenuButton
              class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              {{ selectedTable || 'Select a table' }}
              <ChevronDownIcon class="h-4 w-4 text-gray-500" />
            </MenuButton>
            <MenuItems
              class="absolute left-0 z-10 mt-1 w-56 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
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
                      active ? 'bg-gray-100' : '',
                      selectedTable === table ? 'bg-teal-50 text-teal-700 font-medium' : '',
                      'block w-full text-left px-4 py-2 text-sm text-gray-700'
                    ]"
                  >
                    {{ table }}
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
      :source-connection-type="source.type"
      :target-connection-type="target.type"
      :source-dialect="source.type"
      :target-dialect="target.type"
    />

    <!-- Split View -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Source Pane (Left) - Orange Theme -->
      <div class="flex-1 flex flex-col border-r border-gray-200 overflow-hidden">
        <!-- Source Header -->
        <div
          class="px-4 py-3 border-b border-orange-100 bg-linear-to-r from-orange-50 to-white shrink-0"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <img src="/images/steps/source-step.svg" alt="Source" class="w-6 h-6" />
              <span
                class="text-sm font-semibold bg-linear-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent"
              >
                Source
              </span>
              <span class="text-xs text-gray-600">{{ source.name }}</span>
            </div>
            <div class="text-xs text-gray-600">
              {{ stream.sourceDatabase }}
              <span v-if="stream.sourceSchema && stream.sourceSchema !== 'public'">
                / {{ stream.sourceSchema }}
              </span>
              / {{ selectedTable }}
            </div>
          </div>
        </div>

        <!-- Source Data View -->
        <div class="flex-1 overflow-auto p-4">
          <div v-if="sourceTableMeta && stream.sourceDatabase" class="h-full">
            <AGGridDataView
              :table-meta="sourceTableMeta"
              :connection-id="source.id"
              :database="stream.sourceDatabase"
              :is-view="false"
              :object-key="`compare-source-${stream.id}-${selectedTable}`"
            />
          </div>
          <div v-else class="h-full flex items-center justify-center text-gray-500 text-sm">
            Loading source table...
          </div>
        </div>
      </div>

      <!-- Target Pane (Right) - Teal Theme -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Target Header -->
        <div
          class="px-4 py-3 border-b border-teal-100 bg-linear-to-r from-teal-50 to-white shrink-0"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <img src="/images/steps/target-step.svg" alt="Target" class="w-6 h-6" />
              <span
                class="text-sm font-semibold bg-linear-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent"
              >
                Target
              </span>
              <span class="text-xs text-gray-600">{{ target.name }}</span>
            </div>
            <div class="text-xs text-gray-600">
              <template v-if="isFileTarget"> {{ selectedTable }}.{{ target.type }} </template>
              <template v-else>
                {{ stream.targetDatabase }}
                <span v-if="stream.targetSchema && stream.targetSchema !== 'public'">
                  / {{ stream.targetSchema }}
                </span>
                / {{ selectedTable }}
              </template>
            </div>
          </div>
        </div>

        <!-- Target Data View -->
        <div class="flex-1 overflow-auto p-4">
          <!-- Database Target -->
          <div v-if="!isFileTarget && targetTableMeta && stream.targetDatabase" class="h-full">
            <AGGridDataView
              :table-meta="targetTableMeta"
              :connection-id="target.id"
              :database="stream.targetDatabase"
              :is-view="false"
              :object-key="`compare-target-${stream.id}-${selectedTable}`"
            />
          </div>

          <!-- File Target -->
          <div v-else-if="isFileTarget && targetFileEntry && targetFileMetadata" class="h-full">
            <AGGridFileDataView
              :entry="targetFileEntry"
              :metadata="targetFileMetadata"
              :connection-id="target.id"
            />
          </div>

          <!-- Loading/Error State -->
          <div v-else class="h-full flex items-center justify-center text-gray-500 text-sm">
            Loading target {{ isFileTarget ? 'file' : 'table' }}...
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
