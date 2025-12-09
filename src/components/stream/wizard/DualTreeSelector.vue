<template>
  <div class="flex flex-col gap-6">
    <!-- Split Pane Container -->
    <div class="grid gap-4 grid-cols-1 lg:grid-cols-2 lg:h-[600px]">
      <!-- Source Tree (Left) - Sky Blue Theme -->
      <div
        class="relative rounded-xl bg-linear-to-br from-sky-50 to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-850 overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-gray-900/30 h-full"
      >
        <div
          class="px-4 py-3 border-b border-blue-200 dark:border-blue-800/60 bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 dark:from-blue-900/20 dark:via-blue-900/10 dark:to-blue-900/5 relative overflow-hidden"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-3 min-w-0">
              <div class="flex-shrink-0">
                <img
                  src="/images/steps/source-step.svg"
                  alt="Source"
                  class="w-9 h-9 drop-shadow-sm"
                />
              </div>
              <div class="min-w-0">
                <h3 class="text-base font-semibold text-blue-700 dark:text-blue-200 leading-tight">
                  {{
                    localFederatedConnections.length > 1
                      ? 'Source Connections'
                      : 'Source Connection'
                  }}
                </h3>
                <p class="text-xs text-blue-700/80 dark:text-blue-100/80 font-medium truncate">
                  {{
                    localFederatedConnections.length > 1
                      ? 'Federated mode: combine data from multiple sources'
                      : 'Select where to read data from'
                  }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <BaseButton
                variant="secondary"
                size="sm"
                class="whitespace-nowrap"
                @click="emit('add-connection', 'source')"
              >
                New Connection
              </BaseButton>
            </div>
          </div>
        </div>

        <!-- Source Content: Connection tree with multi-select checkboxes -->
        <StreamConnectionFilter
          :connection-search="sourceConnectionSearch"
          @update:connection-search="sourceConnectionSearch = $event"
          @update:selected-type="sourceConnectionType = $event"
        />

        <div class="flex-1 overflow-y-auto p-3 bg-white dark:bg-gray-900/60">
          <ConnectionTreeSelector
            :connections="filteredSourceConnections"
            :selected-connection-id="sourceConnectionId"
            :selected-database="sourceDatabase"
            :selected-schema="sourceSchema"
            :search-query="sourceConnectionSearch"
            :federated-connections="localFederatedConnections"
            mode="source"
            enable-multi-select
            @select-connection="handleSourceConnectionSelect"
            @select-database="handleSourceDatabaseSelect"
            @toggle-federated="handleToggleFederatedConnection"
          />
        </div>
      </div>

      <!-- Target Tree (Right) - Emerald Theme -->
      <div
        class="relative rounded-xl bg-linear-to-br from-emerald-50 to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-850 overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-gray-900/30 h-full"
      >
        <div
          class="px-4 py-3 border-b border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-50 dark:from-emerald-900/20 dark:via-emerald-900/10 dark:to-emerald-900/5 relative overflow-hidden"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-3 min-w-0">
              <div class="flex-shrink-0">
                <img
                  src="/images/steps/target-step.svg"
                  alt="Target"
                  class="w-9 h-9 drop-shadow-sm"
                />
              </div>
              <div class="min-w-0">
                <h3
                  class="text-base font-semibold text-emerald-700 dark:text-emerald-200 leading-tight"
                >
                  Target Connection
                </h3>
                <p
                  class="text-xs text-emerald-700/80 dark:text-emerald-100/80 font-medium truncate"
                >
                  Select where to write data to
                </p>
              </div>
            </div>
            <BaseButton
              variant="secondary"
              size="sm"
              class="whitespace-nowrap"
              @click="emit('add-connection', 'target')"
            >
              New Connection
            </BaseButton>
          </div>
        </div>

        <!-- Target Filters -->
        <StreamConnectionFilter
          :connection-search="targetConnectionSearch"
          @update:connection-search="targetConnectionSearch = $event"
          @update:selected-type="targetConnectionType = $event"
        />

        <div class="flex-1 overflow-y-auto p-3 bg-white dark:bg-gray-900/60">
          <ConnectionTreeSelector
            :connections="filteredTargetConnections"
            :selected-connection-id="targetConnectionId"
            :selected-database="targetDatabase"
            :selected-schema="targetSchema"
            :selected-path="targetPath"
            :search-query="targetConnectionSearch"
            mode="target"
            @select-connection="handleTargetConnectionSelect"
            @select-database="handleTargetDatabaseSelect"
            @select-file="handleTargetFileSelect"
            @select-bucket="handleTargetBucketSelect"
          />
        </div>
      </div>
    </div>

    <!-- Selection Summary - Enhanced Chips -->
    <div
      v-if="sourceConnectionId || targetConnectionId || localFederatedConnections.length > 0"
      class="shrink-0 flex flex-col gap-2"
    >
      <!-- Source and Target Chips -->
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 flex-1">
          <!-- Source Chip - Sky Blue -->
          <div
            class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-600/60 rounded-lg px-3 py-1.5 text-sm shadow-sm shadow-blue-900/10 dark:shadow-blue-900/40"
          >
            <span class="font-semibold text-blue-700 dark:text-blue-200">Source:</span>
            <template v-if="localFederatedConnections.length > 1">
              <span class="text-blue-900 dark:text-blue-100 ml-1 font-medium">
                {{ localFederatedConnections.length }} connections (federated)
              </span>
            </template>
            <template v-else>
              <span
                v-if="sourceConnectionId"
                class="text-blue-900 dark:text-blue-100 ml-1 font-medium"
              >
                {{ getConnectionName(sourceConnectionId) }}
                <span v-if="sourceDatabase" class="text-blue-600 dark:text-blue-300">
                  / {{ sourceDatabase }}
                </span>
              </span>
              <span v-else class="text-blue-500/80 dark:text-blue-300/70 ml-1 italic"
                >Not selected</span
              >
            </template>
          </div>

          <!-- Arrow - Sky Blue to Emerald Gradient -->
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="url(#skyToEmerald)" viewBox="0 0 24 24">
            <defs>
              <linearGradient id="skyToEmerald" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color: rgb(14, 165, 233); stop-opacity: 1" />
                <stop offset="100%" style="stop-color: rgb(16, 185, 129); stop-opacity: 1" />
              </linearGradient>
            </defs>
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>

          <!-- Target Chip - Emerald -->
          <div
            class="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-600/60 rounded-lg px-3 py-1.5 text-sm shadow-sm shadow-emerald-900/10 dark:shadow-emerald-900/40"
          >
            <span class="font-semibold text-emerald-700 dark:text-emerald-200">Target:</span>
            <span
              v-if="targetConnectionId"
              class="text-emerald-900 dark:text-emerald-100 ml-1 font-medium"
            >
              {{ getConnectionName(targetConnectionId) }}
              <span v-if="targetDatabase" class="text-emerald-600 dark:text-emerald-300">
                / {{ targetDatabase }}
              </span>
            </span>
            <span v-else class="text-emerald-500/80 dark:text-emerald-300/70 ml-1 italic"
              >Not selected</span
            >
          </div>
        </div>

        <!-- Clear All Button -->
        <button
          type="button"
          class="text-sm text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium whitespace-nowrap transition-colors duration-200"
          @click="clearAll"
        >
          Clear All
        </button>
      </div>
    </div>

    <!-- Validation Error -->
    <div
      v-if="isSameConnectionAndDatabase"
      class="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-600 rounded-lg p-3"
    >
      <div class="flex items-center">
        <svg
          class="w-5 h-5 text-red-600 dark:text-red-400 mr-2"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clip-rule="evenodd"
          />
        </svg>
        <p class="text-sm text-red-700 dark:text-red-300 font-medium">
          Source and target cannot be the same connection and database
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { getConnectionHost } from '@/utils/specBuilder'
import BaseButton from '@/components/base/BaseButton.vue'
import ConnectionTreeSelector from './ConnectionTreeSelector.vue'
import StreamConnectionFilter from './StreamConnectionFilter.vue'
import ConnectionAliasPanel from '@/components/console/ConnectionAliasPanel.vue'
import type { ConnectionMapping } from '@/api/federated'

interface Props {
  sourceConnectionId?: string | null
  targetConnectionId?: string | null
  sourceDatabase?: string | null
  targetDatabase?: string | null
  sourceSchema?: string | null
  targetSchema?: string | null
  targetPath?: string | null
  /** Enable federated (multi-source) mode */
  federatedMode?: boolean
  /** Connection mappings for federated mode */
  federatedConnections?: ConnectionMapping[]
}

const props = withDefaults(defineProps<Props>(), {
  sourceConnectionId: null,
  targetConnectionId: null,
  sourceDatabase: null,
  targetDatabase: null,
  sourceSchema: null,
  targetSchema: null,
  targetPath: null,
  federatedMode: false,
  federatedConnections: () => []
})

const emit = defineEmits<{
  'update:source-connection': [connectionId: string, database?: string, schema?: string]
  'update:target-connection': [
    connectionId: string,
    database?: string,
    schema?: string,
    path?: string
  ]
  'add-connection': [paneType: 'source' | 'target']
  'clear-all': []
  'update:federated-mode': [enabled: boolean]
  'update:federated-connections': [connections: ConnectionMapping[]]
}>()

const connectionsStore = useConnectionsStore()
const navigationStore = useExplorerNavigationStore()
const sourceConnectionSearch = ref('')
const targetConnectionSearch = ref('')
const sourceConnectionType = ref<string | null>(null)
const targetConnectionType = ref<string | null>(null)

// Federated connections state (auto-detects federated mode when length > 1)
const localFederatedConnections = ref<ConnectionMapping[]>([...props.federatedConnections])

// Sync prop changes to local state
watch(
  () => props.federatedConnections,
  (val) => {
    localFederatedConnections.value = [...val]
    // Auto-emit federated mode based on connection count
    const isFederated = val.length > 1
    emit('update:federated-mode', isFederated)
  },
  { deep: true, immediate: true }
)

// Auto-detect and emit federated mode when connections change
watch(
  localFederatedConnections,
  (connections) => {
    const isFederated = connections.length > 1
    emit('update:federated-mode', isFederated)
  },
  { deep: true }
)

// Handle federated connections update
function handleFederatedConnectionsUpdate(connections: ConnectionMapping[]) {
  localFederatedConnections.value = connections
  emit('update:federated-connections', connections)
}

// Handle checkbox toggle for federated multi-select
function handleToggleFederatedConnection(payload: {
  connectionId: string
  database?: string
  checked: boolean
}) {
  const connection = connectionsStore.connectionByID(payload.connectionId)
  if (!connection) return

  // Filter out file connections - they don't go in federatedConnections
  const isFileConn =
    connection.type?.toLowerCase()?.includes('file') ||
    connection.type?.toLowerCase() === 's3' ||
    connection.type?.toLowerCase() === 'gcs'

  if (isFileConn) return

  if (payload.checked) {
    // Add to federated connections
    const existing = localFederatedConnections.value.find(
      (c) => c.connectionId === payload.connectionId
    )
    if (!existing) {
      const aliasIndex = localFederatedConnections.value.length + 1
      const alias = `db${aliasIndex}`
      const mapping: ConnectionMapping = {
        connectionId: payload.connectionId,
        alias: alias,
        database: payload.database
      }
      localFederatedConnections.value = [...localFederatedConnections.value, mapping]
      emit('update:federated-connections', localFederatedConnections.value)
    }
  } else {
    // Remove from federated connections
    localFederatedConnections.value = localFederatedConnections.value.filter(
      (c) => c.connectionId !== payload.connectionId
    )
    emit('update:federated-connections', localFederatedConnections.value)
  }

  // Update single-source selection for backward compatibility
  if (localFederatedConnections.value.length === 1) {
    const single = localFederatedConnections.value[0]
    emit('update:source-connection', single.connectionId, single.database, undefined)
  } else if (localFederatedConnections.value.length === 0) {
    emit('update:source-connection', '', undefined, undefined)
  }
}

const connections = computed(() => connectionsStore.connections)

// Helper function to match type filter
function matchesTypeFilter(conn: { type?: string }, typeFilter: string | null): boolean {
  const filterLabel = typeFilter || 'All'
  const filter = filterLabel.toLowerCase()
  if (!filter || filter === 'all') return true
  const connType = (conn.type || '').toLowerCase()
  if (!connType) return false
  if (filter === 'postgresql') return connType.includes('postgres')
  if (filter === 'files') return connType.includes('file')
  return connType.includes(filter)
}

// Helper function to normalize text for case-insensitive search
function normalize(text: string): string {
  return text.toLowerCase()
}

// Deep search function - searches through connection, databases, tables, views
function connectionMatchesDeepSearch(
  connection: { id: string; name?: string; type?: string; spec?: any },
  query: string
): boolean {
  if (!query.trim()) return true

  const normalizedQuery = normalize(query)

  // Search in connection basic info
  const host = connection.spec?.database?.host || connection.spec?.snowflake?.account || ''
  const connectionLabel = `${connection.name || ''} ${host} ${connection.type || ''}`
  if (normalize(connectionLabel).includes(normalizedQuery)) return true

  // Search in database names
  const databases = navigationStore.databasesState[connection.id] || []
  if (databases.some((db) => normalize(db.name).includes(normalizedQuery))) return true

  // Search in metadata (tables and views)
  const metadataByDatabase = navigationStore.metadataState[connection.id] || {}
  for (const databaseName in metadataByDatabase) {
    const metadata = metadataByDatabase[databaseName]

    // Search in tables
    const hasTableMatch = Object.values(metadata.tables || {}).some(
      (table: { name?: string; schema?: string }) =>
        normalize(table.name || '').includes(normalizedQuery) ||
        (table.schema && normalize(table.schema).includes(normalizedQuery))
    )
    if (hasTableMatch) return true

    // Search in views
    const hasViewMatch = Object.values(metadata.views || {}).some(
      (view: { name?: string; schema?: string }) =>
        normalize(view.name || '').includes(normalizedQuery) ||
        (view.schema && normalize(view.schema).includes(normalizedQuery))
    )
    if (hasViewMatch) return true
  }

  return false
}

const filteredSourceConnections = computed(() => {
  let filtered = connections.value.filter((conn) =>
    matchesTypeFilter(conn, sourceConnectionType.value)
  )

  // Sort by creation date (newest first) then by name
  filtered = filtered.sort((a, b) => {
    const ac = Number(a.created || 0)
    const bc = Number(b.created || 0)
    if (bc !== ac) return bc - ac
    return (a.name || '').localeCompare(b.name || '')
  })

  const query = sourceConnectionSearch.value

  return filtered.filter((conn) => connectionMatchesDeepSearch(conn, query))
})

const filteredTargetConnections = computed(() => {
  let filtered = connections.value.filter((conn) =>
    matchesTypeFilter(conn, targetConnectionType.value)
  )

  // Sort by creation date (newest first) then by name
  filtered = filtered.sort((a, b) => {
    const ac = Number(a.created || 0)
    const bc = Number(b.created || 0)
    if (bc !== ac) return bc - ac
    return (a.name || '').localeCompare(b.name || '')
  })

  const query = targetConnectionSearch.value

  return filtered.filter((conn) => connectionMatchesDeepSearch(conn, query))
})

const isSameConnectionAndDatabase = computed(() => {
  return (
    props.sourceConnectionId &&
    props.targetConnectionId &&
    props.sourceConnectionId === props.targetConnectionId &&
    props.sourceDatabase === props.targetDatabase &&
    props.sourceDatabase
  )
})

function getConnectionName(connectionId: string): string {
  const conn = connections.value.find((c) => c.id === connectionId)
  return conn?.name || connectionId
}

function handleSourceConnectionSelect(payload: {
  connectionId: string
  database?: string
  schema?: string
}) {
  emit('update:source-connection', payload.connectionId, payload.database, payload.schema)
}

function handleSourceDatabaseSelect(payload: {
  connectionId: string
  database: string
  schema?: string
}) {
  emit('update:source-connection', payload.connectionId, payload.database, payload.schema)
}

function handleTargetConnectionSelect(payload: {
  connectionId: string
  database?: string
  schema?: string
}) {
  emit('update:target-connection', payload.connectionId, payload.database, payload.schema)
}

function handleTargetDatabaseSelect(payload: {
  connectionId: string
  database: string
  schema?: string
}) {
  emit('update:target-connection', payload.connectionId, payload.database, payload.schema)
}

function handleTargetFileSelect(payload: { connectionId: string; path: string }) {
  emit('update:target-connection', payload.connectionId, undefined, undefined, payload.path)
}

function handleTargetBucketSelect(payload: { connectionId: string; bucket: string }) {
  // For S3 targets, the bucket is passed as the "database" parameter
  // Also set a default output path for staging files before S3 upload
  emit(
    'update:target-connection',
    payload.connectionId,
    payload.bucket,
    undefined,
    '/tmp/dbconvert'
  )
}

function clearAll() {
  emit('clear-all')
}
</script>
