<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { ExportFormat } from '@/stores/logs'
import { useLogsStore } from '@/stores/logs'
import LogFilters from './LogFilters.vue'
import FlatQueryRow from './FlatQueryRow.vue'

const logsStore = useLogsStore()
const searchInputRef = ref<HTMLInputElement | null>(null)

const logsWithHeaders = computed(() => logsStore.logsWithHeaders)

function handleExport(format: ExportFormat) {
  logsStore.exportLogs(format)
}

// Keyboard shortcuts
function handleKeyDown(event: KeyboardEvent) {
  // Ignore if user is typing in an input field (except search)
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' && target.id !== 'sql-log-search') {
    return
  }

  // Focus search on '/'
  if (event.key === '/' && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    searchInputRef.value?.focus()
    return
  }

  // 'E' for errors-only toggle
  if (event.key === 'e' && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    logsStore.setErrorsOnly(!logsStore.filters.errorsOnly)
  }

  // 'K' for clear logs
  if (event.key === 'k' && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    logsStore.clearSQLLogs()
  }

  // 'S' for sort order toggle
  if (event.key === 's' && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    logsStore.toggleSortOrder()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Filter Header -->
    <LogFilters @export="handleExport" />

    <!-- Empty State -->
    <div
      v-if="logsWithHeaders.length === 0"
      class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400"
    >
      <div class="text-center">
        <svg
          class="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p class="font-medium">No queries to display</p>
      </div>
    </div>

    <!-- Flat View with Optional Visual Grouping -->
    <div v-else class="overflow-auto flex-1 scroll-smooth">
      <FlatQueryRow
        v-for="item in logsWithHeaders"
        :key="item.log.id"
        :log="item.log"
        :show-location-header="item.showHeader"
        :location="item.location"
        :queries-in-group="item.queriesInGroup"
      />
    </div>
  </div>
</template>
