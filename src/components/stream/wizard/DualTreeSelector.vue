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
                  Source Connections
                </h3>
                <p class="text-xs text-blue-700/80 dark:text-blue-100/80 font-medium truncate">
                  Select one or more sources to read from
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
            :selected-connection-id="primarySourceId"
            :selected-database="primarySourceDatabase"
            :selected-schema="sourceSchema"
            :search-query="sourceConnectionSearch"
            :source-connections="localSourceConnections"
            mode="source"
            enable-multi-select
            @select-connection="handleSourceConnectionSelect"
            @select-database="handleSourceDatabaseSelect"
            @select-file="handleSourceFileSelect"
            @select-bucket="handleSourceBucketSelect"
            @toggle-source-connection="handleToggleSourceConnection"
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
      v-if="primarySourceId || targetConnectionId || localSourceConnections.length > 0"
      class="shrink-0 flex flex-col gap-3"
    >
      <!-- Source and Target Chips -->
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 flex-1">
          <!-- Source Chip - Sky Blue -->
          <div
            class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-600/60 rounded-lg px-3 py-1.5 text-sm shadow-sm shadow-blue-900/10 dark:shadow-blue-900/40"
          >
            <span class="font-semibold text-blue-700 dark:text-blue-200">Source:</span>
            <span
              v-if="localSourceConnections.length > 0"
              class="text-blue-900 dark:text-blue-100 ml-1 font-medium"
            >
              <template v-if="localSourceConnections.length === 1">
                {{ getConnectionName(localSourceConnections[0].connectionId) }}
                <span
                  v-if="localSourceConnections[0].database"
                  class="text-blue-600 dark:text-blue-300"
                >
                  / {{ localSourceConnections[0].database }}
                </span>
              </template>
              <template v-else> {{ localSourceConnections.length }} sources </template>
            </span>
            <span v-else class="text-blue-500/80 dark:text-blue-300/70 ml-1 italic"
              >Not selected</span
            >
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

      <!-- Source Aliases - shown when multiple sources selected -->
      <div
        v-if="showAliasUI"
        class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/60 rounded-lg p-3"
      >
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs font-semibold uppercase text-amber-700 dark:text-amber-300"
            >Source Aliases</span
          >
          <span class="text-xs text-amber-600 dark:text-amber-400">(used in SQL queries)</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="conn in localSourceConnections"
            :key="`${conn.connectionId}-${conn.database}`"
            class="flex items-center gap-2 bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-600 rounded-md px-2 py-1.5"
          >
            <input
              type="text"
              :value="conn.alias"
              class="w-16 px-1.5 py-0.5 text-xs font-mono font-semibold bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-600 rounded text-amber-800 dark:text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              @input="
                updateConnectionAlias(
                  conn.connectionId,
                  conn.database,
                  ($event.target as HTMLInputElement).value
                )
              "
            />
            <span class="text-xs text-gray-600 dark:text-gray-300">
              {{ getConnectionName(conn.connectionId) }}
              <span v-if="conn.database" class="text-gray-500 dark:text-gray-400">
                / {{ conn.database }}
              </span>
            </span>
            <button
              type="button"
              class="p-0.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title="Remove source"
              @click="removeSourceConnection(conn.connectionId, conn.database)"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
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
import { X } from 'lucide-vue-next'
import BaseButton from '@/components/base/BaseButton.vue'
import ConnectionTreeSelector from './ConnectionTreeSelector.vue'
import StreamConnectionFilter from './StreamConnectionFilter.vue'
import type { StreamConnectionMapping } from '@/types/streamConfig'
import type { Connection } from '@/types/connections'
import { generateTypeBasedAlias } from '@/utils/federatedUtils'
import {
  getConnectionKindFromSpec,
  getConnectionTypeLabel,
  matchesConnectionTypeFilter,
  type ConnectionSpec
} from '@/types/specs'

interface Props {
  sourceConnectionId?: string | null
  targetConnectionId?: string | null
  sourceDatabase?: string | null
  targetDatabase?: string | null
  sourceSchema?: string | null
  targetSchema?: string | null
  targetPath?: string | null
  /** Source connections (multi-source supported) */
  sourceConnections?: StreamConnectionMapping[]
}

const props = withDefaults(defineProps<Props>(), {
  sourceConnectionId: null,
  targetConnectionId: null,
  sourceDatabase: null,
  targetDatabase: null,
  sourceSchema: null,
  targetSchema: null,
  targetPath: null,
  sourceConnections: () => []
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
  'update:source-connections': [connections: StreamConnectionMapping[]]
}>()

const connectionsStore = useConnectionsStore()
const navigationStore = useExplorerNavigationStore()
const sourceConnectionSearch = ref('')
const targetConnectionSearch = ref('')
const sourceConnectionType = ref<string | null>(null)
const targetConnectionType = ref<string | null>(null)

// Source connections state (auto-detects multi-source when length > 1)
const localSourceConnections = ref<StreamConnectionMapping[]>([...props.sourceConnections])

// Sync prop changes to local state
watch(
  () => props.sourceConnections,
  (val) => {
    localSourceConnections.value = [...val]
  },
  { deep: true, immediate: true }
)

const primarySourceId = computed(
  () => localSourceConnections.value[0]?.connectionId || props.sourceConnectionId
)
const primarySourceDatabase = computed(
  () => localSourceConnections.value[0]?.database || props.sourceDatabase
)
// Show alias UI when 2+ sources selected (for disambiguation in queries)
const showAliasUI = computed(() => localSourceConnections.value.length > 1)

// Generate type-based alias for a connection (e.g., pg1, my1, s31)
function generateAlias(connectionId: string): string {
  const connection = connectionsStore.connectionByID(connectionId)
  const connectionType = getConnectionTypeLabel(connection?.spec, connection?.type) || undefined
  const existingAliases = localSourceConnections.value.map((c) => c.alias || '')
  return generateTypeBasedAlias(connectionType, existingAliases)
}

// Update alias for a connection
function updateConnectionAlias(
  connectionId: string,
  database: string | undefined,
  newAlias: string
) {
  // Sanitize: lowercase, alphanumeric + underscore only
  const sanitized = newAlias.toLowerCase().replace(/[^a-z0-9_]/g, '')
  if (!sanitized) return

  // Check for uniqueness (excluding the current connection)
  const isDuplicate = localSourceConnections.value.some(
    (c) => c.alias === sanitized && !(c.connectionId === connectionId && c.database === database)
  )
  if (isDuplicate) return

  localSourceConnections.value = localSourceConnections.value.map((c) =>
    c.connectionId === connectionId && c.database === database ? { ...c, alias: sanitized } : c
  )
  emit('update:source-connections', localSourceConnections.value)
}

// Remove a single source connection
function removeSourceConnection(connectionId: string, database: string | undefined) {
  localSourceConnections.value = localSourceConnections.value.filter(
    (c) => !(c.connectionId === connectionId && c.database === database)
  )
  emit('update:source-connections', localSourceConnections.value)
  syncPrimarySelection()
}

function syncPrimarySelection() {
  const primary = localSourceConnections.value[0]
  // Only emit single-source updates; multi-source state is handled via update:source-connections
  if (!primary || localSourceConnections.value.length !== 1) return
  emit('update:source-connection', primary.connectionId, primary.database, undefined)
}

// Handle checkbox toggle for multi-source selection
function handleToggleSourceConnection(payload: {
  connectionId: string
  database?: string
  checked: boolean
}) {
  const connection = connectionsStore.connectionByID(payload.connectionId)
  if (!connection) return

  // Check if this is an S3 connection
  const isS3Connection = getConnectionKindFromSpec(connection.spec) === 's3'

  if (payload.checked) {
    // Add to source connections - check both connectionId AND database
    const existing = localSourceConnections.value.find(
      (c) => c.connectionId === payload.connectionId && c.database === payload.database
    )
    if (!existing) {
      const alias = generateAlias(payload.connectionId)
      const mapping: StreamConnectionMapping = {
        connectionId: payload.connectionId,
        alias: alias,
        database: payload.database,
        // For S3 connections, set the s3 config with bucket (database holds the bucket name)
        ...(isS3Connection && payload.database ? { s3: { bucket: payload.database } } : {})
      }
      localSourceConnections.value = [...localSourceConnections.value, mapping]
    }
  } else {
    // Remove from source connections - match both connectionId AND database
    localSourceConnections.value = localSourceConnections.value.filter(
      (c) => !(c.connectionId === payload.connectionId && c.database === payload.database)
    )
  }

  emit('update:source-connections', localSourceConnections.value)
  syncPrimarySelection()
}

const connections = computed(() => connectionsStore.connections)

// Helper function to match type filter
function matchesTypeFilter(conn: Connection, typeFilter: string | null): boolean {
  return matchesConnectionTypeFilter(conn.spec, conn.type, typeFilter)
}

// Helper function to normalize text for case-insensitive search
function normalize(text: string): string {
  return text.toLowerCase()
}

// Deep search function - searches through connection, databases, tables, views
function connectionMatchesDeepSearch(
  connection: { id: string; name?: string; type?: string; spec?: unknown },
  query: string
): boolean {
  if (!query.trim()) return true

  const normalizedQuery = normalize(query)

  // Search in connection basic info
  type ConnectionSpecLike = {
    database?: { host?: string }
    snowflake?: { account?: string }
  }

  const spec = (connection.spec ?? undefined) as ConnectionSpecLike | undefined
  const host = spec?.database?.host || spec?.snowflake?.account || ''
  const typeLabel =
    getConnectionTypeLabel(spec as ConnectionSpec | undefined, connection.type) || ''
  const connectionLabel = `${connection.name || ''} ${host} ${typeLabel}`
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

// Conflict check: source and target cannot be same connection + database (for single source)
// With multiple sources, at least one differs from target, so this check is skipped
const isSameConnectionAndDatabase = computed(() => {
  return (
    !showAliasUI.value &&
    primarySourceId.value &&
    props.targetConnectionId &&
    primarySourceId.value === props.targetConnectionId &&
    (primarySourceDatabase.value || props.sourceDatabase) === props.targetDatabase &&
    (primarySourceDatabase.value || props.sourceDatabase)
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
  const alias =
    localSourceConnections.value.find((c) => c.connectionId === payload.connectionId)?.alias ||
    generateAlias(payload.connectionId)
  localSourceConnections.value = [
    {
      alias,
      connectionId: payload.connectionId,
      database: payload.database
    }
  ]
  emit('update:source-connections', localSourceConnections.value)
  emit('update:source-connection', payload.connectionId, payload.database, payload.schema)
}

function handleSourceDatabaseSelect(payload: {
  connectionId: string
  database: string
  schema?: string
}) {
  const alias =
    localSourceConnections.value.find((c) => c.connectionId === payload.connectionId)?.alias ||
    generateAlias(payload.connectionId)
  localSourceConnections.value = [
    {
      alias,
      connectionId: payload.connectionId,
      database: payload.database
    }
  ]
  emit('update:source-connections', localSourceConnections.value)
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

function handleSourceFileSelect(payload: { connectionId: string; path: string }) {
  // For local file sources, treat the path as the "database" equivalent
  const alias =
    localSourceConnections.value.find((c) => c.connectionId === payload.connectionId)?.alias ||
    generateAlias(payload.connectionId)
  localSourceConnections.value = [
    {
      alias,
      connectionId: payload.connectionId,
      database: payload.path // Use path as database for file sources
    }
  ]
  emit('update:source-connections', localSourceConnections.value)
  emit('update:source-connection', payload.connectionId, payload.path, undefined)
}

function handleSourceBucketSelect(payload: { connectionId: string; bucket: string }) {
  // For S3 sources, set both database (for display) and s3.bucket (for backend)
  const alias =
    localSourceConnections.value.find((c) => c.connectionId === payload.connectionId)?.alias ||
    generateAlias(payload.connectionId)
  localSourceConnections.value = [
    {
      alias,
      connectionId: payload.connectionId,
      database: payload.bucket, // For display purposes
      s3: { bucket: payload.bucket } // Required by backend for S3 sources
    }
  ]
  emit('update:source-connections', localSourceConnections.value)
  emit('update:source-connection', payload.connectionId, payload.bucket, undefined)
}

function handleTargetFileSelect(payload: { connectionId: string; path: string }) {
  emit('update:target-connection', payload.connectionId, undefined, undefined, payload.path)
}

function handleTargetBucketSelect(payload: { connectionId: string; bucket: string }) {
  // For S3 targets, the bucket is passed as the "database" parameter
  // Empty output path lets backend use platform-appropriate temp directory
  emit('update:target-connection', payload.connectionId, payload.bucket, undefined, '')
}

function clearAll() {
  emit('clear-all')
}
</script>
