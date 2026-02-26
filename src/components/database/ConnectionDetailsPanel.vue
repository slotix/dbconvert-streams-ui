<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import type { Connection } from '@/types/connections'
import BaseButton from '@/components/base/BaseButton.vue'
import FormInput from '@/components/base/FormInput.vue'
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import ConnectionConfigJsonEditor from '@/components/connection/ConnectionConfigJsonEditor.vue'
import connectionsApi from '@/api/connections'
import { generateConnectionString } from '@/utils/connectionStringGenerator'
import { formatDateTime, formatDataSize } from '@/utils/formats'
import { getConnectionHost, getConnectionPort, getConnectionDatabase } from '@/utils/specBuilder'
import { useDatabaseCapabilities } from '@/composables/useDatabaseCapabilities'
import { getConnectionKindFromSpec, getConnectionTypeLabel, isFileBasedKind } from '@/types/specs'
import { useCopyToClipboard } from '@/composables/useCopyToClipboard'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useDatabaseOverviewStore } from '@/stores/databaseOverview'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import {
  BarChart3,
  Calendar,
  Check,
  Clipboard,
  Cloud,
  Database,
  Eye,
  EyeOff,
  Folder,
  Plus,
  Server,
  Terminal
} from 'lucide-vue-next'

const navigationStore = useExplorerNavigationStore()
const overviewStore = useDatabaseOverviewStore()
const connectionsStore = useConnectionsStore()
const commonStore = useCommonStore()

const props = defineProps<{
  connection: Connection
  fileEntries?: Array<{ name: string; path: string; type: 'file' | 'dir'; size?: number }>
}>()
const emit = defineEmits<{
  (e: 'edit-wizard'): void
  (e: 'clone'): void
  (e: 'delete'): void
  (e: 'create-database', databaseName: string): void
  (e: 'create-schema', schemaName: string): void
  (e: 'open-sql-console'): void
  (e: 'open-file-console'): void
  (e: 'create-bucket', payload: { bucket: string; region?: string }): void
}>()

const jsonEditorRef = ref<InstanceType<typeof ConnectionConfigJsonEditor>>()

async function handleSaveConfig(config: Connection) {
  if (!props.connection?.id) {
    jsonEditorRef.value?.onSaveError('Connection ID is missing')
    return
  }

  try {
    await connectionsApi.updateConnectionById(props.connection.id, config)
    jsonEditorRef.value?.onSaveSuccess()
    await connectionsStore.refreshConnections()
    connectionsStore.setCurrentConnection(props.connection.id)
    commonStore.showNotification('Connection updated successfully', 'success')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save connection'
    jsonEditorRef.value?.onSaveError(errorMessage)
  }
}

const showPassword = ref(false)
const { isCopied, copy: copyToClipboard } = useCopyToClipboard()
const { isCopied: isPathCopied, copy: copyPathToClipboard } = useCopyToClipboard()

// Database/Schema creation form state
const newDatabaseName = ref('')
const newSchemaName = ref('')
const isCreatingDatabase = ref(false)
const isCreatingSchema = ref(false)
const newBucketName = ref('')
const newBucketRegion = ref('')
const isCreatingBucket = ref(false)

const connectionKind = computed(() => getConnectionKindFromSpec(props.connection?.spec))
// Database capabilities - computed based on connection kind
const databaseType = computed(() => {
  if (connectionKind.value === 'database') {
    return props.connection?.type || ''
  }
  if (connectionKind.value === 'snowflake') {
    return 'snowflake'
  }
  if (isFileBasedKind(connectionKind.value)) {
    return 'files'
  }
  return ''
})
const { canCreateDatabase, canCreateSchema, isPostgreSQL } = useDatabaseCapabilities(databaseType)
const connectionTypeLabel = computed(
  () => getConnectionTypeLabel(props.connection?.spec, props.connection?.type) || ''
)

// For PostgreSQL, schema creation is available at database level (DatabaseOverviewPanel)
// so we hide it from connection level to avoid confusion
const showSchemaCreationAtConnectionLevel = computed(
  () => canCreateSchema.value && !isPostgreSQL.value && defaultDatabase.value
)

// Helper to get storage provider from spec
const storageProvider = computed(() => {
  const spec = props.connection?.spec
  if (spec?.s3) return 's3'
  if (spec?.gcs) return 'gcs'
  if (spec?.azure) return 'azure'
  if (spec?.files) return 'local' // FileConnectionSpec is only for local files
  return null
})

// Check if this is an S3 connection
const isS3Connection = computed(() => {
  return storageProvider.value === 's3'
})

// Check if this is a file connection (local files or cloud storage)
const isFileConnection = computed(() => isFileBasedKind(connectionKind.value))

// Get base path from spec
const basePath = computed(() => {
  const spec = props.connection?.spec
  if (spec?.files) return spec.files.basePath
  return ''
})

// Get endpoint from spec (S3 only, local files don't have endpoint)
const storageEndpoint = computed(() => {
  const spec = props.connection?.spec
  if (!spec?.s3?.endpoint) return ''
  // Normalize endpoint for display by stripping scheme and trailing slash artifacts
  return spec.s3.endpoint.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
})

// Get region from spec (S3 only, local files don't have region)
const storageRegion = computed(() => {
  const spec = props.connection?.spec
  if (spec?.s3) return spec.s3.region
  return ''
})

watch(
  () => props.connection?.id,
  () => {
    newBucketRegion.value = storageRegion.value || ''
  },
  { immediate: true }
)

// Check if connection has a path configured
const hasPath = computed(() => {
  return !!basePath.value?.trim()
})

// Parse S3 URI to extract bucket and prefix
// e.g., "s3://my-bucket/prefix/path" -> { bucket: "my-bucket", prefix: "prefix/path" }
function parseS3Uri(uri: string | undefined): { bucket: string; prefix: string } {
  if (!uri) return { bucket: '', prefix: '' }
  const match = uri.match(/^s3:\/\/([^/]+)(?:\/(.*))?$/)
  if (!match) return { bucket: '', prefix: '' }
  return { bucket: match[1] || '', prefix: match[2] || '' }
}

function maskAccessKey(key: string): string {
  if (key.length <= 8) {
    return `${key.slice(0, 2)}••${key.slice(-2)}`
  }
  return `${key.slice(0, 4)}••••${key.slice(-4)}`
}

// Computed S3 bucket and prefix from spec.s3.scope or spec.files.basePath
const s3Bucket = computed(() => {
  const spec = props.connection?.spec
  if (spec?.s3?.scope?.bucket) return spec.s3.scope.bucket
  // Try parsing from basePath if it's an S3 URI
  if (spec?.files?.basePath) {
    return parseS3Uri(spec.files.basePath).bucket
  }
  return ''
})

const s3Prefix = computed(() => {
  const spec = props.connection?.spec
  if (spec?.s3?.scope?.prefix) return spec.s3.scope.prefix
  // Try parsing from basePath if it's an S3 URI
  if (spec?.files?.basePath) {
    return parseS3Uri(spec.files.basePath).prefix
  }
  return ''
})

const isScopedS3Connection = computed(() => !!s3Bucket.value)

const credentialSummary = computed(() => {
  const credentials = props.connection?.spec?.s3?.credentials
  if (!credentials) return 'IAM role / AWS default credentials'
  if (credentials.credentialsRef) {
    return `Vault secret (${credentials.credentialsRef})`
  }
  if (credentials.accessKey) {
    return `Access key ${maskAccessKey(credentials.accessKey)}`
  }
  return 'Static credentials configured'
})

const s3AccessScopeLabel = computed(() => {
  if (isScopedS3Connection.value) return 'Scoped bucket'
  return 'All buckets'
})

const s3AccessScopeDescription = computed(() => {
  if (isScopedS3Connection.value) {
    if (s3Prefix.value) {
      return `Access limited to s3://${s3Bucket.value}/${s3Prefix.value}`
    }
    return `Access limited to bucket "${s3Bucket.value}"`
  }
  if (storageRegion.value) {
    return `Browse all buckets in ${storageRegion.value}`
  }
  return 'Browse all buckets with this credential'
})

// Filter files to show only supported formats
const supportedFiles = computed(() => {
  if (!props.fileEntries) return []
  const supportedExtensions = ['.csv', '.json', '.jsonl', '.parquet', '.gz']
  return props.fileEntries.filter(
    (file) =>
      file.type === 'file' &&
      supportedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
  )
})

// File count and size summary
const totalFileCount = computed(() => {
  return supportedFiles.value.length
})

const totalFileSize = computed(() => {
  return supportedFiles.value.reduce((sum, file) => sum + (file.size || 0), 0)
})

const fileSummary = computed(() => {
  const count = totalFileCount.value
  if (count === 0) return ''

  const size = totalFileSize.value
  const sizeStr = formatFileSize(size)

  if (count === 1) {
    return `1 file (${sizeStr})`
  } else {
    return `${count} files (${sizeStr} total)`
  }
})

// Helper function to format file sizes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  const value = bytes / Math.pow(k, i)
  const formatted = i === 0 ? value.toString() : value.toFixed(1)

  return `${formatted} ${units[i]}`
}

const hostWithPort = computed(() => {
  const host = getConnectionHost(props.connection)
  const port = getConnectionPort(props.connection)
  if (!host && !port) return ''
  return `${host || ''}${port ? `:${port}` : ''}`
})

const defaultDatabase = computed(() => getConnectionDatabase(props.connection))

const connectionString = computed(() =>
  generateConnectionString(props.connection, showPassword.value)
)
const maskedConnectionString = computed(() => generateConnectionString(props.connection, false))

function copyConnectionString() {
  const text = showPassword.value
    ? connectionString.value
    : maskedConnectionString.value.replace(/(?<=:)[^@]+(?=@)/g, '****')
  copyToClipboard(text)
}

function copyFolderPath() {
  // Use spec.files.basePath or build S3 URI from spec.s3
  let pathToCopy = basePath.value

  // If S3 connection, build URI from spec.s3.scope
  if (isS3Connection.value) {
    const spec = props.connection?.spec
    if (spec?.s3?.scope?.bucket) {
      pathToCopy = `s3://${spec.s3.scope.bucket}${spec.s3.scope.prefix ? '/' + spec.s3.scope.prefix : ''}`
    } else {
      pathToCopy = displayS3URI.value || 's3://'
    }
  }

  // If no path, use fallback
  if (!pathToCopy) {
    pathToCopy = isS3Connection.value ? displayS3URI.value || 's3://' : ''
  }

  copyPathToClipboard(pathToCopy)
}

const createdDisplay = computed(() => {
  return formatDateTime(props.connection?.created || 0)
})

const bucketValidationMessage = computed(() => {
  const value = newBucketName.value.trim()
  if (!value) return ''
  if (value.length < 3 || value.length > 63) {
    return 'Bucket names must be 3-63 characters.'
  }
  if (!/^[a-z0-9][a-z0-9.-]+[a-z0-9]$/.test(value)) {
    return 'Use lowercase letters, numbers, dots, and hyphens only.'
  }
  if (value.includes('..')) {
    return 'Bucket names cannot contain consecutive periods.'
  }
  if (value.includes('.-') || value.includes('-.')) {
    return 'Dots cannot be adjacent to hyphens.'
  }
  return ''
})

const canCreateBucket = computed(() => {
  return !!newBucketName.value.trim() && !bucketValidationMessage.value
})

// Database/Schema creation handlers
async function handleCreateDatabase() {
  const dbName = newDatabaseName.value.trim()
  if (!dbName) return

  isCreatingDatabase.value = true
  try {
    emit('create-database', dbName)
    newDatabaseName.value = '' // Clear input on success
  } finally {
    isCreatingDatabase.value = false
  }
}

async function handleCreateSchema() {
  const schemaName = newSchemaName.value.trim()
  if (!schemaName) return

  isCreatingSchema.value = true
  try {
    emit('create-schema', schemaName)
    newSchemaName.value = '' // Clear input on success
  } finally {
    isCreatingSchema.value = false
  }
}

async function handleCreateBucket() {
  const bucket = newBucketName.value.trim()
  if (!bucket || bucketValidationMessage.value) return

  isCreatingBucket.value = true
  try {
    emit('create-bucket', {
      bucket,
      region: newBucketRegion.value.trim() || undefined
    })
    newBucketName.value = ''
  } finally {
    isCreatingBucket.value = false
  }
}

// Compute displayable S3 URI from spec.s3 or spec.files
const displayS3URI = computed(() => {
  const spec = props.connection?.spec

  // Build URI from S3 scope
  if (spec?.s3?.scope?.bucket) {
    const bucket = spec.s3.scope.bucket
    const prefix = spec.s3.scope.prefix || ''
    return `s3://${bucket}${prefix ? '/' + prefix : ''}`
  }

  // Try basePath from files spec
  if (spec?.files?.basePath) {
    return spec.files.basePath
  }

  // Show meaningful info for unscoped connections
  if (storageEndpoint.value) {
    return `s3://${storageEndpoint.value}`
  } else if (storageRegion.value) {
    return `s3://${storageRegion.value}`
  }

  return 's3://'
})

// Server Stats - aggregated across all databases
const databases = computed(() => {
  if (!props.connection?.id) return []
  return navigationStore.getDatabases(props.connection.id) || []
})

// Track loading state for overview fetching
const isLoadingOverviews = ref(false)

// Fetch overviews for all databases when they become available
watch(
  databases,
  async (dbs) => {
    if (!dbs.length || !props.connection?.id) return

    // Check which databases don't have overview data yet
    const dbsNeedingOverview = dbs.filter(
      (db) => !overviewStore.getOverview(props.connection.id, db.name)
    )

    if (dbsNeedingOverview.length === 0) return

    isLoadingOverviews.value = true
    try {
      // Fetch overviews in parallel (limit to 5 concurrent to avoid overwhelming the server)
      const batchSize = 5
      for (let i = 0; i < dbsNeedingOverview.length; i += batchSize) {
        const batch = dbsNeedingOverview.slice(i, i + batchSize)
        await Promise.all(
          batch.map((db) =>
            overviewStore.fetchOverview(props.connection.id, db.name).catch((err) => {
              // Silently ignore errors for individual databases (e.g., permission issues)
              console.debug(`Failed to fetch overview for ${db.name}:`, err)
            })
          )
        )
      }
    } finally {
      isLoadingOverviews.value = false
    }
  },
  { immediate: true }
)

const serverStats = computed(() => {
  const stats = {
    databases: databases.value.length,
    tables: 0,
    views: 0,
    schemas: 0,
    sizeBytes: 0,
    usedConnections: 0,
    maxConnections: 0,
    activeSessions: 0,
    engine: '' as string,
    version: '' as string,
    hasData: false
  }

  if (!props.connection?.id) return stats

  // Aggregate stats from all loaded database overviews
  for (const db of databases.value) {
    const overview = overviewStore.getOverview(props.connection.id, db.name)
    if (overview) {
      stats.hasData = true
      stats.tables += overview.counts?.tables || 0
      stats.views += overview.counts?.views || 0
      stats.schemas += overview.counts?.schemas || 0
      stats.sizeBytes += overview.sizeBytes || 0

      // Take engine/version from first overview (same for all DBs on same server)
      if (!stats.engine && overview.engine) {
        stats.engine = overview.engine
        stats.version = overview.version || ''
      }

      // Take max connections value (same for all DBs on server)
      if (overview.activity?.connections) {
        // Use the highest values seen (connections are server-level, not DB-level)
        if (overview.activity.connections.used > stats.usedConnections) {
          stats.usedConnections = overview.activity.connections.used
        }
        if (
          overview.activity.connections.max &&
          overview.activity.connections.max > stats.maxConnections
        ) {
          stats.maxConnections = overview.activity.connections.max
        }
      }

      // Sum active sessions
      if (overview.activity?.activeSessions) {
        stats.activeSessions = Math.max(stats.activeSessions, overview.activity.activeSessions)
      }
    }
  }

  return stats
})

const serverSizeDisplay = computed(() => {
  if (serverStats.value.sizeBytes === 0) return '—'
  return formatDataSize(serverStats.value.sizeBytes)
})

const isLoadingDatabases = computed(() => {
  if (!props.connection?.id) return false
  return navigationStore.isDatabasesLoading(props.connection.id)
})
</script>

<template>
  <div
    class="bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-900/40 rounded-2xl overflow-hidden hover:shadow-xl dark:hover:shadow-gray-900/70 transition-all duration-300"
  >
    <div
      class="px-6 py-4 border-b border-slate-200 dark:border-gray-800 flex items-center justify-between bg-linear-to-r from-slate-50 to-white dark:from-gray-850 dark:to-gray-900"
    >
      <div class="flex items-center gap-3 min-w-0">
        <h3
          class="text-lg font-bold text-slate-900 dark:text-gray-100 truncate bg-clip-text"
          :title="connection.name"
        >
          {{ connection.name || hostWithPort || 'Connection' }}
        </h3>
        <CloudProviderBadge
          :cloud-provider="connection.cloud_provider || ''"
          :db-type="connectionTypeLabel"
        />
      </div>
      <div class="hidden sm:flex flex-wrap items-center justify-end gap-2">
        <BaseButton variant="secondary" size="sm" @click="emit('edit-wizard')">Edit</BaseButton>
        <BaseButton variant="secondary" size="sm" @click="emit('clone')">Clone</BaseButton>
        <BaseButton variant="danger" size="sm" @click="emit('delete')">Delete</BaseButton>

        <!-- Action buttons separator -->
        <div class="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-0.5"></div>

        <!-- File connection actions -->
        <template v-if="isFileConnection">
          <BaseButton
            variant="secondary"
            size="sm"
            title="SQL Console"
            @click="emit('open-file-console')"
          >
            <Terminal class="w-3.5 h-3.5" />
          </BaseButton>

          <!-- S3: Create Bucket popover -->
          <Popover v-if="isS3Connection" v-slot="{ close }" as="div" class="relative">
            <PopoverButton as="template">
              <BaseButton variant="secondary" size="sm">
                <Plus class="w-3.5 h-3.5 mr-1" />
                Create Bucket
              </BaseButton>
            </PopoverButton>
            <transition
              enter-active-class="transition duration-100 ease-out"
              enter-from-class="transform scale-95 opacity-0"
              enter-to-class="transform scale-100 opacity-100"
              leave-active-class="transition duration-75 ease-in"
              leave-from-class="transform scale-100 opacity-100"
              leave-to-class="transform scale-95 opacity-0"
            >
              <PopoverPanel
                class="absolute right-0 z-10 mt-1 w-72 origin-top-right rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 dark:ring-white/10 p-3"
              >
                <div class="space-y-2">
                  <label class="block text-xs font-medium text-gray-600 dark:text-gray-400"
                    >Bucket name</label
                  >
                  <FormInput
                    v-model="newBucketName"
                    placeholder="analytics-exports"
                    :disabled="isCreatingBucket"
                    @keyup.enter="
                      () => {
                        handleCreateBucket()
                        close()
                      }
                    "
                  />
                  <label class="block text-xs font-medium text-gray-600 dark:text-gray-400"
                    >Region</label
                  >
                  <FormInput
                    v-model="newBucketRegion"
                    :placeholder="storageRegion || 'us-east-1'"
                    :disabled="isCreatingBucket"
                    @keyup.enter="
                      () => {
                        handleCreateBucket()
                        close()
                      }
                    "
                  />
                  <p v-if="bucketValidationMessage" class="text-xs text-red-500">
                    {{ bucketValidationMessage }}
                  </p>
                  <BaseButton
                    variant="primary"
                    size="sm"
                    class="w-full justify-center"
                    :disabled="!canCreateBucket || isCreatingBucket"
                    @click="
                      () => {
                        handleCreateBucket()
                        close()
                      }
                    "
                  >
                    Create
                  </BaseButton>
                </div>
              </PopoverPanel>
            </transition>
          </Popover>
        </template>

        <!-- Database connection actions -->
        <template v-if="!isFileConnection">
          <BaseButton
            variant="secondary"
            size="sm"
            title="SQL Console"
            @click="emit('open-sql-console')"
          >
            <Terminal class="w-3.5 h-3.5" />
          </BaseButton>

          <!-- Create Database popover -->
          <Popover v-if="canCreateDatabase" v-slot="{ close }" as="div" class="relative">
            <PopoverButton as="template">
              <BaseButton variant="secondary" size="sm">
                <Database class="w-3.5 h-3.5 mr-1" />
                Create DB
              </BaseButton>
            </PopoverButton>
            <transition
              enter-active-class="transition duration-100 ease-out"
              enter-from-class="transform scale-95 opacity-0"
              enter-to-class="transform scale-100 opacity-100"
              leave-active-class="transition duration-75 ease-in"
              leave-from-class="transform scale-100 opacity-100"
              leave-to-class="transform scale-95 opacity-0"
            >
              <PopoverPanel
                class="absolute right-0 z-10 mt-1 w-64 origin-top-right rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 dark:ring-white/10 p-3"
              >
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5"
                  >Database name</label
                >
                <div class="flex gap-2">
                  <FormInput
                    v-model="newDatabaseName"
                    placeholder="database_name"
                    class="flex-1"
                    :disabled="isCreatingDatabase"
                    @keyup.enter="
                      () => {
                        handleCreateDatabase()
                        close()
                      }
                    "
                  />
                  <BaseButton
                    variant="primary"
                    size="sm"
                    class="shrink-0"
                    :disabled="!newDatabaseName.trim() || isCreatingDatabase"
                    @click="
                      () => {
                        handleCreateDatabase()
                        close()
                      }
                    "
                  >
                    Create
                  </BaseButton>
                </div>
              </PopoverPanel>
            </transition>
          </Popover>

          <!-- Create Schema popover -->
          <Popover
            v-if="showSchemaCreationAtConnectionLevel"
            v-slot="{ close }"
            as="div"
            class="relative"
          >
            <PopoverButton as="template">
              <BaseButton variant="secondary" size="sm">
                <Plus class="w-3.5 h-3.5 mr-1" />
                Create Schema
              </BaseButton>
            </PopoverButton>
            <transition
              enter-active-class="transition duration-100 ease-out"
              enter-from-class="transform scale-95 opacity-0"
              enter-to-class="transform scale-100 opacity-100"
              leave-active-class="transition duration-75 ease-in"
              leave-from-class="transform scale-100 opacity-100"
              leave-to-class="transform scale-95 opacity-0"
            >
              <PopoverPanel
                class="absolute right-0 z-10 mt-1 w-64 origin-top-right rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 dark:ring-white/10 p-3"
              >
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  In database:
                  <span class="font-medium text-gray-700 dark:text-gray-300">{{
                    defaultDatabase
                  }}</span>
                </p>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5"
                  >Schema name</label
                >
                <div class="flex gap-2">
                  <FormInput
                    v-model="newSchemaName"
                    placeholder="schema_name"
                    class="flex-1"
                    :disabled="isCreatingSchema"
                    @keyup.enter="
                      () => {
                        handleCreateSchema()
                        close()
                      }
                    "
                  />
                  <BaseButton
                    variant="primary"
                    size="sm"
                    class="shrink-0"
                    :disabled="!newSchemaName.trim() || isCreatingSchema"
                    @click="
                      () => {
                        handleCreateSchema()
                        close()
                      }
                    "
                  >
                    Create
                  </BaseButton>
                </div>
              </PopoverPanel>
            </transition>
          </Popover>
        </template>
      </div>
    </div>

    <div class="p-4 space-y-6">
      <!-- File Connection Details -->
      <div v-if="isFileConnection" class="space-y-6">
        <template v-if="isS3Connection">
          <div class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
            <div
              class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 ring-1 ring-slate-200/70 dark:ring-gray-700"
            >
              <div class="flex items-center gap-2 mb-3">
                <div class="p-1.5 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
                  <Cloud class="h-4 w-4 text-sky-600 dark:text-sky-400" />
                </div>
                <span class="text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >Storage Info</span
                >
              </div>
              <div class="space-y-4">
                <div>
                  <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                    >Storage URI</label
                  >
                  <div
                    class="mt-1 flex items-start gap-2 rounded-lg bg-linear-to-r from-slate-50 to-gray-50 dark:from-gray-800 dark:to-gray-850 p-3 font-mono text-sm border border-gray-100 dark:border-gray-700"
                  >
                    <span class="flex-1 break-all text-gray-800 dark:text-gray-200 overflow-x-auto">
                      {{ displayS3URI }}
                    </span>
                    <button
                      v-if="displayS3URI && displayS3URI !== 's3://'"
                      class="shrink-0 transition-colors"
                      :class="
                        isPathCopied
                          ? 'text-green-400'
                          : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                      "
                      :title="isPathCopied ? 'Copied!' : 'Copy storage URI to clipboard'"
                      @click.stop="copyFolderPath"
                    >
                      <Clipboard v-if="!isPathCopied" class="h-4 w-4" />
                      <Check v-else class="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div v-if="storageRegion">
                    <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                      >Region</label
                    >
                    <p class="mt-1 font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
                      {{ storageRegion }}
                    </p>
                  </div>
                  <div v-if="storageEndpoint">
                    <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                      >Endpoint</label
                    >
                    <p class="mt-1 font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
                      {{ storageEndpoint }}
                    </p>
                  </div>
                </div>
                <div>
                  <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                    >Credentials</label
                  >
                  <p class="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {{ credentialSummary }}
                  </p>
                </div>
              </div>
            </div>

            <div
              class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 ring-1 ring-slate-200/70 dark:ring-gray-700"
            >
              <div class="flex items-center gap-2 mb-3">
                <div class="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <Folder class="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <span class="text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >Scope & Files</span
                >
              </div>
              <div class="space-y-4">
                <div>
                  <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                    >Access Scope</label
                  >
                  <p class="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                    {{ s3AccessScopeLabel }}
                  </p>
                  <p class="text-xs text-gray-600 dark:text-gray-400">
                    {{ s3AccessScopeDescription }}
                  </p>
                </div>
                <div v-if="s3Bucket">
                  <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                    >Bucket</label
                  >
                  <p class="mt-1 font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
                    {{ s3Bucket }}
                  </p>
                </div>
                <div v-if="s3Prefix">
                  <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                    >Prefix</label
                  >
                  <p class="mt-1 font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
                    {{ s3Prefix }}
                  </p>
                </div>
                <div>
                  <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                    >Files</label
                  >
                  <p class="mt-1 text-sm text-gray-700 dark:text-gray-300 font-medium">
                    <span v-if="totalFileCount > 0">{{ fileSummary }}</span>
                    <span v-else-if="hasPath || s3Bucket || isS3Connection">
                      {{
                        isS3Connection && !s3Bucket
                          ? 'Browse buckets to view files'
                          : 'No supported files found'
                      }}
                    </span>
                    <span v-else>No path configured</span>
                  </p>
                </div>
                <div
                  v-if="!s3Bucket"
                  class="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                >
                  <p class="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> This connection can browse all buckets. Specify a bucket
                    when using it as a stream target.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <div
            class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 ring-1 ring-slate-200/70 dark:ring-gray-700 space-y-4"
          >
            <div class="flex items-center gap-2">
              <div class="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Folder class="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Local Path</span>
            </div>
            <div>
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Folder Path</label
              >
              <div
                class="mt-1 flex items-start gap-2 rounded-lg bg-linear-to-r from-slate-50 to-gray-50 dark:from-gray-800 dark:to-gray-850 p-3 font-mono text-sm border border-gray-100 dark:border-gray-700"
              >
                <span class="flex-1 break-all text-gray-800 dark:text-gray-200 overflow-x-auto">
                  {{ basePath || 'No path configured' }}
                </span>
                <button
                  v-if="basePath"
                  class="shrink-0 transition-colors"
                  :class="
                    isPathCopied
                      ? 'text-green-400'
                      : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                  "
                  :title="isPathCopied ? 'Copied!' : 'Copy folder path to clipboard'"
                  @click.stop="copyFolderPath"
                >
                  <Clipboard v-if="!isPathCopied" class="h-4 w-4" />
                  <Check v-else class="h-4 w-4" />
                </button>
              </div>
            </div>
            <div>
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Files</label
              >
              <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">
                <span
                  v-if="totalFileCount > 0"
                  class="font-medium text-gray-900 dark:text-gray-100"
                >
                  {{ fileSummary }}
                </span>
                <span v-else-if="hasPath" class="text-gray-500 dark:text-gray-400">
                  No supported files found
                </span>
                <span v-else class="text-gray-500 dark:text-gray-400">No path configured</span>
              </p>
            </div>
          </div>
        </template>
      </div>

      <!-- Database Connection Details - 2x2 Card Layout -->
      <div v-else class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
        <!-- Row 1: Server Info -->
        <!-- Connection Info Card -->
        <div
          class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 ring-1 ring-slate-200/70 dark:ring-gray-700"
        >
          <div class="flex items-center gap-2 mb-3">
            <div class="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Server class="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span class="text-sm font-semibold text-gray-700 dark:text-gray-300"
              >Connection Info</span
            >
          </div>

          <div class="space-y-3">
            <div>
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Host</label
              >
              <p
                class="mt-0.5 font-medium text-gray-900 dark:text-gray-100 truncate text-sm"
                :title="hostWithPort"
              >
                {{ hostWithPort }}
              </p>
            </div>
            <div v-if="defaultDatabase">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Default Database</label
              >
              <p class="mt-0.5 font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
                {{ defaultDatabase }}
              </p>
            </div>
            <div>
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Connection String</label
              >
              <div
                class="mt-1 flex items-start gap-2 rounded-lg bg-white dark:bg-gray-900 p-2 font-mono text-xs border border-gray-200 dark:border-gray-700"
              >
                <span
                  class="flex-1 break-all text-gray-800 dark:text-gray-100 overflow-x-auto max-h-16 overflow-y-auto"
                >
                  {{
                    showPassword
                      ? connectionString
                      : maskedConnectionString.replace(/(?<=:)[^@]+(?=@)/g, '****')
                  }}
                </span>
                <div class="flex flex-col gap-1">
                  <button
                    class="shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    :title="
                      showPassword ? 'Hide password and truncate' : 'Show password and full details'
                    "
                    @click="showPassword = !showPassword"
                  >
                    <Eye v-if="!showPassword" class="h-3.5 w-3.5" />
                    <EyeOff v-else class="h-3.5 w-3.5" />
                  </button>
                  <button
                    class="shrink-0 transition-colors"
                    :class="
                      isCopied
                        ? 'text-green-400'
                        : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                    "
                    :title="isCopied ? 'Copied!' : 'Copy connection string to clipboard'"
                    @click="copyConnectionString"
                  >
                    <Clipboard v-if="!isCopied" class="h-3.5 w-3.5" />
                    <Check v-else class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Server Stats Card -->
        <div
          class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 ring-1 ring-slate-200/70 dark:ring-gray-700"
        >
          <div class="flex items-center gap-2 mb-3">
            <div class="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <BarChart3 class="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Server Stats</span>
          </div>

          <div
            v-if="isLoadingDatabases || isLoadingOverviews"
            class="flex items-center gap-2 text-sm text-gray-500"
          >
            <svg
              class="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
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
            {{ isLoadingDatabases ? 'Loading databases...' : 'Loading stats...' }}
          </div>

          <div v-else class="space-y-3">
            <!-- Engine/Version Badge -->
            <div v-if="serverStats.engine" class="flex items-center gap-2">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize"
                :class="
                  serverStats.engine === 'postgres'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                "
              >
                {{ serverStats.engine === 'postgres' ? 'PostgreSQL' : 'MySQL' }}
              </span>
              <span class="text-xs text-gray-500 dark:text-gray-400">{{
                serverStats.version
              }}</span>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-x-4 gap-y-2">
              <div class="min-w-0">
                <label
                  class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap"
                  >Databases</label
                >
                <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-base">
                  {{ serverStats.databases }}
                </p>
              </div>
              <div class="min-w-0">
                <label
                  class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap"
                  >Total Size</label
                >
                <p
                  class="mt-0.5 font-semibold text-base whitespace-nowrap"
                  :class="
                    serverStats.hasData
                      ? 'text-gray-900 dark:text-gray-100'
                      : 'text-gray-400 dark:text-gray-500'
                  "
                >
                  {{ serverSizeDisplay }}
                </p>
              </div>
              <div class="min-w-0">
                <label
                  class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap"
                  >Tables</label
                >
                <p
                  class="mt-0.5 font-semibold text-base"
                  :class="
                    serverStats.hasData
                      ? 'text-gray-900 dark:text-gray-100'
                      : 'text-gray-400 dark:text-gray-500'
                  "
                >
                  {{ serverStats.hasData ? serverStats.tables : '—' }}
                </p>
              </div>
              <div class="min-w-0">
                <label
                  class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap"
                  >Views</label
                >
                <p
                  class="mt-0.5 font-semibold text-base"
                  :class="
                    serverStats.hasData
                      ? 'text-gray-900 dark:text-gray-100'
                      : 'text-gray-400 dark:text-gray-500'
                  "
                >
                  {{ serverStats.hasData ? serverStats.views : '—' }}
                </p>
              </div>
            </div>

            <!-- Connections & Sessions -->
            <div
              v-if="
                serverStats.hasData &&
                (serverStats.maxConnections > 0 || serverStats.activeSessions > 0)
              "
              class="pt-2 border-t border-gray-200 dark:border-gray-700"
            >
              <div class="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-x-4 gap-y-2">
                <div v-if="serverStats.maxConnections > 0" class="min-w-0">
                  <label
                    class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap"
                    >Connections</label
                  >
                  <p
                    class="mt-0.5 font-semibold text-base text-gray-900 dark:text-gray-100 whitespace-nowrap"
                  >
                    {{ serverStats.usedConnections }}
                    <span class="text-xs font-normal text-gray-500 dark:text-gray-400"
                      >/ {{ serverStats.maxConnections }}</span
                    >
                  </p>
                </div>
                <div v-if="serverStats.activeSessions > 0" class="min-w-0">
                  <label
                    class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap"
                    >Active Sessions</label
                  >
                  <p class="mt-0.5 font-semibold text-base text-gray-900 dark:text-gray-100">
                    {{ serverStats.activeSessions }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        <Calendar class="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <span class="text-sm text-gray-500 dark:text-gray-400 truncate"
          >Created: {{ createdDisplay }}</span
        >
      </div>

      <div class="pt-6 border-t border-gray-100 dark:border-gray-800">
        <ConnectionConfigJsonEditor
          ref="jsonEditorRef"
          :config="connection"
          height="600px"
          default-collapsed
          @save="handleSaveConfig"
        />
      </div>
    </div>
  </div>
</template>

<style scoped></style>
