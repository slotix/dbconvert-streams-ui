<script setup lang="ts">
import { useLogsStore } from '@/stores/logs'
import { ExclamationCircleIcon } from '@heroicons/vue/24/solid'

const store = useLogsStore()
</script>

<template>
  <button
    type="button"
    class="fixed bottom-4 left-[calc(50%+2.5rem)] -translate-x-1/2 inline-flex items-center px-4 py-2 shadow-lg transition-all rounded-full focus:outline-none lg:left-[calc(50%+2.5rem)] bg-gray-700 text-white hover:bg-gray-800 shadow-gray-800/10"
    @click="store.toggleLogsPanel"
  >
    <ExclamationCircleIcon
      v-if="store.hasErrors"
      class="h-5 w-5 mr-2 animate-pulse text-gray-300"
      aria-hidden="true"
    />
    <span class="font-medium">System Logs</span>
    <span class="ml-2 bg-white bg-opacity-20 px-1.5 py-0.5 text-xs rounded-full">{{
      store.logs.length
    }}</span>
  </button>
</template>
