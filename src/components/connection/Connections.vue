<template>
  <div class="antialiased bg-gray-200">
    <!-- View control buttons   -->
    <div class="flex flex-wrap gap-x-3 space-y-0 max-w-7xl mx-auto py-6 px-8;">
      <div class="flex flex-start px-8">
        <DBTypesCombo :isFilterIcon="true" @update:selected-db-type="filterDB" />
      </div>
      <ToggleView class="py-2 px-8" />
    </div>
    <!-- End View control buttons   -->
    <div v-if="connectionsByType.length > 0" class="flex flex-wrap max-w-7xl mx-auto px-4 overflow-hidden"
      v-show="currentViewType === 'cards'">
      <div class="w-full px-4 overflow-hidden md:w-1/2 lg:w-1/3">
        <NewCard />
      </div>
      <div class="w-full px-4 overflow-hidden md:w-1/2 lg:w-1/3" v-for="connection in connectionsByType"
        :key="connection.id">
        <CardItem :connection="connection" :isStreamsTab="isStreamsTab" />
      </div>
    </div>
    <div v-else class="flex items-center justify-center flex-col text-center pb-16">
      <p class="mt-1 text-lg text-gray-700">
        You haven't created any connections yet.<br> Click the button below to create your first connection.
      </p>
      <NewCard />
    </div>
    <div class="flex flex-wrap mx-6 overflow-hidden" v-show="currentViewType === 'table'">
      <Table :connections="connectionsByType" :isStreamsTab="isStreamsTab" />
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import Table from './Table.vue'
import NewCard from './NewCard.vue'
import DBTypesCombo from './DBTypesCombo.vue'
import ToggleView from '@/components/common/ToggleView.vue'
import CardItem from './CardItem.vue'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'


export default {
  name: 'Connections',
  components: {
    Table,
    DBTypesCombo,
    ToggleView,
    CardItem,
    NewCard
  },
  props: {
    isStreamsTab: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const connectionsStore = useConnectionsStore()
    const commonStore = useCommonStore()
    const filter = ref(null)

    const connectionsByType = computed(() => connectionsStore.connectionsByType)
    const currentViewType = computed(() => commonStore.currentViewType)

    const filterDB = (dbType) => {
      filter.value = dbType.type
    }

    const setFilter = (newFilter) => {
      connectionsStore.setFilter(newFilter)
    }

    watch(filter, (newFilter) => {
      if (newFilter == null || newFilter.toLowerCase() == 'all') {
        setFilter('')
        return
      }
      setFilter(newFilter)
    })
    onMounted(async () => {
      commonStore.showNotificationBar = false;

      try {
        await connectionsStore.refreshConnections();
      } catch (err) {
        commonStore.showNotification(err.message);
      }

      await commonStore.getViewType();
    });

    return {
      filter,
      connectionsByType,
      currentViewType,
      filterDB
    }
  }
}
</script>
