<template>
  <header>
    <div
      class="bg-white flex flex-wrap justify-between space-y-4 sm:space-y-0 max-w-7xl mx-auto py-6 px-8"
    >
      <h1 class="flex-auto text-3xl font-bold text-gray-900 dark:text-white;">
        <span v-if="isBackendConnected">{{ connectionsCount }} Connections.</span>
        <span v-else>Database Connections Unavailable</span>
      </h1>
    </div>
  </header>
  <main>
    <div class="antialiased bg-gray-50">
      <!-- Main area -->
      <Connections />
      <!-- Modal components removed - using wizard routing instead -->
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Connections from '@/components/connection/Connections.vue'
import { useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'

// Access the connections store
const connectionsStore = useConnectionsStore()
const commonStore = useCommonStore()

// Define the function to count connections
const connectionsCount = computed(() => connectionsStore.countConnections)

// Check if the backend is connected
const isBackendConnected = computed(() => commonStore.isBackendConnected)
</script>
