<template>
  <div class="container mx-auto px-4 sm:px-0 lg:px-8">
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-base font-semibold leading-6 text-gray-900">Connections</h1>
        <p class="mt-2 text-sm text-gray-700">A list of all the connections.</p>
      </div>
      <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
        <button
          type="button"
          class="flex items-center justify-center rounded-md bg-gray-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
          @click="add"
        >
          <PlusIcon class="mr-2 h-5 w-5 text-white" aria-hidden="true" />
          Add connection
        </button>
      </div>
    </div>

    <div class="container mx-auto">
      <!-- <div class="bg-white -mx-4 mt-8 sm:-mx-0"> -->
      <div class="px-4 py-4 overflow-x-auto">
        <div class="inline-block min-w-full shadow rounded-lg overflow-hidden">
          <table class="min-w-full divide-y divide-gray-300 bg-white">
            <thead class="text-sm md:text-base">
              <tr class="bg-gray-100">
                <th
                  scope="col"
                  class="px-5 py-3 border-b border-gray-200 text-gray-800 text-left uppercase font-normal"
                >
                  Connection
                </th>
                <th
                  scope="col"
                  class="hidden px-5 py-3 border-b border-gray-200 text-gray-800 text-left uppercase font-normal lg:table-cell"
                >
                  Host
                </th>
                <th
                  scope="col"
                  class="hidden px-5 py-3 border-b border-gray-200 text-gray-800 text-left uppercase font-normal lg:table-cell"
                >
                  Database
                </th>
                <th
                  scope="col"
                  class="px-5 py-3 border-b border-gray-200 text-gray-800 text-left uppercase font-normal hidden lg:table-cell"
                >
                  Created at
                </th>
                <th
                  scope="col"
                  class="px-5 py-3 border-b border-gray-200 text-gray-800 text-center uppercase font-normal"
                >
                  Actions
                </th>
                <th scope="col" colspan="3" class="relative py-3.5 pl-3 pr-4 sm:pr-0">
                  <span class="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr v-for="connection in connections" :key="connection.id">
                <table-row :connection="connection" :isSelectable="isSelectable" @edit="edit" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import TableRow from './TableRow.vue'
import shared from './shared.js'
import { PlusIcon } from '@heroicons/vue/24/outline'

export default Object.assign({}, shared, {
  props: {
    connections: {
      type: Array
    },
    isSelectable: {
      type: Boolean,
      required: true,
      default: true
    }
  },
  emits: {
    add: null,
    edit: null
  },
  components: {
    TableRow,
    PlusIcon
  },
  methods: {
    add() {
      this.$emit('add')
    },
    edit() {
      this.$emit('edit')
    }
  }
})
</script>

<style>
table tr:hover td {
  background-color: #f5f5f5;
}
</style>
