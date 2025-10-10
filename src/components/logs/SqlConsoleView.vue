<script setup lang="ts">
import { ref, watch } from 'vue'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import type { SystemLog } from '@/stores/logs'

const props = defineProps<{
  logs: SystemLog[]
}>()

// Track expanded state for each log entry (by log.id)
const expandedEntries = ref<Set<string>>(new Set())

// Global expand/collapse state
const allExpanded = ref(false)

// Max length before truncation
const SQL_PREVIEW_MAX_LENGTH = 150

// Helper to extract SQL metadata from log details
function getSQLMetadata(log: SystemLog) {
  if (!log.details) return null

  return {
    query: log.details.query as string,
    queryType: log.details.queryType as string,
    database: log.details.database as string,
    table: log.details.table as string,
    schema: log.details.schema as string,
    durationMs: log.details.durationMs as number,
    rowCount: log.details.rowCount as number,
    connectionId: log.details.connectionId as string,
    error: log.details.error as string
  }
}

// Format timestamp
function formatTime(timestamp: number): string {
  const timestampInMs = timestamp < 1e12 ? timestamp * 1000 : timestamp
  const date = new Date(timestampInMs)
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Toggle individual entry
function toggleEntry(logId: number) {
  const key = String(logId)
  if (expandedEntries.value.has(key)) {
    expandedEntries.value.delete(key)
  } else {
    expandedEntries.value.add(key)
  }
}

// Check if entry is expanded
function isExpanded(logId: number): boolean {
  return expandedEntries.value.has(String(logId))
}

// Toggle all entries
function toggleAll() {
  if (allExpanded.value) {
    // Collapse all
    expandedEntries.value.clear()
    allExpanded.value = false
  } else {
    // Expand all
    props.logs.forEach((log) => {
      expandedEntries.value.add(String(log.id))
    })
    allExpanded.value = true
  }
}

// Watch for changes in logs to update allExpanded state
watch(
  () => expandedEntries.value.size,
  (size) => {
    allExpanded.value = size === props.logs.length && size > 0
  }
)

// Get displayed query (truncated or full)
function getDisplayedQuery(log: SystemLog): string {
  const query = getSQLMetadata(log)?.query || ''
  if (isExpanded(log.id) || query.length <= SQL_PREVIEW_MAX_LENGTH) {
    return query
  }
  return query.substring(0, SQL_PREVIEW_MAX_LENGTH) + '...'
}

// Check if query needs truncation
function needsTruncation(log: SystemLog): boolean {
  const query = getSQLMetadata(log)?.query || ''
  return query.length > SQL_PREVIEW_MAX_LENGTH
}
</script>

<template>
  <div class="h-full flex flex-col">
    <div v-if="logs.length === 0" class="flex items-center justify-center h-full text-gray-500">
      <p>No SQL queries yet. Execute queries to see them here.</p>
    </div>

    <div v-else class="flex flex-col h-full">
      <!-- Global Controls -->
      <div class="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <span class="text-sm text-gray-600">{{ logs.length }} queries</span>
        <button
          type="button"
          class="px-3 py-1 text-xs text-gray-700 hover:bg-gray-200 rounded transition-colors flex items-center gap-1"
          @click="toggleAll"
        >
          <component :is="allExpanded ? ChevronDownIcon : ChevronRightIcon" class="w-4 h-4" />
          {{ allExpanded ? 'Collapse All' : 'Expand All' }}
        </button>
      </div>

      <!-- SQL Entries List -->
      <div class="overflow-auto flex-1 px-4 py-2">
        <div class="space-y-1">
          <div
            v-for="log in logs"
            :key="log.id"
            class="bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <!-- Header with metadata and query -->
            <div class="flex items-start gap-2 px-3 py-2">
              <!-- Left side: metadata -->
              <div class="flex items-center space-x-2 flex-shrink-0">
                <span class="text-xs font-mono text-gray-500">
                  {{ formatTime(log.timestamp) }}
                </span>
                <span
                  class="text-xs font-semibold px-1.5 py-0.5 rounded"
                  :class="
                    getSQLMetadata(log)?.error ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                  "
                >
                  {{ getSQLMetadata(log)?.queryType || 'SQL' }}
                </span>
                <span class="text-xs text-gray-600">
                  {{ getSQLMetadata(log)?.database }}.{{ getSQLMetadata(log)?.table }}
                </span>
                <span class="text-xs text-gray-500"
                  >⏱ {{ getSQLMetadata(log)?.durationMs }}ms</span
                >
                <span class="text-xs text-gray-500"
                  >📊 {{ getSQLMetadata(log)?.rowCount }} rows</span
                >
              </div>

              <!-- Right side: Expand button (only show if needed) -->
              <div class="flex-1 min-w-0"></div>
              <button
                v-if="needsTruncation(log)"
                type="button"
                class="px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                :title="isExpanded(log.id) ? 'Collapse' : 'Expand'"
                @click="toggleEntry(log.id)"
              >
                {{ isExpanded(log.id) ? 'Collapse' : 'Expand' }}
              </button>
            </div>

            <!-- SQL Query -->
            <div class="px-3 pb-2">
              <pre
                v-highlightjs
                class="m-0 p-0 overflow-x-auto"
                :class="{
                  'whitespace-pre-wrap': isExpanded(log.id),
                  'whitespace-nowrap': !isExpanded(log.id)
                }"
              ><code class="language-sql font-mono text-xs leading-relaxed">{{ getDisplayedQuery(log) }}</code></pre>
            </div>

            <!-- Error message if present -->
            <div v-if="getSQLMetadata(log)?.error" class="px-3 pb-2">
              <div class="px-2 py-1 bg-red-50 border-l-2 border-red-500 text-xs text-red-700">
                <strong>Error:</strong> {{ getSQLMetadata(log)?.error }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
