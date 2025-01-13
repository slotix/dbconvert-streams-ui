<template>
  <div class="text-xs text-gray-400 fixed bottom-2 right-4">v{{ displayVersion }}</div>
</template>

<script setup lang="ts">
import { version } from '@/config/version'
import { computed } from 'vue'

const isDevelopment = import.meta.env.DEV
const displayVersion = computed(() => (isDevelopment ? `${version}-dev` : version))
</script>
