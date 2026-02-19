<template>
  <div
    class="flex flex-col gap-1 py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
  >
    <dt class="text-xs font-semibold tracking-wide uppercase" :class="labelClass">
      {{ label }}
    </dt>
    <dd class="flex items-baseline gap-1.5">
      <span class="text-xl font-bold tabular-nums" :class="valueClass">{{ value }}</span>
      <span v-if="suffix" class="text-sm font-medium text-gray-500 dark:text-gray-400">{{
        suffix
      }}</span>
    </dd>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    value: string | number
    suffix?: string
    variant?: 'default' | 'error'
  }>(),
  {
    variant: 'default'
  }
)

const labelClass = computed(() => {
  return props.variant === 'error'
    ? 'text-red-600 dark:text-red-300'
    : 'text-gray-600 dark:text-gray-400'
})

const valueClass = computed(() => {
  return props.variant === 'error'
    ? 'text-red-600 dark:text-red-300'
    : 'text-gray-900 dark:text-gray-100'
})
</script>
