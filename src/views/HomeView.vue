<template>
  <div>
    <!-- Offline Mode Banner -->
    <div v-if="!isBackendConnected" class="bg-yellow-50 border-b border-yellow-200">
      <div class="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg
                class="h-5 w-5 text-yellow-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-yellow-800">
                <strong>Offline Mode:</strong> Backend services are currently unavailable. Showing
                recent connections with limited functionality.
              </p>
            </div>
          </div>
          <div class="flex-shrink-0">
            <button
              @click="retryConnection"
              :disabled="isRetrying"
              class="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs font-medium px-3 py-1 rounded-md border border-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isRetrying" class="flex items-center">
                <svg
                  class="animate-spin -ml-1 mr-1 h-3 w-3 text-yellow-800"
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
                Retrying...
              </span>
              <span v-else>Retry Connection</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- White background header -->
    <div class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl">
              DBConvert Streams Dashboard
              <span v-if="!isBackendConnected" class="text-sm font-normal text-yellow-600 ml-2"
                >(Offline Mode)</span
              >
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
          <!-- Priority 1: Quick Actions - Most Important for Active Users -->
          <div class="mb-6">
            <div
              class="bg-white overflow-hidden rounded-xl shadow-sm border border-gray-100 hover:border-gray-200 transition-all duration-200"
            >
              <QuickActions v-if="!isLoadingConnections" />
              <div v-else class="p-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  Quick Actions
                </h2>
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

          <!-- Priority 2: Account & System Status - Side by Side -->
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
        </div>

        <!-- Priority 3: Getting Started - For New Users -->
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
import { computed, onMounted, watch, ref } from 'vue'
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
const isRetrying = ref(false)

const retryConnection = async () => {
  if (isRetrying.value) return

  isRetrying.value = true
  try {
    // Try to reinitialize the app
    await commonStore.initApp()
    if (commonStore.isBackendConnected) {
      commonStore.showNotification('Connection restored successfully!', 'success')
    }
  } catch (error) {
    console.error('Failed to retry connection:', error)
    commonStore.showNotification('Still unable to connect. Please try again later.', 'warning')
  } finally {
    isRetrying.value = false
  }
}

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
