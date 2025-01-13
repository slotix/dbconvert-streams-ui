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
    <table
      class="min-w-full table-fixed divide-y divide-gray-300 border border-gray-400 rounded-md"
    >
      <thead v-if="paginatedTables.length > 0">
        <tr class="bg-gray-100">
          <th scope="col" class="relative px-7 sm:w-12 sm:px-6">
            <input
              id="table-select-all"
              type="checkbox"
              class="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-200 text-gray-600 focus:ring-gray-600"
              :checked="selectAllCheckboxState"
              :indeterminate="indeterminate"
              @change="toggleSelectAll"
            />
          </th>
          <th
            scope="col"
            colspan="2"
            class="min-w-[10rem] py-3.5 pr-3 text-left uppercase text-sm font-normal text-gray-800"
          >
            <div class="relative rounded-md shadow-sm">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <FunnelIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                id="table-search"
                v-model="searchQuery"
                type="text"
                placeholder="Filter tables..."
                class="block w-full rounded-md border border-gray-300 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
              />
            </div>
          </th>
        </tr>
      </thead>
      <tbody v-if="paginatedTables.length > 0" class="divide-y divide-gray-200 bg-white">
        <TableRow
          v-for="table in paginatedTables"
          :key="table.name"
          :table="table"
          :isSelected="selectedTableNames.includes(table.name)"
          :colspan="totalColumns"
          @selectTable="toggleTableSettings"
          @checkboxChange="handleCheckboxChange"
          @toggleSettings="toggleTableSettings"
        >
          <!-- This slot will be used to add a button to toggle the settings panel -->
          <template #default>
            <TableSettings
              v-if="selectedTableNames.includes(table.name)"
              :table="table"
              class="ml-10"
            />
          </template>
        </TableRow>
      </tbody>
      <tbody v-else>
        <tr>
          <td colspan="5" class="text-gray-600 py-4 text-center">No tables found</td>
        </tr>
      </tbody>
    </table>
    <Pagination
      :totalPages="filteredTables.length"
      :itemsPerPage="itemsPerPage"
      @update:currentPage="updateCurrentPage"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useStreamsStore, defaultStreamConfigOptions } from '@/stores/streamConfig'
import { useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import Pagination from '@/components/common/Pagination.vue'
import TableSettings from './TableSettings.vue'
import TableRow from './TableRow.vue'
import { FunnelIcon } from '@heroicons/vue/24/outline'
import { debounce } from 'lodash'
import { StreamConfig, Table } from '@/types/streamConfig'

const streamsStore = useStreamsStore()
const currentStreamConfig = streamsStore.currentStreamConfig as StreamConfig

const tables = ref<Table[]>(
  currentStreamConfig.tables?.map((table) => ({
    name: table.name,
    operations: table.operations ?? defaultStreamConfigOptions.operations ?? [], // Default to operations if undefined
    skipIndexCreation: table.skipIndexCreation !== undefined ? table.skipIndexCreation : false, // Default value for createIndexes
    query: table.query,
    selected: true
  })) || []
)

const filteredTables = computed(() => {
  if (!searchQuery.value) {
    return tables.value
  }
  const query = searchQuery.value.toLowerCase()
  currentPage.value = 1
  return tables.value.filter((item) => item?.name.toLowerCase().includes(query))
})

const paginatedTables = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  return filteredTables.value.slice(startIndex, endIndex)
})

const checkedTables = computed(() => {
  return filteredTables.value.filter((table) => table.selected)
})

const checkedTablesCount = computed(() => {
  return checkedTables.value.length
})

const searchQuery = ref('')

const selectedTableNames = ref<string[]>([])
const toggleTableSettings = (tableName: string) => {
  const index = selectedTableNames.value.indexOf(tableName)
  if (index > -1) {
    selectedTableNames.value.splice(index, 1) // Remove if open
  } else {
    selectedTableNames.value.push(tableName) // Add if not open
  }
}

const handleCheckboxChange = (table: Table, checked: boolean) => {
  table.selected = checked
  // If additional logic is required when a checkbox changes, add it here.
  // For example, you may want to emit an event or call an API.
}

const totalColumns = computed(() => {
  return 3
})

const indeterminate = computed(() => {
  const selectedCount = checkedTablesCount.value
  return selectedCount > 0 && selectedCount < tables.value.length
})

let currentPage = ref(1)
const itemsPerPage = 10 // Set the number of items to display per page

const updateCurrentPage = (newPage: number) => {
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
  } catch (err) {
    tables.value = [] // Clear the tables in case of an error
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
// Wrap the refreshTables function with lodash's debounce
const debouncedRefreshTables = debounce(refreshTables, 500) // Debounce for 500 milliseconds

// Define selectAllCheckboxState and toggleSelectAll
let selectAllCheckboxState = computed(() => {
  const allSelected = tables.value.every((table) => table.selected)
  const noneSelected = tables.value.every((table) => !table.selected)

  return allSelected || noneSelected ? allSelected : false
})

const toggleSelectAll = ($event: Event) => {
  const selectAll = ($event.target as HTMLInputElement).checked

  filteredTables.value.forEach((table) => {
    table.selected = selectAll
  })
}

watch(
  checkedTables,
  (newTables) => {
    currentStreamConfig.tables = newTables.filter((table) => table.selected)
  },
  { deep: true }
)
</script>
