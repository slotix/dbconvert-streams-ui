<template>
  <header class="bg-white shadow">
    <div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <div class="flex items-baseline gap-2">
        <h1 class="text-3xl font-bold leading-tight tracking-tight text-gray-900">
          Data Explorer
        </h1>
        <span class="text-lg font-normal text-gray-500">{{ connectionsCountLabel }}</span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConnectionsStore } from '@/stores/connections'

const connectionsStore = useConnectionsStore()

// Computed properties
const connectionsCount = computed(() => connectionsStore.connections.length || 0)
const connectionsCountLabel = computed(
  () => `(${connectionsCount.value} connection${connectionsCount.value === 1 ? '' : 's'})`
)
</script>
