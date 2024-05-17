<template>
  <div class="flex-auto border-b border-gray-400 pb-5">
    <h2 class="text-base font-semibold leading-6 text-gray-900">Source tables.</h2>
  </div>
  <div class="flex items-center justify-between mt-4">
    <div class="mb-4 inline-flex font-medium text-gray-900">
      Selected {{ checkedTablesCount }} of {{ tables.length }} tables
    </div>
    <button type="button"
      class="mb-4 w-full inline-flex rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto"
      @click="refreshTables">
      Refresh tables
    </button>
  </div>
  <table class="min-w-full table-fixed divide-y divide-gray-300">
    <thead>
      <tr class="bg-gray-100">
        <th scope="col" class="relative px-7 sm:w-12 sm:px-6">
          <input type="checkbox" id="table-select-all"
            class="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-200 text-gray-600 focus:ring-gray-600"
            :checked="selectAllCheckboxState" :indeterminate="indeterminate" @change="toggleSelectAll" />
        </th>
        <th scope="col" class="min-w-[10rem] py-3.5 pr-3 text-left uppercase text-sm font-normal text-gray-800">
          <div class="relative rounded-md shadow-sm">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <FunnelIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input type="text" id="table-search" v-model="searchQuery" placeholder="Filter tables..."
              class="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6" />
          </div>
        </th>
      </tr>
    </thead>
    <tbody v-if="paginatedTables.length > 0" class="divide-y divide-gray-200 bg-white">
      <tr v-for="table in paginatedTables" :key="table.name" class="py-4"
        :class="{ 'bg-gray-200 ': table === currentStream.selectedTableRow }" @click="selectTable(table)">
        <td class="relative py-4 px-7 sm:w-12 sm:px-6"
          :class="{ 'border-l border-white': table === currentStream.selectedTableRow }">
          <input type="checkbox" :id="'checkbox-' + table.name"
            class="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-600"
            :value="table.name" v-model="table.selected" />
        </td>
        <td class="py-4 px-3" :class="{ 'border-r border-white': table === currentStream.selectedTableRow }">
          {{ table.name }}
        </td>
      </tr>
    </tbody>
    <tbody v-else>
      <tr>
        <td colspan="5" class="text-gray-600 py-4 text-center">No tables found</td>
      </tr>
    </tbody>
  </table>
  <Pagination :totalPages="filteredTables.length" :itemsPerPage="itemsPerPage"
    @update:currentPage="updateCurrentPage" />
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { FunnelIcon } from '@heroicons/vue/24/outline'
import { useStreamsStore } from '@/stores/streams.js'
import { useCommonStore } from '@/stores/common.js'
import Pagination from '@/components/common/Pagination.vue'
import api from '@/api/connections.js'

const streamsStore = useStreamsStore()
const currentStream = streamsStore.currentStream

// const selectBtns = [
//   { id: 'all', title: 'Select All' },
//   { id: 'filter', title: 'Filter' }
// ]
// const selectedBtn = ref(
//   currentStream?.tables?.length > 0 ? selectBtns[1] : selectBtns[0] || selectBtns[1]
// )

// watch(selectedBtn, (newVal) => {
//   if (newVal.id === 'all') {
//     currentStream.tables = []
//   }
// })

const tables = ref(
  currentStream?.tables?.length > 0
    ? currentStream.tables.map((table) => ({
      name: table.name,
      operations: table.operations,
      // size: table.size,
      // rows: table.rows,
      selected: true
    }))
    : []
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
const selectTable = (table) => {
  if (table !== null && table !== undefined) {
    // currentStream.selectedTableRow = table ? table : null;
    currentStream.selectedTableRow = table
  }
}

const indeterminate = computed(() => {
  const selectedCount = tables.value.filter((table) => table.selected).length
  return selectedCount > 0 && selectedCount < tables.value.length
})

// const changeTableOps = (newValue, table) => {
//   // Assuming newValue is an array of selected operations
//   table.operations = newValue
// }

let currentPage = ref(1)
const itemsPerPage = 10 // Set the number of items to display per page

const updateCurrentPage = (newPage) => {
  currentPage.value = newPage
}


const refreshTables = async () => {
  useCommonStore().showNotificationBar = false
  try {
    const response = await api.getTables(currentStream.source)
    tables.value = response.map((entry) => {
      // if (currentStream.mode === 'cdc') {
      // Set operations for CDC mode
      return {
        name: entry,
        // name: entry.name,
        // size: entry.size,
        // rows: entry.rows,
        operations: ['insert', 'update', 'delete'],
        selected: true // Set the selected property as desired
      }
      // } else {
      // Exclude operations for other modes, like 'convert'
      //   return {
      //     name: entry.name,
      //     size: entry.size,
      //     rows: entry.rows,
      //     selected: true // Set the selected property as desired
      //   }
      // }
    })
  } catch (error) {
    // Handle the error
    useCommonStore().notificationBar = {
      msg: error.message,
      type: 'error'
    }
    useCommonStore().showNotificationBar = true
  }
}



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
  checkedTables,
  (newTables) => {
    // watch(tables, (newTables, oldTables) => {
    // Handle changes in table selection here
    // You can compare newTables and oldTables to detect changes
    // console.log('Tables changed:', newTables, oldTables)

    // Example: Update currentStream.tables based on selected tables
    const selectedTables = newTables.filter((table) => table.selected)
    currentStream.tables = selectedTables;
  },
  { deep: true }
)
</script>
