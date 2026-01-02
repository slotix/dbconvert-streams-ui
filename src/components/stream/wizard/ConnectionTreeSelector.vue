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
        :class="[connectionHeaderClass(connection.id)]"
        :title="connectionTooltip(connection)"
        @click="toggleConnectionExpansion(connection)"
      >
        <component
          :is="isConnectionExpanded(connection.id) ? ChevronDown : ChevronRight"
          class="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500 mt-3"
        />
        <DatabaseIcon
          :db-type="getConnectionTypeDisplay(connection)"
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
              :db-type="getConnectionTypeDisplay(connection)"
              size="sm"
              class="shrink-0"
            />
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
            <div
              v-for="bucket in getS3Buckets(connection.id)"
              :key="`${connection.id}-${bucket}-${isS3BucketSelected(connection.id, bucket)}`"
              class="px-2"
            >
              <div
                class="relative flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors cursor-pointer"
                :class="s3BucketRowClass(connection.id, bucket)"
                @click="handleS3BucketRowClick(connection, bucket)"
              >
                <!-- Checkbox for multi-select mode (source only) -->
                <input
                  v-if="props.enableMultiSelect && props.mode === 'source'"
                  type="checkbox"
                  :checked="isS3BucketSelected(connection.id, bucket)"
                  class="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500 bg-white dark:bg-gray-800 shrink-0"
                  @click.stop
                  @change="
                    handleS3BucketCheckboxChange(
                      connection.id,
                      bucket,
                      ($event.target as HTMLInputElement)?.checked || false
                    )
                  "
                />
                <span v-else class="h-4 w-4 shrink-0" />
                <HighlightedText class="truncate" :text="bucket" :query="props.searchQuery" />
              </div>
            </div>
          </div>
        </div>

        <!-- Local File Connection - Show file path and count -->
        <div v-else-if="isLocalFileConnection(connection)" class="space-y-2 py-2">
          <div class="px-2">
            <div
              class="flex w-full items-start gap-3 rounded-md px-2 py-2 text-sm transition-all duration-200 cursor-pointer"
              :class="filePathClass(connection.id)"
              @click="handleFilePathRowClick(connection)"
            >
              <!-- Checkbox for multi-select mode (source only) -->
              <input
                v-if="props.enableMultiSelect && props.mode === 'source'"
                type="checkbox"
                :checked="isFileConnectionSelected(connection.id)"
                class="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500 bg-white dark:bg-gray-800 shrink-0 mt-0.5"
                @click.stop
                @change="
                  handleFilePathCheckboxChange(
                    connection.id,
                    ($event.target as HTMLInputElement)?.checked || false
                  )
                "
              />
              <span v-else class="h-4 w-4 shrink-0" />
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
                class="relative flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors cursor-pointer"
                :class="databaseRowClass(connection.id, database.name)"
                @click="handleDatabaseRowClick(connection, database.name)"
              >
                <!-- Checkbox for multi-select mode -->
                <input
                  v-if="props.enableMultiSelect && props.mode === 'source'"
                  type="checkbox"
                  :checked="isDatabaseSelected(connection.id, database.name)"
                  class="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500 bg-white dark:bg-gray-800 shrink-0"
                  @change="
                    handleDatabaseCheckboxChange(
                      connection.id,
                      database.name,
                      ($event.target as HTMLInputElement)?.checked || false
                    )
                  "
                />
                <span v-else class="h-4 w-4 shrink-0" />
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
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import HighlightedText from '@/components/common/HighlightedText.vue'
import DatabaseIcon from '@/components/base/DatabaseIcon.vue'
import ConnectionErrorState from '@/components/common/ConnectionErrorState.vue'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useConnectionsStore } from '@/stores/connections'
import { normalizeConnectionType, getConnectionTooltip } from '@/utils/connectionUtils'
import { getConnectionHost, getConnectionPort } from '@/utils/specBuilder'
import { listS3Buckets } from '@/api/files'
import {
  getConnectionKindFromSpec,
  getConnectionTypeLabel,
  isDatabaseKind,
  isFileBasedKind
} from '@/types/specs'
import type { ConnectionKind } from '@/types/specs'
import type { Connection } from '@/types/connections'
import type { StreamConnectionMapping } from '@/types/streamConfig'

interface Props {
  connections: Connection[]
  selectedConnectionId?: string | null
  selectedDatabase?: string | null
  selectedSchema?: string | null
  selectedPath?: string | null
  mode: 'source' | 'target'
  searchQuery?: string
  enableMultiSelect?: boolean
  sourceConnections?: StreamConnectionMapping[]
}

const props = withDefaults(defineProps<Props>(), {
  selectedConnectionId: null,
  selectedDatabase: null,
  selectedSchema: null,
  selectedPath: null,
  searchQuery: '',
  mode: 'source',
  enableMultiSelect: false,
  sourceConnections: () => []
})

const emit = defineEmits<{
  'select-connection': [payload: { connectionId: string; database?: string; schema?: string }]
  'select-database': [payload: { connectionId: string; database: string; schema?: string }]
  'select-file': [payload: { connectionId: string; path: string }]
  'select-bucket': [payload: { connectionId: string; bucket: string }]
  'toggle-source-connection': [
    payload: { connectionId: string; database?: string; checked: boolean; kind: ConnectionKind }
  ]
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

// Connection type helpers - spec is the ONLY source of truth
function isFileConnection(connection: Connection): boolean {
  const kind = getConnectionKindFromSpec(connection.spec)
  return isFileBasedKind(kind)
}

function isS3Connection(connection: Connection): boolean {
  return getConnectionKindFromSpec(connection.spec) === 's3'
}

function isLocalFileConnection(connection: Connection): boolean {
  return getConnectionKindFromSpec(connection.spec) === 'files'
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
  emit('select-bucket', { connectionId: connection.id, bucket })
}

function handleS3BucketCheckboxChange(connectionId: string, bucket: string, checked: boolean) {
  emit('toggle-source-connection', { connectionId, database: bucket, checked, kind: 's3' })
}

function handleS3BucketRowClick(connection: Connection, bucket: string) {
  // In multi-select mode for source, toggle selection on row click
  if (props.enableMultiSelect && props.mode === 'source') {
    const isCurrentlySelected = isS3BucketSelected(connection.id, bucket)
    handleS3BucketCheckboxChange(connection.id, bucket, !isCurrentlySelected)
  } else {
    // Single-select mode (target pane or non-multi-select)
    handleS3BucketSelect(connection, bucket)
  }
}

// Local file connection helpers
function isFileConnectionSelected(connectionId: string): boolean {
  const connection = getConnectionById(connectionId)
  const kind = getConnectionKindFromSpec(connection?.spec)
  if (kind !== 'files') {
    return false
  }
  const basePath = connection?.spec?.files?.basePath || ''
  // Source mode: check sourceConnections array (multi-select)
  // Target mode: check selectedPath (single-select)
  if (props.mode === 'source') {
    return props.sourceConnections.some(
      (fc) => fc.connectionId === connectionId && fc.database === basePath
    )
  }
  return props.selectedConnectionId === connectionId && props.selectedPath === basePath
}

function handleFilePathCheckboxChange(connectionId: string, checked: boolean) {
  const connection = getConnectionById(connectionId)
  const basePath = connection?.spec?.files?.basePath || ''
  emit('toggle-source-connection', { connectionId, database: basePath, checked, kind: 'files' })
}

function handleFilePathRowClick(connection: Connection) {
  const basePath = connection.spec?.files?.basePath || ''

  // In multi-select mode for source, toggle selection on row click
  if (props.enableMultiSelect && props.mode === 'source') {
    const isCurrentlySelected = isFileConnectionSelected(connection.id)
    handleFilePathCheckboxChange(connection.id, !isCurrentlySelected)
  } else {
    // Single-select mode (target pane or non-multi-select)
    emit('select-connection', { connectionId: connection.id })
    if (basePath) {
      emit('select-file', { connectionId: connection.id, path: basePath })
    }
  }
}

// Database connection helpers
function isDatabaseSelected(connectionId: string, database: string): boolean {
  const connection = getConnectionById(connectionId)
  const kind = getConnectionKindFromSpec(connection?.spec)
  if (!isDatabaseKind(kind)) {
    return false
  }
  // Source mode: check sourceConnections array (multi-select)
  // Target mode: check selectedConnectionId/selectedDatabase (single-select)
  if (props.mode === 'source') {
    return props.sourceConnections.some(
      (fc) => fc.connectionId === connectionId && fc.database === database
    )
  }
  return props.selectedConnectionId === connectionId && props.selectedDatabase === database
}

function handleDatabaseCheckboxChange(connectionId: string, database: string, checked: boolean) {
  const connection = getConnectionById(connectionId)
  const kind = getConnectionKindFromSpec(connection?.spec)
  if (!kind) {
    return
  }
  if (!isDatabaseKind(kind)) {
    return
  }

  emit('toggle-source-connection', { connectionId, database, checked, kind })
  if (checked) {
    void ensureMetadata(connectionId, database)
  }
}

function toggleDatabaseSelection(connectionId: string, database: string) {
  const isCurrentlySelected = isDatabaseSelected(connectionId, database)
  handleDatabaseCheckboxChange(connectionId, database, !isCurrentlySelected)
}

// S3 connection helpers
function isS3BucketSelected(connectionId: string, bucket: string): boolean {
  const connection = getConnectionById(connectionId)
  const kind = getConnectionKindFromSpec(connection?.spec)
  if (kind !== 's3') {
    return false
  }
  // Source mode: check sourceConnections array (multi-select)
  // Target mode: check selectedConnectionId/selectedDatabase (single-select)
  if (props.mode === 'source') {
    return props.sourceConnections.some(
      (fc) => fc.connectionId === connectionId && fc.s3?.bucket === bucket
    )
  }
  return props.selectedConnectionId === connectionId && props.selectedDatabase === bucket
}

function s3BucketRowClass(connectionId: string, bucket: string): string {
  const isSelected = isS3BucketSelected(connectionId, bucket)

  if (!isSelected) {
    return 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
  }

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
  const isSelected = isFileConnectionSelected(connectionId)

  if (!isSelected) {
    return 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 bg-transparent'
  }

  // Selected file path styling (same as database row for consistency)
  if (props.mode === 'source') {
    return 'bg-gradient-to-r from-blue-50 via-blue-100/60 to-transparent dark:from-blue-900/30 dark:via-blue-900/15 dark:to-transparent text-blue-900 dark:text-blue-100 font-semibold ring-1 ring-blue-200 dark:ring-blue-500/30 border border-blue-100/70 dark:border-blue-800/40 pl-2 shadow-inner shadow-blue-900/5'
  } else {
    return 'bg-gradient-to-r from-emerald-50 via-emerald-100/60 to-transparent dark:from-emerald-900/30 dark:via-emerald-900/15 dark:to-transparent text-emerald-900 dark:text-emerald-100 font-semibold ring-1 ring-emerald-200 dark:ring-emerald-500/30 border border-emerald-100/70 dark:border-emerald-800/40 pl-2 shadow-inner shadow-emerald-900/5'
  }
}

function databaseRowClass(connectionId: string, database: string): string {
  const isSelected = isDatabaseSelected(connectionId, database)

  if (!isSelected) {
    return 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
  }

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

  addToSet(expandedConnections, connection.id)

  // Handle S3 connections - load buckets (don't auto-select, let user choose via checkbox)
  if (isS3Connection(connection)) {
    await loadS3Buckets(connection)
    return
  }

  // Handle local file connections - load file entries (don't auto-select, let user choose via checkbox)
  if (isLocalFileConnection(connection)) {
    await fileExplorerStore.loadEntries(connection.id)
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

function handleDatabaseRowClick(connection: Connection, database: string) {
  // Skip file connections
  if (isFileConnection(connection)) {
    return
  }

  // In multi-select mode for source, toggle selection on row click
  if (props.enableMultiSelect && props.mode === 'source') {
    toggleDatabaseSelection(connection.id, database)
  } else {
    // Single-select mode
    handleDatabaseSelect(connection, database)
  }
}

function getLogoSrc(connection: Connection): string {
  const typeLabel = getConnectionTypeLabel(connection.spec, connection.type)
  if (!typeLabel) return ''
  const normalizedType = normalizeConnectionType(typeLabel)
  const dbType = connectionsStore.dbTypes.find(
    (f) => normalizeConnectionType(f.type) === normalizedType
  )
  return dbType ? dbType.logo : ''
}

function getConnectionTypeDisplay(connection: Connection): string {
  return getConnectionTypeLabel(connection.spec, connection.type) || ''
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

// Auto-expand and load databases/buckets for multi-source connections (for edit mode restoration)
watch(
  () => props.sourceConnections,
  async (sourceConns) => {
    if (!sourceConns || sourceConns.length === 0) {
      return
    }
    // Expand all connections in multi-source mode and load their data
    for (const fc of sourceConns) {
      if (!fc.connectionId) continue
      addToSet(expandedConnections, fc.connectionId)
      const connection = getConnectionById(fc.connectionId)
      if (!connection) continue

      if (isS3Connection(connection)) {
        // Load S3 buckets
        await loadS3Buckets(connection)
      } else if (!isFileConnection(connection)) {
        // Load databases for non-file connections
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
