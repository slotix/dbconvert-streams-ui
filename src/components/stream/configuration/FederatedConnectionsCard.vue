<template>
  <div>
    <label class="block text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-2">
      Source Connections (Federated)
    </label>
    <div
      class="bg-gray-50 dark:bg-gray-900/40 rounded-md p-4 border border-gray-300 dark:border-gray-700 space-y-3"
    >
      <div v-if="connections.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
        No federated connections configured
      </div>
      <div
        v-for="(fedConn, index) in connections"
        :key="fedConn.connectionId"
        class="flex items-center justify-between gap-3"
        :class="{ 'pt-3 border-t border-gray-200 dark:border-gray-700': index > 0 }"
      >
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <DatabaseIcon
            v-if="getConnection(fedConn.connectionId)?.type"
            :db-type="getConnection(fedConn.connectionId)!.type"
            :logo-src="getLogo(getConnection(fedConn.connectionId))"
            size="SM"
            container-class="hover:shadow-md"
          />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span
                class="font-medium text-gray-900 dark:text-gray-100 truncate"
                :class="{ 'text-red-500 dark:text-red-400': !getConnection(fedConn.connectionId) }"
              >
                {{ getConnection(fedConn.connectionId)?.name || 'Connection not found' }}
              </span>
              <span
                class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {{ fedConn.alias }}
              </span>
              <CloudProviderBadge
                v-if="getConnection(fedConn.connectionId)"
                :cloud-provider="getConnection(fedConn.connectionId)!.cloud_provider"
                :db-type="getConnection(fedConn.connectionId)!.type"
              />
              <ExclamationCircleIcon
                v-if="!getConnection(fedConn.connectionId)"
                class="h-4 w-4 text-red-500 dark:text-red-400 shrink-0"
                aria-hidden="true"
              />
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              <ConnectionStringDisplay
                v-if="getConnection(fedConn.connectionId)"
                :connection="getConnection(fedConn.connectionId)!"
              />
              <span v-else class="text-red-500 dark:text-red-400 text-xs">
                Connection not found
              </span>
            </div>
          </div>
        </div>
        <button
          v-if="getConnection(fedConn.connectionId)?.id"
          v-tooltip="'View connection in Explorer'"
          type="button"
          class="shrink-0 inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-teal-600 dark:text-teal-300 bg-white dark:bg-gray-900 border border-teal-200 dark:border-teal-700 rounded-md hover:bg-teal-50 dark:hover:bg-gray-800 transition-colors"
          @click="emit('navigate', fedConn.connectionId)"
        >
          <ArrowTopRightOnSquareIcon class="w-3.5 h-3.5 mr-1" />
          Explore
        </button>
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
import { ArrowTopRightOnSquareIcon, ExclamationCircleIcon } from '@heroicons/vue/24/outline'
import type { Connection, DbType } from '@/types/connections'
import type { ConnectionMapping } from '@/api/federated'
import { normalizeConnectionType } from '@/utils/connectionUtils'

const props = defineProps<{
  connections: ConnectionMapping[]
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
  if (!connection?.type) return '/images/db-logos/all.svg'
  const normalizedInput = normalizeConnectionType(connection.type.toLowerCase())
  const match = props.dbTypes.find(
    (dbType) => normalizeConnectionType(dbType.type.toLowerCase()) === normalizedInput
  )
  return match ? match.logo : '/images/db-logos/all.svg'
}
</script>
