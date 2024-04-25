<template>
  <header>
    <div class="bg-white flex flex-wrap justify-between space-y-4 sm:space-y-0 max-w-7xl mx-auto py-6 px-8">
      <h1 class="flex-auto text-3xl font-bold text-gray-900 dark:text-white;">
        Monitor stream: <span class="text-gray-500 text-lg underline underline-offset-4 decoration-dashed decoration-gray-400">{{ monitoringStore.streamID }}</span>
      </h1>
    </div>
  </header>
  <main>
    <div v-if="monitoringStore.streamID != ''" class="antialiased bg-gray-200">
      <div class="flex flex-wrap max-w-7xl mx-auto px-4 overflow-hidden">
        <div class="w-full px-4 overflow-hidden mb-10">
          <ProgressContainer />
          <StatContainer />
          <LogContainer />
        </div>
      </div>
    </div>
    <div v-else class ="antialiased bg-gray-200">
      <div class="text-center pt-16 pb-16">
        <ChartBarSquareIcon class=" mx-auto h-16 w-16 text-gray-400" />
        <h3 class="mt-2 text-xl font-semibold text-gray-900">No Active Streams</h3>
        <p class="mt-1 text-lg text-gray-700">Currently, there are no ongoing data transfer processes.</p>
      </div>
    </div>

  </main>
</template>

<script setup>

import { onMounted } from 'vue';
import { ChartBarSquareIcon } from '@heroicons/vue/20/solid'
import LogContainer from '@/components/monitoring/LogContainer.vue';
import StatContainer from '@/components/monitoring/StatContainer.vue';
import ProgressContainer from '@/components/monitoring/ProgressContainer.vue';

import { useMonitoringStore } from '@/stores/monitor.js'
const monitoringStore = useMonitoringStore();

onMounted(() => {
  monitoringStore.consumeLogsFromNATS();
});
</script>
