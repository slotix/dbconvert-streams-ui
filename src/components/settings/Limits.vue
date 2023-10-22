<template>
  <div class="px-4 sm:px-6 lg:px-8">
    <div class="flex items-center">
      <div class="flex-auto border-b border-gray-400 pb-5">
        <h3 class="text-base font-semibold leading-6 text-gray-900">Limits</h3>
      </div>
    </div>
    <div class="mt-6">
      <div>
        <label for="numberOfEvents" class="block text-sm font-medium text-gray-700"
          >Number of Events:</label
        >
        <input
          type="number"
          id="numberOfEvents"
          v-model="limits.numberOfEvents"
          class="mt-1 focus:ring-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
        />
      </div>
      <div class="mt-4">
        <label for="elapsedTime" class="block text-sm font-medium text-gray-700"
          >Elapsed Time (seconds):</label
        >
        <input
          type="number"
          id="elapsedTime"
          v-model="limits.elapsedTime"
          class="mt-1 focus:ring-gray-500 focus:border-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, watchEffect } from 'vue'
import { useStreamsStore } from '@/stores/streams.js'
const currentStream = useStreamsStore().currentStream

const limits =
  ref(currentStream.limits) ||
  ref({
    numberOfEvents: 0,
    elapsedTime: 0
  })
watch(
  limits,
  (newLimits) => {
    // Check if any limit is less than zero and reset it to zero
    if (newLimits.numberOfEvents < 0) {
      limits.value.numberOfEvents = 0
    }
    if (newLimits.elapsedTime < 0) {
      limits.value.elapsedTime = 0
    }

    // Update limits in streams store when limits change
    currentStream.limits = newLimits
  },
  { deep: true }
)
</script>
