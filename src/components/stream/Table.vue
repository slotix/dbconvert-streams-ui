<template>
  <div class="container mx-auto">
    <div class="sm:flex sm:items-center px-4">
      <div class="sm:flex-auto">
        <h1 class="text-base font-semibold leading-6 text-gray-900">List of streams</h1>
        <!-- <p class="mt-2 text-sm text-gray-700">List of streams.</p> -->
      </div>
    </div>
    <div class="container mx-auto">
      <div class="px-4 py-4">
        <div class="inline-block min-w-full shadow rounded-lg">
          <!-- <table class="min-w-full divide-y divide-gray-300 bg-white"> -->
          <table class="min-w-full bg-white">
            <thead class="text-sm md:text-base">
              <tr class="bg-gray-100 divide-x divide-gray-200">
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
                  class="px-5 py-3 border-b border-gray-200 text-gray-800 text-left uppercase font-normal lg:table-cell"
                >
                  Edit
                </th>
                <th
                  scope="col"
                  class="px-5 py-3 border-b border-gray-200 text-gray-800 text-center uppercase font-normal"
                >
                  Actions
                </th>
                <th
                  scope="col"
                  class="px-5 py-3 border-b border-gray-200 text-gray-800 text-left uppercase font-normal lg:table-cell"
                >
                  Start
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr
                v-for="stream in newestFirst"
                :key="stream.id"
                class="divide-x divide-gray-200 border-b border-gray-200 cursor-pointer"
              >
                <TableRow
                  :streamConfig="stream"
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
import { PlusIcon } from '@heroicons/vue/24/outline'
import { mapState, mapActions } from 'pinia'
import { useConnectionsStore } from '@/stores/connections'
import { useStreamsStore } from '@/stores/streamConfig'

export default {
  methods: {
    ...mapActions(useConnectionsStore, ['refreshConnections']),
    addStream() {
      useStreamsStore().resetCurrentStream()
      useConnectionsStore().resetCurrentConnection()
    }
  },
  components: {
    TableRow,
    PlusIcon
  },
  computed: {
    ...mapState(useStreamsStore, ['streams', 'streamsByType', 'newestFirst']),
    connectionByID() {
      return (id) => {
        return useConnectionsStore().connectionByID(id)
      }
    }
  }
}
</script>
