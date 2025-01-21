<template>
  <div class="relative mt-10 pb-5">
    <h3 class="text-xl font-semibold leading-6 text-gray-900">Progress</h3>
  </div>
  <div class="mb-5 overflow-hidden rounded-lg bg-white shadow">
    <div class="px-4 py-5 sm:p-6">
      <h4 class="sr-only">Status</h4>
      <p class="text-lg font-medium text-gray-900">{{ store.currentStage?.description }}</p>

      <div class="mt-3" aria-hidden="true">
        <div class="overflow-hidden rounded-full bg-gray-200">
          <div class="rounded-full bg-green-500 h-3" :style="{ width: store.stagesBarWidth }"></div>
        </div>
      </div>

      <!-- Stage Icons -->
      <div class="flex justify-between mt-4 mb-2">
        <div
          v-for="(stage, index) in store.stages"
          :key="stage.id"
          class="flex flex-col items-center"
        >
          <div
            :class="['w-8 h-8 rounded-full flex items-center justify-center', stageClass(index)]"
          >
            <span class="text-sm font-semibold">{{ index + 1 }}</span>
          </div>
          <span
            :class="[
              'text-sm mt-1',
              textClass(index),
              index === store.currentStageID - 1 ? 'font-bold' : ''
            ]"
            >{{ stage.title }}</span
          >
          <span v-if="stage.timestamp" class="text-xs mt-1 text-gray-500">{{
            formatTimestamp(stage.timestamp)
          }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMonitoringStore } from '@/stores/monitoring'
import { watch } from 'vue'

const store = useMonitoringStore()

function stageClass(index: number): string {
  if (!store.currentStage) return 'bg-gray-200 text-gray-400'
  if (index < store.currentStageID - 1) {
    return 'bg-green-500 text-white' // Completed stages
  } else if (index === store.currentStageID - 1) {
    return 'bg-green-600 text-white' // Current stage
  } else {
    return 'bg-gray-200 text-gray-400' // Following stages
  }
}

function textClass(index: number): string {
  if (!store.currentStage) return 'text-gray-400'
  if (index < store.currentStageID - 1) {
    return 'text-green-500' // Completed stages
  } else if (index === store.currentStageID - 1) {
    return 'text-green-600' // Current stage
  } else {
    return 'text-gray-400' // Following stages
  }
}

function formatTimestamp(timestamp: number | null): string {
  if (!timestamp) return ''
  const timestampInMs = timestamp < 1e12 ? timestamp * 1000 : timestamp
  const date = new Date(timestampInMs)
  return date.toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Watch for changes in currentStageID and update the timestamp
watch(
  () => store.currentStageID,
  (newStageID) => {
    const stage = store.stages.find((s) => s.id === newStageID)
    if (stage) {
      stage.timestamp = Date.now()
    }
  }
)
</script>
