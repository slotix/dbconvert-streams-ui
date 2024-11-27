<template>
  <div class="relative mt-20 mb-4">
    <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
      System Logs
      <span class="ml-2 text-sm font-normal text-gray-500">
        {{ filteredLogs.length }} entries
      </span>
    </h3>
  </div>
  <div class="mb-4">
    <div class="sm:hidden">
      <select
        id="tabs"
        name="tabs"
        class="block w-full rounded-lg border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
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
      <nav class="flex space-x-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800" aria-label="Tabs">
        <button
          v-for="(node, nodeIdx) in store.nodes"
          :key="node.id"
          :class="[
            'flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium',
            node.current
              ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200'
          ]"
          @click="changeTab(nodeIdx)"
        >
          <div class="flex flex-col items-center">
            <span class="text-base font-medium">{{ node.type }}</span>
            <span class="text-xs opacity-75">{{ node.id }}</span>
          </div>
        </button>
      </nav>
    </div>
  </div>
  <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div 
      ref="logContainer" 
      @scroll="handleScroll"
      class="max-h-[32rem] overflow-y-auto px-4 py-2 scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 dark:scrollbar-track-gray-800 dark:scrollbar-thumb-gray-600"
    >
      <div 
        v-if="filteredLogs.length === 0" 
        class="flex h-32 items-center justify-center text-gray-500 dark:text-gray-400"
      >
        <span class="flex items-center">
          <InformationCircleIcon class="mr-2 h-5 w-5" />
          No logs available for this node
        </span>
      </div>
      <div
        v-for="log in filteredLogs"
        :key="log.id"
        :class="[
          'group mb-1 flex items-center rounded-lg p-2 font-mono text-sm transition-colors',
          {
            'bg-gray-50 text-gray-900 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-100 dark:hover:bg-gray-800': 
              log.level !== 'warn' && log.level !== 'error',
            'bg-yellow-50 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-100': 
              log.level === 'warn',
            'bg-red-50 text-red-800 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-100': 
              log.level === 'error'
          }
        ]"
      >
        <div class="shrink-0">
          <component
            :is="getLogIcon(log.level)"
            :class="[
              'h-4 w-4',
              {
                'text-blue-500 dark:text-blue-400': log.level === 'info',
                'text-gray-400 dark:text-gray-500': log.level === 'debug',
                'text-red-500 dark:text-red-400': log.level === 'error',
                'text-yellow-500 dark:text-yellow-400': log.level === 'warn'
              }
            ]"
          />
        </div>
        <span class="ml-2 mr-3 text-xs tabular-nums text-gray-500 dark:text-gray-400">
          {{ formatTimestamp(log.ts) }}
        </span>
        <span class="flex-1 break-all">{{ log.msg }}</span>
      </div>
    </div>
  </div>
  <Transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="opacity-0 translate-y-1"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-1"
  >
    <button
      v-show="!isScrolledToBottom"
      @click="scrollToBottom"
      class="fixed bottom-4 right-4 rounded-full bg-gray-900 p-2 text-white shadow-lg transition-colors hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
    >
      <ArrowDownIcon class="h-5 w-5" />
    </button>
  </Transition>
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
    second: '2-digit',
    hour12: false
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

// Helper function to get the correct icon component
function getLogIcon(level: string) {
  switch (level) {
    case 'info':
      return InformationCircleIcon
    case 'debug':
      return BugAntIcon
    case 'error':
      return ExclamationCircleIcon
    case 'warn':
      return ExclamationTriangleIcon
    default:
      return InformationCircleIcon
  }
}
</script>

<style>
/* Custom scrollbar styling */
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: var(--scrollbar-track, #f1f1f1);
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, #888);
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover, #555);
}
</style>
