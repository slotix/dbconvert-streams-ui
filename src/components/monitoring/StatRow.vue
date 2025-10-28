<template>
  <div
    class="flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-50 transition-colors"
  >
    <dt class="text-sm font-semibold tracking-wide" :class="labelClass">{{ label }}</dt>
    <dd class="text-xl font-bold tabular-nums" :class="valueClass">
      {{ value }}
      <span v-if="suffix" class="text-sm font-medium text-gray-500 ml-1.5">{{ suffix }}</span>
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
  return props.variant === 'error' ? 'text-red-600' : 'text-gray-600'
})

const valueClass = computed(() => {
  return props.variant === 'error' ? 'text-red-600' : 'text-gray-900'
})
</script>
