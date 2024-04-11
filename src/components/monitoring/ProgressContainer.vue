<template>
  <div class="relative mt-10 mb-10">
    <div class="absolute inset-0 flex items-center" aria-hidden="true">
      <div class="w-full border-t border-gray-300"></div>
    </div>
    <div class="relative flex justify-center">
      <span class="px-3 text-xl font-semibold leading-6 text-gray-600">Progress </span>
    </div>
  </div>
  <div class="mt-5  overflow-hidden rounded-lg bg-white shadow">
    <div class="px-4 py-5 sm:p-6">
      <h4 class="sr-only">Status</h4>
      <p class="text-lg font-medium text-gray-900"> {{ store.currentStage?.description }}
      </p>
      <div class="mt-6" aria-hidden="true">
        <div class="overflow-hidden rounded-full bg-gray-200">
          <div class="rounded-full bg-green-500 h-3" :style="{ width: store.stagesBarWidth }" />
        </div>
        <div class="mt-6 hidden grid-cols-4 text-sm font-medium text-gray-600 sm:grid">
          <div v-for="stage in stages" :key="stage.id" class="text-center">
            <div class="text-gray-600">{{ stage.title }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { useMonitoringStore } from '@/stores/monitor.js'
const store = useMonitoringStore() 
const stages = store.stages
</script>