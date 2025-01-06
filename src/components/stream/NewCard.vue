<template>
  <div class="w-full">
    <div
      class="bg-white shadow-lg rounded-xl overflow-hidden cursor-pointer transform hover:scale-[1.02] hover:shadow-xl duration-300 ease-in-out flex flex-col h-full border border-gray-200/75"
      @click="addStream">
      <div class="flex items-center justify-between bg-gray-100/75 p-2.5 border-b border-gray-200">
        <div class="uppercase tracking-wide text-sm font-semibold text-gray-900 truncate">
          Create New Stream
        </div>
        <PlusIcon class="h-5 w-5 text-gray-600" />
      </div>
      <div class="flex-grow p-6 space-y-2 text-sm flex flex-col items-center justify-center bg-white">
        <img class="w-16 h-16 mb-6" src="/images/streams/add-stream.svg" alt="Create new stream" />
        <p class="text-gray-600 text-center">Click here to create a new data stream</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { PlusIcon } from '@heroicons/vue/24/outline'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useRouter } from 'vue-router'

export default defineComponent({
  components: {
    PlusIcon
  },
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
