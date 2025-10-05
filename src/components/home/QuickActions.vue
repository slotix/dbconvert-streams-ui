<!-- src/components/home/QuickActions.vue -->
<template>
  <div class="p-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">Quick Actions</h2>

    <!-- Explore Databases -->
    <div v-if="recentConnections.length > 0" class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-medium text-gray-500">EXPLORE DATABASES</h3>
        <button
          class="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
          title="Clear recent connections"
          @click="clearRecentConnections"
        >
          <TrashIcon class="h-3 w-3" />
          Clear Recent
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="connection in recentConnections.slice(0, 4)"
          :key="connection.id"
          class="group cursor-pointer"
          @click="exploreConnection(connection.id)"
        >
          <div
            class="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50/50 transition-all duration-200"
          >
            <div class="flex items-center min-w-0 flex-1 pr-3">
              <div class="flex-shrink-0">
                <div
                  :class="getDatabaseIconStyle(getConnectionType(connection.id))"
                  class="rounded-lg p-2 transition-all duration-200 hover:shadow-md"
                >
                  <img
                    :src="getConnectionLogo(connection.id) || '/images/db-logos/all.svg'"
                    :alt="getConnectionType(connection.id)"
                    class="h-6 w-6 object-contain"
                    @error="
                      (e) => {
                        ;(e.target as HTMLImageElement).src = '/images/db-logos/all.svg'
                      }
                    "
                  />
                </div>
              </div>
              <div class="ml-4 flex-1 min-w-0">
                <div class="flex items-center gap-2 min-w-0">
                  <h3
                    class="text-sm font-semibold text-gray-900 truncate flex-1 min-w-0"
                    :title="connection.name"
                  >
                    {{ connection.name }}
                  </h3>
                  <CloudProviderBadge
                    :cloud-provider="getCloudProvider(connection.id)"
                    :db-type="getConnectionType(connection.id)"
                    size="sm"
                    class="flex-shrink-0"
                  />
                </div>
                <p class="text-sm text-gray-500 truncate" :title="getConnectionHost(connection.id)">
                  {{ getConnectionHost(connection.id) }}
                </p>
                <p
                  class="text-xs text-gray-400 truncate"
                  :title="getConnectionDatabase(connection.id)"
                >
                  {{ getConnectionDatabase(connection.id) }}
                </p>
              </div>
            </div>
            <div class="flex-shrink-0 ml-2">
              <ArrowRightIcon
                class="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Creation Actions -->
    <div>
      <h3 class="text-sm font-medium text-gray-500 mb-4">CREATE NEW</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Create Connection -->
        <div class="group cursor-pointer" @click="createConnection">
          <div
            class="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:border-violet-200 hover:bg-violet-50/50 transition-all duration-200"
          >
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div
                  class="bg-violet-50 rounded-lg p-3 group-hover:bg-violet-100 transition-colors"
                >
                  <CircleStackIcon class="h-6 w-6 text-violet-600" />
                </div>
              </div>
              <div class="ml-4">
                <h3 class="text-sm font-semibold text-gray-900">Create Connection</h3>
                <p class="text-sm text-gray-500">Connect a new database</p>
              </div>
            </div>
            <ArrowRightIcon
              class="h-5 w-5 text-gray-400 group-hover:text-violet-600 transition-colors"
            />
          </div>
        </div>

        <!-- Create Stream -->
        <div class="group cursor-pointer" @click="createStream">
          <div
            class="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:border-indigo-200 hover:bg-indigo-50/50 transition-all duration-200"
          >
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div
                  class="bg-indigo-50 rounded-lg p-3 group-hover:bg-indigo-100 transition-colors"
                >
                  <ArrowPathIcon class="h-6 w-6 text-indigo-600" />
                </div>
              </div>
              <div class="ml-4">
                <h3 class="text-sm font-semibold text-gray-900">Create Stream</h3>
                <p class="text-sm text-gray-500">Set up a new data stream</p>
              </div>
            </div>
            <ArrowRightIcon
              class="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCommonStore } from '@/stores/common'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { usePersistedState } from '@/composables/usePersistedState'
import {
  ArrowPathIcon,
  CircleStackIcon,
  ClockIcon,
  PlusIcon,
  ArrowRightIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import { normalizeConnectionType } from '@/utils/connectionUtils'

type RecentConnection = {
  id: string
  name: string
  type?: string
  host?: string
  port?: string
  database?: string
  cloud_provider?: string
}

const router = useRouter()
const commonStore = useCommonStore()
const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()

// Recent connections persisted to localStorage
const recentConnectionsRaw = usePersistedState<RecentConnection[]>('recentConnections', [])

// Show most recent first (reversed)
const recentConnections = computed(() => recentConnectionsRaw.value.slice().reverse())

function getConnectionLogo(connectionId: string) {
  const connection = connectionsStore.connections.find((conn) => conn.id === connectionId)
  if (!connection) {
    // Fallback: try to get type from recent connections data
    const recentConn = recentConnectionsRaw.value.find((conn) => conn.id === connectionId)
    if (recentConn && recentConn.type) {
      const normalizedType = normalizeConnectionType(recentConn.type)
      const dbType = connectionsStore.dbTypes.find(
        (f) => normalizeConnectionType(f.type.toLowerCase()) === normalizedType.toLowerCase()
      )
      return dbType?.logo || '/images/db-logos/all.svg'
    }
    return '/images/db-logos/all.svg' // Ultimate fallback
  }

  // Normalize the connection type to match dbTypes
  const normalizedType = normalizeConnectionType(connection.type)

  // First try exact match
  let dbType = connectionsStore.dbTypes.find(
    (f) => normalizeConnectionType(f.type.toLowerCase()) === normalizedType.toLowerCase()
  )

  // If no exact match, try partial match for common variations
  if (!dbType) {
    const typeVariations: Record<string, string[]> = {
      postgresql: ['postgres', 'pg', 'postgresql'],
      mysql: ['mysql', 'mariadb'],
      sqlserver: ['sql server', 'mssql', 'sqlserver', 'microsoft sql server'],
      oracle: ['oracle', 'oracledb'],
      sqlite: ['sqlite', 'sqlite3'],
      mariadb: ['mariadb', 'mysql'],
      cockroachdb: ['cockroach', 'cockroachdb', 'crdb'],
      mongodb: ['mongo', 'mongodb'],
      firebird: ['firebird', 'fb'],
      interbase: ['interbase', 'ib']
    }

    const lowerType = normalizedType.toLowerCase()
    for (const [dbTypeName, variations] of Object.entries(typeVariations)) {
      if (
        variations.some(
          (variation) => lowerType.includes(variation) || variation.includes(lowerType)
        )
      ) {
        dbType = connectionsStore.dbTypes.find(
          (f) => normalizeConnectionType(f.type.toLowerCase()) === dbTypeName
        )
        if (dbType) break
      }
    }
  }

  return dbType?.logo || '/images/db-logos/all.svg' // Fallback to generic logo
}

function getConnectionType(connectionId: string) {
  const connection = connectionsStore.connections.find((conn) => conn.id === connectionId)
  if (connection) return connection.type || ''

  // Fallback: try to get type from recent connections data
  const recentConn = recentConnectionsRaw.value.find((conn) => conn.id === connectionId)
  return recentConn?.type || ''
}

function getConnectionHost(connectionId: string) {
  const connection = connectionsStore.connections.find((conn) => conn.id === connectionId)
  if (connection) {
    // More aggressive truncation for long hostnames to ensure arrow visibility
    let displayHost = connection.host
    if (displayHost.length > 25) {
      // For cloud providers, try to show the important part
      if (displayHost.includes('.')) {
        const parts = displayHost.split('.')
        if (parts.length > 3) {
          // Show first part and last 2 parts with ellipsis
          displayHost = `${parts[0]}...${parts.slice(-2).join('.')}`
        } else {
          // Simple truncation for shorter domain names
          displayHost = `${displayHost.substring(0, 22)}...`
        }
      } else {
        // Simple truncation for other cases
        displayHost = `${displayHost.substring(0, 22)}...`
      }
    }
    return `${displayHost}:${connection.port}`
  }

  // Fallback: try to get from recent connections data
  const recentConn = recentConnectionsRaw.value.find((conn) => conn.id === connectionId)
  if (recentConn?.host && recentConn?.port) {
    let displayHost = recentConn.host
    if (displayHost.length > 25) {
      if (displayHost.includes('.')) {
        const parts = displayHost.split('.')
        if (parts.length > 3) {
          displayHost = `${parts[0]}...${parts.slice(-2).join('.')}`
        } else {
          displayHost = `${displayHost.substring(0, 22)}...`
        }
      } else {
        displayHost = `${displayHost.substring(0, 22)}...`
      }
    }
    return `${displayHost}:${recentConn.port}`
  }

  return ''
}

function getConnectionDatabase(connectionId: string) {
  const connection = connectionsStore.connections.find((conn) => conn.id === connectionId)
  if (connection) {
    let dbName = connection.database
    // Truncate database name if it's too long
    if (dbName.length > 20) {
      dbName = `${dbName.substring(0, 17)}...`
    }
    return `Database: ${dbName}`
  }

  // Fallback: try to get from recent connections data
  const recentConn = recentConnectionsRaw.value.find((conn) => conn.id === connectionId)
  if (recentConn?.database) {
    let dbName = recentConn.database
    if (dbName.length > 20) {
      dbName = `${dbName.substring(0, 17)}...`
    }
    return `Database: ${dbName}`
  }

  return ''
}

function getConnectionDetails(connectionId: string) {
  const connection = connectionsStore.connections.find((conn) => conn.id === connectionId)
  if (connection) {
    // Truncate long hostnames for better display
    let displayHost = connection.host
    if (displayHost.length > 30) {
      // For cloud providers, try to show the important part
      if (displayHost.includes('.')) {
        const parts = displayHost.split('.')
        if (parts.length > 3) {
          // Show first part and last 2 parts with ellipsis
          displayHost = `${parts[0]}...${parts.slice(-2).join('.')}`
        }
      } else {
        // Simple truncation for other cases
        displayHost = `${displayHost.substring(0, 25)}...`
      }
    }
    return `${displayHost}:${connection.port} • ${connection.database}`
  }

  // Fallback: try to get from recent connections data
  const recentConn = recentConnectionsRaw.value.find((conn) => conn.id === connectionId)
  if (recentConn?.host && recentConn?.port && recentConn?.database) {
    let displayHost = recentConn.host
    if (displayHost.length > 30) {
      if (displayHost.includes('.')) {
        const parts = displayHost.split('.')
        if (parts.length > 3) {
          displayHost = `${parts[0]}...${parts.slice(-2).join('.')}`
        }
      } else {
        displayHost = `${displayHost.substring(0, 25)}...`
      }
    }
    return `${displayHost}:${recentConn.port} • ${recentConn.database}`
  }

  return ''
}

function getCloudProvider(connectionId: string) {
  const connection = connectionsStore.connections.find((conn) => conn.id === connectionId)
  if (connection) return connection.cloud_provider || ''

  // Fallback: try to get from recent connections data
  const recentConn = recentConnectionsRaw.value.find((conn) => conn.id === connectionId)
  return recentConn?.cloud_provider || ''
}

function getDatabaseIconStyle(dbType: string): string {
  const normalizedType = normalizeConnectionType(dbType?.toLowerCase() || '')

  // Database-specific brand colors with subtle backgrounds
  const styles: Record<string, string> = {
    postgresql: 'bg-blue-100 ring-2 ring-blue-200/50',
    postgres: 'bg-blue-100 ring-2 ring-blue-200/50',
    mysql: 'bg-orange-100 ring-2 ring-orange-200/50',
    mongodb: 'bg-green-100 ring-2 ring-green-200/50',
    mongo: 'bg-green-100 ring-2 ring-green-200/50',
    redis: 'bg-red-100 ring-2 ring-red-200/50',
    sqlite: 'bg-gray-100 ring-2 ring-gray-200/50',
    mariadb: 'bg-orange-100 ring-2 ring-orange-200/50',
    mssql: 'bg-blue-100 ring-2 ring-blue-200/50',
    sqlserver: 'bg-blue-100 ring-2 ring-blue-200/50',
    oracle: 'bg-red-100 ring-2 ring-red-200/50',
    cassandra: 'bg-purple-100 ring-2 ring-purple-200/50',
    elasticsearch: 'bg-yellow-100 ring-2 ring-yellow-200/50',
    clickhouse: 'bg-yellow-100 ring-2 ring-yellow-200/50'
  }

  return styles[normalizedType] || 'bg-gray-100 ring-2 ring-gray-200/50'
}

function exploreConnection(connectionId: string) {
  router.push({ name: 'DatabaseMetadata', params: { id: connectionId } })
}

function createStream() {
  streamsStore.addStream()
  router.push({ name: 'ManageStream', params: { mode: 'add' } })
}

function createConnection() {
  router.push('/explorer/add')
}

function viewAllConnections() {
  router.push('/explorer')
}

function viewAllStreamConfigurations() {
  router.push('/streams')
}

function clearRecentConnections() {
  // Clear the persisted state (automatically syncs to localStorage)
  recentConnectionsRaw.value = []
}
</script>
