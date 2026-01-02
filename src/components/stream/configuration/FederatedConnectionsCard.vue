<template>
  <div
    class="bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 border border-gray-300 dark:border-gray-700 space-y-3 overflow-hidden"
  >
    <div v-if="connections.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
      No source connections configured
    </div>
    <div
      v-for="(fedConn, index) in connections"
      :key="fedConn.connectionId"
      :class="{ 'pt-3 border-t border-gray-200 dark:border-gray-700': index > 0 }"
    >
      <!-- Connection header -->
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-start gap-2 min-w-0 flex-1">
          <DatabaseIcon
            v-if="getConnectionTypeDisplay(getConnection(fedConn.connectionId))"
            :db-type="getConnectionTypeDisplay(getConnection(fedConn.connectionId))"
            :logo-src="getLogo(getConnection(fedConn.connectionId))"
            size="SM"
            container-class="hover:shadow-md shrink-0"
          />
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1">
              <span
                class="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[150px]"
                :class="{ 'text-red-500 dark:text-red-400': !getConnection(fedConn.connectionId) }"
                :title="getConnection(fedConn.connectionId)?.name"
              >
                {{ getConnection(fedConn.connectionId)?.name || 'Connection not found' }}
              </span>
              <span
                class="inline-flex items-center rounded px-1 py-0.5 text-xs font-mono bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shrink-0"
              >
                {{ fedConn.alias }}
              </span>
              <CloudProviderBadge
                v-if="getConnection(fedConn.connectionId)"
                :cloud-provider="getConnection(fedConn.connectionId)!.cloud_provider"
                :db-type="getConnectionTypeDisplay(getConnection(fedConn.connectionId))"
                class="shrink-0"
              />
              <AlertCircle
                v-if="!getConnection(fedConn.connectionId)"
                class="h-4 w-4 text-red-500 dark:text-red-400 shrink-0"
                aria-hidden="true"
              />
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
              <ConnectionStringDisplay
                v-if="getConnection(fedConn.connectionId)"
                :connection="getConnection(fedConn.connectionId)!"
              />
              <span v-else class="text-red-500 dark:text-red-400">Connection not found</span>
            </div>
          </div>
        </div>
        <button
          v-if="getConnection(fedConn.connectionId)?.id"
          v-tooltip="'View connection in Explorer'"
          type="button"
          class="shrink-0 inline-flex items-center px-2 py-1 text-xs font-medium text-teal-600 dark:text-teal-300 bg-white dark:bg-gray-900 border border-teal-200 dark:border-teal-700 rounded-md hover:bg-teal-50 dark:hover:bg-gray-800 transition-colors"
          @click="emit('navigate', fedConn.connectionId)"
        >
          <ExternalLink class="w-3 h-3 mr-1" />
          Explore
        </button>
      </div>
      <!-- Source details: tables or S3 objects -->
      <div
        v-if="getSourceDetails(fedConn)"
        class="mt-1.5 ml-8 text-xs text-gray-500 dark:text-gray-400"
      >
        <div v-if="fedConn.tables?.length" class="flex items-start gap-1">
          <Table2 class="w-3 h-3 shrink-0 mt-0.5" />
          <span class="break-words">{{ formatTables(fedConn.tables) }}</span>
        </div>
        <div v-else-if="fedConn.s3?.bucket" class="flex items-start gap-1">
          <FolderOpen class="w-3 h-3 shrink-0 mt-0.5" />
          <span class="break-words">
            <span class="font-medium text-gray-700 dark:text-gray-300">{{
              fedConn.s3.bucket
            }}</span>
            <span v-if="fedConn.s3.prefixes?.length" class="text-gray-500 dark:text-gray-400">
              &rarr; {{ formatPrefixes(fedConn.s3.prefixes) }}
            </span>
            <span v-else-if="fedConn.s3.objects?.length" class="text-gray-500 dark:text-gray-400">
              &rarr; {{ formatObjects(fedConn.s3.objects) }}
            </span>
          </span>
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
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import ConnectionStringDisplay from '@/components/common/ConnectionStringDisplay.vue'
import DatabaseIcon from '@/components/base/DatabaseIcon.vue'
import { AlertCircle, ExternalLink, Table2, FolderOpen } from 'lucide-vue-next'
import type { Connection, DbType } from '@/types/connections'
import { getConnectionTypeLabel } from '@/types/specs'
import type { StreamConnectionMapping } from '@/types/streamConfig'
import { normalizeConnectionType } from '@/utils/connectionUtils'

const props = defineProps<{
  connections: StreamConnectionMapping[]
  allConnections: Connection[]
  dbTypes: DbType[]
}>()

const emit = defineEmits<{
  (e: 'navigate', connectionId: string): void
}>()

function getConnection(connectionId: string): Connection | undefined {
  return props.allConnections.find((conn) => conn.id === connectionId)
}

function getLogo(connection?: Connection): string {
  const typeLabel = getConnectionTypeDisplay(connection)
  if (!typeLabel) return '/images/db-logos/all.svg'
  const normalizedInput = normalizeConnectionType(typeLabel)
  const match = props.dbTypes.find(
    (dbType) => normalizeConnectionType(dbType.type.toLowerCase()) === normalizedInput
  )
  return match ? match.logo : '/images/db-logos/all.svg'
}

function getConnectionTypeDisplay(connection?: Connection): string {
  return getConnectionTypeLabel(connection?.spec, connection?.type) || ''
}

function getSourceDetails(conn: StreamConnectionMapping): boolean {
  return !!(conn.tables?.length || conn.s3?.bucket)
}

function formatTables(tables: { name: string }[]): string {
  const names = tables.map((t) => t.name)
  if (names.length <= 3) return names.join(', ')
  return `${names.slice(0, 3).join(', ')}, ... (${names.length - 3} more)`
}

function formatObjects(objects: string[]): string {
  if (objects.length <= 2) return objects.join(', ')
  return `${objects.slice(0, 2).join(', ')} (+${objects.length - 2})`
}

function formatPrefixes(prefixes: string[]): string {
  if (prefixes.length <= 2) return prefixes.join(', ')
  return `${prefixes.slice(0, 2).join(', ')} (+${prefixes.length - 2})`
}
</script>
