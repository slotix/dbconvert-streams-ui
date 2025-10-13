<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useLogsStore } from '@/stores/logs'
import type { ExportFormat, LoggingLevel, TimeWindow } from '@/stores/logs'
import {
  AdjustmentsHorizontalIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  QuestionMarkCircleIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ArrowDownTrayIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/vue/24/outline'

const logsStore = useLogsStore()
const showShortcuts = ref(false)
const showExportMenu = ref(false)
const exportMenuRef = ref<HTMLDivElement | null>(null)
const emit = defineEmits<{
  (e: 'export', format: ExportFormat): void
}>()

const viewMode = computed({
  get: () => logsStore.viewMode,
  set: (val: 'grouped' | 'flat') => {
    logsStore.setViewMode(val)
  }
})

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

const sortOrder = computed(() => logsStore.sortOrder)

function clearLogs() {
  logsStore.clearSQLLogs()
}

function toggleSortOrder() {
  logsStore.toggleSortOrder()
}

function toggleExportMenu() {
  showExportMenu.value = !showExportMenu.value
}

function selectExportFormat(format: ExportFormat) {
  emit('export', format)
  showExportMenu.value = false
}

function handleDocumentClick(event: MouseEvent) {
  if (!showExportMenu.value) return
  const target = event.target as Node | null
  if (exportMenuRef.value && target && !exportMenuRef.value.contains(target)) {
    showExportMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div
    class="flex items-center gap-4 px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 shadow-sm"
  >
    <!-- View Mode Switcher -->
    <div class="flex items-center gap-1 bg-white border border-gray-300 rounded p-0.5">
      <button
        :class="[
          'flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors',
          viewMode === 'grouped'
            ? 'bg-blue-500 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100'
        ]"
        title="Grouped view - Related queries grouped together"
        @click="viewMode = 'grouped'"
      >
        <Squares2X2Icon class="w-4 h-4" />
        <span>Grouped</span>
      </button>
      <button
        :class="[
          'flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors',
          viewMode === 'flat'
            ? 'bg-blue-500 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100'
        ]"
        title="Flat view - All queries in chronological order"
        @click="viewMode = 'flat'"
      >
        <ListBulletIcon class="w-4 h-4" />
        <span>Flat</span>
      </button>
    </div>

    <!-- Sort Order Toggle -->
    <button
      class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
      :title="`Sort: ${sortOrder === 'newest' ? 'Newest on top' : 'Oldest on top'} (click to toggle)`"
      @click="toggleSortOrder"
    >
      <component
        :is="sortOrder === 'newest' ? ArrowDownIcon : ArrowUpIcon"
        class="w-3.5 h-3.5 text-gray-600"
      />
      <span class="text-gray-700 font-medium">{{
        sortOrder === 'newest' ? 'Newest' : 'Oldest'
      }}</span>
    </button>

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

    <!-- Export Button -->
    <div ref="exportMenuRef" class="relative">
      <button
        class="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors shadow-sm"
        @click.stop="toggleExportMenu"
      >
        <ArrowDownTrayIcon class="w-3.5 h-3.5" />
        <span>Export</span>
      </button>

      <div
        v-if="showExportMenu"
        class="absolute right-0 mt-2 w-36 bg-white border border-gray-200 rounded shadow-lg z-50"
      >
        <button
          class="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors"
          @click="selectExportFormat('text')"
        >
          Export as Text
        </button>
        <button
          class="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors"
          @click="selectExportFormat('csv')"
        >
          Export as CSV
        </button>
        <button
          class="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors"
          @click="selectExportFormat('json')"
        >
          Export as JSON
        </button>
      </div>
    </div>

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
            <span class="text-gray-600">Toggle errors only</span>
            <kbd class="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded">E</kbd>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Toggle sort order</span>
            <kbd class="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded">S</kbd>
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
