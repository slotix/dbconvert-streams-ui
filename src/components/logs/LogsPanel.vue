<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLogsStore, type SystemLog } from '@/stores/logs'
import { TransitionRoot, TransitionChild } from '@headlessui/vue'
import {
  XMarkIcon,
  FunnelIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  MinusIcon,
  InformationCircleIcon
} from '@heroicons/vue/24/outline'
import SqlConsoleView from './SqlConsoleView.vue'

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

// Filtered logs based on stream and message type
const filteredLogs = computed(() => {
  let filtered = store.logs

  // Filter by stream if selected
  if (selectedStreamId.value) {
    filtered = filtered.filter((log) => log.streamId === selectedStreamId.value)
  }

  // Filter by message type
  if (selectedMessageType.value !== 'all') {
    filtered = filtered.filter((log) => {
      const msg = log.message?.toLowerCase() || ''
      switch (selectedMessageType.value) {
        case 'error & warning':
          return log.level === 'error' || log.level === 'warn'
        case 'progress & stats':
          return msg.startsWith('[progress]') || msg.startsWith('[stat]')
        case 'info':
          return log.level === 'info' && !msg.startsWith('[progress]') && !msg.startsWith('[stat]')
        default:
          return true
      }
    })
  }

  // Sort by timestamp (newest first)
  return [...filtered].sort((a, b) => a.timestamp - b.timestamp)
})

const totalLogs = computed(() => {
  return selectedStreamId.value ? filteredLogs.value.length : store.logs.length
})

const hasSQLLogs = computed(() => store.flatLogs.size > 0)

function formatTimestamp(timestamp: number): string {
  const timestampInMs = timestamp < 1e12 ? timestamp * 1000 : timestamp
  const date = new Date(timestampInMs)
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function getMessageTypeColor(log: SystemLog): string {
  const msg = log?.message?.toLowerCase() || ''

  if (msg.includes('connecting') || msg.includes('connected to')) {
    return 'bg-blue-50/80 border-l-4 border-blue-300'
  }

  if (msg.startsWith('[stat]')) {
    return 'bg-indigo-50/80 border-l-4 border-indigo-300'
  }
  if (msg.startsWith('[progress]')) {
    return 'bg-emerald-50/80 border-l-4 border-emerald-300'
  }

  if (msg.startsWith('    at ') || msg.startsWith('  at ')) {
    return 'bg-red-50/40 border-l-4 border-red-200 pl-8 font-mono text-xs'
  }

  switch (log?.level) {
    case 'error':
      return 'bg-red-50/80 border-l-4 border-red-400'
    case 'warn':
      return 'bg-yellow-50/80 border-l-4 border-yellow-400'
    case 'debug':
      return 'bg-gray-50/80 border-l-4 border-gray-400'
    default:
      return 'bg-white border-l-4 border-gray-300'
  }
}

function getDuplicateCount(log: SystemLog): string {
  if (!log.details?.duplicateCount) return ''
  const count = log.details.duplicateCount as number
  if (count <= 1) return ''

  const lastTimestamp = log.details.lastTimestamp as number
  const duration = Math.round((lastTimestamp - log.timestamp) / 1000)
  return `(${count}x in ${duration}s)`
}

function getMessageIcon(log: SystemLog): typeof InformationCircleIcon {
  const msg = log?.message?.toLowerCase() || ''
  if (msg.includes('connecting')) return ArrowPathIcon
  if (msg.includes('connected to')) return ArrowPathIcon
  if (msg.startsWith('[stat]')) return ChartBarIcon
  if (msg.startsWith('[progress]')) return ArrowTrendingUpIcon
  if (msg.startsWith('    at ') || msg.startsWith('  at ')) return MinusIcon
  return InformationCircleIcon
}

function getMessageIconColor(log: SystemLog): string {
  const msg = log?.message?.toLowerCase() || ''

  if (msg.includes('connecting')) return 'text-blue-500'
  if (msg.includes('connected to')) return 'text-blue-600'
  if (msg.startsWith('[stat]')) return 'text-indigo-500'
  if (msg.startsWith('[progress]')) return 'text-emerald-500'
  if (msg.startsWith('    at ') || msg.startsWith('  at ')) return 'text-red-300'

  switch (log?.level) {
    case 'error':
      return 'text-red-500'
    case 'warn':
      return 'text-yellow-500'
    case 'debug':
      return 'text-blue-500'
    case 'info':
      return 'text-gray-400'
    default:
      return 'text-gray-400'
  }
}

const logsContainer = ref<HTMLElement | null>(null)

function startResize(e: MouseEvent) {
  e.preventDefault()
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'ns-resize'

  const startY = e.clientY
  let startHeight = parseInt(store.panelHeight)

  if (isNaN(startHeight)) {
    startHeight = parseInt(store.panelHeight)
  }

  if (store.panelHeight.endsWith('vh')) {
    const pixelHeight = startHeight
    store.updatePanelHeight(`${pixelHeight}px`)
  }

  let lastUpdate = Date.now()
  const THROTTLE_MS = 16

  function onMouseMove(e: MouseEvent) {
    e.preventDefault()

    const now = Date.now()
    if (now - lastUpdate < THROTTLE_MS) return

    const delta = startY - e.clientY
    const newHeight = Math.min(Math.max(startHeight + delta, 200), window.innerHeight * 0.9)
    store.updatePanelHeight(`${newHeight}px`)
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
              <div class="flex items-center">
                <h2 class="text-lg font-medium text-gray-900">System Logs</h2>
                <span class="ml-2 text-sm text-gray-500">{{ totalLogs }} entries</span>
              </div>
              <div class="flex items-center space-x-2">
                <button
                  type="button"
                  class="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  @click="store.clearLogs"
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

            <!-- Filters (only for system logs) -->
            <div
              v-if="selectedView === 'system'"
              class="bg-white px-4 py-2 flex items-center space-x-3 border-b border-gray-200"
            >
              <!-- Stream Filter Dropdown -->
              <div class="flex items-center space-x-2">
                <label class="text-sm text-gray-600">Stream:</label>
                <select
                  v-model="selectedStreamId"
                  class="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Streams</option>
                  <option v-for="streamId in availableStreams" :key="streamId" :value="streamId">
                    {{ getShortStreamId(streamId) }}
                  </option>
                </select>
              </div>

              <!-- Message Type Filter -->
              <div class="flex items-center space-x-2 ml-4">
                <FunnelIcon class="h-4 w-4 text-gray-400" />
                <div class="flex flex-wrap gap-1">
                  <button
                    v-for="type in messageTypes"
                    :key="type"
                    class="px-2.5 py-1 text-xs rounded-full transition-colors duration-200"
                    :class="[
                      selectedMessageType === type
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    ]"
                    @click="selectedMessageType = type"
                  >
                    {{ type }}
                  </button>
                </div>
              </div>
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
              class="overflow-y-auto h-full px-4 bg-white"
              :style="{ height: `calc(${panelHeight} - 180px)` }"
            >
              <table class="w-full">
                <tbody class="divide-y divide-gray-100">
                  <tr
                    v-for="log in filteredLogs"
                    :key="log.id"
                    class="group transition-all duration-200"
                    :class="[getMessageTypeColor(log)]"
                  >
                    <td class="py-1.5 px-2 w-20 text-xs text-gray-500 font-mono whitespace-nowrap">
                      {{ formatTimestamp(log.timestamp) }}
                    </td>
                    <td class="py-1.5 px-2 w-6">
                      <component
                        :is="getMessageIcon(log)"
                        class="h-4 w-4 shrink-0"
                        :class="getMessageIconColor(log)"
                      />
                    </td>
                    <td class="py-1.5 px-2 text-sm text-gray-800 break-words">
                      <div class="flex items-start">
                        <span class="flex-1">{{ log.message }}</span>
                        <span v-if="getDuplicateCount(log)" class="ml-2 text-xs text-gray-500">
                          {{ getDuplicateCount(log) }}
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <!-- Empty State -->
              <div
                v-if="filteredLogs.length === 0"
                class="flex flex-col items-center justify-center h-full text-gray-500"
              >
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
