<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <DisconnectedOverlay />
    <main class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
      <AccountOverview />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import AccountOverview from '@/components/home/AccountOverview.vue'
import DisconnectedOverlay from '@/components/common/DisconnectedOverlay.vue'

const commonStore = useCommonStore()
const connectionsStore = useConnectionsStore()

const isBackendConnected = computed(() => commonStore.isBackendConnected)

onMounted(async () => {
  // Try to load fresh connections from API if backend is connected
  if (isBackendConnected.value) {
    try {
      await connectionsStore.refreshConnections()
    } catch (error) {
      console.error('Failed to load connections from API:', error)
    }
  }
})

// Watch for backend connection status changes and load connections when connected
watch(
  () => isBackendConnected.value,
  async (isConnected) => {
    if (isConnected) {
      try {
        // Backend came online - refresh with fresh API data
        await connectionsStore.refreshConnections()
      } catch (error) {
        console.error('Failed to load connections when backend connected:', error)
        // Keep using fallback data if API still fails
      }
    }
  }
)
</script>
