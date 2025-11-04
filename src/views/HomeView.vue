<template>
  <div>
    <!-- Disconnected Overlay -->
    <DisconnectedOverlay />

    <!-- Enhanced header with gradient background -->
    <div
      class="bg-linear-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200 shadow-sm"
    >
      <div class="max-w-7xl mx-auto py-5 px-4 sm:px-6 lg:px-8">
        <h1
          class="text-3xl font-bold bg-linear-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent"
        >
          Dashboard
        </h1>
      </div>
    </div>

    <!-- Content area with gradient background -->
    <div class="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-50">
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Cards Grid -->
        <div class="py-6">
          <!-- Priority 1: Quick Actions - Most Important for Active Users -->
          <div class="mb-6">
            <div
              class="bg-white overflow-hidden rounded-2xl shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300"
            >
              <QuickActions v-if="!isLoadingConnections" />
              <div v-else class="p-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  Quick Actions
                </h2>
                <div class="flex items-center justify-center py-12">
                  <div
                    class="relative w-12 h-12 animate-spin rounded-full bg-linear-to-tr from-blue-500 to-teal-500 p-1"
                  >
                    <div class="bg-white rounded-full w-full h-full"></div>
                  </div>
                  <span class="ml-3 text-gray-700">Loading connections...</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Priority 2: Account & System Status - Side by Side -->
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
            <!-- Account Overview Card -->
            <div
              class="bg-white overflow-hidden rounded-2xl shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300"
            >
              <AccountOverview />
            </div>

            <!-- System Status Card -->
            <div
              class="bg-white overflow-hidden rounded-2xl shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300"
            >
              <SystemStatus />
            </div>
          </div>
        </div>

        <!-- Priority 3: Getting Started - For New Users -->
        <div class="pb-6">
          <div
            class="bg-white rounded-2xl shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300"
          >
            <div class="p-6">
              <h2 class="text-xl font-semibold text-gray-900 flex items-center gap-2">
                Getting Started
              </h2>
              <StepDisplay :steps="allSteps" />
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import StepDisplay from '@/components/home/StepDisplay.vue'
import QuickActions from '@/components/home/QuickActions.vue'
import AccountOverview from '@/components/home/AccountOverview.vue'
import SystemStatus from '@/components/home/SystemStatus.vue'
import DisconnectedOverlay from '@/components/common/DisconnectedOverlay.vue'

const commonStore = useCommonStore()
const connectionsStore = useConnectionsStore()

const allSteps = computed(() => commonStore.steps)
const isBackendConnected = computed(() => commonStore.isBackendConnected)
const isLoadingConnections = computed(() => connectionsStore.isLoadingConnections)

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
