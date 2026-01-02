<template>
  <div class="space-y-6">
    <!-- Summary View (read-only) -->
    <div class="space-y-4">
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

      <!-- Multi-source Connections (shown when more than one source is configured) -->
      <FederatedConnectionsCard
        v-if="isFederatedMode"
        :connections="stream.source?.connections || []"
        :all-connections="allConnections"
        :db-types="dbTypes"
        @navigate="handleFederatedNavigate"
      />

      <!-- Single Source Connection (shown when only one source is configured) -->
      <ConnectionCard
        v-else
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

      <FileOutputSummary v-if="isFileTarget && hasFileFormat" :stream="stream" />

      <TablesSummary :displayed-tables="displayedTables" :remaining-count="remainingTablesCount" />

      <QuerySourcesSummary :queries="allQueries" />

      <div class="pt-4 border-t border-gray-100 dark:border-gray-800">
        <div class="flex items-center gap-2">
          <Calendar class="h-4 w-4 text-gray-500 dark:text-gray-400" />
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
import { Calendar } from 'lucide-vue-next'
import { normalizeConnectionType } from '@/utils/connectionUtils'
import { getConnectionTypeLabel } from '@/types/specs'
import { formatDateTime } from '@/utils/formats'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection, DbType } from '@/types/connections'
import ConnectionCard from './configuration/ConnectionCard.vue'
import FederatedConnectionsCard from './configuration/FederatedConnectionsCard.vue'
import FileOutputSummary from './configuration/FileOutputSummary.vue'
import TablesSummary from './configuration/TablesSummary.vue'
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

const displayedTables = computed(() => {
  if (!props.stream?.source?.connections?.length) return []
  // Collect tables from all connections
  const allTables: string[] = []
  for (const conn of props.stream.source.connections) {
    if (conn.tables) {
      allTables.push(...conn.tables.map((t) => t.name))
    }
  }
  return allTables.slice(0, 5)
})
const remainingTablesCount = computed(() => {
  if (!props.stream?.source?.connections?.length) return 0
  // Count tables from all connections
  let totalTables = 0
  for (const conn of props.stream.source.connections) {
    if (conn.tables) {
      totalTables += conn.tables.length
    }
  }
  return Math.max(0, totalTables - displayedTables.value.length)
})
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

function handleFederatedNavigate(connectionId: string) {
  emit('navigate-federated', connectionId)
}

const sourceLogo = computed(() => getLogo(props.source))
const targetLogo = computed(() => getLogo(props.target))
</script>

<style scoped>
@reference '../../assets/style.css';

/* Component-specific styles only - code highlighting styles are centralized in src/styles/codeHighlighting.css */
</style>
