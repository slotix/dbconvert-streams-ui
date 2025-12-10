<template>
  <div class="space-y-1">
    <div
      v-if="!connections.length"
      class="py-8 text-center text-sm text-gray-500 dark:text-gray-400"
    >
      No connections available
    </div>

    <div
      v-for="connection in connections"
      :key="connection.id"
      class="relative rounded-lg transition-all duration-200 overflow-hidden"
      :class="connectionCardClass(connection.id)"
    >
      <button
        type="button"
        class="flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:focus-visible:ring-emerald-400"
        :class="[
          connectionHeaderClass(connection.id),
          isFileConnection(connection) && mode === 'source' ? 'opacity-50 cursor-not-allowed' : ''
        ]"
        :title="
          isFileConnection(connection) && mode === 'source'
            ? 'File connections cannot be used as source. Only database connections are supported.'
            : connectionTooltip(connection)
        "
        :disabled="isFileConnection(connection) && mode === 'source'"
        @click="toggleConnectionExpansion(connection)"
      >
        <component
          :is="isConnectionExpanded(connection.id) ? ChevronDownIcon : ChevronRightIcon"
          class="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500 mt-3"
        />
        <DatabaseIcon
          :db-type="connection.type || ''"
          :logo-src="getLogoSrc(connection)"
          size="LG"
          container-class="!p-1.5"
        />
        <div class="flex-1 min-w-0 flex flex-col gap-0.5">
          <div class="flex items-center gap-1.5">
            <HighlightedText
              class="truncate text-sm font-medium text-gray-900 dark:text-gray-100"
              :text="connection.name || getConnectionHostValue(connection) || 'Connection'"
              :query="props.searchQuery"
            />
            <CloudProviderBadge
              v-if="connection.cloud_provider"
              :cloud-provider="connection.cloud_provider"
              :db-type="connection.type"
              size="sm"
              class="shrink-0"
            />
            <span
              v-if="isFileConnection(connection) && mode === 'source'"
              class="inline-flex items-center px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full shrink-0"
            >
              Not supported as source
            </span>
          </div>
          <div
            v-if="connectionSubtitle(connection)"
            class="truncate text-xs text-gray-500 dark:text-gray-400 leading-tight"
          >
            {{ connectionSubtitle(connection) }}
          </div>
        </div>
      </button>

      <div v-if="isConnectionExpanded(connection.id)" class="pt-1">
        <!-- S3 Connection - Show buckets like databases -->
        <div v-if="isS3Connection(connection)" class="py-1">
          <div
            v-if="isS3BucketsLoading(connection.id)"
            class="flex items-center gap-2 px-4 py-3 text-sm text-gray-500 dark:text-gray-400"
          >
            <svg class="h-4 w-4 animate-spin text-teal-500" viewBox="0 0 24 24" fill="none">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading buckets…
          </div>

          <div
            v-else-if="getS3BucketsError(connection.id)"
            class="px-4 py-3 text-sm text-red-600 dark:text-red-400"
          >
            {{ getS3BucketsError(connection.id) }}
          </div>

          <div
            v-else-if="getS3Buckets(connection.id).length === 0"
            class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400"
          >
            No buckets found
          </div>

          <div v-else class="py-1">
            <div v-for="bucket in getS3Buckets(connection.id)" :key="bucket" class="px-2">
              <button
                type="button"
                class="relative flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors"
                :class="s3BucketRowClass(connection.id, bucket)"
                @click="handleS3BucketSelect(connection, bucket)"
              >
                <span class="h-4 w-4 shrink-0" />
                <HighlightedText class="truncate" :text="bucket" :query="props.searchQuery" />
              </button>
            </div>
          </div>
        </div>

        <!-- Local File Connection - Show file path and count -->
        <div v-else-if="isLocalFileConnection(connection)" class="space-y-2 py-2">
          <div class="px-2">
            <div
              class="flex w-full items-start gap-3 rounded-md px-2 py-2 text-sm transition-all duration-200"
              :class="filePathClass(connection.id)"
            >
              <span class="h-4 w-4 shrink-0" />
              <span class="flex-1 min-w-0">
                <div
                  class="truncate text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  {{
                    getFileDirectory(connection.id) ||
                    connection.spec?.files?.basePath ||
                    'No folder configured'
                  }}
                </div>
                <div class="mt-1">
                  <template v-if="getFileError(connection.id)">
                    <span class="text-red-600 dark:text-red-400">{{
                      getFileError(connection.id)
                    }}</span>
                  </template>
                  <template v-else-if="getFileLoadingState(connection.id)">
                    <span class="text-gray-600 dark:text-gray-300">Loading files…</span>
                  </template>
                  <template v-else>
                    <span class="text-gray-700 dark:text-gray-200">
                      {{ getFileCount(connection.id) }} files detected
                    </span>
                  </template>
                </div>
              </span>
              <button
                type="button"
                class="ml-auto rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="getFileLoadingState(connection.id)"
                @click.stop="refreshFileEntries(connection.id)"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <template v-else>
          <div
            v-if="isDatabasesLoading(connection.id)"
            class="flex items-center gap-2 px-4 py-3 text-sm text-gray-500 dark:text-gray-400"
          >
            <svg class="h-4 w-4 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading databases…
          </div>

          <!-- Error state when connection failed -->
          <ConnectionErrorState
            v-else-if="getDatabaseError(connection.id)"
            :error="getDatabaseError(connection.id) || ''"
          />

          <div
            v-else-if="getDatabases(connection.id).length === 0"
            class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400"
          >
            No databases found
          </div>

          <div v-else class="py-1">
            <div v-for="database in getDatabases(connection.id)" :key="database.name" class="px-2">
              <div
                class="relative flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors"
                :class="databaseRowClass(connection.id, database.name)"
              >
                <!-- Checkbox for multi-select mode -->
                <input
                  v-if="props.enableMultiSelect && props.mode === 'source'"
                  type="checkbox"
                  :checked="isFederatedConnectionSelected(connection.id, database.name)"
                  class="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500 bg-white dark:bg-gray-800 shrink-0"
                  @click.stop
                  @change="
                    handleFederatedCheckbox(
                      connection.id,
                      database.name,
                      ($event.target as HTMLInputElement).checked
                    )
                  "
                />
                <button
                  v-else
                  type="button"
                  class="absolute inset-0"
                  @click="handleDatabaseSelect(connection, database.name)"
                />
                <span class="h-4 w-4 shrink-0" />
                <HighlightedText
                  class="truncate"
                  :text="database.name"
                  :query="props.searchQuery"
                />
                <span
                  v-if="getTableCount(connection.id, database.name) !== null"
                  class="ml-auto text-xs text-gray-400 dark:text-gray-500"
                >
                  {{ getTableCount(connection.id, database.name) }} tables
                </span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, type Ref } from 'vue'
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import HighlightedText from '@/components/common/HighlightedText.vue'
import DatabaseIcon from '@/components/base/DatabaseIcon.vue'
import ConnectionErrorState from '@/components/common/ConnectionErrorState.vue'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useConnectionsStore } from '@/stores/connections'
import { normalizeConnectionType, getConnectionTooltip } from '@/utils/connectionUtils'
import { getConnectionHost, getConnectionPort } from '@/utils/specBuilder'
import { listS3Buckets, configureS3Session } from '@/api/files'
import type { Connection } from '@/types/connections'

interface Props {
  connections: Connection[]
  selectedConnectionId?: string | null
  selectedDatabase?: string | null
  selectedSchema?: string | null
  selectedPath?: string | null
  mode: 'source' | 'target'
  searchQuery?: string
  enableMultiSelect?: boolean
  federatedConnections?: Array<{ connectionId: string; database?: string }>
}

const props = withDefaults(defineProps<Props>(), {
  selectedConnectionId: null,
  selectedDatabase: null,
  selectedSchema: null,
  selectedPath: null,
  searchQuery: '',
  enableMultiSelect: false,
  federatedConnections: () => []
})

const emit = defineEmits<{
  'select-connection': [payload: { connectionId: string; database?: string; schema?: string }]
  'select-database': [payload: { connectionId: string; database: string; schema?: string }]
  'select-file': [payload: { connectionId: string; path: string }]
  'select-bucket': [payload: { connectionId: string; bucket: string }]
  'toggle-federated': [payload: { connectionId: string; database?: string; checked: boolean }]
}>()

const navigationStore = useExplorerNavigationStore()
const fileExplorerStore = useFileExplorerStore()
const connectionsStore = useConnectionsStore()

const expandedConnections = ref<Set<string>>(new Set())

// S3 bucket state
const s3BucketsState = ref<
  Record<string, { buckets: string[]; loading: boolean; error: string | null }>
>({})

const connectionsMap = computed(() => {
  const map = new Map<string, Connection>()
  props.connections.forEach((connection) => {
    map.set(connection.id, connection)
  })
  return map
})

function addToSet(target: Ref<Set<string>>, value: string) {
  if (target.value.has(value)) {
    return
  }
  const next = new Set(target.value)
  next.add(value)
  target.value = next
}

function removeFromSet(target: Ref<Set<string>>, value: string) {
  if (!target.value.has(value)) {
    return
  }
  const next = new Set(target.value)
  next.delete(value)
  target.value = next
}

function getConnectionById(connectionId?: string | null) {
  if (!connectionId) {
    return undefined
  }
  return connectionsMap.value.get(connectionId)
}

function isFileConnection(connection: Connection): boolean {
  // Only 'files' is a valid file connection type now (legacy csv/json/jsonl/parquet removed)
  // File format is now specified in stream config, not connection type
  return (connection.type || '').toLowerCase() === 'files'
}

function isS3Connection(connection: Connection): boolean {
  // S3 connections have type='files' and spec.s3 present
  return isFileConnection(connection) && !!connection.spec?.s3
}

function isLocalFileConnection(connection: Connection): boolean {
  // Local file connections have type='files' and spec.files present (not S3)
  return isFileConnection(connection) && !!connection.spec?.files && !connection.spec?.s3
}

// S3 bucket functions
function isS3BucketsLoading(connectionId: string): boolean {
  return s3BucketsState.value[connectionId]?.loading || false
}

function getS3BucketsError(connectionId: string): string | null {
  return s3BucketsState.value[connectionId]?.error || null
}

function getS3Buckets(connectionId: string): string[] {
  return s3BucketsState.value[connectionId]?.buckets || []
}

async function loadS3Buckets(connection: Connection) {
  const connectionId = connection.id
  const s3Spec = connection.spec?.s3

  if (!s3Spec) {
    s3BucketsState.value[connectionId] = {
      buckets: [],
      loading: false,
      error: 'No S3 configuration found'
    }
    return
  }

  // Initialize loading state
  s3BucketsState.value[connectionId] = { buckets: [], loading: true, error: null }

  try {
    // Configure S3 session with connection credentials
    const hasStaticCredentials = s3Spec.credentials?.accessKey && s3Spec.credentials?.secretKey

    await configureS3Session({
      credentialSource: hasStaticCredentials ? 'static' : 'aws',
      region: s3Spec.region || 'us-east-1',
      endpoint: s3Spec.endpoint,
      urlStyle: 'auto',
      useSSL: !s3Spec.endpoint?.includes('localhost'),
      credentials: hasStaticCredentials
        ? {
            accessKeyId: s3Spec.credentials!.accessKey!,
            secretAccessKey: s3Spec.credentials!.secretKey!,
            sessionToken: s3Spec.credentials!.sessionToken
          }
        : undefined
    })

    // List buckets
    const response = await listS3Buckets(connectionId)
    s3BucketsState.value[connectionId] = {
      buckets: response.buckets || [],
      loading: false,
      error: null
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to load buckets'
    s3BucketsState.value[connectionId] = { buckets: [], loading: false, error: errorMessage }
  }
}

function handleS3BucketSelect(connection: Connection, bucket: string) {
  addToSet(expandedConnections, connection.id)
  emit('select-connection', { connectionId: connection.id, database: bucket })
  emit('select-bucket', { connectionId: connection.id, bucket })
}

// Multi-select federated helpers
function isFederatedConnectionSelected(connectionId: string, database?: string): boolean {
  // First check federatedConnections array
  if (props.federatedConnections && props.federatedConnections.length > 0) {
    return props.federatedConnections.some(
      (fc) => fc.connectionId === connectionId && (!database || fc.database === database)
    )
  }
  // Fallback: check regular selection props (for non-federated edit mode)
  // This ensures the checkbox is checked when editing a single-source stream
  if (props.selectedConnectionId === connectionId) {
    if (!database) return true
    return props.selectedDatabase === database
  }
  return false
}

function handleFederatedCheckbox(connectionId: string, database: string, checked: boolean) {
  emit('toggle-federated', { connectionId, database, checked })
}

function s3BucketRowClass(connectionId: string, bucket: string): string {
  const isSelected =
    props.selectedConnectionId === connectionId && props.selectedDatabase === bucket

  if (!isSelected) {
    return 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
  }

  // Selected bucket styling (same as database row)
  if (props.mode === 'source') {
    return 'bg-gradient-to-r from-blue-50 via-blue-100/60 to-transparent dark:from-blue-900/30 dark:via-blue-900/15 dark:to-transparent text-blue-900 dark:text-blue-100 font-semibold ring-1 ring-blue-200 dark:ring-blue-500/30 border border-blue-100/70 dark:border-blue-800/40 pl-2 shadow-inner shadow-blue-900/5'
  } else {
    return 'bg-gradient-to-r from-emerald-50 via-emerald-100/60 to-transparent dark:from-emerald-900/30 dark:via-emerald-900/15 dark:to-transparent text-emerald-900 dark:text-emerald-100 font-semibold ring-1 ring-emerald-200 dark:ring-emerald-500/30 border border-emerald-100/70 dark:border-emerald-800/40 pl-2 shadow-inner shadow-emerald-900/5'
  }
}

function getFileCount(connectionId: string): number {
  return fileExplorerStore.getEntries(connectionId)?.length || 0
}

function getFileDirectory(connectionId: string): string {
  const directory = fileExplorerStore.getDirectoryPath(connectionId)
  if (directory) {
    return directory
  }
  // For file connections, the path is stored in spec.files.basePath
  // getConnectionHost returns this for file connections
  const connection = getConnectionById(connectionId)
  // Try spec.files.basePath first
  if (connection?.spec?.files?.basePath) {
    return connection.spec.files.basePath
  }
  return getConnectionHost(connection)
}

function getFileLoadingState(connectionId: string): boolean {
  return fileExplorerStore.isLoading(connectionId)
}

function getFileError(connectionId: string): string {
  return fileExplorerStore.getError(connectionId) || ''
}

function getDatabaseError(connectionId: string): string | null {
  return navigationStore.getDatabasesError(connectionId)
}

function refreshFileEntries(connectionId: string) {
  void fileExplorerStore.loadEntries(connectionId, true)
}

function connectionSubtitle(connection: Connection): string | null {
  const parts: string[] = []
  const host = getConnectionHost(connection)
  const port = getConnectionPort(connection)
  if (host) {
    const hostPort = port ? `${host}:${port}` : host
    parts.push(hostPort)
  }
  return parts.length ? parts.join(' · ') : null
}

// Helper to get host value for display
function getConnectionHostValue(connection: Connection): string {
  return getConnectionHost(connection)
}

// Use imported getConnectionTooltip from utils/connectionUtils.ts
const connectionTooltip = getConnectionTooltip

function connectionCardClass(connectionId: string): string {
  const base =
    'border border-transparent hover:border-gray-200/60 dark:hover:border-gray-700/60 transition-all duration-200 bg-transparent'
  if (props.selectedConnectionId !== connectionId) {
    return base
  }

  const connection = getConnectionById(connectionId)

  // For file connections (local files or S3), don't highlight the card
  // Only the selected item (bucket or file path) should be highlighted
  if (connection && isFileConnection(connection)) {
    return base
  }

  // For database connections, only highlight the card if no database is selected yet
  // Once a database is selected, only the database row should be highlighted
  if (!props.selectedDatabase) {
    if (props.mode === 'source') {
      const sourceHighlight =
        'bg-gradient-to-r from-blue-50/90 via-blue-100/70 to-white dark:from-blue-900/40 dark:via-blue-900/20 dark:to-transparent border-blue-200/80 dark:border-blue-700/60 ring-1 ring-blue-300/60 dark:ring-blue-500/30 shadow-lg shadow-blue-900/10 dark:shadow-blue-900/40'
      return `${base} ${sourceHighlight}`
    }
    const targetHighlight =
      'bg-gradient-to-r from-emerald-50/90 via-emerald-100/70 to-white dark:from-emerald-900/40 dark:via-emerald-900/20 dark:to-transparent border-emerald-200/80 dark:border-emerald-700/60 ring-1 ring-emerald-300/60 dark:ring-emerald-500/30 shadow-lg shadow-emerald-900/10 dark:shadow-emerald-900/40'
    return `${base} ${targetHighlight}`
  }

  // Database is selected - don't highlight the connection card, only the database row
  return base
}

function connectionHeaderClass(connectionId: string): string {
  const defaultClass = 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-800 dark:text-gray-200'

  if (props.selectedConnectionId !== connectionId) {
    return defaultClass
  }

  const connection = getConnectionById(connectionId)

  // For file connections (local files or S3), use default styling
  // The selected bucket/file row will be highlighted, not the connection header
  if (connection && isFileConnection(connection)) {
    return defaultClass
  }

  // For database connections, highlight header only when no database is selected
  // Once a database is selected, only the database row should be highlighted
  if (props.selectedDatabase) {
    return defaultClass
  }

  return props.mode === 'source'
    ? 'bg-transparent text-blue-800 dark:text-blue-100 font-semibold'
    : 'bg-transparent text-emerald-700 dark:text-emerald-100 font-semibold'
}

function filePathClass(connectionId: string): string {
  const isSelected = props.selectedConnectionId === connectionId

  if (!isSelected) {
    return 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 bg-transparent'
  }

  // Selected file path: border-only accent to keep list tidy
  if (props.mode === 'source') {
    return 'bg-transparent text-sky-900 dark:text-sky-100 font-medium ring-1 ring-sky-400/30 border border-sky-400/40'
  } else {
    return 'bg-transparent text-emerald-900 dark:text-emerald-100 font-medium ring-1 ring-emerald-400/30 border border-emerald-400/40'
  }
}

function databaseRowClass(connectionId: string, database: string): string {
  const isSelected =
    props.selectedConnectionId === connectionId && props.selectedDatabase === database

  if (!isSelected) {
    return 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
  }

  // Selected database: border highlights source vs target without extra fills
  if (props.mode === 'source') {
    return 'bg-gradient-to-r from-blue-50 via-blue-100/60 to-transparent dark:from-blue-900/30 dark:via-blue-900/15 dark:to-transparent text-blue-900 dark:text-blue-100 font-semibold ring-1 ring-blue-200 dark:ring-blue-500/30 border border-blue-100/70 dark:border-blue-800/40 pl-2 shadow-inner shadow-blue-900/5'
  } else {
    return 'bg-gradient-to-r from-emerald-50 via-emerald-100/60 to-transparent dark:from-emerald-900/30 dark:via-emerald-900/15 dark:to-transparent text-emerald-900 dark:text-emerald-100 font-semibold ring-1 ring-emerald-200 dark:ring-emerald-500/30 border border-emerald-100/70 dark:border-emerald-800/40 pl-2 shadow-inner shadow-emerald-900/5'
  }
}

function isConnectionExpanded(connectionId: string): boolean {
  return expandedConnections.value.has(connectionId)
}

async function toggleConnectionExpansion(connection: Connection) {
  if (isConnectionExpanded(connection.id)) {
    removeFromSet(expandedConnections, connection.id)
    return
  }

  // Prevent file connections from being selected as source
  if (isFileConnection(connection) && props.mode === 'source') {
    // Don't expand, but show a visual indicator (handled in template)
    return
  }

  addToSet(expandedConnections, connection.id)

  // Handle S3 connections - load buckets
  if (isS3Connection(connection)) {
    await loadS3Buckets(connection)
    emit('select-connection', { connectionId: connection.id })
    return
  }

  // Handle local file connections - load file entries
  if (isLocalFileConnection(connection)) {
    await fileExplorerStore.loadEntries(connection.id)
    emit('select-connection', { connectionId: connection.id })
    return
  }

  // Handle database connections
  await loadDatabases(connection.id)
}

function isDatabasesLoading(connectionId: string): boolean {
  return navigationStore.isDatabasesLoading(connectionId)
}

async function loadDatabases(connectionId: string) {
  const connection = getConnectionById(connectionId)
  if (!connection || isFileConnection(connection)) {
    return
  }

  await navigationStore.ensureDatabases(connectionId)
}

function getDatabases(connectionId: string) {
  // For stream wizard, always filter out system databases/schemas
  const databases = navigationStore.getDatabasesRaw(connectionId)
  if (!databases) return []
  // Filter out system databases (information_schema, pg_catalog, etc.)
  return databases.filter((db) => !db.isSystem)
}

async function ensureMetadata(connectionId: string, database: string) {
  await navigationStore.ensureMetadata(connectionId, database)
}

function getTableCount(connectionId: string, database: string): number | null {
  const meta = navigationStore.metadataState[connectionId]?.[database]
  if (!meta) {
    return null
  }
  return Object.keys(meta.tables || {}).length
}

function handleDatabaseSelect(connection: Connection, database: string) {
  // Skip file connections - they don't have database metadata
  if (isFileConnection(connection)) {
    return
  }
  addToSet(expandedConnections, connection.id)
  emit('select-connection', { connectionId: connection.id, database })
  emit('select-database', { connectionId: connection.id, database })
  void ensureMetadata(connection.id, database)
}

function getLogoSrc(connection: Connection): string {
  const normalizedType = normalizeConnectionType(connection?.type || '')
  const dbType = connectionsStore.dbTypes.find(
    (f) => normalizeConnectionType(f.type) === normalizedType
  )
  return dbType ? dbType.logo : ''
}

watch(
  () => props.selectedConnectionId,
  (connectionId) => {
    if (!connectionId) {
      return
    }
    addToSet(expandedConnections, connectionId)
    const connection = getConnectionById(connectionId)
    if (!connection) {
      return
    }
    // Handle S3 connections - load buckets
    if (isS3Connection(connection)) {
      void loadS3Buckets(connection)
      return
    }
    // Handle local file connections
    if (isLocalFileConnection(connection)) {
      void fileExplorerStore.loadEntries(connectionId)
      return
    }
    // Handle database connections
    void loadDatabases(connectionId)
  },
  { immediate: true }
)

// Auto-expand and load databases for federated connections (for edit mode restoration)
watch(
  () => props.federatedConnections,
  async (federatedConns) => {
    if (!federatedConns || federatedConns.length === 0) {
      return
    }
    // Expand all connections in federated mode and load their databases
    for (const fc of federatedConns) {
      if (!fc.connectionId) continue
      addToSet(expandedConnections, fc.connectionId)
      const connection = getConnectionById(fc.connectionId)
      if (connection && !isFileConnection(connection)) {
        await loadDatabases(fc.connectionId)
      }
    }
  },
  { immediate: true, deep: true }
)

watch(
  () => props.selectedDatabase,
  (database) => {
    const connectionId = props.selectedConnectionId
    if (!connectionId || !database) {
      return
    }
    // Skip file connections - they don't have database metadata
    const connection = getConnectionById(connectionId)
    if (connection && isFileConnection(connection)) {
      return
    }
    addToSet(expandedConnections, connectionId)
    void ensureMetadata(connectionId, database)
  },
  { immediate: true }
)

// Auto-load databases and metadata when search query changes (like data explorer does)
watch(
  () => props.searchQuery,
  async (query) => {
    if (!query.trim()) {
      return
    }

    // Get the filtered connections list
    const filteredConns = props.connections
    const normalizedQuery = query.toLowerCase()

    // Expand all filtered connections and ensure their databases are loaded
    for (const conn of filteredConns) {
      if (isFileConnection(conn)) {
        continue
      }

      addToSet(expandedConnections, conn.id)

      // Load databases if not already loading or loaded
      if (
        !navigationStore.isDatabasesLoading(conn.id) &&
        !navigationStore.databasesState[conn.id]
      ) {
        await navigationStore.ensureDatabases(conn.id)
      }

      // Load metadata for ALL databases so we can search through tables and views
      // (The search query might match a table or view inside a database, not just the database name)
      const databases = navigationStore.databasesState[conn.id] || []
      for (const db of databases) {
        const key = `${conn.id}:${db.name}`

        // Expand database even if query doesn't match database name
        // (might match a table inside it)
        if (db.name.toLowerCase().includes(normalizedQuery)) {
          addToSet(expandedConnections, key)
        }

        // Load metadata if not already loading or loaded
        if (
          !navigationStore.isMetadataLoading(conn.id, db.name) &&
          !navigationStore.getMetadata(conn.id, db.name)
        ) {
          await navigationStore.ensureMetadata(conn.id, db.name).catch(() => {})
        }
      }
    }
  }
)
</script>
