<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLogsStore } from '@/stores/logs'
import type { LoggingLevel, TimeWindow } from '@/stores/logs'
import {
  AdjustmentsHorizontalIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  QuestionMarkCircleIcon
} from '@heroicons/vue/24/outline'

const logsStore = useLogsStore()
const showShortcuts = ref(false)

const level = computed({
  get: () => logsStore.filters.level,
  set: (val: LoggingLevel) => {
    logsStore.filters.level = val
  }
})

const timeWindow = computed({
  get: () => logsStore.filters.timeWindow,
  set: (val: TimeWindow) => {
    logsStore.filters.timeWindow = val
  }
})

const searchText = computed({
  get: () => logsStore.filters.searchText,
  set: (val: string) => {
    logsStore.filters.searchText = val
  }
})

const errorsOnly = computed({
  get: () => logsStore.filters.errorsOnly,
  set: (val: boolean) => {
    logsStore.filters.errorsOnly = val
  }
})

function clearLogs() {
  logsStore.clearSQLLogs()
}
</script>

<template>
  <div
    class="flex items-center gap-4 px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 shadow-sm"
  >
    <!-- Level Selector -->
    <div class="flex items-center gap-2">
      <AdjustmentsHorizontalIcon class="w-4 h-4 text-gray-500" />
      <label class="text-xs font-semibold text-gray-700">Level:</label>
      <select
        v-model="level"
        class="text-xs border border-gray-300 rounded px-2 py-1 bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
      >
        <option value="minimal">Minimal</option>
        <option value="normal">Normal</option>
        <option value="debug">Debug</option>
      </select>
    </div>

    <!-- Time Window -->
    <div class="flex items-center gap-2">
      <ClockIcon class="w-4 h-4 text-gray-500" />
      <label class="text-xs font-semibold text-gray-700">Time:</label>
      <select
        v-model="timeWindow"
        class="text-xs border border-gray-300 rounded px-2 py-1 bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
      >
        <option value="5m">Last 5 min</option>
        <option value="1h">Last 1 hour</option>
        <option value="session">Session</option>
        <option value="all">All</option>
      </select>
    </div>

    <!-- Search -->
    <div class="flex-1 relative">
      <MagnifyingGlassIcon class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        v-model="searchText"
        type="text"
        placeholder="Search queries, tables, errors..."
        class="w-full text-xs border border-gray-300 rounded pl-9 pr-3 py-1.5 bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
      />
    </div>

    <!-- Errors Toggle -->
    <label
      class="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
    >
      <input v-model="errorsOnly" type="checkbox" class="rounded text-red-600" />
      <ExclamationTriangleIcon class="w-4 h-4 text-red-600" />
      <span class="text-xs font-semibold text-red-600">Errors Only</span>
    </label>

    <!-- Clear Button -->
    <button
      class="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-red-600 rounded hover:bg-red-700 transition-colors shadow-sm"
      @click="clearLogs"
    >
      <TrashIcon class="w-3.5 h-3.5" />
      <span>Clear</span>
    </button>

    <!-- Keyboard Shortcuts Help -->
    <div class="relative">
      <button
        class="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
        title="Keyboard shortcuts"
        @click="showShortcuts = !showShortcuts"
      >
        <QuestionMarkCircleIcon class="w-5 h-5" />
      </button>

      <!-- Shortcuts Tooltip -->
      <div
        v-if="showShortcuts"
        class="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 text-xs"
      >
        <div class="font-semibold text-gray-700 mb-2">Keyboard Shortcuts</div>
        <div class="space-y-1.5">
          <div class="flex justify-between">
            <span class="text-gray-600">Focus search</span>
            <kbd class="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded">/ </kbd>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Minimal level</span>
            <kbd class="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded">1</kbd>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Normal level</span>
            <kbd class="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded">2</kbd>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Debug level</span>
            <kbd class="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded">3</kbd>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Toggle errors only</span>
            <kbd class="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded">E</kbd>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Clear logs</span>
            <kbd class="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded">K</kbd>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
