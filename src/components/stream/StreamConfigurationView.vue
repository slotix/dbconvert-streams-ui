<template>
  <div class="space-y-6">
    <div class="flex items-center justify-end">
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-600 dark:text-gray-400">JSON</span>
        <Switch
          v-model="jsonViewModel"
          class="relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 dark:focus:ring-teal-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          :class="[jsonViewModel ? 'bg-gray-600 dark:bg-teal-500' : 'bg-gray-400 dark:bg-gray-600']"
        >
          <span class="sr-only">Toggle JSON view</span>
          <span
            aria-hidden="true"
            class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 shadow-md ring-0 transition duration-200 ease-in-out"
            :class="[
              jsonViewModel ? 'translate-x-5' : 'translate-x-0',
              'shadow-[0_1px_4px_rgba(0,0,0,0.15)]'
            ]"
          />
        </Switch>
        <button
          v-if="jsonViewModel"
          v-tooltip="'Copy configuration'"
          class="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          @click="copyConfig"
        >
          <ClipboardIcon class="h-4 w-4" />
        </button>
      </div>
    </div>

    <div v-if="jsonViewModel">
      <div
        class="rounded-md bg-gray-50 dark:bg-gray-900 p-4 border border-gray-300 dark:border-gray-700 overflow-auto custom-scrollbar"
      >
        <pre v-highlightjs class="text-sm">
<code class="language-json block text-sm leading-6 select-text">{{ prettyConfig }}</code>
        </pre>
      </div>
    </div>

    <div v-else class="space-y-4">
      <div class="pb-4 border-b border-gray-100 dark:border-gray-800">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-500 dark:text-gray-400">Mode:</span>
          <span
            :class="[
              'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
              stream.mode === 'cdc'
                ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 ring-orange-600/20 dark:ring-orange-500/30'
                : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 ring-indigo-600/20 dark:ring-indigo-500/30'
            ]"
          >
            {{ stream.mode.toUpperCase() }}
          </span>
        </div>
      </div>

      <ConnectionCard
        label="Source Connection"
        :connection="source"
        :logo-src="sourceLogo"
        :has-connection="!!source && !!source.name"
        @navigate="emit('navigate-source')"
      />

      <ConnectionCard
        label="Target Connection"
        :connection="target"
        :logo-src="targetLogo"
        :has-connection="!!target && !!target.name"
        @navigate="emit('navigate-target')"
      />

      <FileOutputSummary v-if="isFileTarget && stream.targetFileFormat" :stream="stream" />

      <TablesSummary :displayed-tables="displayedTables" :remaining-count="remainingTablesCount" />

      <div class="pt-4 border-t border-gray-100 dark:border-gray-800">
        <div class="flex items-center gap-2">
          <CalendarIcon class="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span class="text-sm text-gray-500 dark:text-gray-400">Created: {{ streamCreated }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { vTooltip } from '@/directives/tooltip'

export default {
  directives: {
    tooltip: vTooltip
  }
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { Switch } from '@headlessui/vue'
import { ClipboardIcon, CalendarIcon } from '@heroicons/vue/24/outline'
import { normalizeConnectionType } from '@/utils/connectionUtils'
import { formatDateTime } from '@/utils/formats'
import { useCommonStore } from '@/stores/common'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection, DbType } from '@/types/connections'
import ConnectionCard from './configuration/ConnectionCard.vue'
import FileOutputSummary from './configuration/FileOutputSummary.vue'
import TablesSummary from './configuration/TablesSummary.vue'

const props = defineProps<{
  stream: StreamConfig
  source?: Connection
  target?: Connection
  dbTypes: DbType[]
  isJsonView: boolean
  isFileTarget: boolean
}>()

const emit = defineEmits<{
  (e: 'update:isJsonView', value: boolean): void
  (e: 'navigate-source'): void
  (e: 'navigate-target'): void
}>()

const commonStore = useCommonStore()

const jsonViewModel = computed({
  get: () => props.isJsonView,
  set: (value: boolean) => emit('update:isJsonView', value)
})

const prettyConfig = computed(() => JSON.stringify(props.stream, null, 2))
const displayedTables = computed(() => {
  if (!props.stream?.tables?.length) return []
  return props.stream.tables.slice(0, 5).map((table) => table.name)
})
const remainingTablesCount = computed(() => {
  if (!props.stream?.tables?.length) return 0
  return Math.max(0, props.stream.tables.length - displayedTables.value.length)
})
const streamCreated = computed(() => formatDateTime(props.stream?.created || 0))

function getLogo(connection?: Connection) {
  if (!connection?.type) return '/images/db-logos/all.svg'
  const normalizedInput = normalizeConnectionType(connection.type.toLowerCase())
  const match = props.dbTypes.find(
    (dbType) => normalizeConnectionType(dbType.type.toLowerCase()) === normalizedInput
  )
  return match ? match.logo : '/images/db-logos/all.svg'
}

const sourceLogo = computed(() => getLogo(props.source))
const targetLogo = computed(() => getLogo(props.target))

function copyConfig() {
  navigator.clipboard.writeText(prettyConfig.value)
  commonStore.showNotification('Configuration copied to clipboard', 'success')
}
</script>

<style scoped>
@reference '../../assets/style.css';

/* Component-specific styles only - code highlighting styles are centralized in src/styles/codeHighlighting.css */
</style>
