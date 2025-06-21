<template>
  <div>
    <!-- White background header -->
    <div class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl">
              DBConvert Streams Dashboard
            </h1>
          </div>
        </div>
      </div>
    </div>

    <!-- Grey background content area -->
    <div class="min-h-screen bg-gray-50">
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Cards Grid -->
        <div class="py-6">
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
            <!-- Account Overview Card -->
            <div
              class="bg-white overflow-hidden rounded-xl shadow-sm border border-gray-100 hover:border-gray-200 transition-all duration-200"
            >
              <AccountOverview />
            </div>

            <!-- System Status Card -->
            <div
              class="bg-white overflow-hidden rounded-xl shadow-sm border border-gray-100 hover:border-gray-200 transition-all duration-200"
            >
              <SystemStatus />
            </div>
          </div>

          <!-- Quick Actions Card -->
          <div
            class="bg-white overflow-hidden rounded-xl shadow-sm border border-gray-100 hover:border-gray-200 transition-all duration-200"
          >
            <QuickActions v-if="!isLoadingConnections" />
            <div v-else class="p-6">
              <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">Quick Actions</h2>
              <div class="flex items-center justify-center py-8">
                <svg
                  class="animate-spin h-5 w-5 text-gray-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span class="ml-3 text-gray-700">Loading connections...</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Getting Started Section -->
        <div class="pb-6">
          <div class="bg-white rounded-xl shadow-sm border border-gray-100">
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

const commonStore = useCommonStore()
const connectionsStore = useConnectionsStore()

const allSteps = computed(() => commonStore.steps)
const isBackendConnected = computed(() => commonStore.isBackendConnected)
const isLoadingConnections = computed(() => connectionsStore.isLoadingConnections)

onMounted(async () => {
  // First, try to load connections from localStorage
  connectionsStore.initializeFromStorage()
  
  // Then load from API if backend is connected and cache is expired or no connections
  if (isBackendConnected.value && (connectionsStore.shouldRefreshFromAPI() || connectionsStore.connections.length === 0)) {
    try {
      await connectionsStore.refreshConnections()
    } catch (error) {
      console.error('Failed to load connections on home page:', error)
      // If API call fails, we still have the cached data from localStorage
    }
  }
})

// Watch for backend connection status changes and load connections when connected
watch(
  () => isBackendConnected.value,
  async (isConnected) => {
    if (isConnected) {
      try {
        await connectionsStore.refreshConnections()
      } catch (error) {
        console.error('Failed to load connections when backend connected:', error)
        // If API call fails, we still have the cached data from localStorage
      }
    }
  }
)
</script>
