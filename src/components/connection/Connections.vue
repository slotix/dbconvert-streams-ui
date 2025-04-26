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

    <!-- Existing content -->
    <div v-else>
      <!-- Header section with controls -->
      <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex items-center gap-4 flex-wrap">
            <DBTypesCombo :isFilterIcon="true" @update:selected-db-type="filterDB" />
            <div class="flex-shrink-0">
              <ToggleView />
            </div>
          </div>
          <button
            class="inline-flex items-center justify-center rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600 w-full sm:w-auto"
            @click="addConnection"
          >
            <PlusIcon class="mr-2 h-5 w-5 text-white" aria-hidden="true" />
            New connection
          </button>
        </div>
      </div>

      <!-- Loading indicator -->
      <div
        v-if="isLoadingConnections"
        class="flex flex-col items-center justify-center h-full bg-gray-200 py-8"
      >
        <Spinner text="Loading connections..." size="lg" />
      </div>

      <!-- Content section -->
      <div v-else>
        <!-- Empty state -->
        <div
          v-if="connectionsByType.length === 0"
          class="flex items-center justify-center flex-col text-center pb-16"
        >
          <p class="mt-1 text-lg text-gray-700">
            You haven't created any connections yet.<br />
            Click the button below to create your first connection.
          </p>
          <NewCard />
        </div>

        <!-- Cards/Table view -->
        <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div v-show="currentViewType === 'cards'" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div v-for="connection in connectionsByType" :key="connection.id" class="w-full">
              <CardItem :connection="connection" :isStreamsPage="isStreamsPage" />
            </div>
          </div>
          <div v-show="currentViewType === 'table'" class="mx-6">
            <Table :connections="connectionsByType" :isStreamsPage="isStreamsPage" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted } from 'vue'
import Table from './Table.vue'
import DBTypesCombo from './DBTypesCombo.vue'
import ToggleView from '@/components/common/ToggleView.vue'
import CardItem from './CardItem.vue'
import NewCard from './NewCard.vue'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import { PlusIcon } from '@heroicons/vue/24/solid'
import Spinner from '@/components/common/Spinner.vue'

export default defineComponent({
  name: 'Connections',
  components: {
    Table,
    DBTypesCombo,
    ToggleView,
    CardItem,
    NewCard,
    PlusIcon,
    Spinner
  },
  setup() {
    const connectionsStore = useConnectionsStore()
    const commonStore = useCommonStore()
    const filter = ref<string | null>(null)

    const connectionsByType = computed(() => connectionsStore.connectionsByType)
    const currentViewType = computed(() => commonStore.currentViewType)
    const isStreamsPage = computed(() => commonStore.isStreamsPage)
    const isBackendConnected = computed(() => commonStore.isBackendConnected)
    const isLoadingConnections = computed(() => connectionsStore.isLoadingConnections)

    const filterDB = (dbType: { type: string }) => {
      filter.value = dbType.type
    }

    const setFilter = (newFilter: string) => {
      connectionsStore.setFilter(newFilter)
    }

    const addConnection = () => {
      commonStore.openModal('Add')
    }

    watch(filter, (newFilter) => {
      if (newFilter == null || newFilter.toLowerCase() === 'all') {
        setFilter('')
      } else {
        setFilter(newFilter)
      }
    })

    onMounted(async () => {
      try {
        // Only try to refresh connections if we're properly initialized
        if (commonStore.isBackendConnected) {
          await connectionsStore.refreshConnections()
        }
      } catch (err) {
        commonStore.showNotification((err as Error).message, 'error')
      }
      await commonStore.getViewType()
    })

    // Watch for backend connection status changes
    watch(
      () => commonStore.isBackendConnected,
      async (isConnected) => {
        if (isConnected) {
          try {
            await connectionsStore.refreshConnections()
          } catch (err) {
            commonStore.showNotification((err as Error).message, 'error')
          }
        }
      }
    )

    return {
      filter,
      connectionsByType,
      currentViewType,
      filterDB,
      isStreamsPage,
      addConnection,
      isBackendConnected,
      isLoadingConnections
    }
  }
})
</script>
