<template>
  <div
    class="bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700"
    :class="{ 'border-b-0': isCollapsed }"
  >
    <!-- Header -->
    <button
      class="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      @click="toggleCollapse"
    >
      <div class="flex items-center space-x-2">
        <Database class="h-4 w-4 text-teal-600 dark:text-teal-400" />
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100"> Data Sources </span>

        <!-- Collapsed preview of selected sources -->
        <div
          v-if="isCollapsed && selectedPreview.length > 0"
          class="hidden sm:flex items-center gap-1 max-w-[55vw] overflow-hidden"
        >
          <span
            v-for="item in selectedPreview"
            :key="item.connectionId"
            class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 truncate"
          >
            <span class="font-mono text-gray-600 dark:text-gray-300">{{ item.alias }}</span>
            <span class="text-gray-400 dark:text-gray-500">·</span>
            <span class="truncate max-w-40">{{ item.name }}</span>
          </span>
          <span
            v-if="selectedOverflowCount > 0"
            class="inline-flex items-center px-1.5 py-0.5 text-[11px] rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
          >
            +{{ selectedOverflowCount }}
          </span>
        </div>

        <span
          v-if="selectedCount > 0"
          class="px-1.5 py-0.5 text-xs font-medium rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300"
        >
          {{ selectedCount }} selected
        </span>

        <span
          v-if="isCollapsed"
          class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] rounded bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
          :title="collapsedCtaTitle"
        >
          <Plus class="h-3 w-3" />
          {{ collapsedCtaLabel }}
        </span>
      </div>
      <ChevronDown
        class="h-4 w-4 text-gray-400 transition-transform duration-200"
        :class="{ '-rotate-180': !isCollapsed }"
      />
    </button>

    <!-- Collapsible Content -->
    <div v-show="!isCollapsed" class="px-4 pb-3 border-t border-gray-100 dark:border-gray-700/50">
      <div v-if="showCreateConnectionLink" class="pt-3 flex justify-end">
        <RouterLink
          :to="createConnectionTo"
          class="text-xs font-medium text-teal-700 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-200 transition-colors"
          @click.stop
        >
          + New connection
        </RouterLink>
      </div>

      <!-- Info Banner -->
      <div
        class="mt-3 mb-3 flex items-start space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md text-xs"
      >
        <Info class="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
        <div class="text-blue-700 dark:text-blue-300">
          <p>
            Select database connections to query. Use aliases in your SQL:
            <code class="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded font-mono"
              >pg1.schema.table</code
            >
          </p>
          <p class="mt-1 text-blue-600 dark:text-blue-400">
            <strong>Files:</strong> Query files directly without selecting a connection:
            <code class="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded font-mono"
              >read_parquet('/path/file.parquet')</code
            >
          </p>
        </div>
      </div>

      <!-- S3/Cloud Credential Warning -->
      <div
        v-if="hasMultipleCloudConnections"
        class="mb-3 flex items-start space-x-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md text-xs"
      >
        <AlertTriangle class="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
        <div class="text-amber-700 dark:text-amber-300">
          <p>
            <strong>Note:</strong> Multiple S3/GCS connections selected. Only the first connection's
            credentials will be used for cloud storage access.
          </p>
        </div>
      </div>

      <!-- Connection List -->
      <div class="space-y-2 max-h-60 overflow-y-auto">
        <div
          v-for="conn in databaseConnections"
          :key="conn.id"
          class="flex items-center space-x-3 p-2 rounded-md transition-colors"
          :class="[
            isSelected(conn.id)
              ? 'bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
          ]"
        >
          <!-- Checkbox -->
          <input
            :id="`conn-${conn.id}`"
            type="checkbox"
            :checked="isSelected(conn.id)"
            class="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500 bg-white dark:bg-gray-800"
            @change="toggleConnection(conn)"
          />

          <!-- Connection Icon -->
          <div class="shrink-0">
            <component
              :is="getConnectionIcon(conn.type)"
              class="h-5 w-5"
              :class="getConnectionIconColor(conn.type)"
            />
          </div>

          <!-- Connection Info -->
          <div class="flex-1 min-w-0">
            <label
              :for="`conn-${conn.id}`"
              class="block text-sm font-medium text-gray-900 dark:text-gray-100 truncate cursor-pointer"
            >
              {{ conn.name }}
            </label>
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
              {{ conn.type }} · {{ getConnectionHost(conn) }}
            </p>
            <!-- File connection hint -->
            <p
              v-if="isFileConnection(conn.id) && isSelected(conn.id)"
              class="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5"
            >
              Use read_parquet() or read_csv_auto() with file paths
            </p>
          </div>

          <!-- Alias Input (shown when selected) - only for database connections -->
          <div
            v-if="isSelected(conn.id) && !isFileConnection(conn.id)"
            class="flex items-center space-x-2 shrink-0"
          >
            <span class="text-xs text-gray-500 dark:text-gray-400">as</span>
            <input
              type="text"
              :value="getAlias(conn.id)"
              class="w-20 px-2 py-1 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              placeholder="alias"
              @input="updateAlias(conn.id, ($event.target as HTMLInputElement).value)"
            />

            <!-- Database Selector (for connections with multiple databases) -->
            <select
              v-if="conn.databasesInfo && conn.databasesInfo.length > 1"
              :value="getDatabase(conn.id)"
              class="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              @change="updateDatabase(conn.id, ($event.target as HTMLSelectElement).value)"
            >
              <option
                v-for="db in conn.databasesInfo.filter((d) => !d.isSystem)"
                :key="db.name"
                :value="db.name"
              >
                {{ db.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-if="databaseConnections.length === 0"
          class="py-6 text-center text-gray-500 dark:text-gray-400"
        >
          <Database class="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p class="text-sm">No connections found</p>
          <p class="text-xs mt-1">
            Add PostgreSQL, MySQL, or file connections to use federated queries.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { AlertTriangle, ChevronDown, Cloud, Database, Folder, Info, Plus } from 'lucide-vue-next'
import { useConnectionsStore } from '@/stores/connections'
import type { Connection } from '@/types/connections'
import type { ConnectionMapping } from '@/api/federated'

// Props
interface Props {
  modelValue: ConnectionMapping[]
  /** Show file connections (Files, S3, GCS) in addition to database connections */
  showFileConnections?: boolean
  /** Whether the panel is collapsed initially */
  defaultCollapsed?: boolean
  /** Show a shortcut to the New Connection flow */
  showCreateConnectionLink?: boolean
  /** Route to the New Connection flow */
  createConnectionTo?: string
}

const props = withDefaults(defineProps<Props>(), {
  showFileConnections: false,
  defaultCollapsed: false,
  showCreateConnectionLink: false,
  createConnectionTo: '/explorer/add'
})

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: ConnectionMapping[]): void
}>()

// Stores
const connectionsStore = useConnectionsStore()

// Local State
const isCollapsed = ref(props.defaultCollapsed)

// Helper to check if a connection type is a database
function isDatabaseType(type: string): boolean {
  const normalized = type?.toLowerCase() || ''
  return (
    normalized === 'postgresql' ||
    normalized === 'postgres' ||
    normalized === 'mysql' ||
    normalized === 'mariadb'
  )
}

// Helper to check if a connection type is a file/cloud storage
function isFileType(type: string): boolean {
  const normalized = type?.toLowerCase() || ''
  return (
    normalized === 'files' || normalized === 's3' || normalized === 'gcs' || normalized === 'azure'
  )
}

// Computed
const availableConnections = computed(() => {
  return connectionsStore.connections.filter((conn) => {
    const type = conn.type?.toLowerCase() || ''
    // Always include database connections
    if (isDatabaseType(type)) {
      return true
    }
    // Include file connections only if showFileConnections is true
    if (props.showFileConnections && isFileType(type)) {
      return true
    }
    return false
  })
})

// For backward compatibility, expose databaseConnections as alias
const databaseConnections = availableConnections

// Check if multiple S3/GCS connections are selected (credential limitation)
const hasMultipleCloudConnections = computed(() => {
  const cloudConnectionIds = props.modelValue
    .map((m) => {
      const conn = connectionsStore.connections.find((c) => c.id === m.connectionId)
      return conn?.type?.toLowerCase()
    })
    .filter((type) => type === 's3' || type === 'gcs' || type === 'azure')
  return cloudConnectionIds.length > 1
})

const selectedCount = computed(() => props.modelValue.length)
const collapsedCtaLabel = computed(() =>
  selectedCount.value > 0 ? 'Add sources' : 'Select sources'
)
const collapsedCtaTitle = computed(() =>
  selectedCount.value > 0 ? 'Expand to add more sources' : 'Expand to select one or more sources'
)

const selectedPreview = computed(() => {
  const previewLimit = 2
  return props.modelValue.slice(0, previewLimit).map((m) => {
    const conn = connectionsStore.connectionByID(m.connectionId)
    return {
      connectionId: m.connectionId,
      alias: m.alias,
      name: conn?.name || conn?.host || 'Connection'
    }
  })
})

const selectedOverflowCount = computed(() => Math.max(0, props.modelValue.length - 2))

// Methods
function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

function isSelected(connectionId: string): boolean {
  return props.modelValue.some((m) => m.connectionId === connectionId)
}

function getAlias(connectionId: string): string {
  const mapping = props.modelValue.find((m) => m.connectionId === connectionId)
  return mapping?.alias || ''
}

function getDatabase(connectionId: string): string {
  const mapping = props.modelValue.find((m) => m.connectionId === connectionId)
  return mapping?.database || ''
}

function generateAlias(conn: Connection): string {
  const type = conn.type?.toLowerCase() || 'db'
  let prefix = 'db'

  if (type === 'postgresql' || type === 'postgres') {
    prefix = 'pg'
  } else if (type === 'mysql' || type === 'mariadb') {
    prefix = 'my'
  } else if (type === 's3') {
    prefix = 's3'
  } else if (type === 'gcs') {
    prefix = 'gcs'
  } else if (type === 'azure') {
    prefix = 'azure'
  } else if (type === 'files') {
    prefix = 'files'
  }

  // Find next available number
  const existingAliases = props.modelValue.map((m) => m.alias)
  let counter = 1
  while (existingAliases.includes(`${prefix}${counter}`)) {
    counter++
  }

  return `${prefix}${counter}`
}

function toggleConnection(conn: Connection) {
  const newMappings = [...props.modelValue]
  const existingIndex = newMappings.findIndex((m) => m.connectionId === conn.id)

  if (existingIndex >= 0) {
    // Remove
    newMappings.splice(existingIndex, 1)
  } else {
    // Add with auto-generated alias
    const alias = generateAlias(conn)
    // Get default database if available
    const defaultDb = conn.databasesInfo?.find((d) => !d.isSystem)?.name || ''

    newMappings.push({
      alias,
      connectionId: conn.id,
      database: defaultDb
    })
  }

  emit('update:modelValue', newMappings)
}

function updateAlias(connectionId: string, alias: string) {
  // Sanitize alias: alphanumeric and underscore only
  const sanitized = alias.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()

  const newMappings = props.modelValue.map((m) => {
    if (m.connectionId === connectionId) {
      return { ...m, alias: sanitized }
    }
    return m
  })

  emit('update:modelValue', newMappings)
}

function updateDatabase(connectionId: string, database: string) {
  const newMappings = props.modelValue.map((m) => {
    if (m.connectionId === connectionId) {
      return { ...m, database }
    }
    return m
  })

  emit('update:modelValue', newMappings)
}

function getConnectionHost(conn: Connection): string {
  const type = conn.type?.toLowerCase() || ''

  // For file connections, show the path/bucket
  if (type === 'files') {
    return conn.spec?.files?.basePath || 'local files'
  }
  if (type === 's3') {
    const bucket = conn.spec?.s3?.scope?.bucket
    return bucket ? `s3://${bucket}` : 'S3'
  }
  if (type === 'gcs') {
    const bucket = conn.spec?.gcs?.scope?.bucket
    return bucket ? `gs://${bucket}` : 'GCS'
  }
  if (type === 'azure') {
    const container = conn.spec?.azure?.scope?.container
    return container ? `azure://${container}` : 'Azure Blob'
  }

  // For database connections
  if (conn.spec?.database) {
    const { host, port } = conn.spec.database
    if (host) {
      return port ? `${host}:${port}` : host
    }
  }
  return 'localhost'
}

function getConnectionIcon(type: string) {
  const normalized = type?.toLowerCase() || ''
  if (normalized === 'files') {
    return Folder
  }
  if (normalized === 's3' || normalized === 'gcs' || normalized === 'azure') {
    return Cloud
  }
  return Database
}

function getConnectionIconColor(type: string): string {
  const normalized = type?.toLowerCase() || ''
  if (normalized === 'postgresql' || normalized === 'postgres') {
    return 'text-blue-500 dark:text-blue-400'
  }
  if (normalized === 'mysql' || normalized === 'mariadb') {
    return 'text-orange-500 dark:text-orange-400'
  }
  if (normalized === 's3') {
    return 'text-amber-500 dark:text-amber-400'
  }
  if (normalized === 'gcs') {
    return 'text-red-500 dark:text-red-400'
  }
  if (normalized === 'azure') {
    return 'text-sky-500 dark:text-sky-400'
  }
  if (normalized === 'files') {
    return 'text-emerald-500 dark:text-emerald-400'
  }
  return 'text-gray-500 dark:text-gray-400'
}

// Check if a connection is a file type (for showing file-specific UI hints)
function isFileConnection(connectionId: string): boolean {
  const conn = connectionsStore.connections.find((c) => c.id === connectionId)
  return conn ? isFileType(conn.type || '') : false
}

// Load connections if not already loaded
watch(
  () => connectionsStore.connections,
  () => {},
  { immediate: true }
)
</script>
