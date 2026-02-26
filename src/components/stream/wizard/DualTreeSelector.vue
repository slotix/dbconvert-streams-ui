<template>
  <div class="flex h-full min-h-0 flex-col gap-4">
    <!-- Split Pane Container -->
    <div class="grid flex-1 min-h-0 grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- Source Tree (Left) - Sky Blue Theme -->
      <div
        class="relative rounded-xl bg-linear-to-br from-sky-50 to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-850 overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-gray-900/30 h-full"
      >
        <div
          class="px-4 py-3 border-b border-sky-200 dark:border-sky-800/60 bg-gradient-to-br from-sky-50 via-sky-100 to-sky-50 dark:from-sky-900/20 dark:via-sky-900/10 dark:to-sky-900/5 relative overflow-hidden"
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
                <h3 class="text-base font-semibold text-sky-700 dark:text-sky-200 leading-tight">
                  Source Connections
                </h3>
                <p class="text-xs text-sky-700/80 dark:text-sky-100/80 font-medium truncate">
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

    <!-- Validation Error -->
    <div
      v-if="isSameConnectionAndDatabase"
      class="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-600 rounded-lg p-3"
    >
      <div class="flex items-center">
        <svg
          class="w-5 h-5 text-red-600 dark:text-red-300 mr-2"
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
          {{
            conflictingSourceName
              ? `Source "${conflictingSourceName}" and target use the same connection and database`
              : 'Source and target cannot be the same connection and database'
          }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import BaseButton from '@/components/base/BaseButton.vue'
import ConnectionTreeSelector from './ConnectionTreeSelector.vue'
import StreamConnectionFilter from './StreamConnectionFilter.vue'
import type { StreamConnectionMapping } from '@/types/streamConfig'
import type { Connection } from '@/types/connections'
import { generateTypeBasedAlias } from '@/utils/federatedUtils'
import { getSourceSelectionValue, toggleSourceMapping } from './sourceMappings'
import {
  getConnectionKindFromSpec,
  getConnectionTypeLabel,
  isDatabaseKind,
  matchesConnectionTypeFilter,
  type ConnectionKind,
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
    localSourceConnections.value = [...val].filter((m) => {
      const kind = getConnectionKind(m.connectionId)
      // S3 selections must always have a bucket. Drop invalid/bucketless entries.
      if (kind === 's3' && !m.s3?.bucket) {
        return false
      }
      return true
    })
  },
  { deep: true, immediate: true }
)

function getConnectionKind(connectionId: string) {
  const c = connectionsStore.connectionByID(connectionId)
  return getConnectionKindFromSpec(c?.spec)
}

function getSelectionValue(conn: StreamConnectionMapping): string | undefined {
  return getSourceSelectionValue(conn, getConnectionKind(conn.connectionId))
}

const primarySourceId = computed(
  () => localSourceConnections.value[0]?.connectionId || props.sourceConnectionId
)
const primarySourceDatabase = computed(() => {
  const primary = localSourceConnections.value[0]
  if (primary) {
    return getSelectionValue(primary)
  }
  return props.sourceDatabase
})
const hasMultipleSources = computed(() => localSourceConnections.value.length > 1)

// Generate type-based alias for a connection (e.g., pg1, my1, s31)
function generateAlias(connectionId: string): string {
  const connection = connectionsStore.connectionByID(connectionId)
  const connectionType = getConnectionTypeLabel(connection?.spec, connection?.type) || undefined
  const existingAliases = localSourceConnections.value.map((c) => c.alias || '')
  return generateTypeBasedAlias(connectionType, existingAliases)
}

function syncPrimarySelection() {
  const primary = localSourceConnections.value[0]
  // Only emit single-source updates; multi-source state is handled via update:source-connections
  if (!primary || localSourceConnections.value.length !== 1) return
  emit('update:source-connection', primary.connectionId, getSelectionValue(primary), undefined)
}

// Handle checkbox toggle for multi-source selection
function handleToggleSourceConnection(payload: {
  connectionId: string
  selectionValue?: string
  checked: boolean
  kind: ConnectionKind
}) {
  const alias = generateAlias(payload.connectionId)
  localSourceConnections.value = toggleSourceMapping({
    current: localSourceConnections.value,
    connectionId: payload.connectionId,
    selectionValue: payload.selectionValue,
    checked: payload.checked,
    alias,
    kind: payload.kind
  })

  emit('update:source-connections', localSourceConnections.value)
  syncPrimarySelection()
}

const connections = computed(() => connectionsStore.connections)

// Helper function to match type filter
function matchesTypeFilter(conn: Connection, typeFilter: string | null): boolean {
  return matchesConnectionTypeFilter(conn.spec, undefined, typeFilter)
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
  const typeLabel = getConnectionTypeLabel(spec as ConnectionSpec | undefined) || ''
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

// Effective target selection: database for DB connections, path for file connections, bucket for S3
const effectiveTargetSelection = computed(() => {
  if (!props.targetConnectionId) return undefined
  const kind = getConnectionKind(props.targetConnectionId)
  if (kind === 'files') return props.targetPath || undefined
  if (kind === 's3') return props.targetPath || undefined
  return props.targetDatabase || undefined
})

// Conflict check: a source cannot be the same connection + database/bucket/path as the target
const conflictingSourceName = computed<string | null>(() => {
  if (!props.targetConnectionId) return null
  const targetSel = effectiveTargetSelection.value

  if (hasMultipleSources.value) {
    // Multi-source: check each source for conflict with target
    for (const conn of localSourceConnections.value) {
      if (conn.connectionId !== props.targetConnectionId) continue
      const sourceSelection = getSelectionValue(conn)
      if (sourceSelection && targetSel && sourceSelection === targetSel) {
        const connection = connectionsStore.connectionByID(conn.connectionId)
        return connection?.name || conn.connectionId
      }
    }
    return null
  }

  // Single source
  const sourceSel = primarySourceDatabase.value || props.sourceDatabase
  if (
    primarySourceId.value &&
    primarySourceId.value === props.targetConnectionId &&
    sourceSel === targetSel &&
    sourceSel
  ) {
    return ''
  }
  return null
})

const isSameConnectionAndDatabase = computed(() => conflictingSourceName.value !== null)

function handleSourceConnectionSelect(payload: {
  connectionId: string
  database?: string
  schema?: string
}) {
  // S3 connections are selected by bucket only (via select-bucket).
  // Files connections are selected by base path (via select-file).
  const kind = getConnectionKind(payload.connectionId)
  if (kind === 's3' || kind === 'files') {
    return
  }
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
  if (!isDatabaseKind(getConnectionKind(payload.connectionId))) {
    return
  }
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
  // S3 targets must be selected by bucket only (via select-bucket).
  if (getConnectionKind(payload.connectionId) === 's3') {
    return
  }
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
  const alias =
    localSourceConnections.value.find((c) => c.connectionId === payload.connectionId)?.alias ||
    generateAlias(payload.connectionId)
  localSourceConnections.value = [
    {
      alias,
      connectionId: payload.connectionId,
      files: {
        basePath: payload.path
      }
    }
  ]
  emit('update:source-connections', localSourceConnections.value)
  emit('update:source-connection', payload.connectionId, payload.path, undefined)
}

function handleSourceBucketSelect(payload: { connectionId: string; bucket: string }) {
  // For S3 sources, only buckets are valid selections.
  const alias =
    localSourceConnections.value.find((c) => c.connectionId === payload.connectionId)?.alias ||
    generateAlias(payload.connectionId)
  localSourceConnections.value = [
    {
      alias,
      connectionId: payload.connectionId,
      s3: { bucket: payload.bucket }
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
</script>
