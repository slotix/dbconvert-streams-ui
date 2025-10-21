<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <div class="text-sm font-medium text-gray-900">Files</div>
        <div class="mt-1 truncate text-xs text-gray-500" v-if="directoryPath">
          {{ directoryPath }}
        </div>
        <div class="mt-1 text-xs text-gray-400" v-else>No folder path configured</div>
      </div>
      <button
        type="button"
        class="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="isLoading"
        @click="refresh"
      >
        Refresh
      </button>
    </div>

    <div class="rounded-lg border border-gray-200 bg-white">
      <div v-if="isLoading" class="py-10 text-center text-sm text-gray-500">Loading files…</div>
      <div v-else-if="error" class="py-10 text-center text-sm text-red-600">{{ error }}</div>
      <div v-else-if="!files.length" class="py-10 text-center text-sm text-gray-500">
        No files found
      </div>
      <ul v-else class="divide-y divide-gray-100">
        <li
          v-for="file in files"
          :key="file.path"
          class="flex items-center justify-between gap-4 px-4 py-2 text-sm text-gray-700"
        >
          <div class="flex min-w-0 items-center gap-2">
            <svg class="h-4 w-4 flex-shrink-0" :class="fileFormatColor(file)" viewBox="0 0 24 24">
              <path :d="fileFormatIcon(file)" fill="currentColor" />
            </svg>
            <span class="truncate">{{ file.name }}</span>
          </div>
          <span class="text-xs text-gray-500">{{ formatFileSize(file.size) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { getFileFormat, getFileFormatColor, getFileFormatIconPath } from '@/utils/fileFormat'
import type { FileSystemEntry } from '@/api/fileSystem'

interface Props {
  connectionId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  connectionId: null
})

const fileExplorerStore = useFileExplorerStore()

const files = computed<FileSystemEntry[]>(() => {
  if (!props.connectionId) {
    return []
  }
  return fileExplorerStore.getEntries(props.connectionId)
})

const directoryPath = computed(() => {
  if (!props.connectionId) {
    return ''
  }
  return fileExplorerStore.getDirectoryPath(props.connectionId)
})

const error = computed(() => {
  if (!props.connectionId) {
    return ''
  }
  return fileExplorerStore.getError(props.connectionId)
})

const isLoading = computed(() => {
  if (!props.connectionId) {
    return false
  }
  return fileExplorerStore.isLoading(props.connectionId)
})

watch(
  () => props.connectionId,
  async (connectionId) => {
    if (connectionId) {
      await fileExplorerStore.loadEntries(connectionId)
    }
  },
  { immediate: true }
)

function refresh() {
  if (props.connectionId) {
    void fileExplorerStore.loadEntries(props.connectionId, true)
  }
}

function fileFormat(file: FileSystemEntry) {
  return getFileFormat(file.name)
}

function fileFormatColor(file: FileSystemEntry) {
  return getFileFormatColor(fileFormat(file))
}

function fileFormatIcon(file: FileSystemEntry) {
  return getFileFormatIconPath(fileFormat(file))
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`
}
</script>
