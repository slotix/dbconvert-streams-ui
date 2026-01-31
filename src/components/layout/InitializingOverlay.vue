<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-gray-900/50 dark:bg-black/70 flex items-center justify-center z-50"
  >
    <div class="bg-white dark:bg-gray-850 p-6 rounded-lg shadow-xl">
      <div class="flex items-center space-x-3">
        <Loader2 :class="[iconSizes.spinner, 'animate-spin text-gray-600 dark:text-gray-300']" />
        <span class="text-gray-700 dark:text-gray-200">Initializing application...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useContextualIconSizes } from '@/composables/useIconSizes'
import { Loader2 } from 'lucide-vue-next'

defineProps<{
  show: boolean
}>()

const iconSizes = useContextualIconSizes()
</script>
