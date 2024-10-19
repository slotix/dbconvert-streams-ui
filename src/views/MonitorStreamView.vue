<template>
  <header>
    <div class="bg-white flex flex-col max-w-7xl mx-auto py-6 px-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        Monitor stream: 
        <span class="text-gray-500 text-lg font-normal">{{ monitoringStore.streamID }}</span>
      </h1>
      <p class="text-gray-500 text-sm mb-4">
        Config: <span>{{ currentStreamConfig.name }}</span>
      </p>
      <div v-if="monitoringStore.streamID != ''" class="flex space-x-2">
        <button
          v-if="!isPaused"
          class="px-4 py-2 bg-cyan-500 text-white font-semibold rounded-md hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center"
          @click="pauseStream"
        >
          <PauseIcon class="h-5 w-5 mr-2" />
          Pause
        </button>
        <button
          v-else
          class="px-4 py-2 bg-cyan-500 text-white font-semibold rounded-md hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center"
          @click="resumeStream"
        >
          <PlayIcon class="h-5 w-5 mr-2" />
          Resume
        </button>
        <button
          class="px-4 py-2 bg-red-500 text-white font-semibold rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center"
          @click="stopStream"
        >
          <StopIcon class="h-5 w-5 mr-2" />
          Stop
        </button>
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
        <p class="mt-1 text-lg text-gray-700">
          Currently, there are no ongoing data transfer processes.
        </p>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { ChartBarSquareIcon, PauseIcon, PlayIcon, StopIcon } from '@heroicons/vue/20/solid'
import LogContainer from '@/components/monitoring/LogContainer.vue'
import StatContainer from '@/components/monitoring/StatContainer.vue'
import ProgressContainer from '@/components/monitoring/ProgressContainer.vue'
import { useMonitoringStore } from '@/stores/monitoring'
import { useStreamsStore } from '@/stores/streamConfig'
import { useCommonStore } from '@/stores/common'

const monitoringStore = useMonitoringStore()
const streamsStore = useStreamsStore()
const commonStore = useCommonStore()

const currentStreamConfig = computed(() => {
  return monitoringStore.streamConfig
})

const isPaused = ref(false)

onMounted(() => {
  monitoringStore.consumeLogsFromNATS()
})

const pauseStream = async () => {
  try {
    await streamsStore.pauseStream(monitoringStore.streamID)
    commonStore.showNotification('Stream paused', 'success')
    commonStore.fetchUsageData()
    isPaused.value = true
  } catch (error) {
    handleStreamError(error, 'Failed to pause stream')
  }
}

const resumeStream = async () => {
  try {
    await streamsStore.resumeStream(monitoringStore.streamID)
    commonStore.showNotification('Stream resumed', 'success')
    isPaused.value = false
  } catch (error) {
    handleStreamError(error, 'Failed to resume stream')
  }
}

const stopStream = async () => {
  try {
    await streamsStore.stopStream(monitoringStore.streamID)
    commonStore.showNotification('Stream stopped', 'success')
    commonStore.fetchUsageData()
  } catch (error) {
    handleStreamError(error, 'Failed to stop stream')
  }
}

const handleStreamError = (error: any, defaultMessage: string) => {
  console.error(error)
  const errorMessage = error instanceof Error ? error.message : defaultMessage
  commonStore.showNotification(errorMessage, 'error')
}
</script>
