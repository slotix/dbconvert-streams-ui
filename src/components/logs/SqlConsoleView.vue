<script setup lang="ts">
import { DatabaseZap, Info } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { ExportFormat } from '@/stores/logs'
import { useLogsStore } from '@/stores/logs'
import LogFilters from './LogFilters.vue'
import FlatQueryRow from './FlatQueryRow.vue'

const logsStore = useLogsStore()
const searchInputRef = ref<HTMLInputElement | null>(null)

const logsWithHeaders = computed(() => logsStore.logsWithHeaders)
const isCaptureOff = computed(() => logsStore.runtimeLoggingSettings.sqlCaptureMode === 'off')

async function enableMinimalCapture() {
  try {
    await logsStore.updateRuntimeLoggingSettings({ sqlCaptureMode: 'minimal' })
  } catch {
    // Error exposed via logsStore.runtimeLoggingError
  }
}

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

    <!-- Empty State: Capture Off -->
    <div
      v-if="isCaptureOff"
      class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400"
    >
      <div class="text-center max-w-sm">
        <DatabaseZap class="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
        <p class="font-medium text-gray-700 dark:text-gray-200 mb-2">SQL capture is off</p>
        <p class="text-sm mb-4">
          Enable capture to start recording SQL queries executed during stream operations.
        </p>
        <button
          class="ui-surface-raised ui-border-default ui-accent-action inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors dark:text-gray-200 disabled:opacity-50"
          :disabled="logsStore.runtimeLoggingSaving"
          @click="enableMinimalCapture"
        >
          Enable Minimal Capture
        </button>
      </div>
    </div>

    <!-- Empty State: No Queries -->
    <div
      v-else-if="logsWithHeaders.length === 0"
      class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400"
    >
      <div class="text-center">
        <Info class="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
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
