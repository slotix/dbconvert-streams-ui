<!-- src/components/home/QuickActions.vue -->
<template>
  <div class="p-6">
    <h2
      class="text-xl font-semibold bg-linear-to-r from-slate-900 to-slate-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-6 flex items-center gap-2"
    >
      Quick Actions
    </h2>

    <!-- Explore Databases -->
    <div v-if="recentConnections.length > 0" class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">EXPLORE DATABASES</h3>
        <button
          class="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
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
            class="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-850 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-linear-to-r hover:from-blue-50 hover:to-teal-50 dark:hover:from-gray-850 dark:hover:to-gray-800 transition-all duration-200 hover:shadow-md dark:hover:shadow-gray-900/50 hover:scale-[1.01]"
          >
            <div class="flex items-center min-w-0 flex-1 pr-3">
              <div class="shrink-0">
                <!-- File connections: show folder icon -->
                <div
                  v-if="isFileConnection(connection.id)"
                  class="bg-slate-100 dark:bg-slate-800 rounded-lg p-2 transition-all duration-200 hover:shadow-md hover:scale-105"
                >
                  <FolderIcon class="h-6 w-6 text-slate-500 dark:text-slate-400" />
                </div>
                <!-- Database connections: show database logo -->
                <DatabaseIcon
                  v-else
                  :db-type="getConnectionType(connection.id)"
                  :logo-src="getConnectionLogo(connection.id) || '/images/db-logos/all.svg'"
                  size="MD"
                  container-class="hover:shadow-md hover:scale-105"
                />
              </div>
              <div class="ml-4 flex-1 min-w-0">
                <div class="flex items-center gap-2 min-w-0">
                  <h3
                    class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex-1 min-w-0"
                    :title="connection.name"
                  >
                    {{ connection.name }}
                  </h3>
                  <CloudProviderBadge
                    v-if="!isFileConnection(connection.id)"
                    :cloud-provider="getCloudProvider(connection.id)"
                    :db-type="getConnectionType(connection.id)"
                    size="sm"
                    class="shrink-0"
                  />
                </div>
                <!-- For file connections, show directory path instead of host:port -->
                <p
                  v-if="isFileConnection(connection.id)"
                  class="text-sm text-gray-500 dark:text-gray-400 truncate"
                  :title="getFileConnectionPath(connection.id)"
                >
                  {{ getFileConnectionPath(connection.id) }}
                </p>
                <!-- For database connections, show host:port -->
                <p
                  v-else
                  class="text-sm text-gray-500 dark:text-gray-400 truncate"
                  :title="getConnectionHost(connection.id)"
                >
                  {{ getConnectionHost(connection.id) }}
                </p>
                <!-- Database field only for database connections -->
                <p
                  v-if="
                    !isFileConnection(connection.id) && getConnectionDatabaseDisplay(connection.id)
                  "
                  class="text-xs text-gray-400 dark:text-gray-500 truncate"
                  :title="getConnectionDatabaseDisplay(connection.id)"
                >
                  {{ getConnectionDatabaseDisplay(connection.id) }}
                </p>
              </div>
            </div>
            <div class="shrink-0 ml-2">
              <ArrowRightIcon
                class="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-all duration-200 group-hover:translate-x-1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Creation Actions -->
    <div>
      <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">CREATE NEW</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Create Connection -->
        <div class="group cursor-pointer" @click="createConnection">
          <div
            class="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-850 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-linear-to-r hover:from-blue-50 hover:to-teal-50 dark:hover:from-gray-850 dark:hover:to-gray-800 transition-all duration-200 hover:shadow-md dark:hover:shadow-gray-900/50 hover:scale-[1.01]"
          >
            <div class="flex items-center">
              <div class="shrink-0">
                <div
                  class="bg-blue-50 dark:bg-blue-900/50 rounded-lg p-3 group-hover:bg-linear-to-br group-hover:from-blue-100 group-hover:to-teal-100 dark:group-hover:from-blue-800/50 dark:group-hover:to-teal-800/50 transition-all duration-200"
                >
                  <CircleStackIcon class="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div class="ml-4">
                <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Create Connection
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">Connect a new database</p>
              </div>
            </div>
            <ArrowRightIcon
              class="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-all duration-200 group-hover:translate-x-1"
            />
          </div>
        </div>

        <!-- Create Stream -->
        <div class="group cursor-pointer" @click="createStream">
          <div
            class="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-850 hover:border-teal-300 dark:hover:border-teal-600 hover:bg-linear-to-r hover:from-teal-50 hover:to-green-50 dark:hover:from-gray-850 dark:hover:to-gray-800 transition-all duration-200 hover:shadow-md dark:hover:shadow-gray-900/50 hover:scale-[1.01]"
          >
            <div class="flex items-center">
              <div class="shrink-0">
                <div
                  class="bg-teal-50 dark:bg-teal-900/50 rounded-lg p-3 group-hover:bg-linear-to-br group-hover:from-teal-100 group-hover:to-green-100 dark:group-hover:from-teal-800/50 dark:group-hover:to-green-800/50 transition-all duration-200"
                >
                  <ArrowPathIcon class="h-6 w-6 text-teal-600 dark:text-teal-400" />
                </div>
              </div>
              <div class="ml-4">
                <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Create Stream
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">Set up a new data stream</p>
              </div>
            </div>
            <ArrowRightIcon
              class="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-all duration-200 group-hover:translate-x-1"
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
  TrashIcon,
  FolderIcon
} from '@heroicons/vue/24/outline'
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import {
  getConnectionHost as getHostFromSpec,
  getConnectionPort,
  getConnectionDatabase
} from '@/utils/specBuilder'
import DatabaseIcon from '@/components/base/DatabaseIcon.vue'
import { normalizeConnectionType } from '@/utils/connectionUtils'

type RecentConnection = {
  id: string
  name: string
  type?: string
  host?: string
  port?: string
  defaultDatabase?: string
  cloud_provider?: string
}

const router = useRouter()
const commonStore = useCommonStore()
const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()

// Recent connections persisted to localStorage
const recentConnectionsRaw = usePersistedState<RecentConnection[]>('recentConnections', [])

// Show most recent first (reversed)
const recentConnections = computed(() => {
  const recent = recentConnectionsRaw.value.slice().reverse()

  // If we have recent connections from localStorage, use those
  if (recent.length > 0) {
    return recent
  }

  // Otherwise, fallback to showing most recently created connections from the store
  // This ensures the dashboard always shows something useful
  const allConnections = connectionsStore.connections || []

  // Sort by created timestamp (most recent first) and take top 5
  const sortedConnections = [...allConnections]
    .sort((a, b) => {
      const dateA = a.created ? new Date(a.created).getTime() : 0
      const dateB = b.created ? new Date(b.created).getTime() : 0
      return dateB - dateA
    })
    .slice(0, 5)

  // Map to RecentConnection format
  return sortedConnections.map((conn) => ({
    id: conn.id,
    name: conn.name,
    type: conn.type,
    host: getHostFromSpec(conn),
    port: getConnectionPort(conn).toString(),
    defaultDatabase: getConnectionDatabase(conn),
    cloud_provider: conn.cloud_provider
  }))
})

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
    let displayHost = getHostFromSpec(connection)
    const port = getConnectionPort(connection)

    if (displayHost && displayHost.length > 25) {
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

    if (port > 0) {
      return `${displayHost}:${port}`
    }
    return displayHost || ''
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

function getConnectionDatabaseDisplay(connectionId: string) {
  const connection = connectionsStore.connections.find((conn) => conn.id === connectionId)
  if (connection) {
    let dbName = getConnectionDatabase(connection)
    // Truncate database name if it's too long
    if (dbName && dbName.length > 20) {
      dbName = `${dbName.substring(0, 17)}...`
    }
    return dbName ? `Database: ${dbName}` : ''
  }

  // Fallback: try to get from recent connections data
  const recentConn = recentConnectionsRaw.value.find((conn) => conn.id === connectionId)
  if (recentConn?.defaultDatabase) {
    let dbName = recentConn.defaultDatabase
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
    let displayHost = getHostFromSpec(connection)
    if (displayHost && displayHost.length > 30) {
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
    const port = getConnectionPort(connection)
    const dbName = getConnectionDatabase(connection)
    const dbPart = dbName ? ` • ${dbName}` : ''
    const portPart = port ? `:${port}` : ''
    return `${displayHost || ''}${portPart}${dbPart}`
  }

  // Fallback: try to get from recent connections data
  const recentConn = recentConnectionsRaw.value.find((conn) => conn.id === connectionId)
  if (recentConn?.host && recentConn?.port) {
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
    const dbPart = recentConn.defaultDatabase ? ` • ${recentConn.defaultDatabase}` : ''
    return `${displayHost}:${recentConn.port}${dbPart}`
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

function isFileConnection(connectionId: string): boolean {
  const connection = connectionsStore.connections.find((conn) => conn.id === connectionId)
  if (connection) {
    const type = connection.type?.toLowerCase() || ''
    return type === 'files' || type === 'localfiles'
  }

  // Fallback: try to get from recent connections data
  const recentConn = recentConnectionsRaw.value.find((conn) => conn.id === connectionId)
  const type = recentConn?.type?.toLowerCase() || ''
  return type === 'files' || type === 'localfiles'
}

function getFileConnectionPath(connectionId: string): string {
  const connection = connectionsStore.connections.find((conn) => conn.id === connectionId)
  if (connection) {
    // For file connections, use storage_config.uri or fallback to host
    let path = connection.storage_config?.uri || getHostFromSpec(connection) || ''
    // Truncate long paths
    if (path.length > 40) {
      // Try to show the end of the path (most relevant part)
      const parts = path.split('/')
      if (parts.length > 3) {
        path = `.../${parts.slice(-2).join('/')}`
      } else {
        path = `${path.substring(0, 37)}...`
      }
    }
    return path || 'Local Files'
  }

  // Fallback: try to get from recent connections data
  const recentConn = recentConnectionsRaw.value.find((conn) => conn.id === connectionId)
  if (recentConn) {
    let path = recentConn.host || ''
    if (path.length > 40) {
      const parts = path.split('/')
      if (parts.length > 3) {
        path = `.../${parts.slice(-2).join('/')}`
      } else {
        path = `${path.substring(0, 37)}...`
      }
    }
    return path || 'Local Files'
  }

  return 'Local Files'
}

function exploreConnection(connectionId: string) {
  router.push({ name: 'DatabaseMetadata', params: { id: connectionId } })
}

function createStream() {
  streamsStore.addStream()
  router.push({ name: 'CreateStream' })
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
