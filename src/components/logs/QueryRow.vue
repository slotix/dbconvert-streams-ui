<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLogsStore, type SQLQueryLog } from '@/stores/logs'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'
import {
  getPurposePillClass,
  getDurationClass,
  formatTime,
  getPurposeLabel
} from '@/utils/sqlLogHelpers'

const props = defineProps<{
  log: SQLQueryLog
}>()

const logsStore = useLogsStore()
const copied = ref(false)

const isExpanded = computed(() => logsStore.expandedQueries.has(props.log.id))
const locationLabel = computed(() => {
  const parts = [props.log.database, props.log.schema, props.log.tableName].filter(
    (part) => !!part && part !== ''
  )
  return parts.join('.')
})
const oneLinePreview = computed(() => {
  const normalized = props.log.query.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 160) return normalized
  return `${normalized.slice(0, 157).trimEnd()} ...`
})

function toggle() {
  logsStore.toggleQuery(props.log.id)
}

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

</script>

<template>
  <div
    class="border-b border-gray-200 hover:bg-gray-50 transition-colors"
    :class="{ 'bg-red-50': log.error }"
  >
    <!-- Header Row -->
    <div class="query-row-header hover:bg-gray-50" @click="toggle">
      <!-- Expand Icon -->
      <component :is="isExpanded ? ChevronDownIcon : ChevronRightIcon" class="query-expander" />

      <!-- Timestamp -->
      <span class="query-meta query-meta--time">
        {{ formatTime(log.startedAt) }}
      </span>

      <!-- Purpose Pill -->
      <span class="query-meta query-meta--purpose">
        <span
          class="px-2 py-0.5 rounded font-semibold uppercase tracking-wide"
          :class="getPurposePillClass(log.purpose)"
        >
          {{ getPurposeLabel(log.purpose) }}
        </span>
      </span>

      <!-- Database.Table -->
      <span class="query-meta query-meta--location" :title="locationLabel">
        {{ locationLabel }}
      </span>

      <!-- Duration -->
      <span class="query-meta query-meta--duration" :class="getDurationClass(log.durationMs)">
        {{ log.durationMs }}ms
      </span>

      <!-- Row Count -->
      <span class="query-meta query-meta--rows"> {{ log.rowCount.toLocaleString() }} rows </span>

      <!-- Copy Button -->
      <button title="Copy query" class="query-copy-button" @click.stop="copyQuery">
        <CheckIcon v-if="copied" class="w-4 h-4 text-green-600" />
        <ClipboardIcon v-else class="w-4 h-4 text-gray-500" />
      </button>
    </div>

    <!-- Collapsed Preview -->
    <div v-if="!isExpanded" class="query-preview">
      <span class="query-preview__text">{{ oneLinePreview }}</span>
    </div>

    <!-- Expanded Details -->
    <div v-if="isExpanded" class="px-12 py-3 bg-gray-50 border-t border-gray-200">
      <!-- Full Query -->
      <div class="mb-3">
        <div class="text-xs font-semibold text-gray-700 mb-1">Query:</div>
        <div class="bg-white rounded border border-gray-200 overflow-hidden">
          <pre
            v-highlightjs
            class="text-xs p-3 overflow-x-auto"
          ><code class="language-sql">{{ log.query }}</code></pre>
        </div>
        <div v-if="log.redacted" class="text-xs text-orange-600 mt-1">
          ⚠️ Query contains redacted sensitive values
        </div>
      </div>

      <!-- Error -->
      <div v-if="log.error" class="mb-3">
        <div class="text-xs font-semibold text-red-700 mb-1">Error:</div>
        <div class="text-xs bg-red-100 text-red-800 p-3 rounded border border-red-300">
          {{ log.error }}
        </div>
      </div>

      <!-- Metadata -->
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div><span class="font-semibold">Connection:</span> {{ log.connectionId }}</div>
        <div v-if="log.tabId"><span class="font-semibold">Tab:</span> {{ log.tabId }}</div>
        <div v-if="log.triggerSource">
          <span class="font-semibold">Trigger:</span> {{ log.triggerSource }}
        </div>
        <div v-if="log.repeatCount">
          <span class="font-semibold">Repeated:</span> {{ log.repeatCount }}×
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Smooth transitions */
.transition-colors {
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.query-row-header {
  @apply flex items-center gap-3 px-4 py-2 cursor-pointer;
}

.query-expander {
  @apply w-4 h-4 text-gray-500 flex-shrink-0;
}

.query-meta {
  @apply text-xs text-gray-600;
}

.query-meta--time {
  @apply font-mono text-gray-500;
  width: 90px;
  flex-shrink: 0;
}

.query-meta--purpose {
  width: 130px;
  flex-shrink: 0;
}

.query-meta--location {
  @apply text-gray-700;
  flex: 1 1 220px;
  min-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.query-meta--duration {
  @apply font-semibold text-right;
  width: 90px;
  flex-shrink: 0;
}

.query-meta--rows {
  @apply text-gray-500 text-right;
  width: 110px;
  flex-shrink: 0;
}

.query-copy-button {
  @apply ml-auto p-1 rounded transition-colors;
}

.query-copy-button:hover {
  @apply bg-gray-200;
}

.query-preview {
  @apply px-12 pb-3;
}

.query-preview__text {
  @apply text-xs font-mono text-gray-600 bg-gray-100 border border-gray-200 rounded px-3 py-1 block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1024px) {
  .query-meta--rows {
    display: none;
  }

  .query-meta--location {
    min-width: 140px;
  }
}

/* SQL syntax highlighting - matching DDL view colors */
:deep(.hljs) {
  @apply bg-white font-mono;
  color: #24292e;
  padding: 0;
}

:deep(.hljs-keyword) {
  @apply text-[#d73a49] font-semibold;
}

:deep(.hljs-string) {
  @apply text-[#032f62];
}

:deep(.hljs-number) {
  @apply text-[#005cc5];
}

:deep(.hljs-operator) {
  @apply text-[#d73a49];
}

:deep(.hljs-punctuation) {
  @apply text-[#24292e];
}

:deep(.hljs-comment) {
  @apply text-[#6a737d] italic;
}

:deep(.hljs-function) {
  @apply text-[#005cc5];
}

:deep(.hljs-built_in) {
  @apply text-[#005cc5];
}
</style>
