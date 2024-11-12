<template>
  <div class="relative mt-20 pb-5">
    <h3 class="text-xl font-semibold leading-6 text-gray-900">Logs</h3>
  </div>
  <div>
    <div class="sm:hidden">
      <label for="tabs" class="sr-only">Select a node</label>
      <select
        id="tabs"
        name="tabs"
        class="block w-full rounded-md border-gray-300 focus:border-gray-500 focus:ring-gray-500"
        @change="(event: Event) => changeTab(Number((event.target as HTMLSelectElement)?.selectedIndex) || 0)"
      >
        <option
          v-for="(node, nodeIdx) in store.nodes"
          :key="node.id"
          :value="nodeIdx"
          :selected="nodeIdx === activeNode"
        >
          {{ node.type }} - {{ node.id }}
        </option>
      </select>
    </div>
    <div class="hidden sm:block">
      <nav class="isolate flex divide-x divide-gray-200 rounded-lg shadow" aria-label="Tabs">
        <a
          v-for="(node, nodeIdx) in store.nodes"
          :key="node.id"
          :class="[
            node.current ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700',
            nodeIdx === 0 ? 'rounded-l-lg' : '',
            nodeIdx === store.nodes.length - 1 ? 'rounded-r-lg' : '',
            'group relative min-w-0 flex-1 overflow-hidden bg-white py-4 px-4 text-center text-sm font-medium hover:bg-gray-100 focus:z-10'
          ]"
          :aria-current="node.current ? 'page' : undefined"
          @click="changeTab(nodeIdx)"
        >
          <div class="flex flex-col items-center">
            <span class="text-lg font-medium">{{ node.type }}</span>
            <span class="text-xs text-gray-500">{{ node.id }}</span>
          </div>
          <span
            aria-hidden="true"
            :class="[
              node.current ? 'bg-gray-500' : 'bg-transparent',
              'absolute inset-x-0 bottom-0 h-0.5'
            ]"
          />
        </a>
      </nav>
    </div>
  </div>
  <div class="divide-y divide-gray-700 overflow-hidden rounded-lg bg-gray-900 shadow">
    <div 
      ref="logContainer" 
      @scroll="handleScroll"
      class="max-h-96 overflow-y-auto px-4 py-5 sm:p-6"
    >
      <div 
        v-if="filteredLogs.length === 0" 
        class="text-center py-4 text-gray-500"
      >
        No logs available for this node
      </div>
      <div
        v-for="log in filteredLogs"
        :key="log.id"
        :class="[
          'flex',
          'flex-row',
          'items-center',
          'p-2',
          'font-mono',
          'border-b border-gray-700',
          { 'bg-gray-900 text-gray-200': log.level !== 'warn' && log.level !== 'error' },
          { 'bg-yellow-900 text-yellow-100': log.level === 'warn' },
          { 'bg-red-900 text-red-100': log.level === 'error' }
        ]"
      >
        <div v-if="log.level === 'info'">
          <InformationCircleIcon
            class="mr-3 h-5 w-5 text-green-600 group-hover:text-green-700"
            aria-hidden="true"
          />
        </div>
        <div v-else-if="log.level === 'debug'">
          <BugAntIcon
            class="mr-3 h-5 w-5 text-gray-600 group-hover:text-gray-700"
            aria-hidden="true"
          />
        </div>
        <div v-else-if="log.level === 'error'">
          <ExclamationCircleIcon
            class="mr-3 h-5 w-5 text-red-600 group-hover:text-red-700"
            aria-hidden="true"
          />
        </div>
        <div v-else-if="log.level === 'warn'">
          <ExclamationTriangleIcon
            class="mr-3 h-5 w-5 text-yellow-600 group-hover:text-yellow-700"
            aria-hidden="true"
          />
        </div>
        <span class="text-gray-400 tabular-nums text-sm ml-0 mr-2">
          [{{ formatTimestamp(log.ts) }}]
        </span>
        <span class="basis-5/6">
          {{ log.msg }}
        </span>
      </div>
    </div>
  </div>
  <button
    v-show="!isScrolledToBottom"
    @click="scrollToBottom"
    class="fixed bottom-4 right-4 rounded-full bg-gray-700 p-2 text-white shadow-lg hover:bg-gray-600"
  >
    <ArrowDownIcon class="h-5 w-5" />
  </button>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useThrottleFn } from '@vueuse/core'
import { useMonitoringStore } from '@/stores/monitoring'
import {
  BugAntIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownIcon
} from '@heroicons/vue/20/solid'

// Get store and its types
const store = useMonitoringStore()
const logContainer = ref<HTMLDivElement | null>(null)
const activeNode = ref<number>(0)

// Remove side effects from computed
const filteredLogs = computed(() => {
  const activeNodeID = store.nodes[activeNode.value]?.id
  if (!activeNodeID) return []
  return store.logs.filter((log) => log.nodeID === activeNodeID)
})

// Properly type the change handler
const changeTab = (index: number) => {
  store.nodes.forEach((node, idx) => {
    node.current = idx === index
  })
  activeNode.value = index
  
  nextTick(() => {
    if (logContainer.value && autoScroll.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}

const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Scroll control
const autoScroll = ref(true)
const isScrolledToBottom = ref(true)

const handleScroll = useThrottleFn(() => {
  const container = logContainer.value
  if (!container) return
  
  const { scrollTop, scrollHeight, clientHeight } = container
  isScrolledToBottom.value = Math.abs(scrollHeight - clientHeight - scrollTop) < 10
  autoScroll.value = isScrolledToBottom.value
}, 100)

const scrollToBottom = () => {
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
    autoScroll.value = true
  }
}

// Lifecycle hooks
onMounted(() => {
  if (logContainer.value) {
    logContainer.value.addEventListener('scroll', handleScroll)
  }
})

onUnmounted(() => {
  if (logContainer.value) {
    logContainer.value.removeEventListener('scroll', handleScroll)
  }
})

// Watch for log changes
watch(
  () => filteredLogs.value.length,
  async () => {
    if (!autoScroll.value) return
    await nextTick()
    scrollToBottom()
  }
)
</script>
