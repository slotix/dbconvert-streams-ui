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
      </div>
    </div>

    <!-- JSON Editor View (always editable) -->
    <div v-if="jsonViewModel">
      <StreamConfigJsonEditor
        ref="jsonEditorRef"
        :config="stream"
        height="600px"
        @save="handleSaveConfig"
      />
    </div>

    <!-- Summary View -->
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

      <FileOutputSummary v-if="isFileTarget && stream.target?.fileFormat" :stream="stream" />

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
import { ref, computed } from 'vue'
import { Switch } from '@headlessui/vue'
import { CalendarIcon } from '@heroicons/vue/24/outline'
import { normalizeConnectionType } from '@/utils/connectionUtils'
import { formatDateTime } from '@/utils/formats'
import streamsApi from '@/api/streams'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection, DbType } from '@/types/connections'
import ConnectionCard from './configuration/ConnectionCard.vue'
import FileOutputSummary from './configuration/FileOutputSummary.vue'
import TablesSummary from './configuration/TablesSummary.vue'
import StreamConfigJsonEditor from './StreamConfigJsonEditor.vue'

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
  (e: 'stream-updated', config: StreamConfig): void
}>()

const jsonEditorRef = ref<InstanceType<typeof StreamConfigJsonEditor>>()

const jsonViewModel = computed({
  get: () => props.isJsonView,
  set: (value: boolean) => emit('update:isJsonView', value)
})

const displayedTables = computed(() => {
  if (!props.stream?.source?.tables?.length) return []
  return props.stream.source.tables.slice(0, 5).map((table) => table.name)
})
const remainingTablesCount = computed(() => {
  if (!props.stream?.source?.tables?.length) return 0
  return Math.max(0, props.stream.source.tables.length - displayedTables.value.length)
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

async function handleSaveConfig(config: StreamConfig) {
  if (!props.stream.id) {
    jsonEditorRef.value?.onSaveError('Stream ID is missing')
    return
  }

  try {
    const updatedConfig = await streamsApi.updateStreamConfig(props.stream.id, config)
    jsonEditorRef.value?.onSaveSuccess()
    emit('stream-updated', updatedConfig)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration'
    jsonEditorRef.value?.onSaveError(errorMessage)
  }
}
</script>

<style scoped>
@reference '../../assets/style.css';

/* Component-specific styles only - code highlighting styles are centralized in src/styles/codeHighlighting.css */
</style>
