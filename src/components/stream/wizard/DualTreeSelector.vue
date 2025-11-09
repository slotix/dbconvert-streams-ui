<template>
  <div class="flex flex-col h-full gap-6">
    <!-- Split Pane Container -->
    <div class="grid grid-cols-2 gap-4 flex-1 min-h-0">
      <!-- Source Tree (Left) - Sky Blue Theme -->
      <div
        class="relative rounded-xl bg-linear-to-br from-sky-50 to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-850 overflow-hidden flex flex-col border border-sky-200 dark:border-sky-400/40 shadow-sm dark:shadow-gray-900/30"
      >
        <div
          class="px-4 py-3 border-b border-sky-100 dark:border-sky-400/30 bg-linear-to-r from-sky-50 to-white dark:from-gray-900 dark:to-gray-900/60"
        >
          <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <img src="/images/steps/source-step.svg" alt="Source" class="w-8 h-8 mr-2" />
            <span
              class="bg-linear-to-r from-sky-600 to-sky-500 dark:from-sky-400 dark:to-sky-300 bg-clip-text text-transparent"
            >
              Source Connection
            </span>
          </h3>
          <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Select where to read data from
          </p>
        </div>

        <!-- Source Filters -->
        <StreamConnectionFilter
          :connection-search="sourceConnectionSearch"
          pane-type="source"
          @update:connection-search="sourceConnectionSearch = $event"
          @update:selected-type="sourceConnectionType = $event"
          @add-connection="emit('add-connection', $event)"
        />

        <div class="flex-1 overflow-y-auto p-4 bg-white dark:bg-gray-900/60">
          <ConnectionTreeSelector
            :connections="filteredSourceConnections"
            :selected-connection-id="sourceConnectionId"
            :selected-database="sourceDatabase"
            :selected-schema="sourceSchema"
            :search-query="sourceConnectionSearch"
            mode="source"
            @select-connection="handleSourceConnectionSelect"
            @select-database="handleSourceDatabaseSelect"
          />
        </div>
      </div>

      <!-- Target Tree (Right) - Emerald Theme -->
      <div
        class="relative rounded-xl bg-linear-to-br from-emerald-50 to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-850 overflow-hidden flex flex-col border border-emerald-200 dark:border-emerald-400/40 shadow-sm dark:shadow-gray-900/30"
      >
        <div
          class="px-4 py-3 border-b border-emerald-100 dark:border-emerald-400/30 bg-linear-to-r from-emerald-50 to-white dark:from-gray-900 dark:to-gray-900/60"
        >
          <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <img src="/images/steps/target-step.svg" alt="Target" class="w-8 h-8 mr-2" />
            <span
              class="bg-linear-to-r from-emerald-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300 bg-clip-text text-transparent"
            >
              Target Connection
            </span>
          </h3>
          <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Select where to write data to</p>
        </div>

        <!-- Target Filters -->
        <StreamConnectionFilter
          :connection-search="targetConnectionSearch"
          pane-type="target"
          @update:connection-search="targetConnectionSearch = $event"
          @update:selected-type="targetConnectionType = $event"
          @add-connection="emit('add-connection', $event)"
        />

        <div class="flex-1 overflow-y-auto p-4 bg-white dark:bg-gray-900/60">
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
          />
        </div>
      </div>
    </div>

    <!-- Selection Summary - Enhanced Chips -->
    <div v-if="sourceConnectionId || targetConnectionId" class="shrink-0 flex flex-col gap-3">
      <!-- Source and Target Chips -->
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 flex-1">
          <!-- Source Chip - Sky Blue -->
          <div
            class="bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-400/40 rounded-lg px-4 py-2.5 text-sm shadow-sm dark:shadow-gray-900/30"
          >
            <span class="font-semibold text-sky-600 dark:text-sky-300">Source:</span>
            <span
              v-if="sourceConnectionId"
              class="text-slate-700 dark:text-gray-200 ml-1 font-medium"
            >
              {{ getConnectionName(sourceConnectionId) }}
              <span v-if="sourceDatabase" class="text-slate-600 dark:text-gray-400">
                / {{ sourceDatabase }}
              </span>
            </span>
            <span v-else class="text-gray-500 dark:text-gray-400 ml-1 italic">Not selected</span>
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
            class="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-400/40 rounded-lg px-4 py-2.5 text-sm shadow-sm dark:shadow-gray-900/30"
          >
            <span class="font-semibold text-emerald-600 dark:text-emerald-300">Target:</span>
            <span
              v-if="targetConnectionId"
              class="text-slate-700 dark:text-gray-200 ml-1 font-medium"
            >
              {{ getConnectionName(targetConnectionId) }}
              <span v-if="targetDatabase" class="text-slate-600 dark:text-gray-400">
                / {{ targetDatabase }}
              </span>
            </span>
            <span v-else class="text-gray-500 dark:text-gray-400 ml-1 italic">Not selected</span>
          </div>
        </div>

        <!-- Clear All Button -->
        <button
          type="button"
          class="text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 font-medium whitespace-nowrap transition-colors duration-200"
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
import { ref, computed } from 'vue'
import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import ConnectionTreeSelector from './ConnectionTreeSelector.vue'
import StreamConnectionFilter from './StreamConnectionFilter.vue'

interface Props {
  sourceConnectionId?: string | null
  targetConnectionId?: string | null
  sourceDatabase?: string | null
  targetDatabase?: string | null
  sourceSchema?: string | null
  targetSchema?: string | null
  targetPath?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  sourceConnectionId: null,
  targetConnectionId: null,
  sourceDatabase: null,
  targetDatabase: null,
  sourceSchema: null,
  targetSchema: null,
  targetPath: null
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
}>()

const connectionsStore = useConnectionsStore()
const navigationStore = useExplorerNavigationStore()
const sourceConnectionSearch = ref('')
const targetConnectionSearch = ref('')
const sourceConnectionType = ref<string | null>(null)
const targetConnectionType = ref<string | null>(null)

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
  connection: { id: string; name?: string; host?: string; type?: string },
  query: string
): boolean {
  if (!query.trim()) return true

  const normalizedQuery = normalize(query)

  // Search in connection basic info
  const connectionLabel = `${connection.name || ''} ${connection.host || ''} ${connection.type || ''}`
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

function clearAll() {
  emit('clear-all')
}
</script>
