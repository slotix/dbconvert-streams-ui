<template>
  <header>
    <div class="bg-white flex flex-col max-w-7xl mx-auto py-6 px-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        <span v-if="isBackendConnected">
          Monitor stream:
          <span class="text-gray-500 text-lg font-normal">{{ monitoringStore.streamID }}</span>
        </span>
        <span v-else>Stream Monitoring Unavailable</span>
      </h1>
      <div v-if="isBackendConnected && monitoringStore.streamID != ''" class="flex space-x-2">
        <button v-if="!isPaused" :disabled="isStreamFinished"
          class="px-4 py-2 bg-cyan-500 text-white font-semibold rounded-md hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          @click="pauseStream">
          <PauseIcon class="h-5 w-5 mr-2" />
          Pause
        </button>
        <button v-else :disabled="isStreamFinished"
          class="px-4 py-2 bg-cyan-500 text-white font-semibold rounded-md hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          @click="resumeStream">
          <PlayIcon class="h-5 w-5 mr-2" />
          Resume
        </button>
        <button :disabled="isStreamFinished"
          class="px-4 py-2 bg-red-500 text-white font-semibold rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          @click="stopStream">
          <StopIcon class="h-5 w-5 mr-2" />
          Stop
        </button>
      </div>
    </div>
  </header>
  <main>
    <div v-if="isBackendConnected && monitoringStore.streamID != ''" class="antialiased bg-gray-200">
      <div class="flex flex-wrap max-w-7xl mx-auto px-4 overflow-hidden">
        <div class="w-full px-4 overflow-hidden mb-10">
          <ProgressContainer />
          <StatContainer />
          <LogContainer />
        </div>
      </div>
    </div>
    <div v-else-if="isBackendConnected" class="antialiased bg-gray-200">
      <div class="text-center pt-16 pb-16">
        <ChartBarSquareIcon class="mx-auto h-16 w-16 text-gray-400" />
        <h3 class="mt-2 text-xl font-semibold text-gray-900">No Active Streams</h3>
        <p class="mt-1 text-lg text-gray-700">
          Currently, there are no ongoing data transfer processes.
        </p>
      </div>
    </div>
    <div v-else class="antialiased bg-gray-200">
      <div class="max-w-7xl mx-auto px-4 py-8">
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong class="font-bold">Connection Error: </strong>
          <span class="block sm:inline">Unable to connect to the server. Please try again later.</span>
        </div>
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
const isBackendConnected = computed(() => commonStore.isBackendConnected)

onMounted(() => {
  if (isBackendConnected.value) {
    monitoringStore.consumeLogsFromNATS()
  }
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

const isStreamFinished = computed(() => monitoringStore.currentStage?.title === 'Finished')
</script>
