<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Connection } from '@/types/connections'
import BaseButton from '@/components/base/BaseButton.vue'
import FormInput from '@/components/base/FormInput.vue'
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import { generateConnectionString } from '@/utils/connectionStringGenerator'
import { formatDateTime } from '@/utils/formats'
import { getConnectionHost, getConnectionPort, getConnectionDatabase } from '@/utils/specBuilder'
import { useDatabaseCapabilities } from '@/composables/useDatabaseCapabilities'
import {
  CalendarIcon,
  ClipboardIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
  PlusIcon,
  ServerIcon,
  CircleStackIcon
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  connection: Connection
  fileEntries?: Array<{ name: string; path: string; type: 'file' | 'dir'; size?: number }>
}>()
const emit = defineEmits<{
  (e: 'edit-wizard'): void
  (e: 'edit-json'): void
  (e: 'clone'): void
  (e: 'delete'): void
  (e: 'create-database', databaseName: string): void
  (e: 'create-schema', schemaName: string): void
}>()

const showPassword = ref(false)
const isCopied = ref(false)
const isPathCopied = ref(false)

// Database/Schema creation form state
const newDatabaseName = ref('')
const newSchemaName = ref('')
const isCreatingDatabase = ref(false)
const isCreatingSchema = ref(false)

// Database capabilities - computed based on connection type
const databaseType = computed(() => props.connection?.type || '')
const { canCreateDatabase, canCreateSchema, isPostgreSQL } = useDatabaseCapabilities(databaseType)

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

// Check if this is a file connection (files type or cloud storage)
const isFileConnection = computed(() => {
  const type = props.connection?.type?.toLowerCase()
  return type === 'files' || !!storageProvider.value
})

// Get base path from spec
const basePath = computed(() => {
  const spec = props.connection?.spec
  if (spec?.files) return spec.files.basePath
  return ''
})

// Get endpoint from spec (S3 only, local files don't have endpoint)
const storageEndpoint = computed(() => {
  const spec = props.connection?.spec
  if (spec?.s3) return spec.s3.endpoint
  return ''
})

// Get region from spec (S3 only, local files don't have region)
const storageRegion = computed(() => {
  const spec = props.connection?.spec
  if (spec?.s3) return spec.s3.region
  return ''
})

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
  navigator.clipboard.writeText(text).then(() => {
    isCopied.value = true
    setTimeout(() => (isCopied.value = false), 1200)
  })
}

async function copyFolderPath() {
  // Use spec.files.basePath or build S3 URI from spec.s3
  let pathToCopy = basePath.value

  // If S3 connection, build URI from spec.s3.scope
  if (isS3Connection.value) {
    const spec = props.connection?.spec
    if (spec?.s3?.scope?.bucket) {
      pathToCopy = `s3://${spec.s3.scope.bucket}${spec.s3.scope.prefix ? '/' + spec.s3.scope.prefix : ''}`
    } else {
      pathToCopy = 's3://'
    }
  }

  // If no path, use fallback
  if (!pathToCopy) {
    pathToCopy = isS3Connection.value ? 's3://' : ''
  }

  try {
    await navigator.clipboard.writeText(pathToCopy)
    isPathCopied.value = true
    setTimeout(() => (isPathCopied.value = false), 1200)
  } catch (fallbackError) {
    console.error('Copy failed:', fallbackError)
  }
}

const createdDisplay = computed(() => {
  return formatDateTime(props.connection?.created || 0)
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
    return `s3://${storageEndpoint.value} (All buckets)`
  } else if (storageRegion.value) {
    return `s3:// (All buckets in ${storageRegion.value})`
  }

  return 's3:// (All buckets)'
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
          :db-type="connection.type"
        />
      </div>
      <div class="hidden sm:flex items-center gap-2">
        <BaseButton variant="secondary" @click="emit('edit-wizard')">Edit Wizard</BaseButton>
        <BaseButton variant="secondary" @click="emit('edit-json')">Edit JSON</BaseButton>
        <BaseButton variant="secondary" @click="emit('clone')">Clone</BaseButton>
        <BaseButton variant="danger" @click="emit('delete')">Delete</BaseButton>
      </div>
    </div>

    <div class="p-4 space-y-6">
      <!-- File Connection Details -->
      <div v-if="isFileConnection" class="space-y-4">
        <!-- S3/MinIO Specific Details -->
        <div v-if="isS3Connection" class="space-y-4">
          <!-- Storage URI -->
          <div class="min-w-0">
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
                <ClipboardIcon v-if="!isPathCopied" class="h-4 w-4" />
                <CheckIcon v-else class="h-4 w-4" />
              </button>
            </div>
          </div>

          <!-- S3 Configuration Grid -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Endpoint -->
            <div v-if="storageEndpoint">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Endpoint</label
              >
              <p class="mt-1 font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
                {{ storageEndpoint }}
              </p>
            </div>

            <!-- Region -->
            <div v-if="storageRegion">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Region</label
              >
              <p class="mt-1 font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
                {{ storageRegion }}
              </p>
            </div>

            <!-- Bucket (from spec.s3.scope or parsed from basePath) -->
            <div v-if="s3Bucket">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Bucket</label
              >
              <p class="mt-1 font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
                {{ s3Bucket }}
              </p>
            </div>

            <!-- Prefix (from spec.s3.scope or parsed from basePath) -->
            <div v-if="s3Prefix">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Prefix</label
              >
              <p class="mt-1 font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
                {{ s3Prefix }}
              </p>
            </div>
          </div>

          <!-- Info message for unscoped connections -->
          <div
            v-if="!s3Bucket"
            class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
          >
            <p class="text-xs text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> This connection is not scoped to a specific bucket. You can
              browse all buckets in the Data Explorer. To use as a stream target, edit and specify a
              bucket.
            </p>
          </div>
        </div>

        <!-- Local Files Path (non-S3) -->
        <div v-else class="min-w-0">
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
              <ClipboardIcon v-if="!isPathCopied" class="h-4 w-4" />
              <CheckIcon v-else class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- File Count and Size (for all file connections) -->
        <div class="min-w-0">
          <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
            >Files</label
          >
          <div class="mt-1 text-sm text-gray-700 dark:text-gray-300">
            <div v-if="totalFileCount > 0" class="text-gray-900 dark:text-gray-100 font-medium">
              {{ fileSummary }}
            </div>
            <div
              v-else-if="hasPath || s3Bucket || isS3Connection"
              class="text-gray-500 dark:text-gray-400"
            >
              {{
                isS3Connection && !s3Bucket
                  ? 'Browse buckets to view files'
                  : 'No supported files found'
              }}
            </div>
            <div v-else class="text-gray-500 dark:text-gray-400">No path configured</div>
          </div>
        </div>
      </div>

      <!-- Database Connection Details - Card Layout -->
      <div v-else class="grid gap-4" :class="canCreateDatabase ? 'md:grid-cols-2' : 'grid-cols-1'">
        <!-- Connection Info Card -->
        <div
          class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 ring-1 ring-slate-200/70 dark:ring-gray-700"
        >
          <div class="flex items-center gap-2 mb-3">
            <div class="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ServerIcon class="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
                    <EyeIcon v-if="!showPassword" class="h-3.5 w-3.5" />
                    <EyeSlashIcon v-else class="h-3.5 w-3.5" />
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
                    <ClipboardIcon v-if="!isCopied" class="h-3.5 w-3.5" />
                    <CheckIcon v-else class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Create Database Card -->
        <div
          v-if="canCreateDatabase"
          class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 ring-1 ring-slate-200/70 dark:ring-gray-700"
        >
          <div class="flex items-center gap-2 mb-3">
            <div class="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <CircleStackIcon class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span class="text-sm font-semibold text-gray-700 dark:text-gray-300"
              >Create Database</span
            >
          </div>

          <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">
            Create a new database on this server
          </p>

          <div class="space-y-2">
            <FormInput
              v-model="newDatabaseName"
              placeholder="database_name"
              :disabled="isCreatingDatabase"
              @keyup.enter="handleCreateDatabase"
            />
            <BaseButton
              variant="primary"
              size="sm"
              class="w-full justify-center"
              :disabled="!newDatabaseName.trim() || isCreatingDatabase"
              @click="handleCreateDatabase"
            >
              <PlusIcon class="w-4 h-4 mr-1.5" />
              Create Database
            </BaseButton>
          </div>

          <!-- Schema creation for non-PostgreSQL databases -->
          <div
            v-if="showSchemaCreationAtConnectionLevel"
            class="mt-4 pt-4 border-t border-slate-200 dark:border-gray-700"
          >
            <div class="flex items-center gap-2 mb-2">
              <span class="text-sm font-semibold text-gray-700 dark:text-gray-300"
                >Create Schema</span
              >
            </div>
            <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">
              In database: <span class="font-medium">{{ defaultDatabase }}</span>
            </p>
            <div class="space-y-2">
              <FormInput
                v-model="newSchemaName"
                placeholder="schema_name"
                :disabled="isCreatingSchema"
                @keyup.enter="handleCreateSchema"
              />
              <BaseButton
                variant="secondary"
                size="sm"
                class="w-full justify-center"
                :disabled="!newSchemaName.trim() || isCreatingSchema"
                @click="handleCreateSchema"
              >
                <PlusIcon class="w-4 h-4 mr-1.5" />
                Create Schema
              </BaseButton>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        <CalendarIcon class="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <span class="text-sm text-gray-500 dark:text-gray-400 truncate"
          >Created: {{ createdDisplay }}</span
        >
      </div>
    </div>
  </div>
</template>

<style scoped></style>
