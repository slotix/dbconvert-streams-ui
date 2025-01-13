<template>
  <div class="inline-flex items-center">
    <div
      :class="['animate-spin rounded-full border-b-2 border-current', sizeClasses[size ?? 'md']]"
    ></div>
    <span v-if="text" class="ml-2" :class="textClasses[size ?? 'md']">{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  text?: string
  size?: 'sm' | 'md' | 'lg'
}>()

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8'
}

const textClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg'
}
</script>
