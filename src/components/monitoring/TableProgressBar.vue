<script setup lang="ts">
import { computed } from 'vue'
import { formatDataSize } from '@/utils/formats'
import type { StatStatus } from '@/constants'
import { STAT_STATUS } from '@/constants'

interface Props {
  transferred: number // Actual bytes transferred
  estimated: number // Estimated total bytes
  status: StatStatus
}

const props = defineProps<Props>()

const progressPercent = computed(() => {
  // Always show 100% when finished to avoid confusion
  if (props.status === STAT_STATUS.FINISHED) {
    return 100
  }

  if (!props.estimated || props.estimated === 0) return 0
  const percent = (props.transferred / props.estimated) * 100
  // Cap at 100% for display (actual might slightly exceed estimate)
  return Math.min(percent, 100)
})

const statusColor = computed(() => {
  if (props.status === STAT_STATUS.FINISHED) {
    return 'bg-green-600 dark:bg-green-500'
  }
  if (props.status === STAT_STATUS.FAILED) {
    return 'bg-red-600 dark:bg-red-500'
  }
  return 'bg-blue-600 dark:bg-blue-500'
})

const barBackground = computed(() => {
  if (props.status === STAT_STATUS.FINISHED) {
    return 'bg-green-100 dark:bg-green-900/30'
  }
  if (props.status === STAT_STATUS.FAILED) {
    return 'bg-red-100 dark:bg-red-900/30'
  }
  return 'bg-blue-100 dark:bg-blue-900/30'
})
</script>

<template>
  <div class="w-full">
    <div class="flex justify-between items-center text-xs mb-1.5">
      <span class="text-gray-600 dark:text-gray-400">
        {{ formatDataSize(transferred) }} / {{ formatDataSize(estimated) }}
      </span>
      <span class="font-semibold text-gray-900 dark:text-gray-100">
        {{ progressPercent.toFixed(1) }}%
      </span>
    </div>
    <div
      class="w-full rounded-full h-2.5 overflow-hidden ring-1 ring-inset ring-gray-200 dark:ring-gray-700"
      :class="barBackground"
    >
      <div
        :class="[statusColor, 'h-full transition-all duration-300 ease-out']"
        :style="{ width: `${progressPercent}%` }"
        role="progressbar"
        :aria-valuenow="progressPercent"
        aria-valuemin="0"
        aria-valuemax="100"
      />
    </div>
  </div>
</template>

<style scoped></style>
