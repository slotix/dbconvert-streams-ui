<template>
  <div>
    <!-- Enhanced header with gradient background -->
    <div
      class="bg-linear-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200 shadow-sm"
    >
      <div class="max-w-7xl mx-auto py-5 px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
          <h1
            class="text-3xl font-bold bg-linear-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent"
          >
            Dashboard
          </h1>
          <div v-if="!isBackendConnected" class="flex items-center gap-2">
            <span class="text-sm text-yellow-600 font-medium">Disconnected</span>
            <button
              :disabled="isRetrying"
              class="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs font-medium px-3 py-1.5 rounded-lg border border-yellow-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm"
              @click="retryConnection"
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
