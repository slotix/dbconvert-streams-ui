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
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: '▶',
    label: 'Running'
  },
  finished: {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    icon: '✓',
    label: 'Finished'
  },
  failed: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: '✕',
    label: 'Failed'
  },
  pending: {
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
    icon: '○',
    label: 'Pending'
  },
  paused: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: '⏸',
    label: 'Paused'
  },
  initializing: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
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
