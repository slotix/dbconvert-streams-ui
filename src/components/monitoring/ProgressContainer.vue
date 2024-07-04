<template>
  <div class="relative mt-10 pb-5">
    <h3 class="text-xl font-semibold leading-6 text-gray-900">Progress</h3>
  </div>
  <div class=" mb-5 overflow-hidden rounded-lg bg-white shadow">
    <div class="px-4 py-5 sm:p-6">
      <h4 class="sr-only">Status</h4>
      <p class="text-lg font-medium text-gray-900">{{ store.currentStage?.description }}</p>
      <div class="mt-5" aria-hidden="true">
        <div class="overflow-hidden rounded-full bg-gray-200">
          <div class="rounded-full bg-green-500 h-3" :style="{ width: store.stagesBarWidth }"></div>
        </div>
        <div class="mt-5 hidden grid-cols-4 text-base font-medium sm:grid">
          <div v-for="(stage, index) in stages" :key="stage.id" :class="stageClass(index)" class="text-center">
            {{ stage.title }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useMonitoringStore } from '@/stores/monitoring'
const store = useMonitoringStore()
const stages = store.stages

const stageClass = (index) => {
  if (!store.currentStage) return 'text-gray-600'; // If no current stage, default color
  if (index <= stages.findIndex(stage => stage === store.currentStage)) {
    return 'text-green-600'; // Active or previous stages
  } else {
    return 'text-gray-600'; // Following stages
  }
}
</script>
