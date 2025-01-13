<template>
  <div class="antialiased bg-gray-50">
    <!-- Connection error message -->
    <div v-if="!isBackendConnected" class="max-w-7xl mx-auto py-6 px-8">
      <div
        class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong class="font-bold">Connection Error: </strong>
        <span class="block sm:inline"
          >Unable to connect to the server. Please check your backend services and try again.</span
        >
      </div>
    </div>

    <div v-else>
      <div class="flex flex-wrap gap-x-3 space-y-0 max-w-7xl mx-auto py-6 px-8 justify-between">
        <ToggleView class="py-2 px-8" />
        <div class="flex-grow"></div>
        <router-link :to="{ name: 'ManageStream', params: { mode: 'add' } }">
          <button
            type="button"
            class="py-2 px-4 mt-2 flex items-center justify-center rounded-md bg-gray-600 text-center text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
            @click="addStream"
          >
            <PlusIcon class="mr-2 h-5 w-5 text-white" aria-hidden="true" />
            New stream
          </button>
        </router-link>
      </div>
      <div
        v-if="streams.length > 0"
        v-show="viewType === 'cards'"
        class="flex flex-wrap max-w-7xl mx-auto px-4 overflow-hidden"
      >
        <div
          v-for="stream in streams"
          :key="stream.id"
          class="w-full px-4 overflow-hidden md:w-1/2 xl:w-1/2 py-8"
        >
          <CardItem
            :stream="stream"
            :source="connectionByID(stream.source)"
            :target="connectionByID(stream.target)"
          />
        </div>
      </div>
      <div v-else class="flex items-center justify-center flex-col text-center pb-16">
        <p class="mt-1 text-lg text-gray-700">
          You haven't created any streams yet.<br />
          Click the button below to create your first stream.
        </p>
        <NewCard />
      </div>
      <div v-show="viewType === 'table'" class="flex flex-wrap mx-6 overflow-hidden">
        <Table />
      </div>
    </div>
  </div>
</template>
<script>
import { ref, onMounted, computed } from 'vue'
import Table from './Table.vue'
import NewCard from './NewCard.vue'
import ToggleView from '@/components/common/ToggleView.vue'
import CardItem from './CardItem.vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import { mapActions } from 'pinia'
import { PlusIcon } from '@heroicons/vue/24/solid'
import { useRouter } from 'vue-router'

export default {
  name: 'Streams',
  components: {
    Table,
    ToggleView,
    CardItem,
    NewCard,
    PlusIcon
  },

  setup() {
    const streamsStore = useStreamsStore()
    const connectionsStore = useConnectionsStore()
    const commonStore = useCommonStore()

    const fetchStreams = async () => {
      try {
        await streamsStore.refreshStreams()
      } catch (err) {
        commonStore.showNotification(err.message, 'error')
      }
    }

    const viewType = computed(() => commonStore.currentViewType)
    const streams = computed(() => streamsStore.newestFirst)
    const router = useRouter()
    const isBackendConnected = computed(() => commonStore.isBackendConnected)

    const addStream = () => {
      streamsStore.addStream()
    }

    onMounted(async () => {
      try {
        await connectionsStore.refreshConnections()
        await fetchStreams()
      } catch (err) {
        commonStore.showNotification(err.message, 'error')
      }
      await commonStore.getViewType()
    })

    return {
      ...mapActions(useStreamsStore, ['refreshStreams']),
      ...mapActions(useConnectionsStore, ['refreshConnections']),
      ...mapActions(useCommonStore, ['getViewType']),
      connectionByID(id) {
        return connectionsStore.connectionByID(id)
      },
      viewType,
      streams,
      addStream,
      isBackendConnected
    }
  }
}
</script>
