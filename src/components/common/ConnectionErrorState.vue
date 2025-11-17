<script setup lang="ts">
import { ExclamationCircleIcon } from '@heroicons/vue/24/outline'

defineProps<{
  error: string
}>()
</script>

<template>
  <div
    class="text-xs text-red-600 dark:text-red-400 px-3 py-1.5 flex items-center gap-1.5"
    :title="error"
  >
    <ExclamationCircleIcon class="w-3.5 h-3.5 shrink-0" />
    <span>Connection failed</span>
  </div>
</template>
