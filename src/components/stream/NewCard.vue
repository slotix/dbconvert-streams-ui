<template>
  <div class="w-full p-10">
    <div
      class="bg-white shadow-md rounded-lg overflow-hidden cursor-pointer transform hover:scale-105 duration-300 ease-in-out flex flex-col h-full"
      @click="addStream"
    >
      <div class="flex-grow flex flex-col space-y-2 p-10 justify-center items-center">
        <img class="w-20 h-20 mb-12" src="/images/streams/add-stream.svg" alt="Create new stream" />
        <div class="text-lg font-semibold text-gray-800 text-center">Create New Stream</div>
        <p class="text-gray-600 text-center mb-4">Click here to create a new data stream</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useRouter } from 'vue-router'

export default defineComponent({
  setup() {
    const router = useRouter()
    const streamsStore = useStreamsStore()
    const connectionsStore = useConnectionsStore()

    const addStream = () => {
      streamsStore.resetCurrentStream()
      connectionsStore.resetCurrentConnection()
      router.push({ name: 'ManageStream', params: { mode: 'add' } })
    }

    return {
      addStream
    }
  }
})
</script>
