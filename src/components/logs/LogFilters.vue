<script setup lang="ts">
import { computed } from 'vue'
import { useLogsStore } from '@/stores/logs'
import type { LoggingLevel, TimeWindow } from '@/stores/logs'

const logsStore = useLogsStore()

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
  <div class="flex items-center gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200">
    <!-- Level Selector -->
    <div class="flex items-center gap-2">
      <label class="text-xs font-semibold text-gray-600">Level:</label>
      <select v-model="level" class="text-xs border rounded px-2 py-1">
        <option value="minimal">Minimal</option>
        <option value="normal">Normal</option>
        <option value="debug">Debug</option>
      </select>
    </div>

    <!-- Time Window -->
    <div class="flex items-center gap-2">
      <label class="text-xs font-semibold text-gray-600">Time:</label>
      <select v-model="timeWindow" class="text-xs border rounded px-2 py-1">
        <option value="5m">Last 5 min</option>
        <option value="1h">Last 1 hour</option>
        <option value="session">Session</option>
        <option value="all">All</option>
      </select>
    </div>

    <!-- Search -->
    <div class="flex-1">
      <input
        v-model="searchText"
        type="text"
        placeholder="Search queries, tables, errors..."
        class="w-full text-xs border rounded px-3 py-1"
      />
    </div>

    <!-- Errors Toggle -->
    <label class="flex items-center gap-2 cursor-pointer">
      <input v-model="errorsOnly" type="checkbox" class="rounded" />
      <span class="text-xs font-semibold text-red-600">Errors Only</span>
    </label>

    <!-- Clear Button -->
    <button
      @click="clearLogs"
      class="px-3 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700"
    >
      Clear
    </button>
  </div>
</template>
