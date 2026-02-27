<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useLogsStore, type SystemLog } from '@/stores/logs'
import { TransitionRoot, TransitionChild } from '@headlessui/vue'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ClipboardCopy,
  Filter,
  FolderOpen,
  Info,
  Search,
  Trash,
  X
} from 'lucide-vue-next'
import { LOG_LEVELS, STREAM_PROGRESS_CATEGORIES } from '@/constants'
import { useSystemStatus } from '@/composables/useSystemStatus'
import SqlConsoleView from './SqlConsoleView.vue'
import LogRow from './LogRow.vue'
import { getCategoryIcon, formatLogTimestamp } from '@/utils/sqlLogHelpers'
import {
  formatDataSizeWithUnit,
  formatDataRateWithUnit,
  formatElapsedTimeWithUnit,
  parseDataSize
} from '@/utils/formats'

const store = useLogsStore()
const {
  canOpenLogsFolder,
  openLogsFolder,
  meta: systemStatusMeta,
  refresh: refreshSystemStatus
} = useSystemStatus()
const isOpen = computed(() => store.isLogsPanelOpen)
const panelHeight = computed({
  get: () => store.panelHeight,
  set: (value: string) => store.updatePanelHeight(value)
})

// Tab management (using store state)
const systemLogTabs = computed(() => store.systemLogTabs)
const selectedSystemLogTabId = computed({
  get: () => store.selectedSystemLogTabId,
  set: (value: string) => store.selectSystemLogTab(value)
})
const selectedView = ref<'system' | 'sql'>('system')

// Message type filter
const messageTypeOptions = ['error & warning', 'progress & stats', 'info']
const selectedMessageTypes = ref(new Set(messageTypeOptions))
const showMessageTypeMenu = ref(false)
const messageTypeMenuRef = ref<HTMLDivElement | null>(null)
const searchText = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const systemLogsSortOrder = ref<'newest' | 'oldest'>('newest')

// Filtered logs based on message type and search (no tab filter)
const baseFilteredLogs = computed(() => {
  // Use real-time logs from SSE (historical logs are handled per-tab in filteredLogs)
  let filtered = store.logs

  // Filter by message type (multiple selections)
  filtered = filtered.filter((log) => {
    // If no message types selected, show no logs (hide all)
    if (selectedMessageTypes.value.size === 0) return false

    for (const type of selectedMessageTypes.value) {
      switch (type) {
        case 'error & warning':
          if (log.level === LOG_LEVELS.ERROR || log.level === LOG_LEVELS.WARN) return true
          break
        case 'progress & stats':
          if (log.category && STREAM_PROGRESS_CATEGORIES.includes(log.category)) return true
          break
        case 'info':
          if (
            log.level === LOG_LEVELS.INFO &&
            !(log.category && STREAM_PROGRESS_CATEGORIES.includes(log.category))
          )
            return true
          break
      }
    }
    return false
  })

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

  return filtered
})

// Filtered logs based on selected tab, message type, and search
const filteredLogs = computed(() => {
  const selectedTabId = store.selectedSystemLogTabId
  const selectedTab = store.systemLogTabs.get(selectedTabId)

  // Check if this tab has historical logs (loaded from API)
  const historicalLogs = store.historicalLogsMap.get(selectedTabId)
  if (historicalLogs && historicalLogs.length > 0) {
    // Apply message type and search filters to historical logs
    let filtered = applyMessageAndSearchFilters(historicalLogs)
    // Sort by timestamp based on sort order preference
    return [...filtered].sort((a, b) =>
      systemLogsSortOrder.value === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
    )
  }

  // For real-time tabs, filter from baseFilteredLogs
  let filtered = baseFilteredLogs.value

  if (selectedTab) {
    if (selectedTab.streamId === null) {
      // General tab: show only logs without streamId
      filtered = filtered.filter((log) => !log.streamId)
    } else {
      // Stream tab: show logs for this streamId only
      filtered = filtered.filter((log) => log.streamId === selectedTab.streamId)
    }
  }

  // Sort by timestamp based on sort order preference
  return [...filtered].sort((a, b) =>
    systemLogsSortOrder.value === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
  )
})

// Helper function to apply message type and search filters
function applyMessageAndSearchFilters(logs: SystemLog[]): SystemLog[] {
  let filtered = logs

  // Filter by message type (multiple selections)
  filtered = filtered.filter((log) => {
    // If no message types selected, show no logs (hide all)
    if (selectedMessageTypes.value.size === 0) return false

    for (const type of selectedMessageTypes.value) {
      switch (type) {
        case 'error & warning':
          if (log.level === LOG_LEVELS.ERROR || log.level === LOG_LEVELS.WARN) return true
          break
        case 'progress & stats':
          if (log.category && STREAM_PROGRESS_CATEGORIES.includes(log.category)) return true
          break
        case 'info':
          if (
            log.level === LOG_LEVELS.INFO &&
            !(log.category && STREAM_PROGRESS_CATEGORIES.includes(log.category))
          )
            return true
          break
      }
    }
    return false
  })

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

  return filtered
}

const totalLogs = computed(() => {
  return filteredLogs.value.length
})

// Helper function to get log count for a specific tab (handles both historical and real-time)
function getTabLogCount(tabId: string, tab: { streamId: string | null }): number {
  // Check if this tab has historical logs
  const historicalLogs = store.historicalLogsMap.get(tabId)
  if (historicalLogs && historicalLogs.length > 0) {
    return applyMessageAndSearchFilters(historicalLogs).length
  }

  // For real-time tabs, filter from baseFilteredLogs
  if (tab.streamId === null) {
    return baseFilteredLogs.value.filter((log) => !log.streamId).length
  }
  return baseFilteredLogs.value.filter((log) => log.streamId === tab.streamId).length
}

// Logs with meaningful messages (filter out empty ones)
const logsWithContent = computed(() => {
  return filteredLogs.value.filter((log) => {
    const message = getStatLogDisplay(log)
    return message && message.trim()
  })
})

function toggleSystemLogsSortOrder() {
  systemLogsSortOrder.value = systemLogsSortOrder.value === 'newest' ? 'oldest' : 'newest'
}

function computeLogBadge(log: SystemLog) {
  const type = log.category ? 'category' : 'level'
  const value = log.category || log.level || 'info'
  return getCategoryIcon(type, value)
}

const panelContainer = ref<HTMLElement | null>(null)

// Height calculation breakdown:
// - Resize handle: 16px (h-4 and -top-2)
// - Tabs navigation: ~40px (py-4 + px-6 for spacing)
// - Filters bar (System Logs only): ~42px (py-2 + px-4 + button heights)
// - Total fixed space: ~56px (without filters), ~98px (with filters)
// Account for margins/borders and extra padding: use 165px for both views
const CONTENT_HEIGHT_OFFSET = 165

function startResize(e: MouseEvent) {
  e.preventDefault()
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'ns-resize'

  if (!panelContainer.value) return

  const MIN_HEIGHT = 200
  const MAX_HEIGHT = Math.floor(window.innerHeight * 0.65)

  const startY = e.clientY
  const startHeight = panelContainer.value.getBoundingClientRect().height

  let lastUpdate = Date.now()
  const THROTTLE_MS = 16

  function onMouseMove(moveEvent: MouseEvent) {
    moveEvent.preventDefault()

    const now = Date.now()
    if (now - lastUpdate < THROTTLE_MS) return

    const delta = startY - moveEvent.clientY
    const newHeight = Math.max(MIN_HEIGHT, Math.min(startHeight + delta, MAX_HEIGHT))
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
    if (log.type) {
      parts.push(`${String(log.type).toUpperCase()}`)
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
      const sizeFormatted = formatDataSizeWithUnit(parseDataSize(log.size))
      stats.push(`${sizeFormatted.value} ${sizeFormatted.unit}`)
    }
    if (log.status === 'FINISHED') {
      if (log.rate) {
        const rateFormatted = formatDataRateWithUnit(parseDataSize(log.rate))
        stats.push(`${rateFormatted.value} ${rateFormatted.unit}`)
      }
      if (log.elapsed !== undefined) {
        const elapsedFormatted = formatElapsedTimeWithUnit(log.elapsed * 1e9) // Convert seconds to nanoseconds
        stats.push(`${elapsedFormatted.value} ${elapsedFormatted.unit}`)
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

// Copy helpers
const copyAllFeedback = ref(false)

function formatLogLine(log: SystemLog): string {
  const ts = formatLogTimestamp(log.timestamp)
  const msg = getStatLogDisplay(log)
  const level = log.category || log.level || ''
  return `${ts}  [${level}]  ${msg}`
}

async function copyAllLogs() {
  const lines = logsWithContent.value.map(formatLogLine)
  if (lines.length === 0) return
  try {
    await navigator.clipboard.writeText(lines.join('\n'))
    copyAllFeedback.value = true
    setTimeout(() => {
      copyAllFeedback.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy logs:', error)
  }
}

// Keyboard shortcuts handler
function handleKeyboardShortcut(event: KeyboardEvent) {
  // Don't trigger shortcuts if typing in an input field or editor
  const target = event.target as HTMLElement
  const isInputField =
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable ||
    target.closest('.cm-editor') !== null

  // Only apply shortcuts for system logs view
  if (selectedView.value !== 'system') return

  // C: Copy all visible logs
  if (event.key.toLowerCase() === 'c' && !isInputField) {
    event.preventDefault()
    copyAllLogs()
    return
  }

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

  // Close message type dropdown when clicking outside
  if (
    showMessageTypeMenu.value &&
    messageTypeMenuRef.value &&
    target &&
    !messageTypeMenuRef.value.contains(target)
  ) {
    showMessageTypeMenu.value = false
  }
}

onMounted(() => {
  refreshSystemStatus()

  // Clamp panel height to valid range on mount
  nextTick(() => {
    const MAX_HEIGHT = Math.floor(window.innerHeight * 0.65)
    const MIN_HEIGHT = 200
    const current = panelContainer.value?.getBoundingClientRect().height ?? 0
    if (current > MAX_HEIGHT) {
      store.updatePanelHeight(`${MAX_HEIGHT}px`)
    } else if (current < MIN_HEIGHT && store.isLogsPanelOpen) {
      store.updatePanelHeight(`${MIN_HEIGHT}px`)
    }
  })

  // Load preferences from localStorage
  const savedMessageTypes = localStorage.getItem('systemLogMessageTypes')
  if (savedMessageTypes) {
    try {
      const parsed = JSON.parse(savedMessageTypes)
      selectedMessageTypes.value = new Set(parsed)
    } catch {
      // If parsing fails, use defaults
      selectedMessageTypes.value = new Set(messageTypeOptions)
    }
  }

  // Note: Do NOT persist selectedStreamId - start with clean state each session
  // This ensures users don't see stale stream filters after restart
  // Clear any stale stream filter from localStorage
  localStorage.removeItem('systemLogStreamFilter')

  // Setup watchers for persistence
  watch(
    selectedMessageTypes,
    (newValue) => {
      localStorage.setItem('systemLogMessageTypes', JSON.stringify(Array.from(newValue)))
    },
    { deep: true }
  )

  // Note: Do NOT persist selectedStreamId - it should reset each session

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
      <div ref="panelContainer" class="fixed inset-x-0 bottom-0" :style="{ height: panelHeight }">
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
            class="w-full h-full bg-white dark:bg-gray-850 shadow-xl dark:shadow-gray-900/50 rounded-t-lg overflow-hidden border border-gray-200 dark:border-gray-700 lg:px-20"
          >
            <!-- Resize Handle -->
            <div
              role="separator"
              aria-orientation="horizontal"
              class="absolute top-0 left-0 right-0 z-50 h-2 cursor-ns-resize select-none group pointer-events-auto"
              title="Drag to resize"
              @mousedown.prevent="startResize"
            >
              <div
                class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px group-hover:h-[3px] bg-gray-200 dark:bg-gray-700 group-hover:bg-teal-400 dark:group-hover:bg-teal-500 transition-all duration-150"
              />
            </div>

            <!-- View Tabs: System Logs vs SQL Logs -->
            <div
              class="bg-white dark:bg-gray-850 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"
            >
              <nav class="flex space-x-6" aria-label="Tabs">
                <button
                  class="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2"
                  :class="[
                    selectedView === 'system'
                      ? 'text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  ]"
                  @click="selectedView = 'system'"
                >
                  System Logs
                  <span
                    class="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    {{ totalLogs }}
                  </span>
                </button>
                <button
                  class="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200"
                  :class="[
                    selectedView === 'sql'
                      ? 'text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  ]"
                  @click="selectedView = 'sql'"
                >
                  <span class="text-green-600 dark:text-green-400 font-semibold">SQL Logs</span>
                  <span
                    class="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    {{ store.flatLogs.size }}
                  </span>
                </button>
              </nav>
              <!-- Close Button -->
              <button
                type="button"
                class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                @click="store.toggleLogsPanel"
              >
                <X class="h-6 w-6" />
              </button>
            </div>

            <!-- Filters (only for system logs) - Unified with SQL Logs style -->
            <div
              v-if="selectedView === 'system'"
              class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700 shadow-sm flex-wrap"
            >
              <!-- Message Type Filter Dropdown (matching SQL Logs pattern) -->
              <div ref="messageTypeMenuRef" class="relative">
                <button
                  class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 focus:border-gray-400 dark:focus:border-gray-500 focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 transition-colors text-left"
                  :title="`Filter by message type`"
                  @click="showMessageTypeMenu = !showMessageTypeMenu"
                >
                  <Filter class="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span class="text-gray-700 dark:text-gray-200 font-medium">
                    {{
                      selectedMessageTypes.size === messageTypeOptions.length
                        ? 'All Types'
                        : selectedMessageTypes.size === 0
                          ? 'No Selection'
                          : `${selectedMessageTypes.size} Selected`
                    }}
                  </span>
                  <ChevronDown class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                </button>

                <transition
                  leave-active-class="transition ease-in duration-100"
                  leave-from-class="opacity-100"
                  leave-to-class="opacity-0"
                >
                  <div
                    v-if="showMessageTypeMenu"
                    class="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-50"
                    @click.stop
                  >
                    <!-- Select All / Clear All -->
                    <button
                      class="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors group border-b border-gray-100 dark:border-gray-700"
                      @click="
                        selectedMessageTypes.size === messageTypeOptions.length
                          ? selectedMessageTypes.clear()
                          : (selectedMessageTypes = new Set(messageTypeOptions))
                      "
                    >
                      <div
                        :class="[
                          'w-4 h-4 rounded border transition-colors',
                          selectedMessageTypes.size === messageTypeOptions.length
                            ? 'bg-gray-700 dark:bg-gray-600 border-gray-700 dark:border-gray-600'
                            : 'border-gray-300 dark:border-gray-600 group-hover:border-gray-400 dark:group-hover:border-gray-500'
                        ]"
                      >
                        <span
                          v-if="selectedMessageTypes.size === messageTypeOptions.length"
                          class="flex items-center justify-center w-full h-full text-white text-xs"
                        >
                          ✓
                        </span>
                      </div>
                      <span
                        class="text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white font-semibold"
                      >
                        {{
                          selectedMessageTypes.size === messageTypeOptions.length
                            ? 'Clear All'
                            : 'Select All'
                        }}
                      </span>
                    </button>

                    <!-- Message Type Options -->
                    <button
                      v-for="type in messageTypeOptions"
                      :key="type"
                      class="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors group"
                      @click="
                        selectedMessageTypes.has(type)
                          ? selectedMessageTypes.delete(type)
                          : selectedMessageTypes.add(type)
                      "
                    >
                      <div
                        :class="[
                          'w-4 h-4 rounded border transition-colors',
                          selectedMessageTypes.has(type)
                            ? 'bg-gray-700 dark:bg-gray-600 border-gray-700 dark:border-gray-600'
                            : 'border-gray-300 dark:border-gray-600 group-hover:border-gray-400 dark:group-hover:border-gray-500'
                        ]"
                      >
                        <span
                          v-if="selectedMessageTypes.has(type)"
                          class="flex items-center justify-center w-full h-full text-white text-xs"
                        >
                          ✓
                        </span>
                      </div>
                      <span
                        class="text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white"
                        >{{ type }}</span
                      >
                    </button>
                  </div>
                </transition>
              </div>

              <div class="hidden sm:block h-6 border-l border-gray-200 dark:border-gray-700" />

              <!-- Sort Order Toggle (matching SQL Logs pattern) -->
              <button
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                :title="`Sort: ${systemLogsSortOrder === 'newest' ? 'Newest on top' : 'Oldest on top'} (S)`"
                @click="toggleSystemLogsSortOrder"
              >
                <component
                  :is="systemLogsSortOrder === 'newest' ? ArrowDown : ArrowUp"
                  class="w-3.5 h-3.5 text-gray-600 dark:text-gray-400"
                />
                <span class="text-gray-700 dark:text-gray-200 font-medium">{{
                  systemLogsSortOrder === 'newest' ? 'Newest' : 'Oldest'
                }}</span>
              </button>

              <div class="hidden sm:block h-6 border-l border-gray-200 dark:border-gray-700" />

              <!-- Search Input (matching SQL Logs search style) -->
              <div class="flex-1 relative min-w-0 sm:min-w-48">
                <Search
                  class="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2"
                />
                <input
                  ref="searchInputRef"
                  v-model="searchText"
                  type="text"
                  placeholder="Search logs..."
                  class="w-full text-xs border border-gray-300 dark:border-gray-600 rounded pl-9 pr-3 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500 hover:border-gray-400 dark:hover:border-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                />
              </div>

              <!-- Open Logs Folder (desktop only) -->
              <button
                v-if="canOpenLogsFolder"
                type="button"
                :title="systemStatusMeta.join('\n')"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
                @click="openLogsFolder()"
              >
                <FolderOpen class="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                <span class="hidden sm:inline">Logs Folder</span>
              </button>

              <!-- Copy All Button -->
              <button
                type="button"
                :title="`Copy ${logsWithContent.length} visible logs to clipboard (C)`"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
                @click="copyAllLogs"
              >
                <ClipboardCopy class="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                <span class="hidden sm:inline">
                  {{ copyAllFeedback ? 'Copied!' : 'Copy All' }}
                </span>
              </button>

              <!-- Clear Button -->
              <button
                type="button"
                title="Clear logs (K)"
                class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-orange-600 dark:bg-orange-500 rounded hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors shadow-sm"
                @click="store.clearLogs()"
              >
                <Trash class="w-3.5 h-3.5" />
                <span>Clear Logs</span>
              </button>
            </div>

            <!-- SQL Console View -->
            <div
              v-if="selectedView === 'sql'"
              class="h-full bg-white dark:bg-gray-850"
              :style="{ height: `calc(${panelHeight} - ${CONTENT_HEIGHT_OFFSET}px)` }"
            >
              <SqlConsoleView />
            </div>

            <!-- System Logs View -->
            <div
              v-else
              class="flex flex-col h-full bg-white dark:bg-gray-850"
              :style="{ height: `calc(${panelHeight} - ${CONTENT_HEIGHT_OFFSET}px)` }"
            >
              <!-- Stream Tabs Bar -->
              <div
                class="bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700 px-4 py-2 shadow-sm overflow-x-auto shrink-0"
              >
                <div class="flex items-center gap-2">
                  <!-- Tabs Container -->
                  <div class="flex items-center gap-1 flex-nowrap">
                    <button
                      v-for="[tabId, tab] of systemLogTabs"
                      :key="tabId"
                      class="flex items-center gap-2 px-3 py-1.5 text-xs rounded transition-colors whitespace-nowrap"
                      :class="[
                        selectedSystemLogTabId === tabId
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      ]"
                      :title="tab.fullLabel || tab.label"
                      @click="selectedSystemLogTabId = tabId"
                    >
                      <span class="font-medium">{{ tab.label }}</span>
                      <!-- Log count badge -->
                      <span
                        class="text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-1.5 py-0.5 rounded"
                      >
                        {{ getTabLogCount(tabId, tab) }}
                      </span>
                      <!-- Close button (X) - not for General tab -->
                      <button
                        v-if="tabId !== 'general'"
                        class="flex items-center justify-center w-4 h-4 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ml-1"
                        :class="[
                          selectedSystemLogTabId === tabId
                            ? 'hover:bg-blue-200 dark:hover:bg-blue-800'
                            : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                        ]"
                        :title="`Close tab`"
                        @click.stop="store.removeSystemLogTab(tabId)"
                      >
                        ✕
                      </button>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Logs Container (scrollable) -->
              <div ref="logsContainer" class="overflow-y-auto flex-1">
                <!-- Log Rows (flat view - no grouping since tabs provide that) -->
                <div v-if="logsWithContent.length > 0">
                  <LogRow
                    v-for="log in logsWithContent"
                    :key="log.id"
                    :timestamp="formatLogTimestamp(log.timestamp)"
                    :badge="computeLogBadge(log)"
                    :message="getStatLogDisplay(log)"
                    :is-error="log.level === 'error'"
                    :expandable="false"
                    :copy-text="formatLogLine(log)"
                  />
                </div>

                <!-- Empty State -->
                <div
                  v-else
                  class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400"
                >
                  <div class="text-center">
                    <Info class="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                    <p class="font-medium">No logs to display</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TransitionChild>
      </div>
    </div>
  </TransitionRoot>
</template>
