<script setup lang="ts">
import { ref } from 'vue'
import type { SQLQueryLog } from '@/stores/logs'
import { ClipboardIcon, CheckIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  log: SQLQueryLog
}>()

const copied = ref(false)

async function copyQuery() {
  try {
    await navigator.clipboard.writeText(props.log.query)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy query:', error)
  }
}

function getPurposePillClass(purpose: string): string {
  const classes: Record<string, string> = {
    USER_DATA: 'bg-blue-600 text-white',
    USER_ACTION: 'bg-blue-700 text-white',
    METADATA: 'bg-gray-500 text-white',
    PAGINATION: 'bg-orange-600 text-white',
    ESTIMATE: 'bg-teal-600 text-white',
    EXPLAIN: 'bg-purple-600 text-white'
  }
  return classes[purpose] || 'bg-gray-600 text-white'
}

function getDurationClass(ms: number): string {
  if (ms < 100) return 'text-green-600'
  if (ms < 500) return 'text-yellow-600'
  if (ms < 1000) return 'text-orange-600'
  return 'text-red-600'
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return (
    date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) +
    '.' +
    String(date.getMilliseconds()).padStart(3, '0')
  )
}

function truncateQuery(query: string, maxLength: number): string {
  if (query.length <= maxLength) return query
  return query.substring(0, maxLength) + '...'
}
</script>

<template>
  <div
    class="border-b border-gray-200 py-2 px-3 hover:bg-gray-50 transition-colors"
    :class="{ 'bg-red-50': log.error }"
  >
    <!-- Single line summary -->
    <div class="flex items-center gap-2 text-xs">
      <span class="text-gray-500 font-mono">{{ formatTime(log.startedAt) }}</span>
      <span
        class="px-2 py-0.5 rounded text-xs font-semibold uppercase"
        :class="getPurposePillClass(log.purpose)"
      >
        {{ log.purpose.replace(/_/g, ' ') }}
      </span>
      <span class="font-medium text-gray-700">{{ log.database }}</span>
      <span class="font-semibold" :class="getDurationClass(log.durationMs)">
        {{ log.durationMs }}ms
      </span>
      <span class="text-gray-600">{{ log.rowCount }} rows</span>
      <span v-if="log.error" class="text-red-600 font-semibold">ERROR</span>

      <!-- Copy button -->
      <button
        class="ml-auto p-1 text-gray-400 hover:text-blue-600 transition-colors"
        title="Copy query"
        @click="copyQuery"
      >
        <CheckIcon v-if="copied" class="w-4 h-4 text-green-600" />
        <ClipboardIcon v-else class="w-4 h-4" />
      </button>
    </div>

    <!-- Query text (always visible, no expand needed) -->
    <div class="mt-1 font-mono text-xs bg-gray-50 p-2 rounded border border-gray-200">
      {{ truncateQuery(log.query, 500) }}
    </div>

    <!-- Metadata row -->
    <div class="mt-1 flex items-center gap-3 text-xs text-gray-500">
      <span v-if="log.triggerSource">Trigger: {{ log.triggerSource }}</span>
      <span v-if="log.schema">Schema: {{ log.schema }}</span>
      <span v-if="log.tableName">Table: {{ log.tableName }}</span>
      <span class="truncate">Connection: {{ log.connectionId }}</span>
      <span v-if="log.tabId" class="truncate">Tab: {{ log.tabId }}</span>
    </div>

    <!-- Error message if present -->
    <div v-if="log.error" class="mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs">
      <div class="font-semibold text-red-700 mb-1">Error:</div>
      <div class="text-red-600 font-mono">{{ log.error }}</div>
    </div>
  </div>
</template>
