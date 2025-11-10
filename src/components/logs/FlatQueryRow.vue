<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SQLQueryLog } from '@/stores/logs'
import { useLogsStore } from '@/stores/logs'
import {
  ClipboardIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/vue/24/outline'
import {
  getPurposePillClass,
  getDurationClass,
  formatTime,
  getPurposeLabel
} from '@/utils/sqlLogHelpers'
import { useConnectionsStore } from '@/stores/connections'
import SqlCodeBlock from '@/components/database/SqlCodeBlock.vue'
import ExpandableSection from './ExpandableSection.vue'

const props = defineProps<{
  log: SQLQueryLog
  showLocationHeader?: boolean
  location?: string
  queriesInGroup?: number
}>()

const logsStore = useLogsStore()

const connectionsStore = useConnectionsStore()
const copied = ref(false)
const isExpanded = ref(false)

const isLocationCollapsed = computed(() => {
  return props.location ? logsStore.collapsedLocations.has(props.location) : false
})

function toggleLocation() {
  if (props.location) {
    logsStore.toggleLocation(props.location)
  }
}

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

// Get dialect from connection type
const dialect = computed(() => {
  const connection = connectionsStore.connectionByID(props.log.connectionId)
  return connection?.type?.toLowerCase() || 'sql'
})

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

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div>
    <!-- Location Header (when visual grouping is enabled) -->
    <div
      v-if="showLocationHeader && location"
      class="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors sticky top-0 z-10"
      @click="toggleLocation"
    >
      <!-- Expand/Collapse Icon -->
      <component
        :is="isLocationCollapsed ? ChevronRightIcon : ChevronDownIcon"
        class="w-4 h-4 text-gray-700 dark:text-gray-300 flex-shrink-0"
      />

      <!-- Location Label -->
      <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {{ location }}
      </span>

      <!-- Query Count Badge -->
      <span
        v-if="queriesInGroup && queriesInGroup > 1"
        class="text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-2 py-0.5 rounded"
      >
        {{ queriesInGroup }}
      </span>
    </div>

    <!-- Query Row (hidden if location is collapsed) -->
    <div
      v-if="!isLocationCollapsed"
      class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      :class="{ 'bg-red-50 dark:bg-red-900/20': log.error }"
    >
      <!-- Header row with all metadata -->
      <div class="flat-row-header" @click="toggleExpanded">
        <span class="text-[0.65rem] font-mono text-gray-500 dark:text-gray-400">{{
          formatTime(log.startedAt)
        }}</span>
        <span class="flex-shrink-0">
          <span
            class="px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide text-[0.65rem]"
            :class="getPurposePillClass(log.purpose)"
          >
            {{ purposeLabel }}
          </span>
        </span>
        <span
          class="text-[0.7rem] text-gray-700 dark:text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap"
          :title="locationLabel"
        >
          {{ locationLabel }}
        </span>
        <span
          class="text-[0.65rem] font-semibold text-right"
          :class="getDurationClass(log.durationMs)"
        >
          {{ log.durationMs }}ms
        </span>
        <span
          class="text-[0.65rem] text-gray-500 dark:text-gray-400 text-right"
          :class="{ 'flat-meta--rows-empty': !shouldShowRowCount }"
        >
          <template v-if="shouldShowRowCount">{{ formattedRowCount }} rows</template>
        </span>
        <span
          class="text-right text-[0.7rem]"
          :class="{
            'flat-meta--status-empty': !log.error,
            'text-red-600 dark:text-red-400 font-semibold': log.error
          }"
        >
          <template v-if="log.error">ERROR</template>
        </span>

        <!-- Query text inline - clickable -->
        <span
          class="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap"
          :title="fullQuery"
        >
          <code
            v-highlightjs
            class="language-sql text-xs font-mono bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2 py-1 rounded whitespace-nowrap overflow-hidden text-ellipsis block"
            >{{ oneLineQuery }}</code
          >
        </span>

        <!-- Copy button -->
        <button
          class="ml-2 p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded"
          title="Copy query"
          @click.stop="copyQuery"
        >
          <CheckIcon v-if="copied" class="w-4 h-4 text-green-600 dark:text-green-400" />
          <ClipboardIcon v-else class="w-4 h-4" />
        </button>
      </div>

      <!-- Expanded Details (using reusable ExpandableSection component) -->
      <ExpandableSection
        v-if="isExpanded"
        title="Query Details"
        :is-open="isExpanded"
        :has-error="!!log.error"
        class="ml-12"
      >
        <!-- Full Query using SqlCodeBlock -->
        <div class="mb-3">
          <SqlCodeBlock :code="fullQuery" title="Query" :dialect="dialect" />
          <div v-if="log.redacted" class="text-xs text-orange-600 dark:text-orange-400 mt-1">
            ⚠️ Query contains redacted sensitive values
          </div>
        </div>

        <!-- Error -->
        <div v-if="log.error" class="mb-3">
          <div class="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Error:</div>
          <div
            class="text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-3 rounded border border-red-300 dark:border-red-800"
          >
            {{ log.error }}
          </div>
        </div>

        <!-- Metadata -->
        <div v-if="log.tabId" class="grid grid-cols-2 gap-2 text-xs">
          <div class="dark:text-gray-300">
            <span class="font-semibold">Tab:</span> {{ log.tabId }}
          </div>
        </div>
      </ExpandableSection>
    </div>
  </div>
</template>

<style scoped>
@reference '../../assets/style.css';

/* Component-specific styles only - code highlighting styles are centralized in src/styles/codeHighlighting.css */

/* Smooth transitions */
.transition-colors {
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.flat-row-header {
  --col-time: minmax(4.5rem, auto);
  --col-purpose: minmax(5rem, auto);
  --col-location: minmax(6rem, 0.25fr);
  --col-duration: minmax(3rem, auto);
  --col-rows: minmax(4rem, auto);
  --col-status: minmax(3rem, auto);
  --col-query: minmax(0, 2fr);
  --col-copy: minmax(2rem, auto);
  --gap: 0.4rem;

  display: grid;
  grid-template-columns:
    var(--col-time)
    var(--col-purpose)
    var(--col-location)
    var(--col-duration)
    var(--col-rows)
    var(--col-status)
    var(--col-query)
    var(--col-copy);
  align-items: center;
  gap: var(--gap);
  padding: 0.5rem;
  cursor: pointer;
}

@media (max-width: 1400px) {
  .flat-row-header {
    --col-time: minmax(4rem, auto);
    --col-purpose: minmax(4.5rem, auto);
    --col-location: minmax(5rem, 0.8fr);
    --col-duration: minmax(2.75rem, auto);
    --col-rows: minmax(3.5rem, auto);
    --col-status: minmax(2.5rem, auto);
    --gap: 0.35rem;
  }
}

@media (max-width: 1024px) {
  .flat-row-header {
    --col-time: minmax(3.5rem, auto);
    --col-purpose: minmax(4rem, auto);
    --col-location: minmax(4rem, 0.6fr);
    --col-duration: minmax(2.5rem, auto);
    --col-rows: minmax(3rem, auto);
    --col-status: minmax(2rem, auto);
    --gap: 0.3rem;
  }
}

.flat-meta--rows-empty,
.flat-meta--status-empty {
  @apply w-0 min-w-0 overflow-hidden p-0 m-0;
}

/* Component-specific inline query styles */
.flat-row-header :deep(.hljs) {
  @apply whitespace-nowrap overflow-hidden text-ellipsis;
}

/* Override SqlCodeBlock line number padding for better alignment */
:deep(.absolute.inset-y-0.left-0 > div) {
  padding-top: 1rem !important;
  padding-bottom: 1rem !important;
}
</style>
