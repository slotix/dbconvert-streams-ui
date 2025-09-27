<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import { useSchemaStore } from '@/stores/schema'
import { Tab, TabGroup, TabList, TabPanels, TabPanel } from '@headlessui/vue'
// (Removed TrashIcon as Clear All control was removed)
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import ExplorerSidebarTree from '@/components/database/ExplorerSidebarTree.vue'
import ExplorerBreadcrumb from '@/components/database/ExplorerBreadcrumb.vue'
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

// (Removed dropdown change handler with the control)

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

// Fallbacks from recent connections so header shows host/port on hard refresh
const recentCurrent = computed(() =>
  recentConnections.value.find((c) => c.id === (currentConnectionId.value as string))
)

const displayHostPort = computed(() => {
  const host = currentConnection.value?.host || recentCurrent.value?.host
  const port =
    (currentConnection.value?.port && String(currentConnection.value?.port)) ||
    recentCurrent.value?.port
  if (!host || !port) return null
  return `${host}:${port}`
})

const displayCloudProvider = computed(
  () => currentConnection.value?.cloud_provider || recentCurrent.value?.cloud_provider || ''
)

const displayType = computed(() => currentConnection.value?.type || recentCurrent.value?.type || '')

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

// Note: per UX simplification, individual close/remove for a single recent connection
// was part of the tabs UI and is removed with tabs. "Clear All" remains available.

// (Removed switchConnection with the control)

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

function handleBreadcrumbNavigate(payload: { level: 'database' | 'schema' | 'type' | 'name' }) {
  // Clicking a breadcrumb level clears deeper selections and updates the query
  if (payload.level === 'database') {
    selectedSchemaName.value = null
    selectedObjectType.value = null
    selectedObjectName.value = null
    selectedMeta.value = null
  } else if (payload.level === 'schema') {
    selectedObjectType.value = null
    selectedObjectName.value = null
    selectedMeta.value = null
  } else if (payload.level === 'type') {
    selectedObjectName.value = null
    selectedMeta.value = null
  } else if (payload.level === 'name') {
    // no-op, leaf
  }

  router.replace({
    path: `/explorer/${currentConnectionId.value}`,
    query: {
      db: selectedDatabaseName.value || undefined,
      schema: selectedSchemaName.value || undefined,
      type: selectedObjectType.value || undefined,
      name: selectedObjectName.value || undefined
    }
  })
}

// (Removed Clear All recent connections control)

// (Removed helpers used only by the old tabs UI)

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

      <!-- Explorer content with simple connection selector -->
      <div v-else>
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
            <div class="mb-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-sm text-gray-500">
                  <span v-if="displayHostPort" class="font-medium text-gray-700">
                    {{ displayHostPort }}
                  </span>
                  <span v-if="displayHostPort" class="text-gray-400">•</span>
                  <ExplorerBreadcrumb :database="selectedDatabaseName" :schema="selectedSchemaName"
                    :type="selectedObjectType" :name="selectedObjectName" @navigate="handleBreadcrumbNavigate" />
                </div>
                <CloudProviderBadge v-if="displayType" :cloud-provider="displayCloudProvider" :db-type="displayType" />
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
      </div>
    </main>
  </div>
</template>
