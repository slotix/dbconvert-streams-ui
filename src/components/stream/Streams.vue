<template>
  <div class="antialiased bg-gray-200">
    <div class="flex flex-wrap gap-x-3 space-y-0 max-w-7xl mx-auto py-6 px-8 justify-between">
      <ToggleView class="py-2 px-8" />
      <div class="flex-grow"></div>
      <router-link :to="{ name: 'ManageStream', params: { mode: 'add' } }">
        <button type="button"
          class="py-2 px-4 mt-2 flex items-center justify-center rounded-md bg-gray-600 text-center text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
          @click="addStream">
          <PlusIcon class="mr-2 h-5 w-5 text-white" aria-hidden="true" />
          Add stream
        </button>
      </router-link>
    </div>
    <div v-if="streams.length > 0" class="flex flex-wrap max-w-7xl mx-auto px-4 overflow-hidden"
      v-show="viewType === 'cards'">
      <!-- <div class="w-full px-4 overflow-hidden md:w-1/2 lg:w-1/3">
        <NewCard />
      </div> -->
      <div class="w-full px-4 overflow-hidden md:w-1/2 lg:w-1/3" v-for="stream in streams" :key="stream.id">
        <CardItem :stream="stream" :source="connectionByID(stream.source)" :target="connectionByID(stream.target)" />
      </div>
    </div>
    <div v-else class="flex items-center justify-center flex-col text-center pb-16">
      <p class="mt-1 text-lg text-gray-700">
        You haven't created any streams yet.<br> Click the button below to create your first stream.
      </p>
      <NewCard />
    </div>
    <div class="flex flex-wrap mx-6 overflow-hidden" v-show="viewType === 'table'">
      <Table />
    </div>
  </div>
</template>
<script>
import { ref, onMounted, computed } from 'vue';
import Table from './Table.vue';
import NewCard from './NewCard.vue';
import ToggleView from '@/components/common/ToggleView.vue';
import CardItem from './CardItem.vue';
import { useStreamsStore } from '@/stores/streamConfig';
import { useConnectionsStore } from '@/stores/connections';
import { useCommonStore } from '@/stores/common';
import { mapActions } from 'pinia';
import { PlusIcon } from '@heroicons/vue/24/solid';
import { useRouter } from 'vue-router';

export default {
  name: 'Streams',
  components: {
    Table,
    ToggleView,
    CardItem,
    NewCard,
    PlusIcon,
  },

  setup() {
    const streamsStore = useStreamsStore();
    const connectionsStore = useConnectionsStore();
    const commonStore = useCommonStore();

    const fetchStreams = async () => {
      try {
        await streamsStore.refreshStreams();
      } catch (err) {
        commonStore.showNotification(err.message);
      }
    };

    const viewType = computed(() => commonStore.currentViewType);
    const streams = computed(() => streamsStore.newestFirst);
    const router = useRouter();

    const addStream = () => {
      streamsStore.resetCurrentStream();
      connectionsStore.resetCurrentConnection();
      // router.push({ name: 'ManageStream', params: { mode: 'add' } });
    };

    onMounted(async () => {
      try {
        await connectionsStore.refreshConnections();
        await fetchStreams();
      } catch (err) {
        commonStore.showNotification(err.message);
      }
      await commonStore.getViewType();
    });
    return {
      ...mapActions(useStreamsStore, ['refreshStreams']),
      ...mapActions(useConnectionsStore, ['refreshConnections']),
      ...mapActions(useCommonStore, ['getViewType']),
      connectionByID(id) {
        return connectionsStore.connectionByID(id);
      },
      viewType,
      streams,
      addStream,
    };
  },
};
</script>
