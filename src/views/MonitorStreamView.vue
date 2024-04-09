<template>
  <header>
    <div class="bg-white flex flex-wrap justify-between space-y-4 sm:space-y-0 max-w-7xl mx-auto py-6 px-8">
      <h1 class="flex-auto text-3xl font-bold text-gray-900 dark:text-white;">
        Monitor stream: <span class="font-normal text-xl text-gray-600 pl-3">{{ monitoringStore.streamID }}</span>
      </h1>
    </div>
  </header>
  <main>
    <div class="antialiased bg-gray-200">
      <div class="flex flex-wrap max-w-7xl mx-auto px-4 overflow-hidden">
        <div class="w-full px-4 overflow-hidden mb-10">
          <ProgressContainer />
          <StatContainer />
          <LogContainer />
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>

import { onMounted } from 'vue';
import LogContainer from '@/components/monitoring/LogContainer.vue';
import StatContainer from '@/components/monitoring/StatContainer.vue';
import ProgressContainer from '@/components/monitoring/ProgressContainer.vue';

import { useMonitoringStore } from '@/stores/monitor.js'
const monitoringStore = useMonitoringStore()
onMounted(() => {
  monitoringStore.consumeLogsFromNATS();
});
</script>
