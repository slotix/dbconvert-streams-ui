<template>
  <div class="space-y-4">
    <!-- Mode badges -->
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
        <span
          v-if="isFederatedMode"
          class="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 ring-amber-600/20 dark:ring-amber-500/30"
        >
          FEDERATED
        </span>
      </div>
    </div>

    <!-- Side-by-side layout for Source(s) and Target -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <!-- Source Column -->
      <div class="space-y-2">
        <label class="block text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
          {{ isFederatedMode ? 'Source Connections' : 'Source Connection' }}
        </label>
        <FederatedConnectionsCard
          :connections="stream.source?.connections || []"
          :all-connections="allConnections"
          :db-types="dbTypes"
          @navigate="handleSourceNavigate"
        />
      </div>

      <!-- Target Column -->
      <div class="space-y-2">
        <label class="block text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
          Target Connection
        </label>
        <div
          class="bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 border border-gray-300 dark:border-gray-700 overflow-hidden"
        >
          <ConnectionCard
            :connection="target"
            :logo-src="targetLogo"
            :has-connection="!!target && !!target.name"
            :inline="true"
            @navigate="emit('navigate-target')"
          />
          <!-- Output Configuration (for file targets) -->
          <FileOutputSummary
            v-if="isFileTarget && hasFileFormat"
            :stream="stream"
            :compact="true"
          />
        </div>
      </div>
    </div>

    <!-- Queries (if any) -->
    <QuerySourcesSummary :queries="allQueries" />

    <!-- Created timestamp -->
    <div class="pt-4 border-t border-gray-100 dark:border-gray-800">
      <div class="flex items-center gap-2">
        <Calendar class="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <span class="text-sm text-gray-500 dark:text-gray-400">Created: {{ streamCreated }}</span>
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
import { Calendar } from 'lucide-vue-next'
import { normalizeConnectionType } from '@/utils/connectionUtils'
import { getConnectionTypeLabel } from '@/types/specs'
import { formatDateTime } from '@/utils/formats'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection, DbType } from '@/types/connections'
import ConnectionCard from './configuration/ConnectionCard.vue'
import FederatedConnectionsCard from './configuration/FederatedConnectionsCard.vue'
import FileOutputSummary from './configuration/FileOutputSummary.vue'
import QuerySourcesSummary from './configuration/QuerySourcesSummary.vue'
import { getFileSpec } from '@/composables/useTargetSpec'

const props = defineProps<{
  stream: StreamConfig
  source?: Connection
  target?: Connection
  allConnections: Connection[]
  dbTypes: DbType[]
  isFileTarget: boolean
}>()

// Check if federated mode is enabled
const isFederatedMode = computed(() => (props.stream.source?.connections?.length ?? 0) > 1)

// Check if stream has file format in spec
const hasFileFormat = computed(() => !!getFileSpec(props.stream.target?.spec)?.fileFormat)

const emit = defineEmits<{
  (e: 'navigate-source'): void
  (e: 'navigate-target'): void
  (e: 'navigate-federated', connectionId: string): void
}>()

// Collect queries from all connections
const allQueries = computed(() => {
  if (!props.stream?.source?.connections?.length) return []
  const queries: Array<{ name: string; query: string }> = []
  for (const conn of props.stream.source.connections) {
    if (conn.queries) {
      queries.push(...conn.queries)
    }
  }
  return queries
})
const streamCreated = computed(() => formatDateTime(props.stream?.created || 0))

function getLogo(connection?: Connection) {
  const typeLabel = getConnectionTypeLabel(connection?.spec, connection?.type)
  if (!typeLabel) return '/images/db-logos/all.svg'
  const normalizedInput = normalizeConnectionType(typeLabel)
  const match = props.dbTypes.find(
    (dbType) => normalizeConnectionType(dbType.type.toLowerCase()) === normalizedInput
  )
  return match ? match.logo : '/images/db-logos/all.svg'
}

function handleSourceNavigate(connectionId: string) {
  if (isFederatedMode.value) {
    emit('navigate-federated', connectionId)
  } else {
    emit('navigate-source')
  }
}

const targetLogo = computed(() => getLogo(props.target))
</script>

<style scoped>
@reference '../../assets/style.css';

/* Component-specific styles only - code highlighting styles are centralized in src/styles/codeHighlighting.css */
</style>
