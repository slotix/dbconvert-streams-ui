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
          <svg
            :class="[
              'w-6 h-6',
              index <= store.currentStageID - 1 ? 'text-green-500' : 'text-gray-300'
            ]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            ></path>
          </svg>
          <span
            :class="[
              'text-sm mt-1',
              index === store.currentStageID - 1 ? 'font-bold text-green-600' : 'text-gray-500'
            ]"
            >{{ stage.title }}</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useMonitoringStore } from '@/stores/monitoring'
const store = useMonitoringStore()

const stageClass = (index) => {
  if (!store.currentStage) return 'text-gray-600' // If no current stage, default color
  if (index <= store.stages.findIndex((stage) => stage === store.currentStage)) {
    return 'text-green-600' // Active or previous stages
  } else {
    return 'text-gray-600' // Following stages
  }
}
</script>
