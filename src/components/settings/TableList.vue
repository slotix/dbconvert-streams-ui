<template>
  <div>
    <div class="flex-auto border-b border-gray-400 pb-5">
      <h2 class="text-base font-semibold leading-6 text-gray-900">Source tables.</h2>
    </div>
    <div class="flex items-center justify-between mt-4">
      <div class="mb-4 inline-flex font-medium text-gray-900">
        Selected {{ checkedTablesCount }} of {{ tables.length }} tables
      </div>
      <button
        type="button"
        class="mb-4 w-full inline-flex rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto"
        @click="debouncedRefreshTables"
      >
        Refresh tables
      </button>
    </div>

    <!-- Search and Select All Controls -->
    <div class="mb-4 space-y-3">
      <div class="flex items-center gap-4">
        <div class="flex-1">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Filter tables..."
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
          />
        </div>
        <div class="flex items-center">
          <input
            :id="'select-all-checkbox'"
            :checked="selectAllCheckboxState"
            :indeterminate="indeterminate"
            type="checkbox"
            class="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
            @change="toggleSelectAll"
          />
          <label :for="'select-all-checkbox'" class="ml-2 text-sm text-gray-700">
            Select All
          </label>
        </div>
      </div>
    </div>

    <!-- Schema-grouped Table List -->
    <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg divide-y divide-gray-200">
      <div v-if="!groupedTables.length" class="text-center text-gray-500 py-8">
        No tables found
      </div>
      <div v-else class="p-4">
        <div class="space-y-1">
          <template v-for="schemaGroup in groupedTables" :key="schemaGroup.schema">
            <!-- Schema Header -->
            <div class="flex items-center justify-between px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-50 cursor-pointer border-b border-gray-100"
              @click="toggleSchema(schemaGroup.schema)">
              <div class="flex items-center">
                <component :is="isSchemaExpanded(schemaGroup.schema) ? ChevronDownIcon : ChevronRightIcon"
                  class="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                <span class="font-medium">{{ schemaGroup.schema }}</span>
                <span class="ml-2 text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                  {{ schemaGroup.tables.length }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click.stop="selectAllInSchema(schemaGroup.schema)"
                  class="text-xs text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <button
                  @click.stop="clearAllInSchema(schemaGroup.schema)"
                  class="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear All
                </button>
              </div>
            </div>

            <!-- Tables in Schema -->
            <div v-if="isSchemaExpanded(schemaGroup.schema)"
              class="space-y-1 ml-4 border-l border-gray-200 pl-4">
              <template v-for="table in schemaGroup.tables" :key="table.name">
                <!-- Table Row -->
                <div class="flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-gray-50">
                  <div class="flex items-center flex-1">
                    <input
                      :id="`table-${table.name}`"
                      v-model="table.selected"
                      type="checkbox"
                      class="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded mr-3"
                      @change="handleCheckboxChange(table, ($event.target as HTMLInputElement)?.checked || false)"
                    />
                    <TableCellsIcon class="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                    <label :for="`table-${table.name}`" class="cursor-pointer flex-1">
                      {{ getTableDisplayName(table.name) }}
                    </label>
                  </div>
                  <button
                    v-if="table.selected"
                    @click="toggleTableSettings(table.name)"
                    class="text-xs font-medium transition-colors"
                    :class="selectedTableNames.includes(table.name) 
                      ? 'text-red-600 hover:text-red-800' 
                      : 'text-blue-600 hover:text-blue-800'"
                  >
                    {{ selectedTableNames.includes(table.name) ? '▲ Hide Options' : '▼ Show Options' }}
                  </button>
                </div>

                <!-- Table Settings (immediately under the table) -->
                <div v-if="selectedTableNames.includes(table.name)" class="ml-8 mt-1 mb-3">
                  <div class="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <div class="text-xs font-medium text-gray-600 mb-2">
                      Settings for: <span class="font-semibold">{{ getTableDisplayName(table.name) }}</span>
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
        :totalPages="totalPages"
        :itemsPerPage="itemsPerPage"
        @update:currentPage="updateCurrentPage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useStreamsStore, defaultStreamConfigOptions } from '@/stores/streamConfig'
import { useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import Pagination from '@/components/common/Pagination.vue'
import TableSettings from './TableSettings.vue'
import { ChevronRightIcon, ChevronDownIcon, TableCellsIcon } from '@heroicons/vue/24/outline'
import { debounce } from 'lodash'
import { type StreamConfig, type Table } from '@/types/streamConfig'

const streamsStore = useStreamsStore()
const currentStreamConfig = streamsStore.currentStreamConfig as StreamConfig

const tables = ref<Table[]>(
  currentStreamConfig.tables?.map((table) => ({
    name: table.name,
    operations: table.operations ?? defaultStreamConfigOptions.operations ?? [],
    skipIndexCreation: table.skipIndexCreation !== undefined ? table.skipIndexCreation : false,
    query: table.query,
    selected: true
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

const groupedTables = computed<SchemaGroup[]>(() => {
  const filtered = filteredTables.value
  const schemaMap = new Map<string, Table[]>()

  // Group tables by schema
  filtered.forEach(table => {
    const schema = getTableSchema(table.name)
    if (!schemaMap.has(schema)) {
      schemaMap.set(schema, [])
    }
    schemaMap.get(schema)!.push(table)
  })

  // Convert to array and sort
  const groups = Array.from(schemaMap.entries()).map(([schema, tables]) => ({
    schema,
    tables: tables.sort((a, b) => getTableDisplayName(a.name).localeCompare(getTableDisplayName(b.name)))
  }))

  // Sort schemas (public first, then alphabetically)
  groups.sort((a, b) => {
    if (a.schema === 'public') return -1
    if (b.schema === 'public') return 1
    return a.schema.localeCompare(b.schema)
  })

  // Initialize schema expansion only once
  if (!schemasInitialized.value && groups.length > 0) {
    if (groups.length === 1) {
      // Single schema: auto-expand it
      expandedSchemas.value.add(groups[0].schema)
    } else {
      // Multiple schemas: expand public schema by default if it exists, otherwise expand the first one
      const publicSchema = groups.find(g => g.schema === 'public')
      if (publicSchema) {
        expandedSchemas.value.add('public')
      } else {
        expandedSchemas.value.add(groups[0].schema)
      }
    }
    schemasInitialized.value = true
  }

  return groups
})

const filteredTables = computed(() => {
  if (!searchQuery.value) {
    return tables.value
  }
  const query = searchQuery.value.toLowerCase()
  return tables.value.filter((item) => 
    getTableDisplayName(item.name).toLowerCase().includes(query) ||
    item.name.toLowerCase().includes(query)
  )
})

const checkedTables = computed(() => {
  return filteredTables.value.filter((table) => table.selected)
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

// Pagination
const currentPage = ref(1)
const itemsPerPage = 50 // Increase since we're grouping
const totalPages = computed(() => Math.ceil(filteredTables.value.length / itemsPerPage))

// Helper functions
function getTableSchema(tableName: string): string {
  const parts = tableName.split('.')
  return parts.length > 1 ? parts[0] : 'public'
}

function getTableDisplayName(tableName: string): string {
  const parts = tableName.split('.')
  return parts.length > 1 ? parts[1] : tableName
}

function isSchemaExpanded(schema: string): boolean {
  return expandedSchemas.value.has(schema)
}

function toggleSchema(schema: string) {
  if (expandedSchemas.value.has(schema)) {
    expandedSchemas.value.delete(schema)
  } else {
    expandedSchemas.value.add(schema)
  }
}

function selectAllInSchema(schema: string) {
  const schemaGroup = groupedTables.value.find(g => g.schema === schema)
  if (schemaGroup) {
    schemaGroup.tables.forEach(table => {
      table.selected = true
    })
  }
}

function clearAllInSchema(schema: string) {
  const schemaGroup = groupedTables.value.find(g => g.schema === schema)
  if (schemaGroup) {
    schemaGroup.tables.forEach(table => {
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
  currentPage.value = newPage
}

// Helper function to create table objects based on the current stream mode
function createTableObject(entry: any, mode: 'cdc' | 'convert'): Table {
  const name = typeof entry === 'string' ? entry : 'Unknown'
  const operations = entry?.operations ?? defaultStreamConfigOptions.operations ?? []
  const query = entry?.query ?? ''
  const skipIndexCreation = entry?.skipIndexCreation !== undefined ? entry.skipIndexCreation : false
  const selected = entry?.selected !== undefined ? entry.selected : true

  if (mode === 'cdc') {
    return {
      name,
      operations: defaultStreamConfigOptions.operations ?? [],
      skipIndexCreation: skipIndexCreation,
      query: '',
      selected: selected
    }
  } else {
    return {
      name,
      query,
      operations,
      skipIndexCreation: skipIndexCreation,
      selected: selected
    }
  }
}

const refreshTables = async () => {
  const commonStore = useCommonStore()
  const connectionStore = useConnectionsStore()
  try {
    const tablesResponse = await connectionStore.getTables(currentStreamConfig.source)
    tables.value = tablesResponse.map((entry: any) =>
      createTableObject(entry, currentStreamConfig.mode)
    )
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
  () => currentStreamConfig.source,
  async (newSource, oldSource) => {
    if (newSource !== oldSource) {
      await refreshTables()
    }
  }
)

const debouncedRefreshTables = debounce(refreshTables, 500)

watch(
  checkedTables,
  (newTables) => {
    currentStreamConfig.tables = newTables.filter((table) => table.selected)
  },
  { deep: true }
)
</script>
