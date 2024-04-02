<template>
  <header>
    <div class="bg-white flex flex-wrap justify-between space-y-4 sm:space-y-0 max-w-7xl mx-auto py-6 px-8">
      <h1 class="flex-auto text-3xl font-bold text-gray-900 dark:text-white;">
        Monitor stream.
      </h1>
    </div>
  </header>
  <main>
    <div class="antialiased bg-gray-200">
      <div class="flex flex-wrap max-w-7xl mx-auto px-4 overflow-hidden">
        <div class="w-full px-4 overflow-hidden mb-10">
          <StatContainer />
          <LogContainer />
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>

import { ref, onMounted, computed } from 'vue';
import LogContainer from '@/components/common/LogContainer.vue';
import StatContainer from '@/components/common/StatContainer.vue';

import { useMonitoringStore } from '@/stores/monitor.js'

const store = useMonitoringStore()
onMounted(() => {
  store.consumeLogsFromNATS();
});
</script>
