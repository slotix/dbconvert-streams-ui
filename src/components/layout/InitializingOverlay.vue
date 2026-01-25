<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-gray-900/50 dark:bg-black/70 flex items-center justify-center z-50"
  >
    <div class="bg-white dark:bg-gray-850 p-6 rounded-lg shadow-xl">
      <div class="flex items-center space-x-3">
        <svg
          :class="[iconSizes.spinner, 'animate-spin text-gray-600 dark:text-gray-300']"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span class="text-gray-700 dark:text-gray-200">Initializing application...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useContextualIconSizes } from '@/composables/useIconSizes'

defineProps<{
  show: boolean
}>()

const iconSizes = useContextualIconSizes()
</script>
