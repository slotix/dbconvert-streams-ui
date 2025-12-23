<template>
  <div>
    <!-- Disconnected Overlay -->
    <DisconnectedOverlay />

    <!-- Header -->
    <header
      class="sticky top-0 z-30 bg-linear-to-r from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 border-b border-slate-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 lg:-ml-[var(--sidebar-width)] lg:w-[calc(100%+var(--sidebar-width))]"
    >
      <div class="px-6 py-4 flex items-center gap-4">
        <button
          v-if="sidebarMenuToggle"
          type="button"
          class="group flex items-center justify-center p-2 -ml-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 lg:hidden"
          @click="sidebarMenuToggle.openSidebar"
        >
          <Menu class="h-5 w-5" :stroke-width="iconStroke" aria-hidden="true" />
          <span class="sr-only">Open sidebar</span>
        </button>
        <button
          v-if="sidebarWidthToggle"
          type="button"
          class="group hidden lg:flex items-center justify-center p-2 -ml-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
          @click="sidebarWidthToggle.toggleSidebarWidth"
        >
          <Menu class="h-5 w-5" :stroke-width="iconStroke" aria-hidden="true" />
          <span class="sr-only">Toggle sidebar width</span>
        </button>
        <img
          v-if="!isDesktop"
          class="h-5 w-5 shrink-0"
          src="/images/logo.svg"
          alt="DBConvert Streams"
        />
        <h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Overview</h1>
      </div>
    </header>

    <!-- Content area with gradient background -->
    <div
      class="min-h-[calc(100vh-64px)] bg-linear-to-br from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900"
    >
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Cards Grid -->
        <div class="py-6">
          <!-- Priority 2: Account & System Status - Side by Side -->
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
            <!-- Account Overview Card -->
            <div
              class="bg-white dark:bg-gray-850 overflow-hidden rounded-2xl shadow-lg dark:shadow-gray-900/50 border border-slate-200/50 dark:border-gray-700/50 hover:shadow-xl dark:hover:shadow-gray-900/60 transition-all duration-300"
            >
              <AccountOverview />
            </div>

            <!-- System Status Card -->
            <div
              class="bg-white dark:bg-gray-850 overflow-hidden rounded-2xl shadow-lg dark:shadow-gray-900/50 border border-slate-200/50 dark:border-gray-700/50 hover:shadow-xl dark:hover:shadow-gray-900/60 transition-all duration-300"
            >
              <SystemStatus />
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch, inject } from 'vue'
import { useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import { useDesktopMode } from '@/composables/useDesktopMode'
import { useLucideIcons } from '@/composables/useLucideIcons'
import { Menu } from 'lucide-vue-next'
import AccountOverview from '@/components/home/AccountOverview.vue'
import SystemStatus from '@/components/home/SystemStatus.vue'
import DisconnectedOverlay from '@/components/common/DisconnectedOverlay.vue'

const { strokeWidth: iconStroke } = useLucideIcons()

const commonStore = useCommonStore()
const connectionsStore = useConnectionsStore()
const { isDesktop } = useDesktopMode()
const sidebarWidthToggle = inject<{
  isSidebarExpanded: { value: boolean }
  toggleSidebarWidth: () => void
}>('sidebarWidthToggle')
const sidebarMenuToggle = inject<{ openSidebar: () => void }>('sidebarMenuToggle')

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
