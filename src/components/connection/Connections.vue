<template>
  <div class="antialiased bg-gray-200">
    <!-- View control buttons -->
    <div class="flex flex-wrap justify-between items-center max-w-7xl mx-auto py-6 px-8">
      <div class="flex items-center space-x-4">
        <DBTypesCombo :isFilterIcon="true" @update:selected-db-type="filterDB" />
        <ToggleView class=" px-8 pt-4" />
      </div>
      <button
        @click="addConnection"
        class="flex items-center justify-center rounded-md bg-gray-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
      >
        <PlusIcon class="mr-2 h-5 w-5 text-white" aria-hidden="true" />
        New connection
      </button>
    </div>
    <!-- End View control buttons -->

    <div v-if="connectionsByType.length > 0" class="max-w-7xl mx-auto px-4">
      <div v-show="currentViewType === 'cards'" class="flex flex-wrap -mx-4">
        <div class="w-full px-4 mb-8 md:w-1/2 lg:w-1/3" v-for="connection in connectionsByType" :key="connection.id">
          <CardItem :connection="connection" :isStreamsPage="isStreamsPage" />
        </div>
      </div>
      <div v-show="currentViewType === 'table'" class="mx-6">
        <Table :connections="connectionsByType" :isStreamsPage="isStreamsPage" />
      </div>
    </div>
    <div v-else class="flex items-center justify-center flex-col text-center pb-16">
      <p class="mt-1 text-lg text-gray-700">
        You haven't created any connections yet.<br> Click the button below to create your first connection.
      </p>
      <button
        @click="addConnection"
        class="mt-4 flex items-center justify-center rounded-md bg-gray-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
      >
        <PlusIcon class="mr-2 h-5 w-5 text-white" aria-hidden="true" />
        New connection
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted } from 'vue'
import Table from './Table.vue'
import DBTypesCombo from './DBTypesCombo.vue'
import ToggleView from '@/components/common/ToggleView.vue'
import CardItem from './CardItem.vue'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import { PlusIcon } from '@heroicons/vue/24/solid'

export default defineComponent({
  name: 'Connections',
  components: {
    Table,
    DBTypesCombo,
    ToggleView,
    CardItem,
    PlusIcon
  },
  setup() {
    const connectionsStore = useConnectionsStore()
    const commonStore = useCommonStore()
    const filter = ref<string | null>(null)

    const connectionsByType = computed(() => connectionsStore.connectionsByType)
    const currentViewType = computed(() => commonStore.currentViewType)
    const isStreamsPage = computed(() => commonStore.isStreamsPage)

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
        await connectionsStore.refreshConnections()
      } catch (err) {
        commonStore.showNotification((err as Error).message)
      }

      await commonStore.getViewType()
    })

    return {
      filter,
      connectionsByType,
      currentViewType,
      filterDB,
      isStreamsPage,
      addConnection
    }
  }
})
</script>
