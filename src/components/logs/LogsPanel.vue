<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
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

interface LogColumn {
  type: string
  nodeId?: string
  nodes: Record<string, SystemLog[]>
}

const store = useLogsStore()
const isOpen = computed(() => store.isLogsPanelOpen)
const panelHeight = computed({
  get: () => store.panelHeight,
  set: (value: string) => store.updatePanelHeight(value)
})

function formatTimestamp(timestamp: number): string {
  // Convert milliseconds to seconds if needed
  const timestampInMs = timestamp < 1e12 ? timestamp * 1000 : timestamp
  const date = new Date(timestampInMs)
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function getNodeType(source: string | undefined): string {
  if (!source) return 'system'

  // If source contains a colon, extract the type part
  if (source.includes(':')) {
    const [type] = source.split(':')
    return type || 'system'
  }

  // Otherwise, use the source directly as the type
  // Common types: 'api', 'source', 'target'
  if (['api', 'source', 'target'].includes(source.toLowerCase())) {
    return source.toLowerCase()
  }

  // For other sources, map them to appropriate categories
  if (source === 'database') return 'source'
  if (source === 'sse-client') return 'api'

  return 'system'
}

function getNodeId(source: string | undefined, log?: SystemLog): string {
  // If log has a nodeId field, use that
  if (log && log.nodeId) {
    return log.nodeId
  }

  // Otherwise, fall back to extracting from source
  if (!source) return 'system'

  // If source contains a colon, extract the id part
  if (source.includes(':')) {
    const [, id] = source.split(':')
    return id || 'system'
  }

  // Otherwise, use the source as both type and id
  return source
}

function getNodeColor(type: string): string {
  switch (type) {
    case 'api':
      return 'text-blue-600'
    case 'source':
      return 'text-orange-600'
    case 'target':
      return 'text-cyan-600'
    case 'system':
      return 'text-purple-600'
    default:
      return 'text-gray-600'
  }
}

function getMessageTypeColor(log: SystemLog): string {
  const msg = log?.message?.toLowerCase() || ''

  // Connection status messages
  if (msg.includes('connecting') || msg.includes('connected to')) {
    return 'bg-blue-50/80 border-l-4 border-blue-300'
  }

  // Stats and progress
  if (msg.startsWith('[stat]')) {
    return 'bg-indigo-50/80 border-l-4 border-indigo-300'
  }
  if (msg.startsWith('[progress]')) {
    return 'bg-emerald-50/80 border-l-4 border-emerald-300'
  }

  // Stack traces and detailed errors (indented messages)
  if (msg.startsWith('    at ') || msg.startsWith('  at ')) {
    return 'bg-red-50/40 border-l-4 border-red-200 pl-8 font-mono text-xs'
  }

  switch (log?.level) {
    case 'error':
      return 'bg-red-50/80 border-l-4 border-red-400 shadow-sm'
    case 'warn':
      return 'bg-yellow-50/80 border-l-4 border-yellow-400 shadow-sm'
    case 'debug':
      return 'hover:bg-gray-50 border-l-4 border-gray-400'
    case 'info':
      return 'hover:bg-gray-50 border-l-4 border-gray-300'
    default:
      return 'hover:bg-gray-50 border-l-4 border-gray-300'
  }
}

function formatDuplicateInfo(log: SystemLog): string {
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

const messageTypes = ['all', 'error & warning', 'progress & stats', 'info']
const selectedMessageType = ref('all')

const groupedLogs = computed(() => {
  const groups: Record<string, Record<string, SystemLog[]>> = {
    api: {},
    source: {},
    target: {},
    system: {}
  }

  // Group logs and sort them by timestamp (newest first)
  store.logs.forEach((log) => {
    const source = log.source || ''
    const nodeType = getNodeType(source)
    const nodeId = getNodeId(source, log)

    if (!groups[nodeType]) {
      groups[nodeType] = {}
    }

    if (!groups[nodeType][nodeId]) {
      groups[nodeType][nodeId] = []
    }

    groups[nodeType][nodeId].push(log)
  })

  // Sort each group's logs by timestamp (newest first)
  Object.values(groups).forEach((nodeGroups) => {
    Object.values(nodeGroups).forEach((logs) => {
      logs.sort((a, b) => a.timestamp - b.timestamp) // Newest first
    })
  })

  return groups
})

const nodeColumns = computed(() => {
  const columns: LogColumn[] = []

  // Add API column
  if (Object.keys(groupedLogs.value['api']).length > 0) {
    columns.push({ type: 'api', nodes: groupedLogs.value['api'] })
  }

  // Add Source column
  if (Object.keys(groupedLogs.value['source']).length > 0) {
    columns.push({ type: 'source', nodes: groupedLogs.value['source'] })
  }

  // Add Target columns (can be multiple)
  const targetNodes = Object.keys(groupedLogs.value['target'])
  if (targetNodes.length > 0) {
    // Create separate columns for each target node with a unique ID
    targetNodes.forEach((nodeId) => {
      columns.push({
        type: 'target',
        nodeId,
        nodes: { [nodeId]: groupedLogs.value['target'][nodeId] }
      })
    })
  }

  // Add System column if it exists
  if (Object.keys(groupedLogs.value['system'] || {}).length > 0) {
    if (!groupedLogs.value['system']) {
      groupedLogs.value['system'] = {}
    }
    columns.push({ type: 'system', nodes: groupedLogs.value['system'] })
  }

  return columns
})

const totalLogs = computed(() => {
  return store.logs.length
})

function getShortNodeId(id: string): string {
  if (!id || id === 'undefined') return 'default'

  // For standard service types, use the type directly
  if (['api', 'source', 'target', 'system', 'database', 'client'].includes(id)) {
    return id
  }

  // For IDs with underscores, extract the last part
  if (id.includes('_')) {
    const parts = id.split('_')
    const lastPart = parts[parts.length - 1]
    return lastPart.slice(0, 8)
  }

  // For other IDs, just use the first 8 characters
  return id.slice(0, 8)
}

const selectedTab = ref<string>('api')

const tabs = computed(() => {
  return nodeColumns.value.map((col) => ({
    id: col.type + (col.nodeId || ''),
    label: col.type + (col.nodeId ? ` (${getShortNodeId(col.nodeId)})` : ''),
    type: col.type,
    nodeId: col.nodeId,
    count: Object.values(col.nodes).flat().length
  }))
})

const selectedColumn = computed(() =>
  nodeColumns.value.find((col) => col.type + (col.nodeId || '') === selectedTab.value)
)

const filteredLogs = computed(() => {
  const filtered: Record<string, SystemLog[]> = {}
  if (!selectedColumn.value) return filtered

  Object.entries(selectedColumn.value.nodes).forEach(([nodeId, logs]) => {
    if (selectedMessageType.value === 'all') {
      filtered[nodeId] = [...logs] // Create a copy to avoid modifying the original
    } else {
      filtered[nodeId] = logs.filter((log) => {
        const msg = log.message?.toLowerCase() || ''
        switch (selectedMessageType.value) {
          case 'error & warning':
            return log.level === 'error' || log.level === 'warn'
          case 'progress & stats':
            return msg.startsWith('[progress]') || msg.startsWith('[stat]')
          case 'info':
            return (
              log.level === 'info' && !msg.startsWith('[progress]') && !msg.startsWith('[stat]')
            )
          default:
            return true
        }
      })
    }
  })

  return filtered
})

const logsContainer = ref<HTMLElement | null>(null)

// Add watch effect to scroll to bottom when logs change
watch(
  () => store.logs.length,
  () => {
    nextTick(() => {
      if (logsContainer.value) {
        logsContainer.value.scrollTop = logsContainer.value.scrollHeight
      }
    })
  }
)

function startResize(event: MouseEvent) {
  event.preventDefault()

  // Disable text selection during resize
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'ns-resize'

  const startY = event.clientY
  let startHeight: number

  // Handle vh units
  if (store.panelHeight.endsWith('vh')) {
    const vh = parseInt(store.panelHeight)
    startHeight = (window.innerHeight * vh) / 100
  } else {
    startHeight = parseInt(store.panelHeight)
  }

  // Convert initial vh height to pixels to ensure smooth transition
  if (store.panelHeight.endsWith('vh')) {
    const pixelHeight = startHeight
    store.updatePanelHeight(`${pixelHeight}px`)
  }

  let lastUpdate = Date.now()
  const THROTTLE_MS = 16 // Approximately 60fps

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

// Set the selected tab to the first available tab when tabs change
watch(
  () => tabs.value,
  (newTabs) => {
    // If the current tab doesn't exist anymore, select the first available tab
    if (newTabs.length > 0 && !newTabs.some((tab) => tab.id === selectedTab.value)) {
      selectedTab.value = newTabs[0].id
    }
  },
  { immediate: true }
)
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

            <!-- Tab Navigation -->
            <div class="bg-white px-4 overflow-x-auto border-b border-gray-200">
              <nav class="flex space-x-4 min-w-max py-2" aria-label="Tabs">
                <button
                  v-for="tab in tabs"
                  :key="tab.id"
                  class="group relative px-4 py-2 text-sm font-medium rounded-md focus:outline-none transition-all duration-200"
                  :class="[
                    selectedTab === tab.id
                      ? 'text-gray-900 bg-gray-100 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  ]"
                  @click="selectedTab = tab.id"
                >
                  <div class="flex items-center space-x-2">
                    <span :class="[getNodeColor(tab.type), 'capitalize font-semibold']">
                      {{ tab.type }}
                    </span>
                    <template v-if="tab.nodeId">
                      <span
                        class="text-xs px-1.5 py-0.5 rounded"
                        :class="[
                          selectedTab === tab.id
                            ? 'bg-white text-gray-600'
                            : 'bg-gray-100 text-gray-600'
                        ]"
                      >
                        #{{ getShortNodeId(tab.nodeId) }}
                      </span>
                    </template>
                    <span
                      class="text-xs px-1.5 py-0.5 rounded-full"
                      :class="[
                        selectedTab === tab.id
                          ? 'bg-white text-gray-600'
                          : 'bg-gray-100 text-gray-600'
                      ]"
                    >
                      {{ tab.count }}
                    </span>
                  </div>
                  <div
                    class="absolute bottom-0 left-0 w-full h-0.5 transition-colors duration-200"
                    :class="[selectedTab === tab.id ? getNodeColor(tab.type) : 'bg-transparent']"
                  />
                </button>
              </nav>
            </div>

            <!-- Message Type Filter -->
            <div class="bg-white px-4 py-2 flex items-center space-x-3 border-b border-gray-200">
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

            <div
              v-if="selectedColumn"
              ref="logsContainer"
              class="overflow-y-auto h-full px-4 bg-white"
              :style="{ height: `calc(${panelHeight} - 132px)` }"
            >
              <table class="w-full">
                <tbody class="divide-y divide-gray-100">
                  <template v-for="(logs, nodeId) in filteredLogs" :key="nodeId">
                    <tr
                      v-for="log in logs"
                      :key="log.id"
                      class="group transition-all duration-200"
                      :class="[getMessageTypeColor(log)]"
                    >
                      <td class="w-24 py-2 px-4">
                        <span
                          class="font-mono text-xs text-gray-500 tabular-nums whitespace-nowrap"
                        >
                          {{ formatTimestamp(log.timestamp) }}
                        </span>
                      </td>
                      <td class="py-2 px-4">
                        <div class="flex items-center space-x-3">
                          <span
                            class="flex-shrink-0 transition-transform group-hover:scale-110"
                            :class="[getMessageIconColor(log)]"
                          >
                            <component :is="getMessageIcon(log)" class="h-4 w-4" />
                          </span>
                          <span class="text-sm text-gray-900 break-words font-mono leading-relaxed">
                            {{ log.message }}
                          </span>
                          <span
                            v-if="log.details?.duplicateCount"
                            class="text-xs text-gray-500 ml-2"
                          >
                            {{ formatDuplicateInfo(log) }}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
              <div class="h-6"></div>
            </div>
          </div>
        </TransitionChild>
      </div>
    </div>
  </TransitionRoot>
</template>
