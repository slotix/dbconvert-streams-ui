<template>
  <div>
    <!-- Single row with all controls -->
    <div class="mb-4 flex items-center gap-4">
      <!-- Table count -->
      <div class="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
        {{ checkedTablesCount }} / {{ tables.length }}
      </div>

      <!-- Filter input -->
      <div class="flex-1">
        <FormInput v-model="searchQuery" type="text" placeholder="Filter tables..." />
      </div>

      <!-- Select All checkbox -->
      <div class="flex items-center whitespace-nowrap">
        <input
          :id="'select-all-checkbox'"
          :checked="selectAllCheckboxState"
          :indeterminate="indeterminate"
          type="checkbox"
          class="h-4 w-4 text-teal-600 dark:text-teal-500 focus:ring-teal-500 dark:focus:ring-teal-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
          @change="toggleSelectAll"
        />
        <label :for="'select-all-checkbox'" class="ml-2 text-sm text-gray-700 dark:text-gray-300">
          Select All
        </label>
      </div>

      <!-- Refresh button -->
      <button
        type="button"
        class="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-gray-400 dark:focus:ring-offset-gray-900 whitespace-nowrap"
        @click="debouncedRefreshTables"
      >
        Refresh tables
      </button>
    </div>

    <!-- Schema-grouped Table List -->
    <div
      class="bg-white dark:bg-gray-850 shadow-sm dark:shadow-gray-900/30 ring-1 ring-gray-900/5 dark:ring-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-800"
    >
      <div
        v-if="filteredTablesCount === 0"
        class="text-center text-gray-500 dark:text-gray-400 py-8"
      >
        No tables found
      </div>
      <div v-else class="p-4">
        <div class="space-y-1">
          <template v-for="schemaGroup in paginatedGroupedTables" :key="schemaGroup.schema">
            <!-- Schema Header - only show for PostgreSQL -->
            <div
              v-if="sourceConnectionType === 'postgresql' && schemaGroup.schema"
              class="flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/70 cursor-pointer border-b border-gray-100 dark:border-gray-800"
              @click="toggleSchema(schemaGroup.schema)"
            >
              <div class="flex items-center">
                <component
                  :is="isSchemaExpanded(schemaGroup.schema) ? ChevronDownIcon : ChevronRightIcon"
                  class="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2 flex-shrink-0"
                />
                <span class="font-medium">{{ schemaGroup.schema }}</span>
                <span
                  class="ml-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-0.5"
                >
                  {{ schemaGroup.tables.length }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  @click.stop="selectAllInSchema(schemaGroup.schema)"
                >
                  Select All
                </button>
                <button
                  class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  @click.stop="clearAllInSchema(schemaGroup.schema)"
                >
                  Clear All
                </button>
              </div>
            </div>

            <!-- Tables in Schema -->
            <div
              v-if="sourceConnectionType !== 'postgresql' || isSchemaExpanded(schemaGroup.schema)"
              :class="
                sourceConnectionType === 'postgresql' && schemaGroup.schema
                  ? 'space-y-1 ml-4 border-l border-gray-200 dark:border-gray-800 pl-4'
                  : 'space-y-1'
              "
            >
              <template v-for="table in schemaGroup.tables" :key="table.name">
                <!-- Table Row -->
                <div
                  class="flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/70"
                >
                  <div class="flex items-center flex-1">
                    <input
                      :id="`table-${table.name}`"
                      v-model="table.selected"
                      type="checkbox"
                      class="h-4 w-4 text-teal-600 dark:text-teal-500 focus:ring-teal-500 dark:focus:ring-teal-400 border-gray-300 dark:border-gray-600 rounded mr-3 bg-white dark:bg-gray-800"
                      @change="
                        handleCheckboxChange(
                          table,
                          ($event.target as HTMLInputElement)?.checked || false
                        )
                      "
                    />
                    <TableCellsIcon
                      class="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2 flex-shrink-0"
                    />
                    <label
                      :for="`table-${table.name}`"
                      class="cursor-pointer flex-1 text-gray-900 dark:text-gray-100"
                    >
                      {{ getTableDisplayName(table.name) }}
                    </label>
                  </div>
                  <button
                    v-if="table.selected && !isCDCMode"
                    class="text-xs font-medium transition-colors"
                    :class="
                      selectedTableNames.includes(table.name)
                        ? 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                    "
                    @click="toggleTableSettings(table.name)"
                  >
                    {{
                      selectedTableNames.includes(table.name) ? '▲ Hide Options' : '▼ Show Options'
                    }}
                  </button>
                </div>

                <!-- Table Settings (immediately under the table) -->
                <div
                  v-if="selectedTableNames.includes(table.name) && !isCDCMode"
                  :class="
                    sourceConnectionType === 'postgresql' && schemaGroup.schema
                      ? 'ml-8 mt-1 mb-3'
                      : 'ml-4 mt-1 mb-3'
                  "
                >
                  <div
                    class="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-md p-4"
                  >
                    <div class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Settings for:
                      <span class="font-semibold text-gray-900 dark:text-gray-100">
                        {{ getTableDisplayName(table.name) }}
                      </span>
                    </div>
                    <TableSettings :table="table" />
                  </div>
                </div>
              </template>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="mt-4">
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
import { useStreamsStore, defaultStreamConfigOptions } from '@/stores/streamConfig'
import { useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import Pagination from '@/components/common/Pagination.vue'
import TableSettings from './TableSettings.vue'
import FormInput from '@/components/base/FormInput.vue'
import { ChevronRightIcon, ChevronDownIcon, TableCellsIcon } from '@heroicons/vue/24/outline'
import { debounce } from '@/utils/debounce'
import { type StreamConfig, type Table } from '@/types/streamConfig'

const streamsStore = useStreamsStore()
const connectionStore = useConnectionsStore()
const currentStreamConfig = streamsStore.currentStreamConfig as StreamConfig

// Get the source connection to determine database type
const sourceConnection = computed(() => {
  return connectionStore.connections.find((conn) => conn.id === currentStreamConfig.source)
})

const sourceConnectionType = computed(() => {
  return sourceConnection.value?.type?.toLowerCase() || ''
})

// Initialize tables from _allTablesWithState if available (preserves unselected tables during navigation)
// Otherwise, fall back to currentStreamConfig.tables (only selected tables from saved config)
const tables = ref<Table[]>(
  (currentStreamConfig._allTablesWithState || currentStreamConfig.tables)?.map((table: Table) => ({
    name: table.name,
    query: table.query,
    // If using _allTablesWithState, use the explicit selected property
    // If using currentStreamConfig.tables, mark as selected because backend only stores selected tables
    selected: currentStreamConfig._allTablesWithState ? table.selected : true
  })) || []
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
const itemsPerPage = 15

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
  try {
    if (!currentStreamConfig.source) {
      tables.value = []
      return
    }
    // When editing a stream, use the sourceDatabase from the config if available
    const database = currentStreamConfig.sourceDatabase || undefined
    const tablesResponse = await connectionStore.getTables(currentStreamConfig.source, database)

    // Create a map of existing selections to preserve state
    // Check both the component's tables ref AND the stream config
    const existingSelections = new Map<string, boolean>()
    const existingQueries = new Map<string, string>()

    // First, get selections from component state (includes unselected tables)
    tables.value.forEach((table) => {
      existingSelections.set(table.name, table.selected)
      if (table.query) {
        existingQueries.set(table.name, table.query)
      }
    })

    // Then overlay with stream config (only selected tables, but has authoritative state)
    // Backend only stores selected tables, so mark them as selected
    if (currentStreamConfig.tables) {
      currentStreamConfig.tables.forEach((table) => {
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
  () => currentStreamConfig.source,
  async (newSource, oldSource) => {
    // Refresh tables if source changed
    if (newSource && newSource !== oldSource) {
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
    currentStreamConfig.tables = newTables.filter((table) => table.selected)
  },
  { deep: true }
)
</script>
