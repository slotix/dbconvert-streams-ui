<template>
  <div class="container mx-auto">
    <div class="sm:flex sm:items-center px-4">
      <div class="sm:flex-auto">
        <h1 class="text-base font-semibold leading-6 text-gray-900">Streams</h1>
        <p class="mt-2 text-sm text-gray-700">List of streams.</p>
      </div>
      <router-link :to="{ name: 'ManageStream', params: { mode: 'add' }}">
        <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            class="flex items-center justify-center rounded-md bg-gray-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
            @click="addStream"
          >
            <PlusIcon class="mr-2 h-5 w-5 text-white" aria-hidden="true" />
            Add stream
          </button>
        </div>
      </router-link>
    </div>
    <div class="container mx-auto">
      <div class="px-4 py-4 overflow-x-auto">
        <div class="inline-block min-w-full shadow rounded-lg overflow-hidden">
          <table class="min-w-full divide-y divide-gray-300 bg-white">
            <thead class="text-sm md:text-base">
              <tr class="bg-gray-100 divide-x divide-gray-200 ">
                <th
                  scope="col"
                  class="px-5 py-3 border-b border-gray-200 text-gray-800 text-left uppercase font-normal"
                >
                  Stream
                </th>
                <th
                  scope="col"
                  class="hidden px-5 py-3 border-b border-gray-200 text-gray-800 text-left uppercase font-normal lg:table-cell"
                >
                  Source
                </th>
                <th
                  scope="col"
                  class="hidden px-5 py-3 border-b border-gray-200 text-gray-800 text-left uppercase font-normal lg:table-cell"
                >
                  Target
                </th>
                <th
                  scope="col"
                  class="px-5 py-3 border-b border-gray-200 text-gray-800 text-left uppercase font-normal hidden lg:table-cell"
                >
                  Created at
                </th>
                <th
                  scope="col"
                  colspan="3"
                  class="px-5 py-3 border-b border-gray-200 text-gray-800 text-center uppercase font-normal"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr v-for="stream in strms" :key="stream.id" class="divide-x divide-gray-200 border-b border-gray-200 cursor-pointer">
                <TableRow
                  :stream="stream"
                  :source="connectionByID(stream.source)"
                  :target="connectionByID(stream.target)"
                />
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
// import shared from './shared.js'
import { PlusIcon } from '@heroicons/vue/24/outline'
import { mapState, mapActions } from 'pinia'
import { useConnectionsStore } from '@/stores/connections.js'
import { useStreamsStore } from '@/stores/streams.js'

// export default Object.assign({}, shared, {
export default {
  props: {
    strms: {
      type: Array
    }
  },
  methods: {
    ...mapActions(useConnectionsStore, ['refreshConnections']),
    addStream() {
      useStreamsStore().resetCurrentStream();
      useConnectionsStore().resetCurrentConnection();
    }
  },
  components: {
    TableRow,
    PlusIcon
  },
  computed: {
    ...mapState(useStreamsStore, ['streams', 'streamsByType']),
    connectionByID() {
      return (id) => {
        return useConnectionsStore().connectionByID(id)
      }
    }
  },
}
</script>
