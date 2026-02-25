<template>
  <div class="space-y-3">
    <!-- Header Bar -->
    <div
      class="flex flex-wrap items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <!-- Table count badge -->
      <div
        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 text-sm font-medium"
      >
        <span class="text-teal-600 dark:text-teal-400">{{ checkedTablesCount }}</span>
        <span class="text-gray-400">/</span>
        <span class="text-gray-600 dark:text-gray-300">{{ tables.length }}</span>
      </div>

      <!-- Filter input - grows to fill space -->
      <div class="flex-1 min-w-[180px]">
        <div class="relative">
          <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Filter tables..."
            class="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      </div>

      <!-- Select All -->
      <div class="inline-flex items-center">
        <FormCheckbox
          :model-value="selectAllCheckboxState"
          :indeterminate="indeterminate"
          label="All"
          @update:model-value="setSelectAllFromValue"
        />
      </div>

      <!-- Refresh button -->
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title="Refresh tables"
        @click="debouncedRefreshTables"
      >
        <RefreshCw class="w-4 h-4" />
        <span class="hidden sm:inline">Refresh</span>
      </button>
    </div>

    <!-- Table List Container with scroll -->
    <div
      class="bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden overflow-y-auto"
      :style="listContainerStyle"
    >
      <!-- Empty State -->
      <div
        v-if="filteredTablesCount === 0"
        class="text-center text-gray-500 dark:text-gray-400 py-8 text-sm"
      >
        No tables found
      </div>

      <!-- Table Grid -->
      <div v-else>
        <!-- Multi-source Mode: Group by connection -->
        <template v-if="isFederatedMode">
          <template
            v-for="connectionGroup in multiSourceGroupedTables"
            :key="connectionGroup.alias"
          >
            <!-- Connection Header -->
            <div
              class="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-linear-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-b-2 border-amber-200 dark:border-amber-700 cursor-pointer backdrop-blur-sm"
              @click="toggleConnectionGroup(connectionGroup.alias)"
            >
              <div class="flex items-center gap-3">
                <component
                  :is="
                    isConnectionGroupExpanded(connectionGroup.alias) ? ChevronDown : ChevronRight
                  "
                  class="h-4 w-4 text-amber-600 dark:text-amber-400"
                />
                <component
                  :is="getConnectionIcon(connectionGroup.connectionType)"
                  class="w-5 h-5"
                  :class="getConnectionIconColor(connectionGroup.connectionType)"
                />
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-bold text-amber-900 dark:text-amber-100">
                      {{ connectionGroup.alias }}
                    </span>
                    <span class="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      {{ connectionGroup.connectionName }}
                    </span>
                    <span
                      v-if="connectionGroup.database"
                      class="text-xs text-amber-500 dark:text-amber-400"
                    >
                      / {{ connectionGroup.database }}
                    </span>
                  </div>
                </div>
                <span
                  class="text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 rounded px-2 py-0.5 font-medium"
                >
                  {{ connectionGroup.tableCount }} tables
                </span>
              </div>
              <div class="flex items-center gap-3">
                <button
                  class="text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium"
                  @click.stop="selectAllInConnection(connectionGroup.alias)"
                >
                  Select All
                </button>
                <button
                  class="text-xs text-amber-500 dark:text-amber-400 hover:underline"
                  @click.stop="clearAllInConnection(connectionGroup.alias)"
                >
                  Clear
                </button>
              </div>
            </div>

            <!-- Schema Groups within Connection -->
            <template v-if="isConnectionGroupExpanded(connectionGroup.alias)">
              <template
                v-for="schemaGroup in connectionGroup.schemas"
                :key="`${connectionGroup.alias}-${schemaGroup.schema}`"
              >
                <!-- Schema Header (if applicable) -->
                <div
                  v-if="schemaGroup.schema"
                  class="sticky top-[52px] z-10 flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-700 cursor-pointer backdrop-blur-sm ml-6"
                  @click="toggleSchema(`${connectionGroup.alias}-${schemaGroup.schema}`)"
                >
                  <div class="flex items-center gap-2">
                    <component
                      :is="
                        isSchemaExpanded(`${connectionGroup.alias}-${schemaGroup.schema}`)
                          ? ChevronDown
                          : ChevronRight
                      "
                      class="h-4 w-4 text-gray-400"
                    />
                    <Grid2X2 class="w-4 h-4 text-teal-500 dark:text-teal-400 shrink-0" />
                    <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {{ schemaGroup.schema }}
                    </span>
                    <span
                      class="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 rounded px-2 py-0.5"
                    >
                      {{ schemaGroup.tables.length }}
                    </span>
                  </div>
                </div>

                <!-- Tables Grid -->
                <div
                  v-if="
                    !schemaGroup.schema ||
                    isSchemaExpanded(`${connectionGroup.alias}-${schemaGroup.schema}`)
                  "
                  class="grid grid-cols-1 lg:grid-cols-2"
                  :class="
                    schemaGroup.schema
                      ? 'border-l-2 border-amber-200 dark:border-amber-700 ml-9'
                      : 'ml-6'
                  "
                >
                  <template v-for="(table, idx) in schemaGroup.tables" :key="table.name">
                    <!-- Table Row -->
                    <div
                      class="group flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      :class="[
                        idx % 2 === 0
                          ? 'lg:border-r lg:border-r-gray-100 lg:dark:border-r-gray-800'
                          : ''
                      ]"
                    >
                      <!-- Checkbox -->
                      <input
                        :id="`table-${table.name}`"
                        v-model="table.selected"
                        type="checkbox"
                        class="h-4 w-4 text-teal-600 dark:text-teal-500 focus:ring-teal-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 shrink-0"
                        @change="
                          handleCheckboxChange(
                            table,
                            ($event.target as HTMLInputElement)?.checked || false
                          )
                        "
                      />
                      <TableIcon class="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                      <label
                        :for="`table-${table.name}`"
                        class="flex-1 min-w-0 cursor-pointer text-sm text-gray-900 dark:text-gray-100 truncate"
                      >
                        <HighlightedText
                          :text="getTableDisplayName(table.name)"
                          :query="searchQuery"
                        />
                      </label>

                      <!-- Filter indicator/toggle - only when selected and not CDC -->
                      <button
                        v-if="table.selected && !isCDCMode"
                        class="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all"
                        :class="
                          isTableSettingsOpen(table.name)
                            ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                            : hasTableFilter(table)
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                              : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700'
                        "
                        :title="hasTableFilter(table) ? 'Edit filter' : 'Add filter'"
                        @click="toggleTableSettings(table.name)"
                      >
                        <Filter class="w-3.5 h-3.5" />
                        <span v-if="hasTableFilter(table)" class="hidden sm:inline">filtered</span>
                        <ChevronUp v-if="isTableSettingsOpen(table.name)" class="w-3 h-3" />
                      </button>
                    </div>
                  </template>
                </div>
              </template>
            </template>
          </template>
        </template>

        <!-- Non-Federated Mode: Original grouping -->
        <template v-else>
          <template v-for="schemaGroup in groupedTables" :key="schemaGroup.schema">
            <!-- Schema Header - PostgreSQL only -->
            <div
              v-if="sourceConnectionType === 'postgresql' && schemaGroup.schema"
              class="sticky top-0 z-10 flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-700 cursor-pointer backdrop-blur-sm"
              @click="toggleSchema(schemaGroup.schema)"
            >
              <div class="flex items-center gap-2">
                <component
                  :is="isSchemaExpanded(schemaGroup.schema) ? ChevronDown : ChevronRight"
                  class="h-4 w-4 text-gray-400"
                />
                <Grid2X2 class="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{
                  schemaGroup.schema
                }}</span>
                <span
                  class="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 rounded px-2 py-0.5"
                >
                  {{ schemaGroup.tables.length }}
                </span>
              </div>
              <div class="flex items-center gap-3">
                <button
                  class="text-xs text-teal-600 dark:text-teal-400 hover:underline"
                  @click.stop="selectAllInSchema(schemaGroup.schema)"
                >
                  Select
                </button>
                <button
                  class="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                  @click.stop="clearAllInSchema(schemaGroup.schema)"
                >
                  Clear
                </button>
              </div>
            </div>

            <!-- Tables Grid - 2 columns on wider screens -->
            <div
              v-if="sourceConnectionType !== 'postgresql' || isSchemaExpanded(schemaGroup.schema)"
              class="grid grid-cols-1 lg:grid-cols-2"
              :class="
                sourceConnectionType === 'postgresql' && schemaGroup.schema
                  ? 'border-l-2 border-gray-200 dark:border-gray-700 ml-3'
                  : ''
              "
            >
              <template v-for="(table, idx) in schemaGroup.tables" :key="table.name">
                <!-- Table Row -->
                <div
                  class="group flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  :class="[
                    idx % 2 === 0
                      ? 'lg:border-r lg:border-r-gray-100 lg:dark:border-r-gray-800'
                      : ''
                  ]"
                >
                  <!-- Checkbox -->
                  <input
                    :id="`table-${table.name}`"
                    v-model="table.selected"
                    type="checkbox"
                    class="h-4 w-4 text-teal-600 dark:text-teal-500 focus:ring-teal-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 shrink-0"
                    @change="
                      handleCheckboxChange(
                        table,
                        ($event.target as HTMLInputElement)?.checked || false
                      )
                    "
                  />

                  <!-- Table Icon -->
                  <TableIcon class="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />

                  <!-- Table Name -->
                  <label
                    :for="`table-${table.name}`"
                    class="flex-1 min-w-0 cursor-pointer text-sm text-gray-900 dark:text-gray-100 truncate"
                  >
                    <HighlightedText :text="getTableDisplayName(table.name)" :query="searchQuery" />
                  </label>

                  <!-- Row count badge (informational only, shown if overview data is cached) -->
                  <span
                    v-if="getTableRowCount(table.name) !== undefined"
                    class="text-xs px-1.5 py-0.5 rounded shrink-0 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    title="Approximate row count"
                  >
                    {{ formatRowCount(getTableRowCount(table.name)) }}
                  </span>

                  <!-- Filter indicator/toggle - only when selected and not CDC -->
                  <button
                    v-if="table.selected && !isCDCMode"
                    class="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all"
                    :class="
                      isTableSettingsOpen(table.name)
                        ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                        : hasTableFilter(table)
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                          : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700'
                    "
                    :title="hasTableFilter(table) ? 'Edit filter' : 'Add filter'"
                    @click="toggleTableSettings(table.name)"
                  >
                    <Filter class="w-3.5 h-3.5" />
                    <span v-if="hasTableFilter(table)" class="hidden sm:inline">filtered</span>
                    <ChevronUp v-if="isTableSettingsOpen(table.name)" class="w-3 h-3" />
                  </button>
                </div>
              </template>
            </div>
          </template>
        </template>
      </div>
    </div>

    <SlideOverPanel
      :open="Boolean(activeFilterTableName) && !isCDCMode"
      title="Data Filter"
      :subtitle="activeFilterTable ? getTableDisplayName(activeFilterTable.name) : ''"
      size="xl"
      body-padding
      @close="closeTableSettingsDrawer"
    >
      <TableSettings
        v-if="activeFilterTable"
        :key="activeFilterTable.name"
        :table="activeFilterTable"
      />
    </SlideOverPanel>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useDatabaseOverviewStore } from '@/stores/databaseOverview'
import { useSelectableList } from '@/composables/useSelectableList'
import FormCheckbox from '@/components/base/FormCheckbox.vue'
import SlideOverPanel from '@/components/common/SlideOverPanel.vue'
import HighlightedText from '@/components/common/HighlightedText.vue'
import TableSettings from './TableSettings.vue'
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Filter,
  Grid2X2,
  RefreshCw,
  Search,
  Sheet as TableIcon
} from 'lucide-vue-next'
import { debounce } from '@/utils/debounce'
import { type StreamConfig, type Table } from '@/types/streamConfig'
import { isFederatedMode as checkFederatedMode, parseTableName } from '@/utils/federatedUtils'
import { getConnectionTypeLabel } from '@/types/specs'

const props = withDefaults(
  defineProps<{
    listMaxHeight?: string
    listHeight?: string
  }>(),
  {
    listMaxHeight: '500px',
    listHeight: undefined
  }
)

const listContainerStyle = computed(() => {
  if (props.listHeight) {
    return {
      height: props.listHeight,
      maxHeight: props.listHeight
    }
  }
  return {
    maxHeight: props.listMaxHeight
  }
})

const streamsStore = useStreamsStore()
const connectionStore = useConnectionsStore()
const overviewStore = useDatabaseOverviewStore()
const currentStreamConfig = computed(() => streamsStore.currentStreamConfig as StreamConfig)
const sourceConnections = computed(() => currentStreamConfig.value.source?.connections || [])

// Non-federated streams behave as single-source in this view.
// We treat connections[0] as the default/only source connection for metadata lookups.
const firstSourceConnectionId = computed(
  () => currentStreamConfig.value.source?.connections?.[0]?.connectionId
)

// Get the source connection to determine database type
const sourceConnection = computed(() => {
  const connId = firstSourceConnectionId.value
  if (!connId) return undefined
  return connectionStore.connections.find((conn) => conn.id === connId)
})

const sourceConnectionType = computed(
  () => getConnectionTypeLabel(sourceConnection.value?.spec, sourceConnection.value?.type) || ''
)

// Initialize tables from _allTablesWithState if available (preserves unselected tables during navigation)
// Otherwise, fall back to first connection's tables (only selected tables from saved config)
const initTables =
  currentStreamConfig.value._allTablesWithState ||
  currentStreamConfig.value.source?.connections?.[0]?.tables
const tables = ref<Table[]>(
  initTables?.map((table: Table) => ({
    name: table.name,
    filter: table.filter,
    // If using _allTablesWithState, use the explicit selected property (default false if undefined)
    // If using connection tables, mark as selected because backend only stores selected tables
    selected: currentStreamConfig.value._allTablesWithState ? (table.selected ?? false) : true
  })) || []
)

const searchQuery = ref('')
const activeFilterTableName = ref<string | null>(null)
const expandedSchemas = ref(new Set<string>())
const schemasInitialized = ref(false)

// Schema grouping logic
interface SchemaGroup {
  schema: string
  tables: Table[]
}

function buildGroupedTables(tablesToGroup: Table[], initializeSchemas = false): SchemaGroup[] {
  const schemaMap = new Map<string, Table[]>()

  tablesToGroup.forEach((table) => {
    const schema = getTableSchema(table.name)
    if (!schemaMap.has(schema)) {
      schemaMap.set(schema, [])
    }
    schemaMap.get(schema)!.push(table)
  })

  let groups = Array.from(schemaMap.entries()).map(([schema, tables]) => ({
    schema,
    tables: tables
      .slice()
      .sort((a, b) => getTableDisplayName(a.name).localeCompare(getTableDisplayName(b.name)))
  }))

  if (sourceConnectionType.value !== 'postgresql') {
    const allTables = groups.flatMap((group) => group.tables)
    return [
      {
        schema: '',
        tables: allTables
          .slice()
          .sort((a, b) => getTableDisplayName(a.name).localeCompare(getTableDisplayName(b.name)))
      }
    ]
  }

  groups.sort((a, b) => {
    if (a.schema === 'public') return -1
    if (b.schema === 'public') return 1
    return a.schema.localeCompare(b.schema)
  })

  if (initializeSchemas && !schemasInitialized.value && groups.length > 0) {
    if (groups.length === 1) {
      expandedSchemas.value.add(groups[0].schema)
    } else {
      const publicSchema = groups.find((g) => g.schema === 'public')
      if (publicSchema) {
        expandedSchemas.value.add('public')
      } else {
        expandedSchemas.value.add(groups[0].schema)
      }
    }
    schemasInitialized.value = true
  }

  return groups
}

const filteredTables = computed(() => {
  if (!searchQuery.value) {
    return tables.value
  }
  const query = searchQuery.value.toLowerCase()
  return tables.value.filter(
    (item) =>
      getTableDisplayName(item.name).toLowerCase().includes(query) ||
      item.name.toLowerCase().includes(query)
  )
})

// Use selectable list composable for selection state
const {
  selectedCount: checkedTablesCount,
  indeterminate,
  selectAllState: selectAllCheckboxState
} = useSelectableList(tables)

// Check if current mode is CDC - table-level settings are not needed for CDC mode
const isCDCMode = computed(() => {
  return currentStreamConfig.value.mode === 'cdc'
})

const groupedTables = computed<SchemaGroup[]>(() => buildGroupedTables(filteredTables.value, true))
const filteredTablesCount = computed(() => filteredTables.value.length)

// Federated mode detection
const isFederatedMode = computed(() => checkFederatedMode(sourceConnections.value))

// Federated connection grouping
interface ConnectionGroup {
  alias: string
  connectionId: string
  connectionName: string
  connectionType: string
  database: string
  schemas: SchemaGroup[]
  tableCount: number
}

const expandedConnectionGroups = ref(new Set<string>())

const multiSourceGroupedTables = computed<ConnectionGroup[]>(() => {
  if (!isFederatedMode.value) return []

  const connectionMap = new Map<string, ConnectionGroup>()

  // Group tables by alias (connection)
  filteredTables.value.forEach((table) => {
    const parts = table.name.split('.')
    if (parts.length < 2) return

    const alias = parts[0]

    // Find the connection mapping for this alias
    const fedConn = sourceConnections.value.find((fc) => fc.alias === alias)
    if (!fedConn) return

    // Find the actual connection details
    const connection = connectionStore.connections.find((c) => c.id === fedConn.connectionId)
    if (!connection) return

    // Get or create connection group
    if (!connectionMap.has(alias)) {
      connectionMap.set(alias, {
        alias,
        connectionId: fedConn.connectionId,
        connectionName: connection.name,
        connectionType: getConnectionTypeLabel(connection.spec, connection.type) || '',
        database: fedConn.database || '',
        schemas: [],
        tableCount: 0
      })
      // Auto-expand all groups by default
      expandedConnectionGroups.value.add(alias)
    }

    const group = connectionMap.get(alias)!
    group.tableCount++

    // Parse schema from table name
    let schema = ''
    if (parts.length === 3) {
      schema = parts[1] // alias.schema.table
    }

    // Find or create schema group
    let schemaGroup = group.schemas.find((s) => s.schema === schema)
    if (!schemaGroup) {
      schemaGroup = { schema, tables: [] }
      group.schemas.push(schemaGroup)
    }

    schemaGroup.tables.push(table)
  })

  // Sort tables within each schema
  connectionMap.forEach((connGroup) => {
    connGroup.schemas.forEach((schemaGroup) => {
      schemaGroup.tables.sort((a, b) =>
        getTableDisplayName(a.name).localeCompare(getTableDisplayName(b.name))
      )
    })

    // Sort schemas: put common schemas first (public, dbo), then alphabetically
    connGroup.schemas.sort((a, b) => {
      const commonSchemas = ['public', 'dbo']
      const aIsCommon = commonSchemas.includes(a.schema)
      const bIsCommon = commonSchemas.includes(b.schema)

      if (aIsCommon && !bIsCommon) return -1
      if (!aIsCommon && bIsCommon) return 1
      return a.schema.localeCompare(b.schema)
    })
  })

  return Array.from(connectionMap.values())
})

// Helper functions - use shared utilities for parsing
function getTableSchema(tableName: string): string {
  const isFederated = isFederatedMode.value
  const parsed = parseTableName(tableName, isFederated)

  if (isFederated && parsed.alias) {
    // Federated format: show "alias (schema)" or just "alias"
    return parsed.schema ? `${parsed.alias} (${parsed.schema})` : parsed.alias
  }

  // Non-federated: return schema if present
  if (parsed.schema) {
    return parsed.schema
  }

  // For PostgreSQL, default to 'public' schema
  // For MySQL and others, return empty string (no schema grouping)
  return sourceConnectionType.value === 'postgresql' ? 'public' : ''
}

function getTableDisplayName(tableName: string): string {
  const isFederated = isFederatedMode.value
  const parsed = parseTableName(tableName, isFederated)
  return parsed.table
}

// Get the row count for a table from the overview store (cached data only)
function getTableRowCount(tableName: string): number | undefined {
  const connId = firstSourceConnectionId.value
  const database = currentStreamConfig.value.sourceDatabase
  if (!connId || !database) return undefined
  // Only returns data if overview was already loaded (no API call)
  return overviewStore.getTableRowCount(tableName, connId, database)
}

// Format row count for display
function formatRowCount(count: number | undefined): string {
  if (count === undefined) return ''
  if (count === 0) return '0 rows'
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M rows`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K rows`
  return `${count} rows`
}

function isSchemaExpanded(schema: string): boolean {
  // For non-PostgreSQL databases, always show tables (no schema grouping)
  if (sourceConnectionType.value !== 'postgresql' || schema === '') {
    return true
  }
  return expandedSchemas.value.has(schema)
}

function toggleSchema(schema: string) {
  // Only allow toggling for PostgreSQL with non-empty schemas
  if (sourceConnectionType.value !== 'postgresql' || schema === '') {
    return
  }

  if (expandedSchemas.value.has(schema)) {
    expandedSchemas.value.delete(schema)
  } else {
    expandedSchemas.value.add(schema)
  }
}

function selectAllInSchema(schema: string) {
  const schemaGroup = groupedTables.value.find((g) => g.schema === schema)
  if (schemaGroup) {
    schemaGroup.tables.forEach((table) => {
      table.selected = true
    })
  }
}

function clearAllInSchema(schema: string) {
  const schemaGroup = groupedTables.value.find((g) => g.schema === schema)
  if (schemaGroup) {
    schemaGroup.tables.forEach((table) => {
      table.selected = false
    })
  }
}

// Federated connection group helpers
function getConnectionIcon(connectionType: string) {
  // Map database types to Lucide icons
  type IconComponent = typeof TableIcon
  const iconMap: Record<string, IconComponent> = {
    mysql: TableIcon,
    postgresql: TableIcon,
    postgres: TableIcon,
    snowflake: TableIcon,
    sqlite: TableIcon
  }
  return iconMap[connectionType.toLowerCase()] || TableIcon
}

function getConnectionIconColor(connectionType: string) {
  // Map database types to color classes
  const colorMap: Record<string, string> = {
    mysql: 'text-orange-500',
    postgresql: 'text-blue-500',
    postgres: 'text-blue-500',
    snowflake: 'text-cyan-500',
    sqlite: 'text-gray-500'
  }
  return colorMap[connectionType.toLowerCase()] || 'text-gray-500'
}

function isConnectionGroupExpanded(alias: string): boolean {
  return expandedConnectionGroups.value.has(alias)
}

function toggleConnectionGroup(alias: string) {
  if (expandedConnectionGroups.value.has(alias)) {
    expandedConnectionGroups.value.delete(alias)
  } else {
    expandedConnectionGroups.value.add(alias)
  }
}

function selectAllInConnection(alias: string) {
  const connGroup = multiSourceGroupedTables.value.find((g) => g.alias === alias)
  if (connGroup) {
    connGroup.schemas.forEach((schemaGroup) => {
      schemaGroup.tables.forEach((table) => {
        table.selected = true
      })
    })
  }
}

function clearAllInConnection(alias: string) {
  const connGroup = multiSourceGroupedTables.value.find((g) => g.alias === alias)
  if (connGroup) {
    connGroup.schemas.forEach((schemaGroup) => {
      schemaGroup.tables.forEach((table) => {
        table.selected = false
      })
    })
  }
}

function toggleTableSettings(tableName: string) {
  activeFilterTableName.value = activeFilterTableName.value === tableName ? null : tableName
}

function isTableSettingsOpen(tableName: string): boolean {
  return activeFilterTableName.value === tableName
}

const activeFilterTable = computed(() => {
  if (!activeFilterTableName.value) return null
  return tables.value.find((table) => table.name === activeFilterTableName.value) || null
})

function closeTableSettingsDrawer() {
  activeFilterTableName.value = null
}

function hasTableFilter(table: Table): boolean {
  if (!table.filter) return false
  const f = table.filter
  const hasColumns = f.selectedColumns && f.selectedColumns.length > 0
  const hasFilters = f.filters && f.filters.length > 0
  const hasSorts = f.sorts && f.sorts.length > 0
  const hasLimit = f.limit !== undefined && f.limit !== null
  return hasColumns || hasFilters || hasSorts || hasLimit
}

function handleCheckboxChange(table: Table, checked: boolean) {
  table.selected = checked
}

function setSelectAllFromValue(value: boolean | unknown[]) {
  const selectAll = Array.isArray(value) ? value.length > 0 : value
  filteredTables.value.forEach((table) => {
    table.selected = selectAll
  })
}

const refreshTables = async () => {
  const commonStore = useCommonStore()
  const connectionStore = useConnectionsStore()
  const navigationStore = useExplorerNavigationStore()
  try {
    // Check if multi-source mode
    const isFederated = isFederatedMode.value

    if (isFederated && sourceConnections.value.length > 0) {
      // Multi-source mode: Load tables from all connections
      const allTableNames: string[] = []

      // Build maps of existing selections and filters to preserve state
      const existingSelections = new Map<string, boolean>()
      const existingFilters = new Map<string, Table['filter']>()

      // First, get selections from component state (includes unselected tables)
      tables.value.forEach((table) => {
        existingSelections.set(table.name, table.selected ?? false)
        if (table.filter) {
          existingFilters.set(table.name, table.filter)
        }
      })

      // Then overlay with stream config (only selected tables, but has authoritative state)
      // Tables are now per-connection, so collect from all connections
      // In federated mode, saved table names don't have alias prefix (e.g., "public.actor")
      // but displayed names do (e.g., "src.public.actor"), so add both versions
      for (const conn of currentStreamConfig.value.source?.connections || []) {
        if (conn.tables) {
          conn.tables.forEach((table) => {
            // Store with original saved name
            existingSelections.set(table.name, table.selected ?? true)
            if (table.filter) {
              existingFilters.set(table.name, table.filter)
            }
            // Also store with alias prefix for federated mode matching
            if (conn.alias) {
              const aliasedName = `${conn.alias}.${table.name}`
              existingSelections.set(aliasedName, table.selected ?? true)
              if (table.filter) {
                existingFilters.set(aliasedName, table.filter)
              }
            }
          })
        }
      }

      for (const fedConn of sourceConnections.value) {
        const connectionId = fedConn.connectionId
        const database = fedConn.database
        const alias = fedConn.alias

        if (!database) continue

        // For PostgreSQL and other multi-schema databases, filter out system schemas
        let schemaFilter: string[] | undefined
        if (connectionStore.supportsMultiSchema(connectionId)) {
          await navigationStore.ensureDatabases(connectionId)
          const userSchemas = navigationStore.getFilteredSchemas(connectionId, database)
          if (userSchemas && userSchemas.length > 0) {
            schemaFilter = userSchemas.map((s) => s.name)
          }
        }

        // Fetch metadata
        await navigationStore.ensureMetadata(connectionId, database, true)
        const metadata = navigationStore.getMetadata(connectionId, database)

        if (metadata?.tables) {
          Object.values(metadata.tables).forEach((tableMeta) => {
            // Filter by schema if needed
            if (schemaFilter && !schemaFilter.includes(tableMeta.schema)) {
              return
            }

            // Prefix table name with alias for multi-source mode
            const tableName = `${alias}.${tableMeta.schema ? tableMeta.schema + '.' : ''}${tableMeta.name}`
            allTableNames.push(tableName)
          })
        }
      }

      // Map table names and preserve existing selections/filters
      // In create mode (no stream ID), select all tables by default
      // In edit mode (has stream ID), only keep previously selected tables, new ones default to false
      const isEditMode = Boolean(currentStreamConfig.value.id)

      tables.value = allTableNames.map((name: string) => {
        const hasExistingSelection = existingSelections.has(name)

        // Tables that were previously selected should remain selected
        // In edit mode: new tables default to false; in create mode: new tables default to true
        const selected = hasExistingSelection ? existingSelections.get(name)! : !isEditMode

        const filter = existingFilters.get(name)

        if (currentStreamConfig.value.mode === 'cdc') {
          return {
            name,
            selected
          }
        } else {
          return {
            name,
            filter,
            selected
          }
        }
      })
      return
    }

    // Single source mode (existing logic)
    const connectionId = firstSourceConnectionId.value
    if (!connectionId) {
      tables.value = []
      return
    }
    const database = currentStreamConfig.value.sourceDatabase || undefined

    if (!database) {
      tables.value = []
      return
    }

    // For PostgreSQL and other multi-schema databases, filter out system schemas
    let schemaFilter: string[] | undefined
    if (connectionStore.supportsMultiSchema(connectionId)) {
      // Ensure databases are loaded to get schema information
      await navigationStore.ensureDatabases(connectionId)

      // Get user schemas only (excluding system schemas)
      const userSchemas = navigationStore.getFilteredSchemas(connectionId, database)
      if (userSchemas && userSchemas.length > 0) {
        schemaFilter = userSchemas.map((s) => s.name)
      }
    }

    // Fetch metadata (includes ALL tables) - overview is NOT fetched here
    // Row counts will only be shown if overview was already loaded (e.g., from Database Explorer)
    await navigationStore.ensureMetadata(connectionId, database, true)

    // Get all tables from metadata (includes empty tables)
    const metadata = navigationStore.getMetadata(connectionId, database)
    const allTableNames: string[] = []

    if (metadata?.tables) {
      Object.values(metadata.tables).forEach((tableMeta) => {
        // Filter by schema if needed
        if (schemaFilter) {
          if (schemaFilter.includes(tableMeta.schema)) {
            // Include schema prefix for PostgreSQL
            const fullName = tableMeta.schema
              ? `${tableMeta.schema}.${tableMeta.name}`
              : tableMeta.name
            allTableNames.push(fullName)
          }
        } else {
          allTableNames.push(tableMeta.name)
        }
      })
    }

    // Create a map of existing selections to preserve state
    // Check both the component's tables ref AND the stream config
    const existingSelections = new Map<string, boolean>()
    const existingFilters = new Map<string, Table['filter']>()

    // First, get selections from component state (includes unselected tables)
    tables.value.forEach((table) => {
      existingSelections.set(table.name, table.selected ?? false)
      if (table.filter) {
        existingFilters.set(table.name, table.filter)
      }
    })

    // Then overlay with stream config (only selected tables, but has authoritative state)
    // Backend only stores selected tables, so mark them as selected
    // Tables are now per-connection, so collect from all connections
    for (const conn of currentStreamConfig.value.source?.connections || []) {
      if (conn.tables) {
        conn.tables.forEach((table) => {
          existingSelections.set(table.name, table.selected ?? true)
          if (table.filter) {
            existingFilters.set(table.name, table.filter)
          }

          if (!table.name.includes('.')) {
            const schema = conn.schema
            if (schema) {
              const schemaName = `${schema}.${table.name}`
              existingSelections.set(schemaName, table.selected ?? true)
              if (table.filter) {
                existingFilters.set(schemaName, table.filter)
              }
            }
          }
        })
      }
    }

    // Map the response and preserve existing selections
    // In create mode (no stream ID), select all tables by default
    // In edit mode (has stream ID), only keep previously selected tables, new ones default to false
    const isEditMode = Boolean(currentStreamConfig.value.id)

    tables.value = allTableNames.map((name: string) => {
      const hasExistingSelection = existingSelections.has(name)

      // Tables that were previously selected should remain selected
      // In edit mode: new tables default to false; in create mode: new tables default to true
      const selected = hasExistingSelection ? existingSelections.get(name)! : !isEditMode

      const filter = existingFilters.get(name)

      if (currentStreamConfig.value.mode === 'cdc') {
        return {
          name,
          selected
        }
      } else {
        return {
          name,
          filter,
          selected
        }
      }
    })

    // Reset schema initialization so expansion logic runs again
    schemasInitialized.value = false
    expandedSchemas.value.clear()
  } catch (err) {
    tables.value = []
    if (err instanceof Error) {
      commonStore.showNotification(err.message, 'error')
    } else {
      commonStore.showNotification('An unknown error occurred.', 'error')
    }
  }
}

watch(
  () => firstSourceConnectionId.value,
  async (newSourceId, oldSourceId) => {
    // Refresh tables if source ID changed
    if (newSourceId && newSourceId !== oldSourceId) {
      await refreshTables()
    }
  },
  { immediate: true } // Auto-load tables when component mounts with a source already set
)

const debouncedRefreshTables = debounce(refreshTables, 500)

watch(
  tables,
  (newTables) => {
    if (
      activeFilterTableName.value &&
      !newTables.some((table) => table.name === activeFilterTableName.value && table.selected)
    ) {
      activeFilterTableName.value = null
    }

    // Store the full table list (including unselected) in _allTablesWithState for UI navigation
    currentStreamConfig.value._allTablesWithState = newTables

    // Only store selected tables in stream config (for saving/execution)
    const selectedTables = newTables.filter((table) => table.selected)
    const connections = currentStreamConfig.value.source?.connections || []

    if (connections.length <= 1) {
      // Single-source: all tables go to the first connection
      const firstConn = connections[0]
      if (firstConn) {
        firstConn.tables = selectedTables
      }
    } else {
      // Multi-source (federated): distribute tables to their respective connections by alias
      // Table names are prefixed with alias: "src.tablename" or "src2.schema.tablename"
      // We need to strip the alias prefix when storing, as backend knows which connection to use
      // Clear all connection tables first
      for (const conn of connections) {
        conn.tables = []
      }

      for (const table of selectedTables) {
        // Extract alias from table name (first segment before the dot)
        // e.g., "src.actor" -> alias="src", rest="actor"
        // e.g., "src2.public.actor" -> alias="src2", rest="public.actor"
        const aliasMatch = table.name.match(/^([^.]+)\.(.+)$/)
        const tableAlias = aliasMatch ? aliasMatch[1] : null
        // Get the table name without the alias prefix
        const tableNameWithoutAlias = aliasMatch ? aliasMatch[2] : table.name

        // Find matching connection by alias
        const targetConn = tableAlias
          ? connections.find((c) => c.alias === tableAlias)
          : connections[0]

        if (targetConn) {
          if (!targetConn.tables) {
            targetConn.tables = []
          }
          // Store table with name stripped of alias prefix
          targetConn.tables.push({
            ...table,
            name: tableNameWithoutAlias
          })
        }
      }
    }
  },
  { deep: true }
)
</script>
