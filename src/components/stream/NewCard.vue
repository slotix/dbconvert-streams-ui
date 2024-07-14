<template>
  <div class="max-w-sm w-full py-6">
    <div class="bg-white shadow-md rounded-lg overflow-hidden">
      <div class="bg-gray-100 p-6 tracking-wide uppercase text-sm font-medium text-gray-700">
        Create new stream
      </div>
      <div class="flex justify-center">
        <img class="mt-8 mb-8 h-24 w-20 rounded-full" :src="'/images/streams/add-stream.svg'" alt="Create database connection" />
      </div>
      <router-link :to="{ name: 'ManageStream', params: { mode: 'add' } }">
        <div class="flex flex-wrap text-gray-700 bg-gray-100">
          <button type="button" @click="addStream" class="relative -mr-px inline-flex flex-1 items-center justify-center gap-x-4 rounded-bl-lg rounded-br-lg border border-gray-300 py-4 text-sm font-semibold hover:bg-gray-200 hover:text-gray-900">
            Add Stream
          </button>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script>
import { useStreamsStore } from "@/stores/streams";
import { useConnectionsStore } from "@/stores/connections"

export default {
  methods: {
    addStream() {
      useStreamsStore().resetCurrentStream();
      useConnectionsStore().resetCurrentConnection();
    }
  }
}
</script>
