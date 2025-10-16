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
const shouldShowRowCount = computed(() => {
  // Only show row count for query types where it's meaningful
  const relevantPurposes = ['DATA_QUERY', 'COUNT_QUERY', 'DML_OPERATION']
  return relevantPurposes.includes(props.log.purpose)
})
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
  <div
    class="relative border-b border-gray-200 py-2 pl-2 pr-[50px] hover:bg-gray-50 transition-colors"
    :class="{ 'bg-red-50': log.error }"
    @click="closeFullQuery"
  >
    <!-- Copy button - positioned absolutely on the right -->
    <button
      class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600 transition-colors rounded z-10"
      title="Copy query"
      @click.stop="copyQuery"
    >
      <CheckIcon v-if="copied" class="w-4 h-4 text-green-600" />
      <ClipboardIcon v-else class="w-4 h-4" />
    </button>

    <!-- Single row with all metadata and query -->
    <div
      class="grid items-center gap-3"
      style="
        grid-template-columns:
          max-content max-content minmax(140px, max-content)
          4rem 5.5rem max-content 1fr;
      "
    >
      <span class="text-[0.65rem] font-mono text-gray-500 whitespace-nowrap">
        {{ formatTime(log.startedAt) }}
      </span>

      <span>
        <span
          class="px-2 py-0.5 rounded font-semibold uppercase tracking-wide text-[0.65rem] whitespace-nowrap inline-block"
          :class="getPurposePillClass(log.purpose)"
        >
          {{ purposeLabel }}
        </span>
      </span>

      <span
        class="text-[0.7rem] text-gray-700 overflow-hidden text-ellipsis whitespace-nowrap min-w-0"
        :title="locationLabel"
      >
        {{ locationLabel }}
      </span>

      <span
        class="text-[0.65rem] font-semibold text-right whitespace-nowrap"
        :class="getDurationClass(log.durationMs)"
      >
        {{ log.durationMs }}ms
      </span>

      <span
        class="text-[0.65rem] text-gray-500 text-right whitespace-nowrap"
        :class="{ 'w-0 min-w-0 overflow-hidden p-0 m-0': !shouldShowRowCount }"
      >
        <template v-if="shouldShowRowCount">{{ formattedRowCount }} rows</template>
      </span>

      <span
        class="text-right text-[0.7rem] whitespace-nowrap min-w-[3rem]"
        :class="{ 'opacity-0': !log.error, 'text-red-600 font-semibold': log.error }"
      >
        <template v-if="log.error">ERROR</template>
      </span>

      <!-- Query text inline -->
      <span
        class="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap min-w-0"
        :title="fullQuery"
        @click.stop="toggleFullQuery"
      >
        <code
          v-highlightjs
          class="language-sql text-xs font-mono bg-gray-50 hover:bg-blue-50 px-2 py-1 rounded whitespace-nowrap overflow-hidden text-ellipsis block"
          >{{ oneLineQuery }}</code
        >
      </span>
    </div>

    <!-- Metadata row -->
    <div v-if="log.tabId" class="flat-metadata mt-2 grid gap-2 text-xs text-gray-500">
      <span><strong class="text-gray-600 font-semibold">Tab:</strong> {{ log.tabId }}</span>
    </div>

    <!-- Error message if present -->
    <div v-if="log.error" class="mt-3 p-3 bg-red-100 border border-red-300 rounded text-xs">
      <div class="font-semibold text-red-700 mb-1">Error:</div>
      <div class="text-red-600 font-mono">{{ log.error }}</div>
    </div>

    <div v-if="showFullQuery" class="query-popover" @click.stop>
      <div
        class="flex items-center justify-between bg-gray-100 border-b border-gray-300 px-3 py-2 text-xs"
      >
        <span class="font-semibold text-gray-700">Full Query</span>
        <button
          class="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          @click="closeFullQuery"
        >
          Close
        </button>
      </div>
      <pre
        v-highlightjs
        class="max-h-72 overflow-auto text-xs p-3"
      ><code class="language-sql">{{ fullQuery }}</code></pre>
    </div>
  </div>
</template>

<style scoped>
.query-popover {
  left: 0;
  top: 100%;
}

:deep(.hljs) {
  @apply bg-white font-mono whitespace-nowrap overflow-hidden text-ellipsis p-0 text-[#24292e];
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

.query-popover__body :deep(.hljs) {
  @apply whitespace-pre overflow-auto;
  text-overflow: unset;
}
</style>
