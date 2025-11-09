<template>
  <div>
    <label class="block text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-2">
      Output Configuration
    </label>
    <div
      class="bg-gray-50 dark:bg-gray-900/40 rounded-md p-4 border border-gray-300 dark:border-gray-700 space-y-2"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-600 dark:text-gray-400">Format:</span>
        <span
          class="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-500/30"
        >
          {{ stream.targetFileFormat?.toUpperCase() }}
        </span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-600 dark:text-gray-400">Compression:</span>
        <span :class="compressionBadgeClass">
          {{ compressionLabel }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StreamConfig } from '@/types/streamConfig'

const props = defineProps<{
  stream: StreamConfig
}>()

const compressionLabel = computed(() => (props.stream.compressionType || 'zstd').toUpperCase())

const compressionBadgeClass = computed(() => {
  const base =
    'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset '
  if (props.stream.compressionType === 'zstd') {
    return `${base}bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-500/30`
  }
  if (props.stream.compressionType === 'gzip') {
    return `${base}bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-900/30 dark:text-yellow-300 dark:ring-yellow-500/30`
  }
  return `${base}bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-900/30 dark:text-gray-300 dark:ring-gray-600/30`
})
</script>
