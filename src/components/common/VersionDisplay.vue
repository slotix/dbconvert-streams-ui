<template>
  <div class="mt-2 pt-2 border-t border-gray-700 dark:border-gray-800 text-center">
    <div class="text-[10px] text-gray-500 dark:text-gray-600">v{{ version }}</div>
    <div v-if="isDev" class="text-[9px] text-gray-600 dark:text-gray-700 font-medium">DEV</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const version = import.meta.env.PACKAGE_VERSION || 'unknown'
const isDev = computed(() => import.meta.env.DEV)
</script>
