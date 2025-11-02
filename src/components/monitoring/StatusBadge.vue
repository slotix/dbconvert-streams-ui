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
      return 'bg-linear-to-r from-teal-100 to-green-100 text-teal-800'
    case 'RUNNING':
      return 'bg-linear-to-r from-blue-100 to-teal-100 text-blue-800'
    case 'PAUSED':
      return 'bg-yellow-100 text-yellow-800'
    case 'FAILED':
      return 'bg-red-100 text-red-800'
    case 'STOPPED':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
})

const dotClass = computed(() => {
  switch (props.status) {
    case 'FINISHED':
      return 'bg-teal-500'
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
