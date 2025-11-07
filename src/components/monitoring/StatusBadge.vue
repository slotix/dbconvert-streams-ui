<template>
  <span
    :class="statusClass"
    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium shadow-sm"
  >
    <span class="mr-1.5 h-2 w-2 rounded-full" :class="dotClass"></span>
    {{ status }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: string
}>()

const statusClass = computed(() => {
  switch (props.status) {
    case 'FINISHED':
      return 'bg-teal-200 dark:bg-teal-900/40 text-teal-900 dark:text-teal-300'
    case 'RUNNING':
      return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'
    case 'PAUSED':
      return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'
    case 'FAILED':
      return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
    case 'STOPPED':
      return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
  }
})

const dotClass = computed(() => {
  switch (props.status) {
    case 'FINISHED':
      return 'bg-teal-600'
    case 'RUNNING':
      return 'bg-blue-500 animate-pulse'
    case 'PAUSED':
      return 'bg-yellow-500'
    case 'FAILED':
      return 'bg-red-500'
    case 'STOPPED':
      return 'bg-gray-500'
    default:
      return 'bg-gray-500'
  }
})
</script>
