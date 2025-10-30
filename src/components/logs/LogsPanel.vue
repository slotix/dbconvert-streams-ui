<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useLogsStore, type SystemLog } from '@/stores/logs'
import { TransitionRoot, TransitionChild } from '@headlessui/vue'
import {
  XMarkIcon,
  FunnelIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/vue/24/outline'
import { LOG_LEVELS, STREAM_PROGRESS_CATEGORIES } from '@/constants'
import SqlConsoleView from './SqlConsoleView.vue'
import LogRow from './LogRow.vue'
import {
  getCategoryBadgeClasses,
  getCategoryLabel,
  formatLogTimestamp
} from '@/utils/sqlLogHelpers'

const store = useLogsStore()
const isOpen = computed(() => store.isLogsPanelOpen)
const panelHeight = computed({
  get: () => store.panelHeight,
  set: (value: string) => store.updatePanelHeight(value)
})

// Stream filter (using store state)
const selectedStreamId = computed({
  get: () => store.selectedStreamId,
  set: (value: string) => store.setStreamFilter(value)
})
const selectedView = ref<'system' | 'sql'>('system')

// Available streams from logs
const availableStreams = computed(() => {
  const streams = new Set<string>()
  store.logs.forEach((log) => {
    if (log.streamId) {
      streams.add(log.streamId)
    }
  })
  return Array.from(streams).sort()
})

// Message type filter
const messageTypes = ['all', 'error & warning', 'progress & stats', 'info']
const selectedMessageType = ref('all')
const showMessageTypeMenu = ref(false)
const searchText = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const visuallyGrouped = ref(false)
const collapsedStreams = ref(new Set<string>())

// Filtered logs based on stream, message type, and search
const filteredLogs = computed(() => {
  // Use historical logs if in historical view, otherwise use SSE logs
  let filtered = store.isHistoricalView ? store.historicalLogs : store.logs

  // Filter by stream if selected (only for SSE logs, historical logs are already filtered)
  if (selectedStreamId.value && !store.isHistoricalView) {
    filtered = filtered.filter((log) => log.streamId === selectedStreamId.value)
  }

  // Filter by message type
  if (selectedMessageType.value !== 'all') {
    filtered = filtered.filter((log) => {
      switch (selectedMessageType.value) {
        case 'error & warning':
          return log.level === LOG_LEVELS.ERROR || log.level === LOG_LEVELS.WARN
        case 'progress & stats':
          return log.category ? STREAM_PROGRESS_CATEGORIES.includes(log.category) : false
        case 'info':
          return (
            log.level === LOG_LEVELS.INFO &&
            !(log.category && STREAM_PROGRESS_CATEGORIES.includes(log.category))
          )
        default:
          return true
      }
    })
  }

  // Filter by search text (searches message, source, type, streamId)
  if (searchText.value.trim()) {
    const query = searchText.value.toLowerCase()
    filtered = filtered.filter((log) => {
      const message = (log.message || '').toLowerCase()
      const source = (log.source || '').toLowerCase()
      const type = (log.type || '').toLowerCase()
      const streamId = (log.streamId || '').toLowerCase()
      const category = (log.category || '').toLowerCase()

      return (
        message.includes(query) ||
        source.includes(query) ||
        type.includes(query) ||
        streamId.includes(query) ||
        category.includes(query)
      )
    })
  }

  // Sort by timestamp (newest first)
  return [...filtered].sort((a, b) => a.timestamp - b.timestamp)
})

const totalLogs = computed(() => {
  return selectedStreamId.value ? filteredLogs.value.length : store.logs.length
})

// Logs with meaningful messages (filter out empty ones)
const logsWithContent = computed(() => {
  return filteredLogs.value.filter((log) => {
    const message = getStatLogDisplay(log)
    return message && message.trim()
  })
})

// Grouped logs by streamId (for visual grouping)
const groupedLogs = computed(() => {
  if (!visuallyGrouped.value) {
    return null
  }

  const groups = new Map<string, typeof logsWithContent.value>()
  logsWithContent.value.forEach((log) => {
    const streamId = log.streamId || 'ungrouped'
    if (!groups.has(streamId)) {
      groups.set(streamId, [])
    }
    groups.get(streamId)!.push(log)
  })
  return groups
})

function toggleGrouping() {
  visuallyGrouped.value = !visuallyGrouped.value
}

function toggleStream(streamId: string) {
  if (collapsedStreams.value.has(streamId)) {
    collapsedStreams.value.delete(streamId)
  } else {
    collapsedStreams.value.add(streamId)
  }
}

const hasSQLLogs = computed(() => store.flatLogs.size > 0)

function computeLogBadge(log: SystemLog) {
  const type = log.category ? 'category' : 'level'
  const value = log.category || log.level || 'info'
  return {
    label: getCategoryLabel(type, value),
    class: getCategoryBadgeClasses(type, value)
  }
}

const logsContainer = ref<HTMLElement | null>(null)

function startResize(e: MouseEvent) {
  e.preventDefault()
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'ns-resize'

  const startY = e.clientY
  const container = logsContainer.value?.parentElement
  if (!container) return

  // Get the actual current height in pixels at start of drag
  const startHeight = container.getBoundingClientRect().height

  // Define min and max heights
  const MIN_HEIGHT = 200
  const MAX_HEIGHT = window.innerHeight * 0.8

  let lastUpdate = Date.now()
  const THROTTLE_MS = 16

  function onMouseMove(e: MouseEvent) {
    e.preventDefault()

    const now = Date.now()
    if (now - lastUpdate < THROTTLE_MS) return

    // Calculate delta from the original start position
    const delta = startY - e.clientY

    // Calculate new height with constraints
    const newHeight = Math.max(MIN_HEIGHT, Math.min(startHeight + delta, MAX_HEIGHT))

    // Update the panel height
    store.updatePanelHeight(`${Math.round(newHeight)}px`)
    lastUpdate = now
  }

  function onMouseUp() {
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function getShortStreamId(streamId: string): string {
  if (!streamId) return ''
  // Extract the last part after underscore
  if (streamId.includes('_')) {
    const parts = streamId.split('_')
    return parts[parts.length - 1].slice(0, 8)
  }
  return streamId.slice(0, 12)
}

function getStatLogDisplay(log: SystemLog): string {
  // For progress logs with structured data, build a polished display string
  if (log.category === 'progress') {
    const parts: string[] = []

    // Stage number and description
    if (log.stage !== undefined) {
      parts.push(`STAGE ${log.stage}:`)
    }

    if (log.description) {
      parts.push(log.description)
    }

    // Optional percentage
    if (log.percentage !== undefined && log.percentage > 0 && log.percentage < 100) {
      parts.push(`(${log.percentage}%)`)
    }

    return parts.join(' ')
  }

  // For stat logs with structured data, build a polished display string
  if (log.category === 'stat') {
    const parts: string[] = []

    // Header: source/target (use type field instead of nodeType)
    if ((log as any).type) {
      parts.push(`${(log as any).type.toUpperCase()}`)
    }

    // Table name
    if (log.table && log.table !== '') {
      parts.push(`"${log.table}"`)
    } else if (log.table === '') {
      // Show Total for aggregate stats
      parts.push(`TOTAL`)
    }

    // Status indicator
    if (log.status) {
      const statusEmoji = log.status === 'FINISHED' ? '✓' : log.status === 'FAILED' ? '✗' : '→'
      parts.push(`${statusEmoji} ${log.status}`)
    }

    // Statistics
    const stats: string[] = []
    if (log.events !== undefined) {
      stats.push(`${log.events.toLocaleString()} rows`)
    }
    if (log.size) {
      stats.push(`${log.size}`)
    }
    if (log.status === 'FINISHED') {
      if (log.rate) {
        stats.push(`${log.rate}/s`)
      }
      if (log.elapsed !== undefined) {
        stats.push(`${log.elapsed.toFixed(3)}s`)
      }
    }

    if (stats.length > 0) {
      parts.push(`[${stats.join(' • ')}]`)
    }

    return parts.join(' ')
  }

  // For other log types, use the message field
  return log.message || ''
}

function backToLiveLogs() {
  store.clearHistoricalLogs()
  selectedStreamId.value = ''
}

// Keyboard shortcuts handler
function handleKeyboardShortcut(event: KeyboardEvent) {
  // Don't trigger shortcuts if typing in an input field (except for specific keys)
  const target = event.target as HTMLElement
  const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

  // Only apply shortcuts for system logs view
  if (selectedView.value !== 'system') return

  // K: Clear logs
  if (event.key.toLowerCase() === 'k' && !isInputField) {
    event.preventDefault()
    store.clearLogs()
    return
  }

  // Forward slash or F: Focus search input
  if ((event.key === '/' || event.key.toLowerCase() === 'f') && !isInputField) {
    event.preventDefault()
    searchInputRef.value?.focus()
    return
  }
}

function handleDocumentClick(event: MouseEvent) {
  const target = event.target as Node | null

  // Close stream dropdown when clicking outside
  if (target) {
    // This can be expanded if we implement a custom dropdown
  }
}

onMounted(() => {
  // Load preferences from localStorage
  const savedGrouped = localStorage.getItem('systemLogVisuallyGrouped')
  if (savedGrouped === 'true') {
    visuallyGrouped.value = true
  }

  const savedMessageType = localStorage.getItem('systemLogMessageType')
  if (savedMessageType) {
    selectedMessageType.value = savedMessageType
  }

  const savedStreamId = localStorage.getItem('systemLogStreamFilter')
  if (savedStreamId) {
    selectedStreamId.value = savedStreamId
  }

  // Setup watchers for persistence
  watch(visuallyGrouped, (newValue) => {
    localStorage.setItem('systemLogVisuallyGrouped', String(newValue))
  })

  watch(selectedMessageType, (newValue) => {
    localStorage.setItem('systemLogMessageType', newValue)
  })

  watch(selectedStreamId, (newValue) => {
    localStorage.setItem('systemLogStreamFilter', newValue)
  })

  // Setup event listeners
  document.addEventListener('keydown', handleKeyboardShortcut)
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyboardShortcut)
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <TransitionRoot as="template" :show="isOpen">
    <div class="relative z-30">
      <div class="fixed inset-x-0 bottom-0" :style="{ height: panelHeight }">
        <TransitionChild
          as="template"
          enter="transform transition ease-in-out duration-300"
          enter-from="translate-y-full"
          enter-to="translate-y-0"
          leave="transform transition ease-in-out duration-300"
          leave-from="translate-y-0"
          leave-to="translate-y-full"
        >
          <div
            class="w-full h-full bg-white shadow-xl rounded-t-lg overflow-hidden border border-gray-200 lg:pl-20"
          >
            <!-- Resize Handle -->
            <div class="absolute top-0 left-0 right-0 flex items-center justify-center select-none">
              <div
                class="w-full h-1 bg-gray-200 hover:bg-gray-300 cursor-ns-resize transition-colors"
                @mousedown.prevent="startResize"
              ></div>
              <div
                class="absolute h-4 w-16 -top-2 bg-gray-200 hover:bg-gray-300 rounded-t-md cursor-ns-resize transition-colors flex items-center justify-center"
                @mousedown.prevent="startResize"
              >
                <div class="w-6 h-0.5 bg-gray-400 rounded-full"></div>
              </div>
            </div>

            <div
              class="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200"
            >
              <div class="flex items-center space-x-3">
                <h2 class="text-lg font-medium text-gray-900">System Logs</h2>
                <span class="ml-2 text-sm text-gray-500">{{ totalLogs }} entries</span>

                <!-- Historical Logs Indicator -->
                <span
                  v-if="store.isHistoricalView"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full ring-1 ring-inset ring-gray-300"
                >
                  <svg
                    class="h-3.5 w-3.5 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Historical Logs
                </span>

                <!-- Loading Indicator -->
                <span
                  v-if="store.isLoadingHistoricalLogs"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full"
                >
                  <ArrowPathIcon class="h-3.5 w-3.5 animate-spin" />
                  Loading...
                </span>
              </div>
              <div class="flex items-center space-x-2">
                <!-- Back to Live Logs Button (only show in historical view) -->
                <button
                  v-if="store.isHistoricalView"
                  type="button"
                  class="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors font-medium"
                  @click="backToLiveLogs"
                >
                  Back to Live
                </button>
                <button
                  type="button"
                  class="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  @click="store.isHistoricalView ? store.clearHistoricalLogs() : store.clearLogs()"
                >
                  Clear
                </button>
                <button
                  type="button"
                  class="text-gray-400 hover:text-gray-600 transition-colors"
                  @click="store.toggleLogsPanel"
                >
                  <XMarkIcon class="h-6 w-6" />
                </button>
              </div>
            </div>

            <!-- View Tabs: System Logs vs SQL Logs -->
            <div class="bg-white px-4 border-b border-gray-200">
              <nav class="flex space-x-4 py-2" aria-label="Tabs">
                <button
                  class="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200"
                  :class="[
                    selectedView === 'system'
                      ? 'text-gray-900 bg-gray-100 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  ]"
                  @click="selectedView = 'system'"
                >
                  System Logs
                </button>
                <button
                  v-if="hasSQLLogs"
                  class="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200"
                  :class="[
                    selectedView === 'sql'
                      ? 'text-gray-900 bg-gray-100 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  ]"
                  @click="selectedView = 'sql'"
                >
                  <span class="text-purple-600 font-semibold">SQL</span>
                  <span class="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">
                    {{ store.flatLogs.size }}
                  </span>
                </button>
              </nav>
            </div>

            <!-- Filters (only for system logs) - Unified with SQL Logs style -->
            <div
              v-if="selectedView === 'system'"
              class="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 shadow-sm flex-wrap"
            >
              <!-- Grouping Toggle (matching SQL Logs pattern) -->
              <button
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded transition-colors"
                :class="[
                  visuallyGrouped
                    ? 'border-gray-400 bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                ]"
                title="Toggle grouping by stream"
                @click="toggleGrouping"
              >
                <component
                  :is="visuallyGrouped ? Squares2X2Icon : ListBulletIcon"
                  class="w-4 h-4"
                />
                <span class="font-medium">{{ visuallyGrouped ? 'Grouped' : 'Ungrouped' }}</span>
              </button>

              <div class="hidden sm:block h-6 border-l border-gray-200" />

              <!-- Stream Filter Dropdown (matching SQL Logs query type dropdown style) -->
              <div class="relative">
                <button
                  class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-colors text-left"
                  title="Filter by stream"
                >
                  <FunnelIcon class="w-4 h-4 text-gray-600" />
                  <span class="text-gray-700 font-medium">
                    {{ selectedStreamId ? getShortStreamId(selectedStreamId) : 'All Streams' }}
                  </span>
                </button>
              </div>

              <div class="hidden sm:block h-6 border-l border-gray-200" />

              <!-- Message Type Filter (matching SQL Logs button group style) -->
              <div class="flex items-center gap-2">
                <button
                  v-for="type in messageTypes"
                  :key="type"
                  class="px-3 py-1.5 text-xs border rounded transition-colors"
                  :class="[
                    selectedMessageType === type
                      ? 'border-gray-400 bg-gray-700 text-white'
                      : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                  ]"
                  @click="selectedMessageType = type"
                >
                  {{ type }}
                </button>
              </div>

              <div class="hidden sm:block h-6 border-l border-gray-200" />

              <!-- Search Input (matching SQL Logs search style) -->
              <div class="flex-1 relative min-w-0 sm:min-w-48">
                <svg
                  class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  ref="searchInputRef"
                  v-model="searchText"
                  type="text"
                  placeholder="Search logs..."
                  class="w-full text-xs border border-gray-300 rounded pl-9 pr-3 py-1.5 bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              <!-- Stream selector dropdown (hidden native select for accessibility) -->
              <select
                v-model="selectedStreamId"
                class="hidden px-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Streams</option>
                <option v-for="streamId in availableStreams" :key="streamId" :value="streamId">
                  {{ getShortStreamId(streamId) }}
                </option>
              </select>
            </div>

            <!-- SQL Console View -->
            <div
              v-if="selectedView === 'sql'"
              class="h-full bg-white"
              :style="{ height: `calc(${panelHeight} - 132px)` }"
            >
              <SqlConsoleView />
            </div>

            <!-- System Logs View -->
            <div
              v-else
              ref="logsContainer"
              class="overflow-y-auto h-full bg-white"
              :style="{ height: `calc(${panelHeight} - 180px)` }"
            >
              <!-- Log Rows using reusable LogRow component -->
              <!-- Grouped View -->
              <div v-if="visuallyGrouped && groupedLogs && groupedLogs.size > 0">
                <div v-for="[streamId, logs] of groupedLogs.entries()" :key="streamId">
                  <!-- Stream Group Header -->
                  <div
                    class="bg-gray-100 border-b border-gray-300 px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-gray-200 transition-colors sticky top-0 z-10"
                    @click="toggleStream(streamId)"
                  >
                    <component
                      :is="collapsedStreams.has(streamId) ? ChevronRightIcon : ChevronDownIcon"
                      class="w-4 h-4 text-gray-700 flex-shrink-0"
                    />
                    <span class="text-sm font-semibold text-gray-900">
                      {{ streamId === 'ungrouped' ? 'Ungrouped' : getShortStreamId(streamId) }}
                    </span>
                    <span class="text-xs bg-gray-600 text-white px-2 py-0.5 rounded">
                      {{ logs.length }} logs
                    </span>
                  </div>

                  <!-- Logs in group (hidden if collapsed) -->
                  <div v-if="!collapsedStreams.has(streamId)">
                    <LogRow
                      v-for="log in logs"
                      :key="log.id"
                      :timestamp="formatLogTimestamp(log.timestamp)"
                      :badge="computeLogBadge(log)"
                      :message="getStatLogDisplay(log)"
                      :is-error="log.level === 'error'"
                      :expandable="false"
                    >
                    </LogRow>
                  </div>
                </div>
              </div>

              <!-- Ungrouped View -->
              <div v-else-if="!visuallyGrouped && logsWithContent.length > 0">
                <LogRow
                  v-for="log in logsWithContent"
                  :key="log.id"
                  :timestamp="formatLogTimestamp(log.timestamp)"
                  :badge="computeLogBadge(log)"
                  :message="getStatLogDisplay(log)"
                  :is-error="log.level === 'error'"
                  :expandable="false"
                >
                </LogRow>
              </div>

              <!-- Empty State -->
              <div v-else class="flex flex-col items-center justify-center h-full text-gray-500">
                <InformationCircleIcon class="h-12 w-12 mb-2" />
                <p class="text-sm">No logs to display</p>
                <p v-if="selectedStreamId" class="text-xs mt-1">
                  Try selecting a different stream or clearing filters
                </p>
              </div>
            </div>
          </div>
        </TransitionChild>
      </div>
    </div>
  </TransitionRoot>
</template>
