<script setup lang="ts">
import { ViewfinderCircleIcon } from '@heroicons/vue/24/outline'
</script>

<template>
  <div
    class="absolute top-4 left-4 p-3 rounded-lg border bg-white/95 dark:bg-gray-850/95 border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-gray-900/40 backdrop-blur-sm z-10"
  >
    <h4 class="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Legend</h4>
    <div class="space-y-1.5">
      <div class="flex items-center">
        <div
          class="w-4 h-4 mr-2 bg-white dark:bg-gray-850 border border-gray-300 dark:border-gray-700 rounded"
        ></div>
        <span class="text-xs text-gray-700 dark:text-gray-300">Table</span>
      </div>
      <div class="flex items-center">
        <ViewfinderCircleIcon class="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" />
        <span class="text-xs text-gray-700 dark:text-gray-300 italic font-medium">View</span>
      </div>
      <div class="flex items-center">
        <div class="w-5 h-0.5 mr-2 bg-cyan-500"></div>
        <span class="text-xs text-gray-700 dark:text-gray-300">Foreign Key</span>
      </div>
      <div class="flex items-center">
        <div class="w-5 h-0.5 mr-2 bg-orange-500"></div>
        <span class="text-xs text-gray-700 dark:text-gray-300">Junction Table</span>
      </div>
      <div class="flex items-center">
        <div
          class="w-5 h-0.5 mr-2 border-t border-gray-400 dark:border-gray-500 border-dashed"
        ></div>
        <span class="text-xs text-gray-700 dark:text-gray-300">View Dependency</span>
      </div>
    </div>
  </div>
</template>
