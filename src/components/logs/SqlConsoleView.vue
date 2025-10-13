<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { ExportFormat, SQLQueryLog, QueryGroup } from '@/stores/logs'
import { useLogsStore } from '@/stores/logs'
import LogFilters from './LogFilters.vue'
import QueryRow from './QueryRow.vue'
import QueryGroupComponent from './QueryGroup.vue'
import FlatQueryRow from './FlatQueryRow.vue'

const logsStore = useLogsStore()
const searchInputRef = ref<HTMLInputElement | null>(null)

const visibleLogs = computed(() => logsStore.visibleLogs)
const viewMode = computed(() => logsStore.viewMode)

// For flat view, we need to flatten all logs (ungrouped)
const flattenedLogs = computed(() => {
  const result: SQLQueryLog[] = []
  for (const item of visibleLogs.value) {
    if (isGroup(item)) {
      // Extract all queries from the group
      for (const queryId of item.queryIds) {
        const log = logsStore.flatLogs.get(queryId)
        if (log) result.push(log)
      }
    } else {
      result.push(item)
    }
  }
  return result
})

function isGroup(item: SQLQueryLog | QueryGroup): item is QueryGroup {
  return 'queryIds' in item
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

  // Level shortcuts: 1=minimal, 2=normal
  if (event.key === '1' && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    logsStore.filters.level = 'minimal'
  } else if (event.key === '2' && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    logsStore.filters.level = 'normal'
  }

  // 'E' for errors-only toggle
  if (event.key === 'e' && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    logsStore.filters.errorsOnly = !logsStore.filters.errorsOnly
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
      v-if="viewMode === 'grouped' && visibleLogs.length === 0"
      class="flex items-center justify-center h-full text-gray-500"
    >
      <p>No queries match current filters.</p>
    </div>
    <div
      v-else-if="viewMode === 'flat' && flattenedLogs.length === 0"
      class="flex items-center justify-center h-full text-gray-500"
    >
      <p>No queries match current filters.</p>
    </div>

    <!-- Grouped View (Original) -->
    <div v-else-if="viewMode === 'grouped'" class="overflow-auto flex-1">
      <div v-for="item in visibleLogs" :key="'groupId' in item ? item.groupId : item.id">
        <QueryGroupComponent v-if="isGroup(item)" :group="item" />
        <QueryRow v-else :log="item" />
      </div>
    </div>

    <!-- Flat View (New) -->
    <div v-else class="overflow-auto flex-1">
      <FlatQueryRow v-for="log in flattenedLogs" :key="log.id" :log="log" />
    </div>
  </div>
</template>
