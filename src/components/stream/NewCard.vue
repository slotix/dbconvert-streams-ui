<template>
  <div class="max-w-sm w-full py-6">
    <div class="bg-white shadow-md rounded-lg overflow-hidden">
      <div class="bg-gray-100 p-6 tracking-wide uppercase text-sm font-medium text-gray-700">
        Create new stream
      </div>
      <div class="flex justify-center">
        <img
          class="mt-8 mb-7 h-20 w-20 rounded-full"
          :src="'/images/streams/add-stream.svg'"
          alt="Create database connection"
        />
      </div>
      <router-link :to="{ name: 'ManageStream', params: { mode: 'add' }  }">
        <div class="flex flex-wrap text-gray-700 bg-gray-100">
          <button
            type="button"
            @click="addStream"
            class="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg rounded-br-lg border border-gray-500 py-4 text-sm font-semibold text-gray-200 bg-gray-600"
          >
            Add Stream
          </button>
        </div>
      </router-link>
    </div>
  </div>
</template>
<script >
import { useStreamsStore } from "@/stores/streams.js";
import {useConnectionsStore} from "@/stores/connections.js"

export default {
  methods: {
    addStream() {
      useStreamsStore().resetCurrentStream();
      useConnectionsStore().resetCurrentConnection();
    }
  }
}
// import shared from './shared.js'
// export default Object.assign({}, shared, {})
</script>
