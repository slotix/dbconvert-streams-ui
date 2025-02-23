<template>
  <div class="fixed bottom-2 right-2 text-xs text-gray-400">
    v{{ version }}
  </div>
</template>

<script setup lang="ts">
const version = import.meta.env.PACKAGE_VERSION || 'unknown'
</script>
