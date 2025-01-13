<template>
    <div class="text-xs text-gray-400 fixed bottom-2 right-4">
        v{{ version }}
    </div>
</template>

<script setup lang="ts">
const version = '0.5.0' // This should match package.json version
</script>