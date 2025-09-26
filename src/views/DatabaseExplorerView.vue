<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import { useSchemaStore } from '@/stores/schema'
import { Tab, TabGroup, TabList, TabPanels, TabPanel } from '@headlessui/vue'
import { XMarkIcon, TrashIcon } from '@heroicons/vue/20/solid'
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import ExplorerSidebarTree from '@/components/database/ExplorerSidebarTree.vue'
import DatabaseObjectContainer from '@/components/database/DatabaseObjectContainer.vue'
import DiagramView from '@/components/database/DiagramView.vue'
import connections from '@/api/connections'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'

const MAX_RECENT_CONNECTIONS = 5
const route = useRoute()
const router = useRouter()
const commonStore = useCommonStore()
const connectionsStore = useConnectionsStore()

// Get recent connections from localStorage or initialize empty
const recentConnections = ref<
  Array<{
    id: string
    name: string
    type?: string
    host?: string
    port?: string
    database?: string
    cloud_provider?: string
  }>
>(JSON.parse(localStorage.getItem('recentConnections') || '[]'))

// Track last viewed connection
const lastViewedConnectionId = ref<string>(localStorage.getItem('lastViewedConnectionId') || '')

// Current active connection ID
const currentConnectionId = computed(() => route.params.id as string)

// Selection state (database as root)
type ObjectType = 'table' | 'view'
const selectedDatabaseName = ref<string | null>(null)
const selectedSchemaName = ref<string | null>(null)
const selectedObjectType = ref<ObjectType | null>(null)
const selectedObjectName = ref<string | null>(null)
const selectedMeta = ref<SQLTableMeta | SQLViewMeta | null>(null)

const schemaStore = useSchemaStore()

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

async function handleSidebarSelect(payload: {
  database: string
  schema?: string
  type: ObjectType
  name: string
  meta: SQLTableMeta | SQLViewMeta
}) {
  const { database, schema, type, name, meta } = payload
  const dbChanged = selectedDatabaseName.value !== database
  selectedDatabaseName.value = database
  selectedSchemaName.value = schema || null
  selectedObjectType.value = type
  selectedObjectName.value = name
  selectedMeta.value = meta

  // Sync schema store and diagram when database changes
  if (dbChanged) {
    schemaStore.setConnectionId(currentConnectionId.value)
    schemaStore.setDatabaseName(database)
    await schemaStore.fetchSchema(false)
  }

  // Sync route query for deep link
  router.replace({
    path: `/explorer/${currentConnectionId.value}`,
    query: {
      db: database,
      schema: schema || undefined,
      type,
      name
    }
  })
}

async function refreshSelectedMetadata(force = true) {
  if (
    !currentConnectionId.value ||
    !selectedDatabaseName.value ||
    !selectedObjectType.value ||
    !selectedObjectName.value
  )
    return
  const meta = await connections.getMetadata(
    currentConnectionId.value,
    selectedDatabaseName.value,
    force
  )
  let obj: SQLTableMeta | SQLViewMeta | undefined
  if (selectedObjectType.value === 'table') {
    obj = Object.values(meta.tables).find((t) => t.name === selectedObjectName.value!)
  } else {
    obj = Object.values(meta.views).find((v) => v.name === selectedObjectName.value!)
  }
  if (obj) selectedMeta.value = obj
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
  // Seed selection from query if present
  const { db, schema, type, name } = route.query as Record<string, string | undefined>
  if (db) {
    selectedDatabaseName.value = db
    selectedSchemaName.value = schema || null
    selectedObjectType.value = (type as ObjectType) || null
    selectedObjectName.value = name || null
    // Load meta if object specified
    if (type && name) {
      connections
        .getMetadata(currentConnectionId.value, db)
        .then((m) => {
          const obj =
            type === 'table'
              ? Object.values(m.tables).find((t) => t.name === name)
              : Object.values(m.views).find((v) => v.name === name)
          if (obj) selectedMeta.value = obj
        })
        .catch(() => void 0)
    }
    // Prepare diagram store
    schemaStore.setConnectionId(currentConnectionId.value)
    schemaStore.setDatabaseName(db)
    schemaStore.fetchSchema(false)
  }
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
            <button v-if="recentConnections.length > 0"
              class="text-sm text-gray-400 hover:text-red-500 flex items-center gap-1 px-3 py-1 rounded hover:bg-red-50 transition-colors"
              title="Clear all recent connections" @click="clearAllRecentConnections">
              <TrashIcon class="h-4 w-4" />
              Clear All
            </button>
            <RouterLink to="/connections" class="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
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
        <RouterLink to="/connections"
          class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
          Select a Connection
        </RouterLink>
      </div>

      <!-- Recent connections tabs -->
      <div v-else>
        <TabGroup :selected-index="selectedIndex" @change="(index) => switchConnection(recentConnections[index].id)">
          <TabList class="flex bg-gray-50 p-2 rounded-xl shadow-sm border border-gray-200">
            <Tab v-for="connection in recentConnections" :key="connection.id" v-slot="{ selected }" as="template">
              <div class="relative flex-1 mx-1">
                <button :class="[
                  'w-full rounded-lg py-3 px-4 text-sm font-medium',
                  'focus:outline-none',
                  'flex items-center justify-center gap-2 transition-all duration-200',
                  selected
                    ? 'bg-white text-slate-800 shadow-md border border-gray-200'
                    : 'text-gray-600 hover:bg-white hover:text-gray-800 hover:shadow-sm'
                ]">
                  <img v-if="currentConnectionDetails && currentConnectionId === connection.id"
                    :src="currentConnectionDetails.logo" :alt="currentConnectionDetails.type"
                    class="h-5 w-5 rounded-full" />
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="truncate max-w-[120px]" :title="connection.name">
                      {{ connection.name }}
                    </span>
                    <CloudProviderBadge :cloud-provider="getConnectionCloudProvider(connection.id)"
                      :db-type="getConnectionType(connection.id)" size="sm" />
                  </div>
                </button>
                <!-- Close button -->
                <button
                  class="absolute -right-1.5 -top-1.5 rounded-full bg-white p-1 hover:bg-gray-100 shadow-sm border border-gray-200 transition-colors"
                  @click.stop="removeFromRecent(connection.id)">
                  <XMarkIcon class="h-3.5 w-3.5 text-gray-500" />
                </button>
              </div>
            </Tab>
          </TabList>

          <div class="mt-6 grid grid-cols-12 gap-4">
            <!-- Sidebar -->
            <div class="col-span-12 md:col-span-4 lg:col-span-3">
              <ExplorerSidebarTree v-if="currentConnectionId" :connection-id="currentConnectionId" :selected="{
                database: selectedDatabaseName || undefined,
                schema: selectedSchemaName || undefined,
                type: selectedObjectType || undefined,
                name: selectedObjectName || undefined
              }" @select="handleSidebarSelect" />
            </div>
            <!-- Right panel -->
            <div class="col-span-12 md:col-span-8 lg:col-span-9">
              <div v-if="currentConnectionDetails" class="mb-4">
                <div class="flex items-center gap-2 text-sm text-gray-500">
                  <span class="font-medium text-gray-700">
                    {{ currentConnectionDetails.host }}:{{ currentConnectionDetails.port }}
                  </span>
                  <span class="text-gray-400">•</span>
                  <span class="font-medium text-gray-700">
                    {{ selectedDatabaseName || 'Select a database' }}
                  </span>
                  <CloudProviderBadge :cloud-provider="currentConnectionDetails.cloud_provider || ''"
                    :db-type="currentConnectionDetails.type || ''" />
                </div>
              </div>

              <TabGroup>
                <TabList class="flex space-x-2 mb-4 border-b border-gray-200">
                  <Tab v-slot="{ selected }" as="template">
                    <button :class="[
                      'px-5 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-200',
                      'focus:outline-none relative',
                      selected
                        ? 'bg-white text-slate-800 border-t border-l border-r border-gray-200 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    ]">
                      Structure & Data
                      <span v-if="selected" class="absolute bottom-0 left-0 w-full h-0.5 bg-slate-600"></span>
                    </button>
                  </Tab>
                  <Tab v-slot="{ selected }" as="template">
                    <button :class="[
                      'px-5 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-200',
                      'focus:outline-none relative',
                      selected
                        ? 'bg-white text-slate-800 border-t border-l border-r border-gray-200 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    ]">
                      Diagram
                      <span v-if="selected" class="absolute bottom-0 left-0 w-full h-0.5 bg-slate-600"></span>
                    </button>
                  </Tab>
                </TabList>

                <TabPanels>
                  <TabPanel>
                    <div class="min-h-[480px]">
                      <div v-if="selectedMeta">
                        <DatabaseObjectContainer :table-meta="selectedMeta" :is-view="selectedObjectType === 'view'"
                          :connection-id="currentConnectionId || ''"
                          :connection-type="currentConnectionDetails?.type || 'sql'"
                          :database="selectedDatabaseName || ''" @refresh-metadata="refreshSelectedMetadata(true)" />
                      </div>
                      <div v-else class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-8 text-center">
                        <h3 class="text-sm font-medium text-gray-900">No object selected</h3>
                        <p class="mt-1 text-sm text-gray-500">
                          Select a table or view from the sidebar to view its structure
                        </p>
                      </div>
                    </div>
                  </TabPanel>
                  <TabPanel>
                    <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
                      <DiagramView :tables="schemaStore.tables" :views="schemaStore.views"
                        :relationships="schemaStore.relationships" />
                    </div>
                  </TabPanel>
                </TabPanels>
              </TabGroup>
            </div>
          </div>
        </TabGroup>
      </div>
    </main>
  </div>
</template>
