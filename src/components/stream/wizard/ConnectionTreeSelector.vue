<template>
  <div class="space-y-3">
    <div v-if="!connections.length" class="py-8 text-center text-sm text-gray-500">
      No connections available
    </div>

    <div v-for="connection in connections" :key="connection.id" class="rounded-lg">
      <button
        type="button"
        class="flex w-full items-start gap-3 px-3 py-2 text-left transition-colors"
        :class="connectionHeaderClass(connection.id)"
        @click="toggleConnectionExpansion(connection)"
      >
        <component
          :is="isConnectionExpanded(connection.id) ? ChevronDownIcon : ChevronRightIcon"
          class="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400"
        />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="truncate text-sm font-medium text-gray-900">{{ connection.name }}</span>
            <span class="text-xs uppercase tracking-wide text-gray-400">{{ connection.type }}</span>
          </div>
          <div v-if="connectionSubtitle(connection)" class="truncate text-xs text-gray-500">
            {{ connectionSubtitle(connection) }}
          </div>
          <div
            v-if="connectionSelectionLabel(connection.id)"
            class="truncate text-xs text-blue-600"
          >
            {{ connectionSelectionLabel(connection.id) }}
          </div>
        </div>
      </button>

      <div v-if="isConnectionExpanded(connection.id)" class="border-t border-gray-100">
        <div v-if="isFileConnection(connection)" class="space-y-2 py-2">
          <div class="px-2">
            <div class="flex w-full items-start gap-3 rounded-md px-2 py-2 text-sm text-gray-700">
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
                    ? 'ring-2 ring-gray-600 border-gray-600'
                    : 'border-gray-300 hover:border-gray-400',
                  'relative rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500'
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
                <span class="truncate">{{ database.name }}</span>
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
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useStreamsStore } from '@/stores/streamConfig'
import type { Connection } from '@/types/connections'

interface Props {
  connections: Connection[]
  selectedConnectionId?: string | null
  selectedDatabase?: string | null
  selectedSchema?: string | null
  selectedPath?: string | null
  mode: 'source' | 'target'
}

const props = withDefaults(defineProps<Props>(), {
  selectedConnectionId: null,
  selectedDatabase: null,
  selectedSchema: null,
  selectedPath: null
})

const emit = defineEmits<{
  'select-connection': [payload: { connectionId: string; database?: string; schema?: string }]
  'select-database': [payload: { connectionId: string; database: string; schema?: string }]
  'select-file': [payload: { connectionId: string; path: string }]
}>()

const navigationStore = useExplorerNavigationStore()
const fileExplorerStore = useFileExplorerStore()
const streamsStore = useStreamsStore()

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

function connectionSelectionLabel(connectionId: string): string | null {
  if (props.selectedConnectionId !== connectionId) {
    return null
  }
  if (props.mode === 'target' && props.selectedPath) {
    return props.selectedPath
  }
  const parts: string[] = []
  if (props.selectedDatabase) {
    parts.push(props.selectedDatabase)
  }

  const connection = getConnectionById(connectionId)
  if (connection && isFileConnection(connection)) {
    const folder = fileExplorerStore.getDirectoryPath(connectionId) || connection.path || ''
    if (folder) {
      parts.push(folder)
    }
  }

  return parts.length ? parts.join(' / ') : null
}

function connectionHeaderClass(connectionId: string): string {
  if (props.selectedConnectionId !== connectionId) {
    return 'hover:bg-gray-50 text-gray-800'
  }

  const connection = getConnectionById(connectionId)
  const shouldHighlight =
    !props.selectedDatabase || (connection ? isFileConnection(connection) : false)

  return shouldHighlight ? 'bg-gray-100 text-gray-900' : 'text-gray-800'
}

function databaseRowClass(connectionId: string, database: string): string {
  const isSelected =
    props.selectedConnectionId === connectionId && props.selectedDatabase === database
  return isSelected ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
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
</script>
