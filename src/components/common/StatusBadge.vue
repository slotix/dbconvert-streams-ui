<template>
  <span
    class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset"
    :class="statusClass"
  >
    <span class="h-1.5 w-1.5 rounded-full" :class="dotClass" />
    <slot>{{ statusLabel }}</slot>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { STATUS, getStatusLabel, type Status } from '@/constants'

interface Props {
  status: Status | string
}

const props = defineProps<Props>()

const statusClass = computed(() => {
  const status = props.status.toUpperCase()
  switch (status) {
    case STATUS.FINISHED:
      return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-500/40'
    case STATUS.RUNNING:
      return 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-500/40'
    case STATUS.FAILED:
      return 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-500/40'
    case STATUS.STOPPED:
      return 'ui-chip-muted'
    case STATUS.PAUSED:
      return 'bg-cyan-50 text-cyan-700 ring-cyan-600/20 dark:bg-cyan-900/30 dark:text-cyan-200 dark:ring-cyan-500/40'
    case STATUS.TIME_LIMIT_REACHED:
    case STATUS.EVENT_LIMIT_REACHED:
      return 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-900/30 dark:text-purple-200 dark:ring-purple-500/40'
    default:
      return 'ui-chip-muted'
  }
})

const dotClass = computed(() => {
  const status = props.status.toUpperCase()
  switch (status) {
    case STATUS.FINISHED:
      return 'bg-emerald-500'
    case STATUS.RUNNING:
      return 'bg-blue-500 animate-pulse'
    case STATUS.FAILED:
      return 'bg-red-500'
    case STATUS.STOPPED:
      return '[background-color:var(--ui-text-muted)]'
    case STATUS.PAUSED:
      return 'bg-cyan-500'
    case STATUS.TIME_LIMIT_REACHED:
    case STATUS.EVENT_LIMIT_REACHED:
      return 'bg-purple-500'
    default:
      return '[background-color:var(--ui-text-muted)]'
  }
})

const statusLabel = computed(() => {
  return getStatusLabel(props.status as Status)
})
</script>
