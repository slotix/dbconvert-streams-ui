<template>
  <div class="h-screen flex flex-col">
    <!-- Disconnected Overlay -->
    <DisconnectedOverlay />

    <!-- Enhanced Functional Toolbar with gradient background -->
    <header
      class="sticky top-0 z-30 bg-linear-to-r from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 border-b border-slate-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 lg:-ml-(--sidebar-width) lg:w-[calc(100%+var(--sidebar-width))]"
    >
      <div class="px-6 py-4 flex items-center gap-4">
        <div class="flex items-center gap-3">
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
          <!-- Stream Count Header -->
          <h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {{ streamCountLabel }}
          </h1>
        </div>

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
          <!-- Primary CTA Button with orange-to-teal gradient -->
          <router-link :to="{ name: 'CreateStream' }">
            <BaseButton variant="primary">
              <Plus class="h-5 w-5" :stroke-width="iconStroke" />
              <span>New Stream Config</span>
            </BaseButton>
          </router-link>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 mx-auto py-4 overflow-x-hidden">
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
      <div v-else class="px-4 sm:px-6 lg:px-8 h-full">
        <div
          :ref="(el) => (sidebar.sidebarContainerRef.value = el as HTMLElement)"
          class="mt-6 flex flex-row items-stretch min-w-0 overflow-x-hidden h-full"
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
              class="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] rounded bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300 dark:group-hover:bg-gray-600 transition-colors"
            />

            <!-- Centered handle with chevron indicator -->
            <div
              class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-12 bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300 dark:group-hover:bg-gray-600 rounded flex items-center justify-center transition-all cursor-pointer"
              @click.stop="sidebar.toggleSidebar"
            >
              <!-- Double chevron left icon -->
              <svg
                class="w-3 h-3 text-gray-500 dark:text-gray-400"
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
              class="absolute top-1/2 -translate-y-1/2 w-5 h-12 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded flex items-center justify-center transition-all shadow-sm dark:shadow-gray-900/30"
              title="Show Sidebar"
              @click="sidebar.toggleSidebar"
            >
              <!-- Double chevron right icon -->
              <svg
                class="w-3 h-3 text-gray-500 dark:text-gray-400"
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
              'overflow-hidden',
              sidebar.sidebarVisible.value ? 'pl-2' : 'pl-0'
            ]"
          >
            <div v-if="selectedStreamId && selectedStream" class="h-full">
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
import { ref, computed, onMounted, onUnmounted, watch, inject } from 'vue'
import { useLucideIcons } from '@/composables/useLucideIcons'
import { RefreshCw, Plus, Menu } from 'lucide-vue-next'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useMonitoringStore } from '@/stores/monitoring'
import { useCommonStore } from '@/stores/common'
import { useSidebar } from '@/composables/useSidebar'
import { useDesktopMode } from '@/composables/useDesktopMode'
import StreamsSidebar from '@/components/stream/StreamsSidebar.vue'
import StreamDetailsPanel from '@/components/stream/StreamDetailsPanel.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import DisconnectedOverlay from '@/components/common/DisconnectedOverlay.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection } from '@/types/connections'
import type { StreamDetailsTab } from '@/composables/useStreamHistory'
import { readStreamsViewState, setSelectedStreamInViewState } from '@/utils/streamsViewState'

const { strokeWidth: iconStroke } = useLucideIcons()

const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()
const monitoringStore = useMonitoringStore()
const commonStore = useCommonStore()
const { isDesktop } = useDesktopMode()
const sidebarWidthToggle = inject<{
  isSidebarExpanded: { value: boolean }
  toggleSidebarWidth: () => void
}>('sidebarWidthToggle')
const sidebarMenuToggle = inject<{ openSidebar: () => void }>('sidebarMenuToggle')

// Use sidebar composable for resize and toggle functionality
const sidebar = useSidebar()

const selectedStreamId = ref<string>('')
const restoredTab = ref<StreamDetailsTab | undefined>(undefined)
const initialTab = computed(() => restoredTab.value)
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
    return `${filtered} of ${total} stream configs`
  }
  return `${total} stream config${total === 1 ? '' : 's'}`
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

// Fetch connections and streams on mount
onMounted(async () => {
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

  // Add keyboard shortcut listener
  window.addEventListener('keydown', handleKeyboardShortcut)
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

onUnmounted(() => {
  // Remove keyboard shortcut listener
  window.removeEventListener('keydown', handleKeyboardShortcut)
})
</script>
