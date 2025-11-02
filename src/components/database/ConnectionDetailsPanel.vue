<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Connection } from '@/types/connections'
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
  (e: 'edit'): void
  (e: 'clone'): void
  (e: 'delete'): void
}>()

const showPassword = ref(false)
const isCopied = ref(false)
const isPathCopied = ref(false)

// Check if this is a file connection
const isFileConnection = computed(() => {
  return props.connection?.type?.toLowerCase() === 'files'
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
  if (!props.connection.path) return
  try {
    await navigator.clipboard.writeText(props.connection.path)
    isPathCopied.value = true
    setTimeout(() => (isPathCopied.value = false), 1200)
  } catch (fallbackError) {
    console.error('Copy failed:', fallbackError)
  }
}

const createdDisplay = computed(() => {
  return formatDateTime(props.connection?.created || 0)
})
</script>

<template>
  <div
    class="bg-white shadow-lg ring-1 ring-slate-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300"
  >
    <div
      class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-linear-to-r from-slate-50 to-white"
    >
      <div class="flex items-center gap-3 min-w-0">
        <h3 class="text-lg font-bold text-slate-900 truncate bg-clip-text" :title="connection.name">
          {{ connection.name || hostWithPort || 'Connection' }}
        </h3>
        <CloudProviderBadge
          :cloud-provider="connection.cloud_provider || ''"
          :db-type="connection.type"
        />
      </div>
      <div class="hidden sm:flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold shadow-sm border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:shadow-md transition-all duration-200"
          @click="emit('edit')"
        >
          Edit
        </button>
        <button
          type="button"
          class="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold shadow-sm border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:shadow-md transition-all duration-200"
          @click="emit('clone')"
        >
          Clone
        </button>
        <button
          type="button"
          class="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold shadow-sm border border-red-300 bg-white text-red-600 hover:bg-red-50 hover:shadow-md transition-all duration-200"
          @click="emit('delete')"
        >
          Delete
        </button>
      </div>
    </div>

    <div class="p-4 space-y-6">
      <!-- File Connection Details -->
      <div v-if="isFileConnection" class="space-y-6">
        <div class="min-w-0">
          <label class="text-xs font-medium uppercase text-gray-500">Folder Path</label>
          <div class="mt-1 flex items-start gap-2 rounded-md bg-gray-50 p-3 font-mono text-sm">
            <span class="flex-1 break-all text-gray-800 overflow-x-auto">
              {{ connection.path || 'No path configured' }}
            </span>
            <button
              v-if="connection.path"
              class="shrink-0 transition-colors"
              :class="isPathCopied ? 'text-green-500' : 'text-gray-400 hover:text-gray-600'"
              :title="isPathCopied ? 'Copied!' : 'Copy folder path to clipboard'"
              @click.stop="copyFolderPath"
            >
              <ClipboardIcon v-if="!isPathCopied" class="h-4 w-4" />
              <CheckIcon v-else class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div class="min-w-0">
          <label class="text-xs font-medium uppercase text-gray-500">Files</label>
          <div class="mt-1 text-sm text-gray-700">
            <div v-if="totalFileCount > 0" class="text-gray-900 font-medium">
              {{ fileSummary }}
            </div>
            <div v-else-if="hasPath" class="text-gray-500">No supported files found</div>
            <div v-else class="text-gray-500">No path configured</div>
          </div>
        </div>
      </div>

      <!-- Database Connection Details -->
      <div v-else>
        <div class="grid gap-4" :class="connection.database ? 'grid-cols-2' : 'grid-cols-1'">
          <div>
            <label class="text-xs font-medium uppercase text-gray-500">Host</label>
            <p class="mt-1 font-medium text-gray-900 truncate" :title="hostWithPort">
              {{ hostWithPort }}
            </p>
          </div>
          <div v-if="connection.database">
            <label class="text-xs font-medium uppercase text-gray-500">Database</label>
            <p class="mt-1 font-medium text-gray-900 truncate">{{ connection.database }}</p>
          </div>
        </div>

        <div>
          <label class="text-xs font-medium uppercase text-gray-500">Connection String</label>
          <div class="mt-1 flex items-start gap-2 rounded-md bg-gray-50 p-3 font-mono text-sm">
            <span class="flex-1 break-all text-gray-800 overflow-x-auto">
              {{
                showPassword
                  ? connectionString
                  : maskedConnectionString.replace(/(?<=:)[^@]+(?=@) /g, '****')
              }}
            </span>
            <div class="flex flex-col gap-1">
              <button
                class="shrink-0 text-gray-400 hover:text-gray-600"
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
                :class="isCopied ? 'text-green-500' : 'text-gray-400 hover:text-gray-600'"
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

      <div class="flex items-center gap-2 pt-2 border-t border-gray-100">
        <CalendarIcon class="h-4 w-4 text-gray-500" />
        <span class="text-sm text-gray-500 truncate">Created: {{ createdDisplay }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
