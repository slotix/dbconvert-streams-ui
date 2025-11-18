<script setup lang="ts">
import { computed } from 'vue'
import type { Status } from '@/constants'
import { STATUS } from '@/constants'

interface Props {
  transferred: number // Actual bytes transferred
  estimated: number // Estimated total bytes
  status: Status
}

const props = defineProps<Props>()

const progressPercent = computed(() => {
  // Always show 100% when finished to avoid confusion
  if (props.status === STATUS.FINISHED) {
    return 100
  }

  if (!props.estimated || props.estimated === 0) return 0
  const percent = (props.transferred / props.estimated) * 100
  // Cap at 100% for display (actual might slightly exceed estimate)
  return Math.min(percent, 100)
})

const statusColor = computed(() => {
  if (props.status === STATUS.FINISHED) {
    return 'bg-emerald-400 dark:bg-emerald-800'
  }
  if (props.status === STATUS.FAILED) {
    return 'bg-rose-400 dark:bg-rose-800'
  }
  return 'bg-blue-400 dark:bg-blue-800'
})

const barBackground = computed(() => {
  if (props.status === STATUS.FINISHED) {
    return 'bg-emerald-50 dark:bg-emerald-950/40'
  }
  if (props.status === STATUS.FAILED) {
    return 'bg-rose-50 dark:bg-rose-950/40'
  }
  return 'bg-blue-50 dark:bg-blue-950/40'
})

const textColor = computed(() => {
  if (props.status === STATUS.FINISHED) {
    return 'text-emerald-950 dark:text-emerald-50'
  }
  if (props.status === STATUS.FAILED) {
    return 'text-rose-950 dark:text-rose-50'
  }
  return 'text-cyan-950 dark:text-cyan-50'
})

const ringColor = computed(() => {
  if (props.status === STATUS.FINISHED) {
    return 'ring-emerald-200 dark:ring-emerald-800'
  }
  if (props.status === STATUS.FAILED) {
    return 'ring-rose-200 dark:ring-rose-800'
  }
  return 'ring-cyan-200 dark:ring-cyan-800'
})
</script>

<template>
  <div class="w-full">
    <div
      class="w-full rounded-full h-6 overflow-hidden ring-1 ring-inset relative"
      :class="[barBackground, ringColor]"
    >
      <div
        :class="[statusColor, 'h-full transition-all duration-300 ease-out']"
        :style="{ width: `${progressPercent}%` }"
        role="progressbar"
        :aria-valuenow="progressPercent"
        aria-valuemin="0"
        aria-valuemax="100"
      />
      <div class="absolute inset-0 flex items-center justify-center">
        <span :class="['text-xs font-semibold', textColor]">
          {{ progressPercent.toFixed(1) }}%
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
