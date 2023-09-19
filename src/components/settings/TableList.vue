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
          Selected {{ selectedTables.length }} of {{ tables.length }} tables
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
                      :checked="indeterminate || selectedTables.length === tables.length"
                      :indeterminate="indeterminate"
                      @change="
                        selectedTables = $event.target.checked ? tables.map((t) => t.name) : []
                      "
                    />
                  </th>
                  <th
                    scope="col"
                    colspan="2"
                    class="min-w-[12rem] py-3.5 pr-3 text-left uppercase text-sm font-normal text-gray-800"
                  >
                    <div class="relative flex items-center">
                      <input
                        type="text"
                        id="table-search"
                        v-model="searchQuery"
                        placeholder="Filter tables..."
                        class="rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
                      />
                      <FunnelIcon
                        class="absolute h-5 w-5 text-gray-400 left-3"
                        aria-hidden="true"
                      />
                    </div>
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
                <tr
                  v-for="table in paginatedTables"
                  :key="table.name"
                  :class="[selectedTables.includes(table.name) && 'bg-gray-50']"
                >
                  <td class="relative px-7 sm:w-12 sm:px-6">
                    <div
                      v-if="selectedTables.includes(table.name)"
                      class="absolute inset-y-0 left-0 w-0.5 bg-gray-600"
                    ></div>
                    <input
                      type="checkbox"
                      :id="'checkbox-' + table.name"
                      class="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-600"
                      :value="table.name"
                      v-model="selectedTables"
                    />
                  </td>
                  <td
                    :class="[
                      'whitespace-nowrap py-4 pr-3 text-sm font-medium',
                      selectedTables.includes(table.name) ? 'text-gray-600' : 'text-gray-900'
                    ]"
                  >
                    {{ table.name }}
                  </td>
                  <td
                    :class="[
                      'whitespace-nowrap py-4 pr-3 text-sm font-medium',
                      selectedTables.includes(table.name) ? 'text-gray-600' : 'text-gray-900'
                    ]"
                  >
                    ({{ table.size }})
                  </td>
                  <td
                    class="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-3"
                    v-if="currentStream.mode !== 'convert'"
                  >
                    <Listbox as="div" v-model="table.operations" multiple>
                      <div class="relative mt-2">
                        <ListboxButton
                          class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-600 sm:text-sm sm:leading-6"
                        >
                          <span class="">{{ getFormattedOperations(table.operations) }}</span>
                          <span
                            class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"
                          >
                            <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                          </span>
                        </ListboxButton>

                        <transition
                          leave-active-class="transition ease-in duration-100"
                          leave-from-class="opacity-100"
                          leave-to-class="opacity-0"
                        >
                          <ListboxOptions
                            class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
                          >
                            <ListboxOption
                              as="template"
                              v-for="operation in operations"
                              :key="operation"
                              :value="operation"
                              v-slot="{ active, selected }"
                            >
                              <li
                                :class="[
                                  active ? 'bg-gray-600 text-white' : 'text-gray-900',
                                  'relative cursor-default select-none py-2 pl-3 pr-9'
                                ]"
                              >
                                <span
                                  class="pr-8"
                                  :class="[
                                    selected ? 'font-semibold' : 'font-normal',
                                    'block truncate'
                                  ]"
                                  >{{ operation }}</span
                                >
                                <span
                                  v-if="selected"
                                  :class="[
                                    active ? 'text-white' : 'text-gray-600',
                                    'absolute inset-y-0 right-0 flex items-center pr-4'
                                  ]"
                                >
                                  <CheckIcon class="h-5 w-5" aria-hidden="true" />
                                </span>
                              </li>
                            </ListboxOption>
                          </ListboxOptions>
                        </transition>
                      </div>
                    </Listbox>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="isPaginatorVisible" class="mt-4 mt-4 flex items-center">
              <button
                type="button"
                class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto"
                :disabled="previousPageDisabled"
                @click="previousPage"
              >
                <ChevronLeftIcon class="h-6 w-6" aria-hidden="true" />
                Prev
              </button>
              <span class="mx-3">Page {{ currentPage }} of {{ maxPage }} </span>
              <button
                type="button"
                class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto"
                :disabled="nextPageDisabled"
                @click="nextPage"
              >
                Next
                <ChevronRightIcon class="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <NotificationBar />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/vue'
import { FunnelIcon } from '@heroicons/vue/24/outline'
import {
  CheckIcon,
  ChevronUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/vue/20/solid'
import { useStreamsStore } from '@/stores/streams.js'
import { useSettingsStore } from '@/stores/settings.js'
import NotificationBar from '@/components/common/NotificationBar.vue'
import api from '@/api/connections.js'

const streamsStore = useStreamsStore()
const currentStream = streamsStore.currentStream
const operationMap = streamsStore.operationMap
const operations = Object.keys(operationMap)

const tables = ref(
  currentStream.tables.map((table) => ({
    name: table.name,
    operations: table.operations,
    size: table.size // Initialize size as an empty string
  }))
)

const searchQuery = ref('')
const filteredTables = computed(() => {
  if (!searchQuery.value) {
    return tables.value
  }
  const query = searchQuery.value.toLowerCase()
  return tables.value.filter((item) => item?.name.toLowerCase().includes(query))
})

// Initialize selectedTables with an array of all table names
const selectedTables = ref(tables.value.map((table) => table.name))

const indeterminate = computed(
  () => selectedTables.value.length > 0 && selectedTables.value.length < tables.length
)
const getFormattedOperations = (operations) => {
  return operations.map((operation) => operationMap[operation] || operation).join(', ')
}

let currentPage = ref(1)
const itemsPerPage = 20 // Set the number of items to display per page
const maxPage = computed(() => Math.ceil(filteredTables.value.length / itemsPerPage))
const isPaginatorVisible = computed(() => maxPage.value > 1)

const previousPageDisabled = computed(() => currentPage.value <= 1)
const nextPageDisabled = computed(() => currentPage.value >= maxPage.value)

const paginatedTables = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  return filteredTables.value.slice(startIndex, endIndex)
})

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}
const nextPage = () => {
  if (currentPage.value < maxPage.value) {
    currentPage.value++
  }
}

const refreshTables = async () => {
  try {
    const response = await api.getTables(currentStream.source)
    tables.value = response.map((entry) => ({
      name: entry.name,
      size: entry.size, // Set the size property
      operations: ['insert', 'update', 'delete']
    }))
  } catch (error) {
    useSettingsStore().showNotificationBar = false
    useSettingsStore().notificationBar = {
      msg: 'Error: ' + error.message,
      type: 'error'
    }
    useSettingsStore().showNotificationBar = true
  }
}

watch(selectedTables, () => {
  currentStream.tables = selectedTables.value.map((tableName) => {
    const table = tables.value.find((t) => t.name === tableName)
    return {
      name: table.name,
      size: table.size,
      operations: table.operations
    }
  })
})

watch(
  () => tables.value.map((table) => table.operations),
  () => {
    selectedTables.value.forEach((tableName) => {
      const table = tables.value.find((t) => t.name === tableName)
      if (table) {
        const updatedTable = currentStream.tables.find((t) => t.name === tableName)
        if (updatedTable) {
          updatedTable.operations = table.operations
        }
      }
    })
  },
  { deep: true }
)
</script>
