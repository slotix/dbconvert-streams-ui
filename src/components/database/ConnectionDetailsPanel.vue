<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Connection } from '@/types/connections'
import BaseButton from '@/components/base/BaseButton.vue'
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import { generateConnectionString } from '@/utils/connectionStringGenerator'
import { formatDateTime } from '@/utils/formats'
import {
  CalendarIcon,
  ClipboardIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon
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
}>()

const showPassword = ref(false)
const isCopied = ref(false)
const isPathCopied = ref(false)

// Check if this is an S3 connection (includes MinIO endpoints via S3 provider)
const isS3Connection = computed(() => {
  const provider = props.connection?.storage_config?.provider?.toLowerCase()
  return provider === 's3'
})

// Check if this is a file connection (local files or anything with storage_config)
const isFileConnection = computed(() => {
  const type = props.connection?.type?.toLowerCase()
  return type === 'files' || type === 'localfiles' || !!props.connection?.storage_config
})

// Check if connection has a path configured
const hasPath = computed(() => {
  return !!props.connection?.path?.trim()
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
  const { host, port } = props.connection || {}
  if (!host && !port) return ''
  return `${host || ''}${port ? `:${port}` : ''}`
})

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
  // For S3 connections, copy the base URI without extra info
  let pathToCopy = props.connection.storage_config?.uri

  // If no storage_config.uri, construct from s3Config
  if (!pathToCopy && props.connection.s3Config?.bucket) {
    const bucket = props.connection.s3Config.bucket
    const prefix = props.connection.s3Config.prefix || ''
    pathToCopy = `s3://${bucket}${prefix ? '/' + prefix : ''}`
  }

  // If still no path, use the base s3://
  if (!pathToCopy) {
    pathToCopy = 's3://'
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

// Compute displayable S3 URI
const displayS3URI = computed(() => {
  const storageURI = props.connection.storage_config?.uri || ''

  // If URI is just "s3://", show more meaningful info
  if (storageURI === 's3://') {
    const endpoint =
      props.connection.storage_config?.endpoint || props.connection.s3Config?.endpoint
    const region = props.connection.storage_config?.region || props.connection.s3Config?.region

    if (endpoint) {
      return `s3://${endpoint} (All buckets)`
    } else if (region) {
      return `s3:// (All buckets in ${region})`
    }
    return 's3:// (All buckets)'
  }

  // If s3Config has bucket/prefix but storage_config doesn't, use that
  if (!storageURI && props.connection.s3Config?.bucket) {
    const bucket = props.connection.s3Config.bucket
    const prefix = props.connection.s3Config.prefix || ''
    return `s3://${bucket}${prefix ? '/' + prefix : ''}`
  }

  return storageURI || 's3://'
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
            <div v-if="connection.storage_config?.endpoint || connection.s3Config?.endpoint">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Endpoint</label
              >
              <p class="mt-1 font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
                {{ connection.storage_config?.endpoint || connection.s3Config?.endpoint }}
              </p>
            </div>

            <!-- Region -->
            <div v-if="connection.storage_config?.region || connection.s3Config?.region">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Region</label
              >
              <p class="mt-1 font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
                {{ connection.storage_config?.region || connection.s3Config?.region }}
              </p>
            </div>

            <!-- Bucket (if specified) -->
            <div v-if="connection.s3Config?.bucket">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Bucket</label
              >
              <p class="mt-1 font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
                {{ connection.s3Config.bucket }}
              </p>
            </div>

            <!-- Prefix (if specified) -->
            <div v-if="connection.s3Config?.prefix">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Prefix</label
              >
              <p class="mt-1 font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
                {{ connection.s3Config.prefix }}
              </p>
            </div>
          </div>

          <!-- Info message for unscoped connections -->
          <div
            v-if="!connection.s3Config?.bucket"
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
              {{ connection.storage_config?.uri || 'No path configured' }}
            </span>
            <button
              v-if="connection.storage_config?.uri"
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
              v-else-if="hasPath || connection.s3Config?.bucket || isS3Connection"
              class="text-gray-500 dark:text-gray-400"
            >
              {{
                isS3Connection && !connection.s3Config?.bucket
                  ? 'Browse buckets to view files'
                  : 'No supported files found'
              }}
            </div>
            <div v-else class="text-gray-500 dark:text-gray-400">No path configured</div>
          </div>
        </div>
      </div>

      <!-- Database Connection Details -->
      <div v-else>
        <div class="grid gap-4" :class="connection.defaultDatabase ? 'grid-cols-2' : 'grid-cols-1'">
          <div>
            <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
              >Host</label
            >
            <p
              class="mt-1 font-medium text-gray-900 dark:text-gray-100 truncate"
              :title="hostWithPort"
            >
              {{ hostWithPort }}
            </p>
          </div>
          <div v-if="connection.defaultDatabase">
            <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
              >Default Database</label
            >
            <p class="mt-1 font-medium text-gray-900 dark:text-gray-100 truncate">
              {{ connection.defaultDatabase }}
            </p>
          </div>
        </div>

        <div>
          <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
            >Connection String</label
          >
          <div
            class="mt-1 flex items-start gap-2 rounded-lg bg-linear-to-r from-slate-50 to-gray-50 dark:from-gray-800 dark:to-gray-850 p-3 font-mono text-sm border border-gray-100 dark:border-gray-700"
          >
            <span class="flex-1 break-all text-gray-800 dark:text-gray-100 overflow-x-auto">
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
                <EyeIcon v-if="!showPassword" class="h-4 w-4" />
                <EyeSlashIcon v-else class="h-4 w-4" />
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
                <ClipboardIcon v-if="!isCopied" class="h-4 w-4" />
                <CheckIcon v-else class="h-4 w-4" />
              </button>
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
