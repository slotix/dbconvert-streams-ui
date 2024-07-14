<!-- SlashedFunnelIcon.vue -->
<template>
  <div class="relative w-5 h-5">
    <FunnelIcon class="absolute inset-0 text-gray-400" />
    <SlashIcon class="absolute inset-0 text-gray-600 transform rotate-90" />
  </div>
</template>

<script setup>
import { FunnelIcon, SlashIcon } from '@heroicons/vue/24/outline';
</script>
