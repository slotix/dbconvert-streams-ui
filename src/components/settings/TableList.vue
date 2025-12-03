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
          <MagnifyingGlassIcon
            class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Filter tables..."
            class="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      </div>

      <!-- Select All -->
      <label class="inline-flex items-center gap-2 cursor-pointer group">
        <input
          :checked="selectAllCheckboxState"
          :indeterminate="indeterminate"
          type="checkbox"
          class="h-4 w-4 text-teal-600 dark:text-teal-500 focus:ring-teal-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
          @change="toggleSelectAll"
        />
        <span
          class="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200"
          >All</span
        >
      </label>

      <!-- Refresh button -->
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title="Refresh tables"
        @click="debouncedRefreshTables"
      >
        <ArrowPathIcon class="w-4 h-4" />
        <span class="hidden sm:inline">Refresh</span>
      </button>
    </div>

    <!-- Table List Container -->
    <div
      class="bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
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
        <template v-for="schemaGroup in paginatedGroupedTables" :key="schemaGroup.schema">
          <!-- Schema Header - PostgreSQL only -->
          <div
            v-if="sourceConnectionType === 'postgresql' && schemaGroup.schema"
            class="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-700 cursor-pointer"
            @click="toggleSchema(schemaGroup.schema)"
          >
            <div class="flex items-center gap-2">
              <component
                :is="isSchemaExpanded(schemaGroup.schema) ? ChevronDownIcon : ChevronRightIcon"
                class="h-4 w-4 text-gray-400"
              />
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
                  idx % 2 === 0 ? 'lg:border-r lg:border-r-gray-100 lg:dark:border-r-gray-800' : ''
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
                <TableCellsIcon class="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />

                <!-- Table Name -->
                <label
                  :for="`table-${table.name}`"
                  class="flex-1 min-w-0 cursor-pointer text-sm text-gray-900 dark:text-gray-100 truncate"
                >
                  <HighlightedText :text="getTableDisplayName(table.name)" :query="searchQuery" />
                </label>

                <!-- Filter indicator/toggle - only when selected and not CDC -->
                <button
                  v-if="table.selected && !isCDCMode"
                  class="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all"
                  :class="
                    selectedTableNames.includes(table.name)
                      ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                      : hasTableFilter(table)
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700'
                  "
                  :title="hasTableFilter(table) ? 'Edit filter' : 'Add filter'"
                  @click="toggleTableSettings(table.name)"
                >
                  <FunnelIcon class="w-3.5 h-3.5" />
                  <span v-if="hasTableFilter(table)" class="hidden sm:inline">filtered</span>
                  <ChevronUpIcon v-if="selectedTableNames.includes(table.name)" class="w-3 h-3" />
                </button>
              </div>

              <!-- Table Settings Panel - Full width below row -->
              <div
                v-if="selectedTableNames.includes(table.name) && !isCDCMode"
                class="col-span-1 lg:col-span-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/30 border-b border-gray-200 dark:border-gray-700"
              >
                <TableSettings :table="table" />
              </div>
            </template>
          </div>
        </template>
      </div>
    </div>

    <!-- Compact Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between">
      <Pagination
        :total-items="filteredTablesCount"
        :itemsPerPage="itemsPerPage"
        :current-page="currentPage"
        @update:currentPage="updateCurrentPage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import Pagination from '@/components/common/Pagination.vue'
import HighlightedText from '@/components/common/HighlightedText.vue'
import TableSettings from './TableSettings.vue'
import {
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TableCellsIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'
import { debounce } from '@/utils/debounce'
import { type StreamConfig, type Table } from '@/types/streamConfig'

const streamsStore = useStreamsStore()
const connectionStore = useConnectionsStore()
const currentStreamConfig = streamsStore.currentStreamConfig as StreamConfig

// Get the source connection to determine database type
const sourceConnection = computed(() => {
  return connectionStore.connections.find((conn) => conn.id === currentStreamConfig.source?.id)
})

const sourceConnectionType = computed(() => {
  return sourceConnection.value?.type?.toLowerCase() || ''
})

// Initialize tables from _allTablesWithState if available (preserves unselected tables during navigation)
// Otherwise, fall back to currentStreamConfig.source.tables (only selected tables from saved config)
const tables = ref<Table[]>(
  (currentStreamConfig._allTablesWithState || currentStreamConfig.source?.tables)?.map(
    (table: Table) => ({
      name: table.name,
      query: table.query,
      // If using _allTablesWithState, use the explicit selected property (default false if undefined)
      // If using currentStreamConfig.source.tables, mark as selected because backend only stores selected tables
      selected: currentStreamConfig._allTablesWithState ? (table.selected ?? false) : true
    })
  ) || []
)

const searchQuery = ref('')
const selectedTableNames = ref<string[]>([])
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

const checkedTables = computed(() => {
  return tables.value.filter((table) => table.selected)
})

const checkedTablesCount = computed(() => {
  return checkedTables.value.length
})

const indeterminate = computed(() => {
  const selectedCount = checkedTablesCount.value
  return selectedCount > 0 && selectedCount < tables.value.length
})

const selectAllCheckboxState = computed(() => {
  const allSelected = tables.value.every((table) => table.selected)
  const noneSelected = tables.value.every((table) => !table.selected)
  return allSelected || noneSelected ? allSelected : false
})

// Check if current mode is CDC - table-level settings are not needed for CDC mode
const isCDCMode = computed(() => {
  return currentStreamConfig.mode === 'cdc'
})

const groupedTables = computed<SchemaGroup[]>(() => buildGroupedTables(filteredTables.value, true))
const filteredTablesCount = computed(() => filteredTables.value.length)
const currentPage = ref(1)
const itemsPerPage = 20

const totalPages = computed(() =>
  itemsPerPage > 0 ? Math.max(1, Math.ceil(filteredTablesCount.value / itemsPerPage)) : 1
)

const paginatedTables = computed(() => {
  if (itemsPerPage <= 0) {
    return filteredTables.value
  }
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredTables.value.slice(start, start + itemsPerPage)
})

const paginatedGroupedTables = computed(() => {
  const pageSet = new Set(paginatedTables.value.map((table) => table.name))
  if (pageSet.size === 0) {
    return []
  }
  return groupedTables.value
    .map((group) => ({
      schema: group.schema,
      tables: group.tables.filter((table) => pageSet.has(table.name))
    }))
    .filter((group) => group.tables.length > 0)
})

// Helper functions
function getTableSchema(tableName: string): string {
  const parts = tableName.split('.')
  if (parts.length > 1) {
    return parts[0]
  }

  // For PostgreSQL, default to 'public' schema
  // For MySQL and others, return empty string (no schema grouping)
  return sourceConnectionType.value === 'postgresql' ? 'public' : ''
}

function getTableDisplayName(tableName: string): string {
  const parts = tableName.split('.')
  return parts.length > 1 ? parts[1] : tableName
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

function toggleTableSettings(tableName: string) {
  const index = selectedTableNames.value.indexOf(tableName)
  if (index > -1) {
    selectedTableNames.value.splice(index, 1)
  } else {
    selectedTableNames.value.push(tableName)
  }
}

function hasTableFilter(table: Table): boolean {
  return Boolean(table.query && table.query.trim().length > 0)
}

function handleCheckboxChange(table: Table, checked: boolean) {
  table.selected = checked
}

function toggleSelectAll(event: Event) {
  const selectAll = (event.target as HTMLInputElement).checked
  filteredTables.value.forEach((table) => {
    table.selected = selectAll
  })
}

function updateCurrentPage(newPage: number) {
  const boundedPage = Math.min(Math.max(1, newPage), totalPages.value)
  currentPage.value = boundedPage
}

const refreshTables = async () => {
  const commonStore = useCommonStore()
  const connectionStore = useConnectionsStore()
  const navigationStore = useExplorerNavigationStore()
  try {
    if (!currentStreamConfig.source?.id) {
      tables.value = []
      return
    }
    // When editing a stream, use the sourceDatabase from the config if available
    const database = currentStreamConfig.sourceDatabase || undefined

    // For PostgreSQL and other multi-schema databases, filter out system schemas
    let options: { schemas?: string[] } | undefined
    if (connectionStore.supportsMultiSchema(currentStreamConfig.source.id) && database) {
      // Ensure databases are loaded to get schema information
      await navigationStore.ensureDatabases(currentStreamConfig.source.id)

      // Get user schemas only (excluding system schemas)
      const userSchemas = navigationStore.getFilteredSchemas(
        currentStreamConfig.source.id,
        database
      )
      if (userSchemas && userSchemas.length > 0) {
        options = { schemas: userSchemas.map((s) => s.name) }
      }
    }

    const tablesResponse = await connectionStore.getTables(
      currentStreamConfig.source.id,
      database,
      options
    )

    // Create a map of existing selections to preserve state
    // Check both the component's tables ref AND the stream config
    const existingSelections = new Map<string, boolean>()
    const existingQueries = new Map<string, string>()

    // First, get selections from component state (includes unselected tables)
    tables.value.forEach((table) => {
      existingSelections.set(table.name, table.selected ?? false)
      if (table.query) {
        existingQueries.set(table.name, table.query)
      }
    })

    // Then overlay with stream config (only selected tables, but has authoritative state)
    // Backend only stores selected tables, so mark them as selected
    if (currentStreamConfig.source?.tables) {
      currentStreamConfig.source.tables.forEach((table) => {
        existingSelections.set(table.name, table.selected ?? true)
        if (table.query) {
          existingQueries.set(table.name, table.query)
        }
      })
    }

    // Map the response and preserve existing selections
    // In create mode (no stream ID), select all tables by default
    // In edit mode (has stream ID), only keep previously selected tables, new ones default to false
    const isEditMode = Boolean(currentStreamConfig.id)

    tables.value = tablesResponse.map((entry: any) => {
      const name = typeof entry === 'string' ? entry : 'Unknown'
      const hasExistingSelection = existingSelections.has(name)
      // Tables that were previously selected should remain selected
      // In edit mode: new tables default to false; in create mode: new tables default to true
      const selected = hasExistingSelection ? existingSelections.get(name)! : !isEditMode
      const query = existingQueries.get(name) || ''

      if (currentStreamConfig.mode === 'cdc') {
        return {
          name,
          query: '',
          selected: selected
        }
      } else {
        return {
          name,
          query,
          selected: selected
        }
      }
    })

    // Reset schema initialization so expansion logic runs again
    currentPage.value = 1
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
  () => currentStreamConfig.source?.id,
  async (newSourceId, oldSourceId) => {
    // Refresh tables if source ID changed
    if (newSourceId && newSourceId !== oldSourceId) {
      await refreshTables()
    }
  },
  { immediate: true } // Auto-load tables when component mounts with a source already set
)

const debouncedRefreshTables = debounce(refreshTables, 500)

watch(searchQuery, () => {
  currentPage.value = 1
})

watch(filteredTablesCount, () => {
  const maxPage = totalPages.value
  if (currentPage.value > maxPage) {
    currentPage.value = maxPage
  }
  if (currentPage.value < 1) {
    currentPage.value = 1
  }
})

watch(
  tables,
  (newTables) => {
    // Store the full table list (including unselected) in _allTablesWithState for UI navigation
    currentStreamConfig._allTablesWithState = newTables

    // Only store selected tables in stream config (for saving/execution)
    if (!currentStreamConfig.source.tables) {
      currentStreamConfig.source.tables = []
    }
    currentStreamConfig.source.tables = newTables.filter((table) => table.selected)
  },
  { deep: true }
)
</script>
