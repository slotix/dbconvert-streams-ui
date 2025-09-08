<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import { Tab, TabGroup, TabList, TabPanels, TabPanel } from '@headlessui/vue'
import { XMarkIcon, TrashIcon } from '@heroicons/vue/20/solid'
import DatabaseMetadataView from './DatabaseMetadataView.vue'
import DatabaseSelectionView from '@/components/database/DatabaseSelectionView.vue'
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'

const MAX_RECENT_CONNECTIONS = 5
const route = useRoute()
const router = useRouter()
const commonStore = useCommonStore()
const connectionsStore = useConnectionsStore()

// Get recent connections from localStorage or initialize empty
const recentConnections = ref<Array<{ id: string; name: string; type?: string; host?: string; port?: string; database?: string; cloud_provider?: string }>>(
  JSON.parse(localStorage.getItem('recentConnections') || '[]')
)

// Track last viewed connection
const lastViewedConnectionId = ref<string>(localStorage.getItem('lastViewedConnectionId') || '')

// Current active connection ID
const currentConnectionId = computed(() => route.params.id as string)

// Selected database name for detailed view
const selectedDatabaseName = ref<string | null>(null)

// Selected tab index
const selectedIndex = computed(() =>
  recentConnections.value.findIndex((c) => c.id === currentConnectionId.value)
)

// Get connection details for the current connection
const currentConnection = computed(() =>
  connectionsStore.connections.find((conn) => conn.id === currentConnectionId.value)
)

// Get connection details for the current connection
const currentConnectionDetails = computed(() => {
  const conn = currentConnection.value
  if (!conn) return null
  const dbType = connectionsStore.dbTypes.find((f) => f.type === conn.type)
  return {
    ...conn,
    logo: dbType?.logo || ''
  }
})

// Add current connection to recent list if it exists
function addToRecentConnections() {
  if (!currentConnection.value) return

  const connection = {
    id: currentConnection.value.id,
    name: currentConnection.value.name,
    type: currentConnection.value.type,
    host: currentConnection.value.host,
    port: currentConnection.value.port?.toString(),
    database: currentConnection.value.database,
    cloud_provider: currentConnection.value.cloud_provider || ''
  }

  // Only add if it doesn't exist
  const existingIndex = recentConnections.value.findIndex((c) => c.id === connection.id)
  if (existingIndex === -1) {
    // Add to end of array instead of front
    recentConnections.value.push(connection)

    // Keep only MAX_RECENT_CONNECTIONS from the end
    if (recentConnections.value.length > MAX_RECENT_CONNECTIONS) {
      recentConnections.value = recentConnections.value.slice(-MAX_RECENT_CONNECTIONS)
    }

    // Save to localStorage
    localStorage.setItem('recentConnections', JSON.stringify(recentConnections.value))
  }
}

// Remove a connection from recent list
function removeFromRecent(connectionId: string) {
  recentConnections.value = recentConnections.value.filter((c) => c.id !== connectionId)
  localStorage.setItem('recentConnections', JSON.stringify(recentConnections.value))

  // If we removed the current connection, navigate to the first available or connections page
  if (connectionId === currentConnectionId.value) {
    if (connectionId === lastViewedConnectionId.value) {
      lastViewedConnectionId.value = ''
      localStorage.removeItem('lastViewedConnectionId')
    }
    const firstAvailable = recentConnections.value[0]
    if (firstAvailable) {
      router.push(`/explorer/${firstAvailable.id}`)
    } else {
      router.push('/connections')
    }
  }
}

// Switch to a different connection
function switchConnection(connectionId: string) {
  selectedDatabaseName.value = null // Reset database selection when switching connections
  router.push(`/explorer/${connectionId}`)
}

// Handle database selection
function handleDatabaseSelect(databaseName: string) {
  selectedDatabaseName.value = databaseName
}

// Clear all recent connections
function clearAllRecentConnections() {
  recentConnections.value = []
  localStorage.removeItem('recentConnections')
  localStorage.removeItem('lastViewedConnectionId')
  // Navigate back to connections page since no recent connections remain
  router.push('/connections')
}

// Get cloud provider for a connection
function getConnectionCloudProvider(connectionId: string) {
  const connection = connectionsStore.connections.find((conn) => conn.id === connectionId)
  return connection?.cloud_provider || ''
}

// Get connection type for a connection
function getConnectionType(connectionId: string) {
  const connection = connectionsStore.connections.find((conn) => conn.id === connectionId)
  return connection?.type || ''
}

// If we have a current connection ID but it's not in recent connections, add it
function initializeCurrentConnection() {
  if (
    currentConnection.value &&
    !recentConnections.value.find((c) => c.id === currentConnectionId.value)
  ) {
    addToRecentConnections()
  }
}

// Watch for route changes to handle navigation to /explorer without an ID
watch(
  () => route.path,
  (newPath) => {
    if (newPath === '/explorer' && recentConnections.value.length > 0) {
      // Use the last viewed connection if available and still in recent connections
      const connectionToUse =
        lastViewedConnectionId.value &&
        recentConnections.value.find((c) => c.id === lastViewedConnectionId.value)
          ? lastViewedConnectionId.value
          : recentConnections.value[recentConnections.value.length - 1].id

      router.replace(`/explorer/${connectionToUse}`)
    }
  },
  { immediate: true }
)

onMounted(() => {
  commonStore.setCurrentPage('Database Explorer')
  initializeCurrentConnection()
})

// Watch for route changes to update recent connections and last viewed connection
watch(currentConnectionId, (newId) => {
  if (newId && currentConnection.value) {
    addToRecentConnections()
    // Update last viewed connection
    lastViewedConnectionId.value = newId
    localStorage.setItem('lastViewedConnectionId', newId)
  }
})
</script>

<template>
  <div class="min-h-full">
    <header class="bg-white shadow">
      <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
          <h1 class="text-3xl font-bold leading-tight tracking-tight text-gray-900">
            Database Explorer
          </h1>
          <div class="flex items-center gap-4">
            <button
              v-if="recentConnections.length > 0"
              @click="clearAllRecentConnections"
              class="text-sm text-gray-400 hover:text-red-500 flex items-center gap-1 px-3 py-1 rounded hover:bg-red-50 transition-colors"
              title="Clear all recent connections"
            >
              <TrashIcon class="h-4 w-4" />
              Clear All
            </button>
            <RouterLink
              to="/connections"
              class="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              ← Back to Connections
            </RouterLink>
          </div>
        </div>
      </div>
    </header>

    <main class="mx-auto py-4">
      <!-- No recent connections -->
      <div v-if="recentConnections.length === 0" class="text-center py-12">
        <p class="text-gray-500">No recently explored connections.</p>
        <RouterLink
          to="/connections"
          class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Select a Connection
        </RouterLink>
      </div>

      <!-- Recent connections tabs -->
      <div v-else>
        <TabGroup
          :selected-index="selectedIndex"
          @change="(index) => switchConnection(recentConnections[index].id)"
        >
          <TabList class="flex bg-gray-50 p-2 rounded-xl shadow-sm border border-gray-200">
            <Tab
              v-for="connection in recentConnections"
              :key="connection.id"
              v-slot="{ selected }"
              as="template"
            >
              <div class="relative flex-1 mx-1">
                <button
                  :class="[
                    'w-full rounded-lg py-3 px-4 text-sm font-medium',
                    'focus:outline-none',
                    'flex items-center justify-center gap-2 transition-all duration-200',
                    selected
                      ? 'bg-white text-slate-800 shadow-md border border-gray-200'
                      : 'text-gray-600 hover:bg-white hover:text-gray-800 hover:shadow-sm'
                  ]"
                >
                  <img
                    v-if="currentConnectionDetails && currentConnectionId === connection.id"
                    :src="currentConnectionDetails.logo"
                    :alt="currentConnectionDetails.type"
                    class="h-5 w-5 rounded-full"
                  />
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="truncate max-w-[120px]" :title="connection.name">{{ connection.name }}</span>
                    <CloudProviderBadge 
                      :cloud-provider="getConnectionCloudProvider(connection.id)" 
                      :db-type="getConnectionType(connection.id)"
                      size="sm"
                    />
                  </div>
                </button>
                <!-- Close button -->
                <button
                  @click.stop="removeFromRecent(connection.id)"
                  class="absolute -right-1.5 -top-1.5 rounded-full bg-white p-1 hover:bg-gray-100 shadow-sm border border-gray-200 transition-colors"
                >
                  <XMarkIcon class="h-3.5 w-3.5 text-gray-500" />
                </button>
              </div>
            </Tab>
          </TabList>

          <div class="mt-6 bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <!-- Database Selection View -->
            <DatabaseSelectionView
              v-if="currentConnectionId && !selectedDatabaseName"
              :key="currentConnectionId"
              :connection-id="currentConnectionId"
              @database-selected="handleDatabaseSelect"
            />
            
            <!-- Database Metadata View (for selected database) -->
            <DatabaseMetadataView
              v-else-if="currentConnectionId && selectedDatabaseName"
              :key="`${currentConnectionId}-${selectedDatabaseName}`"
              :id="currentConnectionId"
              :database="selectedDatabaseName"
              @back-to-databases="selectedDatabaseName = null"
            />
            
            <div v-else class="text-center py-12">
              <p class="text-gray-500">Select a connection to view its databases.</p>
            </div>
          </div>
        </TabGroup>
      </div>
    </main>
  </div>
</template>
