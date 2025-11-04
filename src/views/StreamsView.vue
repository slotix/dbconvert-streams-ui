<template>
  <div class="min-h-full overflow-x-hidden">
    <!-- Enhanced Functional Toolbar with gradient background -->
    <header
      class="sticky top-0 z-10 bg-linear-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200 shadow-sm"
    >
      <div class="px-6 py-4 flex items-center gap-4">
        <!-- Search Input with enhanced styling -->
        <div class="flex-1 max-w-xl">
          <SearchInput
            ref="searchInputRef"
            v-model="searchQuery"
            placeholder="Search stream configs... (Press / to focus)"
            size="sm"
          />
        </div>

        <!-- Right side group -->
        <div class="flex items-center gap-4 ml-auto">
          <!-- Elevated Badge showing count with icon -->
          <div
            class="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200 shadow-sm"
          >
            <ArrowPathIcon class="h-4 w-4 text-slate-400" />
            <span class="text-sm font-semibold text-slate-700">{{ streamCountLabel }}</span>
          </div>

          <!-- Primary CTA Button with orange-to-teal gradient -->
          <router-link :to="{ name: 'CreateStream' }">
            <button
              type="button"
              class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-linear-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <PlusIcon class="h-5 w-5" />
              <span>New Stream Config</span>
            </button>
          </router-link>

          <!-- Connection Status (if disconnected) -->
          <ConnectionStatus />
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="mx-auto py-4 overflow-x-hidden">
      <!-- No streams (show regardless of backend connection status) -->
      <div v-if="streamsCount() === 0" class="text-center py-12">
        <p class="text-gray-500">
          No stream configurations yet. Create your first configuration to get started.
        </p>
        <router-link
          :to="{ name: 'CreateStream' }"
          class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon class="mr-2 h-5 w-5" />
          Create Stream Configuration
        </router-link>
      </div>

      <!-- Streams with resizable sidebar -->
      <div v-else class="px-4 sm:px-6 lg:px-8">
        <div
          :ref="(el) => (sidebar.sidebarContainerRef.value = el as HTMLElement)"
          class="mt-6 flex flex-row items-stretch min-w-0 overflow-x-hidden"
        >
          <!-- Sidebar -->
          <div
            v-if="sidebar.sidebarVisible.value"
            :ref="(el) => (sidebar.sidebarRef.value = el as HTMLElement)"
            :style="{
              flexBasis: `calc(${sidebar.sidebarWidthPct.value}% - 8px)`,
              flexGrow: 0,
              flexShrink: 0
            }"
            class="min-w-[220px] pr-2"
          >
            <StreamsSidebar
              :selected-stream-id="selectedStreamId"
              :search-query="searchQuery"
              @select-stream="handleSelectStream"
              @delete-stream="handleDeleteStream"
            />
          </div>

          <!-- Sidebar divider with handle -->
          <div
            v-if="sidebar.sidebarVisible.value"
            role="separator"
            aria-orientation="vertical"
            class="relative z-20 mx-1.5 w-3 shrink-0 cursor-col-resize select-none pointer-events-auto group"
            title="Drag to resize • Double-click to hide"
            @mousedown.prevent="sidebar.onSidebarDividerMouseDown"
            @dblclick="sidebar.onSidebarDividerDoubleClick"
          >
            <!-- Vertical divider line -->
            <div
              class="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] rounded bg-gray-200 group-hover:bg-gray-300 transition-colors"
            />

            <!-- Centered handle with chevron indicator -->
            <div
              class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-12 bg-gray-200 group-hover:bg-gray-300 rounded flex items-center justify-center transition-all cursor-pointer"
              @click.stop="sidebar.toggleSidebar"
            >
              <!-- Double chevron left icon -->
              <svg
                class="w-3 h-3 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </div>
          </div>

          <!-- Show sidebar button (when hidden) -->
          <div v-if="!sidebar.sidebarVisible.value" class="relative shrink-0 w-5 mr-2">
            <button
              type="button"
              class="absolute top-1/2 -translate-y-1/2 w-5 h-12 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center transition-all shadow-sm"
              title="Show Sidebar"
              @click="sidebar.toggleSidebar"
            >
              <!-- Double chevron right icon -->
              <svg
                class="w-3 h-3 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          <!-- Right panel -->
          <div
            :style="{ flexBasis: '0px' }"
            :class="[
              'grow',
              'min-w-0',
              'overflow-x-hidden',
              sidebar.sidebarVisible.value ? 'pl-2' : 'pl-0'
            ]"
          >
            <div v-if="selectedStreamId && selectedStream" class="h-full">
              <StreamDetailsPanel
                :stream="selectedStream"
                :source="connectionByID(selectedStream.source)"
                :target="connectionByID(selectedStream.target)"
                @stream-deleted="handleStreamDeletedFromPanel"
              />
            </div>
            <div v-else class="h-full flex items-center justify-center text-gray-500">
              <p>Select a stream from the list to view details</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { PlusIcon, ArrowPathIcon } from '@heroicons/vue/24/solid'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useMonitoringStore } from '@/stores/monitoring'
import { useCommonStore } from '@/stores/common'
import { useSidebar } from '@/composables/useSidebar'
import StreamsSidebar from '@/components/stream/StreamsSidebar.vue'
import StreamDetailsPanel from '@/components/stream/StreamDetailsPanel.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import ConnectionStatus from '@/components/common/ConnectionStatus.vue'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection } from '@/types/connections'

const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()
const monitoringStore = useMonitoringStore()
const commonStore = useCommonStore()

// Use sidebar composable for resize and toggle functionality
const sidebar = useSidebar()

const selectedStreamId = ref<string>('')
const searchQuery = ref('')
const searchInputRef = ref<InstanceType<typeof SearchInput> | null>(null)

// Backend connection status
const isBackendConnected = computed(() => commonStore.isBackendConnected)

// Computed for filtered stream count
const filteredStreamsCount = computed(() => {
  if (!searchQuery.value) return streamsStore.countStreams

  const query = searchQuery.value.toLowerCase()
  return streamsStore.streamConfigs.filter(
    (stream) =>
      stream.name.toLowerCase().includes(query) || stream.mode.toLowerCase().includes(query)
  ).length
})

const streamCountLabel = computed(() => {
  const filtered = filteredStreamsCount.value
  const total = streamsStore.countStreams
  if (searchQuery.value && filtered !== total) {
    return `${filtered} of ${total} configs`
  }
  return `${total} config${total === 1 ? '' : 's'}`
})

function streamsCount() {
  return streamsStore.countStreams
}

// Keyboard shortcut handler for search focus
function handleKeyboardShortcut(e: KeyboardEvent) {
  // Focus search on '/' key (only if not already in an input)
  if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
    e.preventDefault()
    searchInputRef.value?.focus()
  }
}

const selectedStream = computed<StreamConfig | undefined>(() => {
  if (!selectedStreamId.value) return undefined
  return streamsStore.streamConfigs.find((s) => s.id === selectedStreamId.value)
})

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
  }
}

function handleStreamDeletedFromPanel() {
  selectedStreamId.value = ''
}

// Fetch connections and streams on mount
onMounted(async () => {
  // Only fetch if backend is connected
  if (isBackendConnected.value) {
    try {
      // Fetch connections first so they're available when streams are displayed
      await connectionsStore.refreshConnections()

      // Then fetch streams
      await streamsStore.refreshStreams()

      // Check if there's a running stream and auto-select it (from SSE structured logs)
      if (monitoringStore.streamID) {
        // Auto-select the running stream
        selectedStreamId.value = monitoringStore.streamID
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    }
  }

  // Add keyboard shortcut listener
  window.addEventListener('keydown', handleKeyboardShortcut)
})

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

onUnmounted(() => {
  // Remove keyboard shortcut listener
  window.removeEventListener('keydown', handleKeyboardShortcut)
})
</script>
