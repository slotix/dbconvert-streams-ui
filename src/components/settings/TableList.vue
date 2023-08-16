<template>
  <div class="px-4 sm:px-6 lg:px-8">
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-base font-semibold leading-6 text-gray-900">Select tables</h1>
        <!-- <p class="mt-2 text-sm text-gray-700">Select tables.</p> -->
      </div>
    </div>
    <div class="mt-8 flow-root">
      <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div class="relative">
            <table class="min-w-full table-fixed divide-y divide-gray-300">
              <thead>
                <tr class="bg-gray-100">
                  <th scope="col" class="relative px-7 sm:w-12 sm:px-6">
                    <input
                      type="checkbox"
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
                    class="min-w-[12rem] py-3.5 pr-3 text-left uppercase text-sm font-normal text-gray-800"
                  >
                    <div class="relative flex items-center">
                      <input
                        type="text"
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
                  >
                    Operations
                  </th>
                  <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-3">
                    <span class="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr
                  v-for="table in filteredTables"
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
                    class="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-3"
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
                  <td
                    class="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-3"
                  >
                    <a href="#" class="text-gray-600 hover:text-gray-900">
                      ... <span class="sr-only">, {{ table.name }}</span>
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="mt-2 pt-4">
              <p class="text-sm text-gray-600">
                Selected: {{ selectedTables.length }} of {{ tables.length }} tables
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/vue'
import { FunnelIcon } from '@heroicons/vue/24/outline'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/vue/20/solid'

const operations = ['insert', 'update', 'delete']

const tables = ref([
  { name: 'product', operations: ['insert', 'update', 'delete'] },
  { name: 'country', operations: ['insert', 'update', 'delete'] },
  { name: 'city', operations: ['insert', 'update', 'delete'] },
  { name: 'store', operations: ['insert', 'update', 'delete'] },
  { name: 'users', operations: ['insert', 'update', 'delete'] },
  { name: 'status_name', operations: ['insert', 'update', 'delete'] },
  { name: 'sale', operations: ['insert', 'update', 'delete'] },
  { name: 'order_status', operations: ['insert', 'update', 'delete'] }
])

const searchQuery = ref('')
const filteredTables = computed(() => {
  if (!searchQuery.value) {
    return tables.value
  }
  const query = searchQuery.value.toLowerCase()
  return tables.value.filter((item) => item.name.toLowerCase().includes(query))
})

// Initialize selectedTables with an array of all table names
const selectedTables = ref(tables.value.map((table) => table.name))
const indeterminate = computed(
  () => selectedTables.value.length > 0 && selectedTables.value.length < tables.length
)
const getFormattedOperations = (operations) => {
  return operations
    .map((operation) => {
      if (operation === 'insert') return 'Insert'
      if (operation === 'update') return 'Update'
      if (operation === 'delete') return 'Delete'
      return operation
    })
    .join(', ')
}
</script>
