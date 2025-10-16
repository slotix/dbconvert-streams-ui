<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SQLQueryLog } from '@/stores/logs'
import { ClipboardIcon, CheckIcon } from '@heroicons/vue/24/outline'
import {
  getPurposePillClass,
  getDurationClass,
  formatTime,
  getPurposeLabel
} from '@/utils/sqlLogHelpers'

const props = defineProps<{
  log: SQLQueryLog
}>()

const copied = ref(false)
const purposeLabel = computed(() => getPurposeLabel(props.log.purpose))
const locationLabel = computed(() => {
  const parts = [props.log.database, props.log.schema, props.log.tableName].filter(
    (part) => !!part && part !== ''
  )
  return parts.join('.')
})
const formattedRowCount = computed(() => props.log.rowCount.toLocaleString())
const fullQuery = computed(() => props.log.query.trim())
const oneLineQuery = computed(() => {
  const flattened = fullQuery.value.replace(/\s+/g, ' ').trim()
  const maxLength = 260
  const suffixLength = 120
  if (flattened.length <= maxLength + suffixLength) return flattened

  const leading = flattened.slice(0, maxLength).trimEnd()
  const trailing = flattened.slice(-suffixLength).trimStart()
  return `${leading} … ${trailing}`
})
const showFullQuery = ref(false)

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

function toggleFullQuery() {
  showFullQuery.value = !showFullQuery.value
}

function closeFullQuery() {
  showFullQuery.value = false
}
</script>

<template>
  <div class="flat-row" :class="{ 'flat-row--error': log.error }" @click="closeFullQuery">
    <!-- Summary row -->
    <div class="flat-row-header">
      <span class="flat-meta flat-meta--time">{{ formatTime(log.startedAt) }}</span>
      <span class="flat-meta flat-meta--purpose">
        <span
          class="px-2 py-0.5 rounded font-semibold uppercase tracking-wide"
          :class="getPurposePillClass(log.purpose)"
        >
          {{ purposeLabel }}
        </span>
      </span>
      <span class="flat-meta flat-meta--location" :title="locationLabel">
        {{ locationLabel }}
      </span>
      <span class="flat-meta flat-meta--duration" :class="getDurationClass(log.durationMs)">
        {{ log.durationMs }}ms
      </span>
      <span class="flat-meta flat-meta--rows"> {{ formattedRowCount }} rows </span>
      <span v-if="log.error" class="flat-meta flat-meta--status text-red-600 font-semibold">
        ERROR
      </span>

      <!-- Copy button -->
      <button class="flat-copy-button" title="Copy query" @click.stop="copyQuery">
        <CheckIcon v-if="copied" class="w-4 h-4 text-green-600" />
        <ClipboardIcon v-else class="w-4 h-4" />
      </button>
    </div>

    <!-- Query text -->
    <div class="query-snippet" :title="fullQuery" @click.stop="toggleFullQuery">
      <pre
        v-highlightjs
        class="query-snippet__pre"
      ><code class="language-sql">{{ oneLineQuery }}</code></pre>
    </div>

    <!-- Metadata row -->
    <div class="flat-metadata">
      <span v-if="log.schema"><strong>Schema:</strong> {{ log.schema }}</span>
      <span v-if="log.tableName"><strong>Table:</strong> {{ log.tableName }}</span>
      <span><strong>Connection:</strong> {{ log.connectionId }}</span>
      <span v-if="log.tabId"><strong>Tab:</strong> {{ log.tabId }}</span>
    </div>

    <!-- Error message if present -->
    <div v-if="log.error" class="flat-error">
      <div class="font-semibold text-red-700 mb-1">Error:</div>
      <div class="text-red-600 font-mono">{{ log.error }}</div>
    </div>

    <div v-if="showFullQuery" class="query-popover" @click.stop>
      <div class="query-popover__header">
        <span class="query-popover__title">Full Query</span>
        <button class="query-popover__close" @click="closeFullQuery">Close</button>
      </div>
      <pre
        v-highlightjs
        class="query-popover__body"
      ><code class="language-sql">{{ fullQuery }}</code></pre>
    </div>
  </div>
</template>

<style scoped>
.flat-row {
  @apply relative border-b border-gray-200 py-3 px-3 hover:bg-gray-50 transition-colors;
}

.flat-row--error {
  @apply bg-red-50;
}

.flat-row-header {
  display: grid;
  grid-template-columns: 110px 140px minmax(220px, 2fr) 90px 110px minmax(80px, auto) auto;
  align-items: center;
  gap: 0.75rem;
}

@media (max-width: 1024px) {
  .flat-row-header {
    grid-template-columns: 100px 120px minmax(160px, 1fr) 80px 80px auto;
  }

  .flat-meta--status {
    display: none;
  }
}

.flat-meta {
  @apply text-xs text-gray-600;
}

.flat-meta--time {
  @apply font-mono text-gray-500;
}

.flat-meta--purpose {
  width: 140px;
  flex-shrink: 0;
}

.flat-meta--location {
  @apply text-gray-700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flat-meta--duration {
  @apply font-semibold text-right;
}

.flat-meta--rows {
  @apply text-gray-500 text-right;
}

.flat-meta--status {
  text-align: right;
}

.flat-copy-button {
  @apply ml-auto p-1 text-gray-400 hover:text-blue-600 transition-colors rounded;
}

.query-snippet {
  @apply mt-2 border border-gray-200 rounded bg-white overflow-hidden cursor-pointer;
}

.query-snippet__pre {
  @apply text-xs p-2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.query-popover {
  @apply absolute z-10 mt-2 w-full lg:w-[48rem] rounded border border-gray-300 bg-white shadow-xl;
  left: 0;
  top: 100%;
}

.query-popover__header {
  @apply flex items-center justify-between bg-gray-100 border-b border-gray-300 px-3 py-2 text-xs;
}

.query-popover__title {
  @apply font-semibold text-gray-700;
}

.query-popover__close {
  @apply text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors;
}

.query-popover__body {
  @apply max-h-72 overflow-auto text-xs p-3;
}

.query-popover__body :deep(.hljs) {
  white-space: pre;
  overflow: auto;
  text-overflow: unset;
}

.flat-metadata {
  @apply mt-2 grid gap-2 text-xs text-gray-500;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.flat-metadata strong {
  @apply text-gray-600 font-semibold;
}

.flat-error {
  @apply mt-3 p-3 bg-red-100 border border-red-300 rounded text-xs;
}

:deep(.hljs) {
  @apply bg-white font-mono;
  color: #24292e;
  padding: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
