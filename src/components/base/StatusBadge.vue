<script setup lang="ts">
/**
 * StatusBadge Component
 *
 * Displays status indicators with semantic colors for streams, connections, and operations.
 *
 * @example
 * <StatusBadge status="running" />
 * <StatusBadge status="finished">Complete</StatusBadge>
 * <StatusBadge status="failed" size="sm" />
 */

type Status = 'running' | 'finished' | 'failed' | 'pending' | 'paused' | 'initializing'
type Size = 'sm' | 'md' | 'lg'

interface Props {
  status: Status
  size?: Size
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

interface StatusConfig {
  bg: string
  text: string
  border: string
  icon: string
  label: string
}

const statusConfig: Record<Status, StatusConfig> = {
  running: {
    bg: 'bg-blue-50 dark:bg-blue-900',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-700',
    icon: '▶',
    label: 'Running'
  },
  finished: {
    bg: 'bg-teal-50 dark:bg-teal-900',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-700',
    icon: '✓',
    label: 'Finished'
  },
  failed: {
    bg: 'bg-red-50 dark:bg-red-900',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-700',
    icon: '✕',
    label: 'Failed'
  },
  pending: {
    bg: 'bg-gray-50 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-600',
    icon: '○',
    label: 'Pending'
  },
  paused: {
    bg: 'bg-amber-50 dark:bg-amber-900',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-700',
    icon: '⏸',
    label: 'Paused'
  },
  initializing: {
    bg: 'bg-purple-50 dark:bg-purple-900',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-700',
    icon: '⟳',
    label: 'Initializing'
  }
}

const sizeClasses: Record<Size, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
  lg: 'text-base px-3 py-1'
}

const config = statusConfig[props.status]
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 rounded-full border font-medium',
      config.bg,
      config.text,
      config.border,
      sizeClasses[size]
    ]"
  >
    <span>{{ config.icon }}</span>
    <slot>{{ config.label }}</slot>
  </span>
</template>
