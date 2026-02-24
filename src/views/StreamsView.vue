<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <!-- Disconnected Overlay -->
    <DisconnectedOverlay />

    <main class="flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <!-- No streams (show regardless of backend connection status) -->
      <div
        v-if="streamsCount() === 0"
        class="flex flex-col items-center justify-center py-16 px-4 text-center"
      >
        <div
          class="bg-linear-to-br from-blue-50 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 rounded-full p-6 mb-6"
        >
          <RefreshCw
            class="h-16 w-16 text-blue-500 dark:text-blue-400"
            :stroke-width="iconStroke"
          />
        </div>
        <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No Stream Configurations Yet
        </h3>
        <p class="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
          Kick things off by creating your first stream configuration. Choose a source and target
          connection to begin streaming data.
        </p>
        <router-link
          :to="{ name: 'CreateStream' }"
          class="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-linear-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 dark:from-blue-500 dark:to-teal-500 dark:hover:from-blue-600 dark:hover:to-teal-600 transition-all duration-200 hover:shadow-md hover:scale-105"
        >
          <Plus class="h-5 w-5" :stroke-width="iconStroke" />
          Create Stream Configuration
        </router-link>
      </div>

      <!-- Streams with resizable sidebar -->
      <div v-else class="flex-1 flex flex-col min-h-0 px-4 sm:px-6 lg:px-8">
        <div
          :ref="(el) => (sidebar.sidebarContainerRef.value = el as HTMLElement)"
          class="flex-1 flex flex-row items-stretch min-w-0 overflow-x-hidden min-h-0"
        >
          <!-- Sidebar -->
          <div
            v-if="sidebar.sidebarVisible.value"
            :ref="(el) => (sidebar.sidebarRef.value = el as HTMLElement)"
            :style="{
              flexBasis: `${sidebar.sidebarWidthPct.value}%`,
              flexGrow: 0,
              flexShrink: 0
            }"
            class="min-w-[80px] min-h-0"
          >
            <StreamsSidebar
              :selected-stream-id="selectedStreamId"
              @select-stream="handleSelectStream"
              @delete-stream="handleDeleteStream"
            />
          </div>

          <!-- Sidebar sash: drag to resize, double-click to collapse/restore -->
          <div
            v-if="sidebar.sidebarVisible.value"
            role="separator"
            aria-orientation="vertical"
            class="relative z-20 w-[8px] shrink-0 cursor-col-resize select-none group"
            title="Drag to resize • Double-click to collapse"
            @mousedown.prevent="sidebar.onSidebarDividerMouseDown"
            @dblclick="sidebar.toggleSidebar"
          >
            <div
              class="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px group-hover:w-[3px] bg-gray-200 dark:bg-gray-700 group-hover:bg-teal-400 dark:group-hover:bg-teal-500 transition-all duration-150"
            />
          </div>

          <!-- Collapsed sash edge — click to restore sidebar -->
          <div
            v-if="!sidebar.sidebarVisible.value"
            role="separator"
            aria-orientation="vertical"
            class="relative z-20 w-[8px] shrink-0 cursor-col-resize select-none group"
            title="Click to restore sidebar"
            @click="sidebar.toggleSidebar"
          >
            <div
              class="absolute inset-y-0 left-0 w-px group-hover:w-[3px] bg-gray-200 dark:bg-gray-700 group-hover:bg-teal-400 dark:group-hover:bg-teal-500 transition-all duration-150"
            />
          </div>

          <!-- Right panel -->
          <div
            :style="{ flexBasis: '0px' }"
            class="grow min-w-0 min-h-0 overflow-x-hidden flex flex-col"
          >
            <div v-if="selectedStreamId && selectedStream">
              <StreamDetailsPanel
                :stream="selectedStream"
                :source="connectionByID(selectedStream.source?.connections?.[0]?.connectionId)"
                :target="connectionByID(selectedStream.target?.id)"
                :initial-tab="initialTab"
                @stream-deleted="handleStreamDeletedFromPanel"
              />
            </div>
            <div
              v-else
              class="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center text-gray-500 dark:text-gray-400"
            >
              <div
                class="inline-flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-teal-500 text-white shadow-xl"
              >
                <RefreshCw class="h-10 w-10" :stroke-width="iconStroke" />
              </div>
              <div class="max-w-md mx-auto space-y-1">
                <p class="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  No stream selected
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Select a stream from the sidebar to view details
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useLucideIcons } from '@/composables/useLucideIcons'
import { Plus, RefreshCw } from 'lucide-vue-next'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useMonitoringStore } from '@/stores/monitoring'
import { useCommonStore } from '@/stores/common'
import { useSidebar } from '@/composables/useSidebar'
import StreamsSidebar from '@/components/stream/StreamsSidebar.vue'
import StreamDetailsPanel from '@/components/stream/StreamDetailsPanel.vue'
import DisconnectedOverlay from '@/components/common/DisconnectedOverlay.vue'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection } from '@/types/connections'
import type { StreamDetailsTab } from '@/composables/useStreamHistory'
import { readStreamsViewState, setSelectedStreamInViewState } from '@/utils/streamsViewState'

const { strokeWidth: iconStroke } = useLucideIcons()

const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()
const monitoringStore = useMonitoringStore()
const commonStore = useCommonStore()
// Use sidebar composable for resize and toggle functionality
const sidebar = useSidebar()

const selectedStreamId = ref<string>('')
const restoredTab = ref<StreamDetailsTab | undefined>(undefined)
const initialTab = computed(() => restoredTab.value)

// Backend connection status
const isBackendConnected = computed(() => commonStore.isBackendConnected)

function streamsCount() {
  return streamsStore.countStreams
}

const selectedStream = computed<StreamConfig | undefined>(() => {
  if (!selectedStreamId.value) return undefined
  return streamsStore.streamConfigs.find((s) => s.id === selectedStreamId.value)
})

watch(
  () => selectedStream.value,
  (stream) => {
    if (!stream) return
    const streamId = stream.id
    if (!streamId) return
    const isSameStream = monitoringStore.streamConfig?.id === streamId
    if (isSameStream && monitoringStore.streamID) {
      return
    }
    monitoringStore.setStream('', stream)
  }
)

function connectionByID(id?: string): Connection | undefined {
  if (!id) return undefined
  return connectionsStore.connections.find((conn) => conn.id === id)
}

function handleSelectStream(payload: { streamId: string }) {
  selectedStreamId.value = payload.streamId
}

function handleDeleteStream(payload: { streamId: string }) {
  if (selectedStreamId.value === payload.streamId) {
    selectedStreamId.value = ''
    setSelectedStreamInViewState()
  }
}

function handleStreamDeletedFromPanel() {
  selectedStreamId.value = ''
  setSelectedStreamInViewState()
}

function handleToggleSidebar() {
  sidebar.toggleSidebar()
}

// Fetch connections and streams on mount
onMounted(async () => {
  window.addEventListener('wails:toggle-explorer-sidebar', handleToggleSidebar)

  const persistedStateAtInit = readStreamsViewState()
  if (persistedStateAtInit?.selectedStreamId) {
    selectedStreamId.value = persistedStateAtInit.selectedStreamId
  }
  if (persistedStateAtInit?.tab) {
    restoredTab.value = persistedStateAtInit.tab
  }

  // Only fetch if backend is connected
  if (isBackendConnected.value) {
    try {
      // Fetch connections first so they're available when streams are displayed
      await connectionsStore.refreshConnections()

      // Then fetch streams
      await streamsStore.refreshStreams()

      // Ensure restored state still points to a valid stream.
      // (Avoid showing an empty panel if the stream was deleted.)
      if (selectedStreamId.value) {
        const exists = streamsStore.streamConfigs.some((s) => s.id === selectedStreamId.value)
        if (!exists) {
          selectedStreamId.value = ''
          setSelectedStreamInViewState()
        }
      }

      // Fallback: auto-select the currently running stream when no persisted selection exists.
      if (!selectedStreamId.value && monitoringStore.streamID) {
        // Otherwise check if there's a running stream and auto-select it (from SSE structured logs)
        selectedStreamId.value = monitoringStore.streamID
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('wails:toggle-explorer-sidebar', handleToggleSidebar)
})

// Persist selected stream across navigation (e.g., Streams -> Explorer -> Streams)
watch(
  () => selectedStreamId.value,
  (selected) => {
    setSelectedStreamInViewState(selected || undefined)
    const stored = readStreamsViewState()
    if (stored?.tab) {
      restoredTab.value = stored.tab
    }
  }
)

// Watch for backend connection status changes and refresh data when reconnected
watch(
  () => isBackendConnected.value,
  async (isConnected) => {
    if (isConnected) {
      try {
        // Backend came online - refresh with fresh API data
        await connectionsStore.refreshConnections()
        await streamsStore.refreshStreams()
      } catch (error) {
        console.error('Failed to refresh data when backend connected:', error)
      }
    }
  }
)
</script>
