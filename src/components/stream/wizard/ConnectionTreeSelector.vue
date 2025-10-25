<template>
  <div class="space-y-1">
    <div v-if="!connections.length" class="py-8 text-center text-sm text-gray-500">
      No connections available
    </div>

    <div
      v-for="connection in connections"
      :key="connection.id"
      class="rounded-lg transition-all duration-200"
      :class="connectionCardClass(connection.id)"
    >
      <button
        type="button"
        class="flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors rounded-lg"
        :class="connectionHeaderClass(connection.id)"
        :title="connectionTooltip(connection)"
        @click="toggleConnectionExpansion(connection)"
      >
        <component
          :is="isConnectionExpanded(connection.id) ? ChevronDownIcon : ChevronRightIcon"
          class="h-4 w-4 flex-shrink-0 text-gray-400 mt-0.5"
        />
        <img
          class="h-5 w-5 flex-shrink-0 object-contain mt-0.5"
          :src="getLogoSrc(connection)"
          :alt="connection.type + ' logo'"
        />
        <div class="flex-1 min-w-0 flex flex-col gap-0.5">
          <div class="flex items-center gap-1.5">
            <span class="truncate text-sm font-medium text-gray-900">
              <template v-for="(part, i) in getHighlightedText(connection.name)" :key="i">
                <mark v-if="part.match" class="bg-yellow-200 font-semibold">{{ part.text }}</mark>
                <span v-else>{{ part.text }}</span>
              </template>
            </span>
            <CloudProviderBadge
              v-if="connection.cloud_provider"
              :cloud-provider="connection.cloud_provider"
              :db-type="connection.type"
              size="sm"
              class="shrink-0"
            />
          </div>
          <div
            v-if="connectionSubtitle(connection)"
            class="truncate text-xs text-gray-500 leading-tight"
          >
            {{ connectionSubtitle(connection) }}
          </div>
        </div>
      </button>

      <div v-if="isConnectionExpanded(connection.id)" class="pt-1">
        <div v-if="isFileConnection(connection)" class="space-y-2 py-2">
          <div class="px-2">
            <div
              class="flex w-full items-start gap-3 rounded-md px-2 py-2 text-sm transition-all duration-200"
              :class="filePathClass(connection.id)"
            >
              <span class="h-4 w-4 flex-shrink-0" />
              <span class="flex-1 min-w-0">
                <div class="truncate text-xs uppercase tracking-wide text-gray-500">
                  {{ getFileDirectory(connection.id) || connection.path || 'No folder configured' }}
                </div>
                <div class="mt-1">
                  <template v-if="getFileError(connection.id)">
                    <span class="text-red-600">{{ getFileError(connection.id) }}</span>
                  </template>
                  <template v-else-if="getFileLoadingState(connection.id)">
                    Loading files…
                  </template>
                  <template v-else> {{ getFileCount(connection.id) }} files detected </template>
                </div>
              </span>
              <button
                type="button"
                class="ml-auto rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="getFileLoadingState(connection.id)"
                @click.stop="refreshFileEntries(connection.id)"
              >
                Refresh
              </button>
            </div>
          </div>
          <div v-if="mode === 'target' && selectedConnectionId === connection.id" class="px-2">
            <div class="text-xs font-medium uppercase tracking-wide text-gray-500">
              Output Format
            </div>
            <div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                v-for="option in fileFormatOptions"
                :key="option.value"
                type="button"
                :class="[
                  targetFileFormat === option.value
                    ? 'bg-green-50 border border-green-200 shadow-[0_0_0_2px_rgba(37,99,235,0.1)]'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50',
                  'relative rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500'
                ]"
                @click.stop="targetFileFormat = option.value"
              >
                <div class="text-sm font-semibold uppercase text-gray-900">{{ option.label }}</div>
                <div v-if="option.description" class="mt-1 text-[11px] text-gray-500">
                  {{ option.description }}
                </div>

                <!-- Selection indicator -->
                <div
                  v-if="targetFileFormat === option.value"
                  class="absolute top-2 right-2 w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center"
                >
                  <CheckIcon class="w-2.5 h-2.5 text-white" />
                </div>
              </button>
            </div>
          </div>
        </div>

        <template v-else>
          <div
            v-if="isDatabasesLoading(connection.id)"
            class="flex items-center gap-2 px-4 py-3 text-sm text-gray-500"
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

          <div
            v-else-if="getDatabases(connection.id).length === 0"
            class="px-4 py-3 text-sm text-gray-500"
          >
            No databases found
          </div>

          <div v-else class="py-1">
            <div v-for="database in getDatabases(connection.id)" :key="database.name" class="px-2">
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors"
                :class="databaseRowClass(connection.id, database.name)"
                @click="handleDatabaseSelect(connection, database.name)"
              >
                <span class="h-4 w-4 flex-shrink-0" />
                <span class="truncate">
                  <template v-for="(part, i) in getHighlightedText(database.name)" :key="i">
                    <mark v-if="part.match" class="bg-yellow-200 font-semibold">
                      {{ part.text }}
                    </mark>
                    <span v-else>{{ part.text }}</span>
                  </template>
                </span>
                <span
                  v-if="getTableCount(connection.id, database.name) !== null"
                  class="ml-auto text-xs text-gray-400"
                >
                  {{ getTableCount(connection.id, database.name) }} tables
                </span>
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, type Ref } from 'vue'
import { ChevronRightIcon, ChevronDownIcon, CheckIcon } from '@heroicons/vue/24/outline'
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { normalizeConnectionType, getConnectionTooltip } from '@/utils/connectionUtils'
import { highlightParts, type HighlightPart } from '@/utils/highlight'
import type { Connection } from '@/types/connections'

interface Props {
  connections: Connection[]
  selectedConnectionId?: string | null
  selectedDatabase?: string | null
  selectedSchema?: string | null
  selectedPath?: string | null
  mode: 'source' | 'target'
  searchQuery?: string
}

const props = withDefaults(defineProps<Props>(), {
  selectedConnectionId: null,
  selectedDatabase: null,
  selectedSchema: null,
  selectedPath: null,
  searchQuery: ''
})

const emit = defineEmits<{
  'select-connection': [payload: { connectionId: string; database?: string; schema?: string }]
  'select-database': [payload: { connectionId: string; database: string; schema?: string }]
  'select-file': [payload: { connectionId: string; path: string }]
}>()

const navigationStore = useExplorerNavigationStore()
const fileExplorerStore = useFileExplorerStore()
const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()

const expandedConnections = ref<Set<string>>(new Set())

const connectionsMap = computed(() => {
  const map = new Map<string, Connection>()
  props.connections.forEach((connection) => {
    map.set(connection.id, connection)
  })
  return map
})

type TargetFileFormat = 'csv' | 'json' | 'jsonl' | 'parquet'

const fileFormatOptions: Array<{
  value: TargetFileFormat
  label: string
  description: string
}> = [
  { value: 'csv', label: 'CSV', description: '' },
  { value: 'jsonl', label: 'JSONL (NDJSON)', description: '' },
  { value: 'parquet', label: 'Parquet', description: '' }
]

const targetFileFormat = computed<TargetFileFormat>({
  get: () => (streamsStore.currentStreamConfig?.targetFileFormat ?? 'csv') as TargetFileFormat,
  set: (value) => {
    if (streamsStore.currentStreamConfig) {
      streamsStore.currentStreamConfig.targetFileFormat = value
    }
  }
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
  return ['files', 'csv', 'parquet', 'jsonl'].includes((connection.type || '').toLowerCase())
}

function getFileCount(connectionId: string): number {
  return fileExplorerStore.getEntries(connectionId)?.length || 0
}

function getFileDirectory(connectionId: string): string {
  const directory = fileExplorerStore.getDirectoryPath(connectionId)
  if (directory) {
    return directory
  }
  const connection = getConnectionById(connectionId)
  return connection?.path || ''
}

function getFileLoadingState(connectionId: string): boolean {
  return fileExplorerStore.isLoading(connectionId)
}

function getFileError(connectionId: string): string {
  return fileExplorerStore.getError(connectionId) || ''
}

function getHighlightedText(text: string): HighlightPart[] {
  return highlightParts(text, props.searchQuery || '')
}

function refreshFileEntries(connectionId: string) {
  void fileExplorerStore.loadEntries(connectionId, true)
}

function connectionSubtitle(connection: Connection): string | null {
  const parts: string[] = []
  if (connection.host) {
    const hostPort = connection.port ? `${connection.host}:${connection.port}` : connection.host
    parts.push(hostPort)
  }
  return parts.length ? parts.join(' · ') : null
}

// Use imported getConnectionTooltip from utils/connectionUtils.ts
const connectionTooltip = getConnectionTooltip

function connectionCardClass(connectionId: string): string {
  if (props.selectedConnectionId !== connectionId) {
    return 'hover:bg-gray-50'
  }

  // Selected connection: subtle neutral styling
  // Accent bar is now on the selected database row instead
  return 'border border-gray-200 bg-white'
}

function connectionHeaderClass(connectionId: string): string {
  if (props.selectedConnectionId !== connectionId) {
    return 'hover:bg-gray-50 text-gray-800'
  }

  return 'bg-transparent text-gray-900'
}

function filePathClass(connectionId: string): string {
  const isSelected = props.selectedConnectionId === connectionId

  if (!isSelected) {
    return 'text-gray-700 hover:bg-gray-50'
  }

  // Selected file path: unified soft glow + light background based on mode
  if (props.mode === 'source') {
    return 'bg-yellow-50 border border-yellow-200 text-gray-900'
  } else {
    return 'bg-green-50 border border-green-200 text-gray-900'
  }
}

function databaseRowClass(connectionId: string, database: string): string {
  const isSelected =
    props.selectedConnectionId === connectionId && props.selectedDatabase === database

  if (!isSelected) {
    return 'text-gray-700 hover:bg-gray-50'
  }

  // Selected database: soft glow ring + light background based on mode (source = amber, target = blue)
  if (props.mode === 'source') {
    return 'bg-yellow-50 border border-yellow-200 text-gray-900'
  } else {
    return 'bg-green-50 border border-green-200 text-gray-900'
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

  if (isFileConnection(connection)) {
    await fileExplorerStore.loadEntries(connection.id)
    emit('select-connection', { connectionId: connection.id })
    return
  }

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
  return navigationStore.databasesState[connectionId] || []
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
    if (isFileConnection(connection)) {
      void fileExplorerStore.loadEntries(connectionId)
      return
    }
    void loadDatabases(connectionId)
  },
  { immediate: true }
)

watch(
  () => props.selectedDatabase,
  (database) => {
    const connectionId = props.selectedConnectionId
    if (!connectionId || !database) {
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
