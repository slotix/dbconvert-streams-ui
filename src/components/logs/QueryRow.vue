<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLogsStore, type SQLQueryLog } from '@/stores/logs'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'
import { getPurposePillClass, getDurationClass, formatTime } from '@/utils/sqlLogHelpers'

const props = defineProps<{
  log: SQLQueryLog
}>()

const logsStore = useLogsStore()
const copied = ref(false)

const isExpanded = computed(() => logsStore.expandedQueries.has(props.log.id))

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

function getPurposeLabel(purpose: string): string {
  return purpose.replace(/_/g, ' ')
}
</script>

<template>
  <div
    class="border-b border-gray-200 hover:bg-gray-50 transition-colors"
    :class="{ 'bg-red-50': log.error }"
  >
    <!-- Header Row -->
    <div class="flex items-center gap-3 px-4 py-2 cursor-pointer" @click="toggle">
      <!-- Expand Icon -->
      <component
        :is="isExpanded ? ChevronDownIcon : ChevronRightIcon"
        class="w-4 h-4 text-gray-500 flex-shrink-0"
      />

      <!-- Timestamp -->
      <span class="text-xs font-mono text-gray-500 flex-shrink-0">
        {{ formatTime(log.startedAt) }}
      </span>

      <!-- Purpose Pill -->
      <span
        class="text-xs font-semibold px-2 py-0.5 rounded flex-shrink-0"
        :class="getPurposePillClass(log.purpose)"
      >
        {{ getPurposeLabel(log.purpose) }}
      </span>

      <!-- Database.Table -->
      <span class="text-xs text-gray-700 truncate flex-shrink-0">
        {{ log.database }}{{ log.schema ? '.' + log.schema : ''
        }}{{ log.tableName ? '.' + log.tableName : '' }}
      </span>

      <!-- Duration -->
      <span class="text-xs font-semibold flex-shrink-0" :class="getDurationClass(log.durationMs)">
        ⏱ {{ log.durationMs }}ms
      </span>

      <!-- Row Count -->
      <span class="text-xs text-gray-500 flex-shrink-0">
        📊 {{ log.rowCount.toLocaleString() }} rows
      </span>

      <!-- Query Preview -->
      <span class="text-xs text-gray-600 truncate flex-1 font-mono">
        {{ log.query.substring(0, 80) }}{{ log.query.length > 80 ? '...' : '' }}
      </span>

      <!-- Copy Button -->
      <button
        title="Copy query"
        class="p-1 hover:bg-gray-200 rounded transition-colors"
        @click.stop="copyQuery"
      >
        <CheckIcon v-if="copied" class="w-4 h-4 text-green-600" />
        <ClipboardIcon v-else class="w-4 h-4 text-gray-500" />
      </button>
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
        <div><span class="font-semibold">Type:</span> {{ log.queryType }}</div>
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
