<template>
  <div class="px-4 sm:px-6 lg:px-8">
    <div class="flex items-center">
      <div class="flex-auto border-b border-gray-400 pb-5">
        <h2 class="text-base font-semibold leading-6 text-gray-900">Source tables</h2>
      </div>
    </div>
    <div class="mt-8 flow-root">
      <div class="flex items-center justify-between">
        <div class="mb-4 inline-flex font-medium text-gray-900">
          Selected {{ selectedTablesCount }} of {{ tables.length }} tables
        </div>
        <button
          type="button"
          class="mb-4 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto"
          @click="refreshTables"
        >
          Refresh tables
        </button>
      </div>
      <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div class="relative">
            <table class="min-w-full table-fixed divide-y divide-gray-300">
              <thead>
                <tr class="bg-gray-100">
                  <th scope="col" class="relative px-7 sm:w-12 sm:px-6">
                    <input
                      type="checkbox"
                      id="table-select-all"
                      class="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-200 text-gray-600 focus:ring-gray-600"
                      :checked="selectAllCheckboxState"
                      :indeterminate="indeterminate"
                      @change="toggleSelectAll"
                    />
                  </th>
                  <th
                    scope="col"
                    class="min-w-[10rem] py-3.5 pr-3 text-left uppercase text-sm font-normal text-gray-800"
                  >
                    <div class="relative rounded-md shadow-sm">
                      <div
                        class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
                      >
                        <FunnelIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                      </div>
                      <input
                        type="text"
                        id="table-search"
                        v-model="searchQuery"
                        placeholder="Filter tables..."
                        class="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
                      />
                    </div>
                  </th>
                  <th
                    scope="col"
                    class="px-3 py-3.5 text-left uppercase text-sm font-normal text-gray-800 text-right"
                  >
                    Size
                  </th>
                  <th
                    scope="col"
                    class="px-3 py-3.5 text-left uppercase text-sm font-normal text-gray-800 text-right"
                  >
                    Rows
                  </th>
                  <th
                    scope="col"
                    class="px-3 py-3.5 text-left uppercase text-sm font-normal text-gray-800"
                    v-if="currentStream.mode !== 'convert'"
                  >
                    Capture Events
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr v-for="table in paginatedTables" :key="table.name" class="py-4 bg-gray-5">
                  <td class="relative py-4 px-7 sm:w-12 sm:px-6">
                    <div class="absolute inset-y-0 left-0 w-0.5 bg-gray-600"></div>

                    <input
                      type="checkbox"
                      :id="'checkbox-' + table.name"
                      class="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-600"
                      :value="table.name"
                      v-model="table.selected"
                    />
                  </td>
                  <td class="py-4 px-3">
                    {{ table.name }}
                  </td>
                  <!-- <td> -->
                  <!--   {{ table.name }} -->
                  <!-- </td> -->
                  <td class="text-right">
                    {{ table.size }}
                  </td>
                  <td class="text-right pr-3">
                    {{ table.rows }}
                  </td>
                  <td
                    class="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-3"
                    v-if="currentStream.mode !== 'convert'"
                  >
                    <OperationsListBox
                      v-model="table.operations"
                      :tableOperations="table.operations"
                      @update:tableOperations="changeTableOps(table.operations, table)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            <Pagination
              :totalPages="filteredTables.length"
              :itemsPerPage="itemsPerPage"
              @update:currentPage="updateCurrentPage"
            />
            <NotificationBar />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { FunnelIcon } from '@heroicons/vue/24/outline'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/20/solid'
import { useStreamsStore } from '@/stores/streams.js'
import { useSettingsStore } from '@/stores/settings.js'
import NotificationBar from '@/components/common/NotificationBar.vue'
import Pagination from '@/components/common/Pagination.vue'
import OperationsListBox from '@/components/settings/OperationsListBox.vue'
import api from '@/api/connections.js'

const streamsStore = useStreamsStore()
const currentStream = streamsStore.currentStream

const tables = ref(
  currentStream.tables.map((table) => ({
    name: table.name,
    operations: table.operations,
    size: table.size,
    rows: table.rows,
    selected: true
  }))
)

const searchQuery = ref('')
const filteredTables = computed(() => {
  if (!searchQuery.value) {
    return tables.value
  }
  const query = searchQuery.value.toLowerCase()
  currentPage.value = 1
  return tables.value.filter((item) => item?.name.toLowerCase().includes(query))
})

const indeterminate = computed(() => {
  const selectedCount = tables.value.filter((table) => table.selected).length
  return selectedCount > 0 && selectedCount < tables.value.length
})

const changeTableOps = (newValue, table) => {
  // Assuming newValue is an array of selected operations
  table.operations = newValue
}

let currentPage = ref(1)
const itemsPerPage = 20 // Set the number of items to display per page

const updateCurrentPage = (newPage) => {
  currentPage.value = newPage
}

const paginatedTables = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  return filteredTables.value.slice(startIndex, endIndex)
})

const refreshTables = async () => {
  useSettingsStore().showNotificationBar = false
  try {
    const response = await api.getTables(currentStream.source)
    tables.value = response.map((entry) => ({
      name: entry.name,
      size: entry.size,
      rows: entry.rows,
      operations: ['insert', 'update', 'delete'],
      selected: true // Set the selected property as desired
    }))
  } catch (error) {
    // Handle the error
    useSettingsStore().notificationBar = {
      msg: 'Error: ' + error.message,
      type: 'error'
    }
    useSettingsStore().showNotificationBar = true
  }
}

const selectedTablesCount = computed(() => {
  return tables.value.filter((table) => table.selected).length
})

// Define selectAllCheckboxState and toggleSelectAll
let selectAllCheckboxState = computed(() => {
  const allSelected = tables.value.every((table) => table.selected)
  const noneSelected = tables.value.every((table) => !table.selected)

  if (allSelected) {
    return true // If all tables are selected, check the "Select All" checkbox
  } else if (noneSelected) {
    return false // If no tables are selected, uncheck the "Select All" checkbox
  } else {
    return null // If some tables are selected, set the checkbox to indeterminate
  }
})
const toggleSelectAll = ($event) => {
  const selectAll = $event.target.checked

  filteredTables.value.forEach((table) => {
    table.selected = selectAll
  })
}
watch(
  tables,
  (newTables) => {
    // watch(tables, (newTables, oldTables) => {
    // Handle changes in table selection here
    // You can compare newTables and oldTables to detect changes
    // console.log('Tables changed:', newTables, oldTables)

    // Example: Update currentStream.tables based on selected tables
    const selectedTables = newTables.filter((table) => table.selected)
    currentStream.tables = selectedTables
  },
  { deep: true }
)
</script>
