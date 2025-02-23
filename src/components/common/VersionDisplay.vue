<template>
  <div class="fixed bottom-2 right-2 text-xs text-gray-400 flex items-center gap-1">
    <span>v{{ version }}</span>
    <span v-if="isDev" class="px-1 py-0.5 bg-gray-200 rounded text-gray-600">DEV</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const version = import.meta.env.PACKAGE_VERSION || 'unknown'
const isDev = computed(() => import.meta.env.DEV)
</script>
