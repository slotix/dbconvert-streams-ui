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
            class="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 ring-purple-600/20 dark:ring-purple-500/30"
          >
            FEDERATED
          </span>
        </div>
      </div>

      <!-- Federated Connections (shown when federated mode is enabled) -->
      <FederatedConnectionsCard
        v-if="isFederatedMode"
        :connections="stream.source?.federatedConnections || []"
        :all-connections="allConnections"
        :db-types="dbTypes"
        @navigate="handleFederatedNavigate"
      />

      <!-- Single Source Connection (shown when NOT federated mode) -->
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

      <QuerySourcesSummary :queries="stream.source?.queries || []" />

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
import { useRouter } from 'vue-router'
import { CalendarIcon } from '@heroicons/vue/24/outline'
import { normalizeConnectionType } from '@/utils/connectionUtils'
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

const router = useRouter()

// Check if federated mode is enabled
const isFederatedMode = computed(() => props.stream.source?.federatedMode === true)

// Check if stream has file format in spec
const hasFileFormat = computed(() => !!getFileSpec(props.stream.target?.spec)?.fileFormat)

const emit = defineEmits<{
  (e: 'navigate-source'): void
  (e: 'navigate-target'): void
}>()

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

function handleFederatedNavigate(connectionId: string) {
  // Navigate to the explorer with the selected connection
  router.push({ name: 'Explorer', query: { connectionId } })
}

const sourceLogo = computed(() => getLogo(props.source))
const targetLogo = computed(() => getLogo(props.target))
</script>

<style scoped>
@reference '../../assets/style.css';

/* Component-specific styles only - code highlighting styles are centralized in src/styles/codeHighlighting.css */
</style>
