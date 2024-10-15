<template>
  <header>
    <div class="bg-white flex flex-col max-w-7xl mx-auto py-6 px-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Monitor stream: <span
          class="text-gray-500 text-lg underline underline-offset-4 decoration-dashed decoration-gray-400">{{
            monitoringStore.streamID }}
        </span>
      </h1>
      <p class="text-gray-500 text-sm mb-4">
        Config: <span class="">{{ currentStreamConfig.name }}</span>
      </p>
      <div v-if="monitoringStore.streamID != ''" class="antialiased">
        <div class="flex space-x-1 border border-gray-300 rounded-md overflow-hidden">
          <button @click="pauseStream"
            class="px-4 py-2 bg-white text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-500 flex items-center">
            <PauseIcon class="h-5 w-5 mr-2 ml-2 text-yellow-700" />
            Pause
          </button>
          <div class="w-px bg-gray-300"></div>
          <button @click="resumeStream"
            class="px-4 py-2 bg-white text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-500 flex items-center">
            <PlayIcon class="h-5 w-5 mr-2 ml-2 text-green-700" />
            Resume
          </button>
          <div class="w-px bg-gray-300"></div>
          <button @click="stopStream"
            class="px-4 py-2 bg-white text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-500 flex items-center">
            <StopIcon class="h-5 w-5 mr-2 ml-2 text-red-700" />
            Stop
          </button>
        </div>
      </div>
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
    <div v-else class="antialiased bg-gray-200">
      <div class="text-center pt-16 pb-16">
        <ChartBarSquareIcon class="mx-auto h-16 w-16 text-gray-400" />
        <h3 class="mt-2 text-xl font-semibold text-gray-900">No Active Streams</h3>
        <p class="mt-1 text-lg text-gray-700">Currently, there are no ongoing data transfer processes.</p>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { ChartBarSquareIcon, PauseIcon, PlayIcon, StopIcon } from '@heroicons/vue/20/solid';
import LogContainer from '@/components/monitoring/LogContainer.vue';
import StatContainer from '@/components/monitoring/StatContainer.vue';
import ProgressContainer from '@/components/monitoring/ProgressContainer.vue';
import { useMonitoringStore } from '@/stores/monitoring';
import { useStreamsStore } from '@/stores/streamConfig';
import { useCommonStore } from '@/stores/common';

const monitoringStore = useMonitoringStore();
const streamsStore = useStreamsStore();
const commonStore = useCommonStore();

const currentStreamConfig = computed(() => {
  return monitoringStore.streamConfig;
});

onMounted(() => {
  monitoringStore.consumeLogsFromNATS();
});

const pauseStream = async () => {
  try {
    await streamsStore.pauseStream(monitoringStore.streamID);
    commonStore.showNotification('Stream paused', 'success');
    commonStore.fetchUsageData();
  } catch (error) {
    handleStreamError(error, 'Failed to pause stream');
  }
};

const resumeStream = async () => {
  try {
    await streamsStore.resumeStream(monitoringStore.streamID);
    commonStore.showNotification('Stream resumed', 'success');
  } catch (error) {
    handleStreamError(error, 'Failed to resume stream');
  }
};

const stopStream = async () => {
  try {
    await streamsStore.stopStream(monitoringStore.streamID);
    commonStore.showNotification('Stream stopped', 'success');
    commonStore.fetchUsageData();
  } catch (error) {
    handleStreamError(error, 'Failed to stop stream');
  }
};

const handleStreamError = (error: any, defaultMessage: string) => {
  console.error(error);
  const errorMessage = error instanceof Error ? error.message : defaultMessage;
  commonStore.showNotification(errorMessage, 'error');
};
</script>
