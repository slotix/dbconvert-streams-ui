<template>
  <div class="space-y-4">
    <!-- Header with file count, filter, select all, and refresh -->
    <div class="flex items-center gap-4">
      <!-- File count -->
      <div class="text-sm font-medium text-gray-900 whitespace-nowrap">
        {{ selectedFilesCount }} / {{ files.length }}
      </div>

      <!-- Filter input -->
      <div class="flex-1">
        <FormInput v-model="searchQuery" type="text" placeholder="Filter files..." />
      </div>

      <!-- Select All checkbox -->
      <div class="flex items-center whitespace-nowrap">
        <input
          id="select-all-files"
          :checked="selectAllCheckboxState"
          :indeterminate="indeterminate"
          type="checkbox"
          class="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
          @change="toggleSelectAll"
        />
        <label for="select-all-files" class="ml-2 text-sm text-gray-700"> Select All </label>
      </div>

      <!-- Refresh button -->
      <button
        type="button"
        class="inline-flex items-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 whitespace-nowrap"
        :disabled="isLoading"
        @click="refresh"
      >
        Refresh files
      </button>
    </div>

    <!-- File List -->
    <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg divide-y divide-gray-200">
      <div v-if="isLoading" class="py-10 text-center text-sm text-gray-500">Loading files…</div>
      <div v-else-if="error" class="py-10 text-center text-sm text-red-600">{{ error }}</div>
      <div v-else-if="!filteredFiles.length" class="py-10 text-center text-sm text-gray-500">
        No files found
      </div>
      <div v-else class="p-4">
        <div class="space-y-1">
          <div
            v-for="file in filteredFiles"
            :key="file.path"
            class="flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-gray-50"
          >
            <div class="flex items-center flex-1">
              <input
                :id="`file-${file.path}`"
                v-model="file.selected"
                type="checkbox"
                class="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded mr-3"
                @change="
                  handleCheckboxChange(file, ($event.target as HTMLInputElement)?.checked || false)
                "
              />
              <img
                :src="fileFormatLogoPath(file)"
                :alt="fileFormat(file) || 'file'"
                class="h-6 w-6 flex-shrink-0 mr-2 object-contain"
              />
              <label :for="`file-${file.path}`" class="cursor-pointer flex-1 truncate">
                {{ file.name }}
              </label>
            </div>
            <span class="text-xs text-gray-500 ml-4">{{ formatFileSize(file.size) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useStreamsStore } from '@/stores/streamConfig'
import { getFileFormat, getFileFormatLogoPath } from '@/utils/fileFormat'
import FormInput from '@/components/base/FormInput.vue'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { FileEntry } from '@/types/streamConfig'

interface Props {
  connectionId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  connectionId: null
})

const fileExplorerStore = useFileExplorerStore()
const streamsStore = useStreamsStore()
const searchQuery = ref('')

const rawFiles = computed<FileSystemEntry[]>(() => {
  if (!props.connectionId) {
    return []
  }
  return fileExplorerStore.getEntries(props.connectionId)
})

const files = computed<FileEntry[]>(() => {
  return streamsStore.currentStreamConfig?.files || []
})

const filteredFiles = computed(() => {
  if (!searchQuery.value) {
    return files.value
  }
  const query = searchQuery.value.toLowerCase()
  return files.value.filter((file) => file.name.toLowerCase().includes(query))
})

const selectedFilesCount = computed(() => {
  return files.value.filter((file) => file.selected).length
})

const indeterminate = computed(() => {
  const selectedCount = selectedFilesCount.value
  return selectedCount > 0 && selectedCount < files.value.length
})

const selectAllCheckboxState = computed(() => {
  const allSelected = files.value.every((file) => file.selected)
  const noneSelected = files.value.every((file) => !file.selected)
  return allSelected || noneSelected ? allSelected : false
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

function handleCheckboxChange(file: FileEntry, checked: boolean) {
  file.selected = checked
}

function toggleSelectAll(event: Event) {
  const selectAll = (event.target as HTMLInputElement).checked
  filteredFiles.value.forEach((file) => {
    file.selected = selectAll
  })
}

watch(
  () => props.connectionId,
  async (connectionId) => {
    if (connectionId) {
      await fileExplorerStore.loadEntries(connectionId)
    }
  },
  { immediate: true }
)

watch(
  rawFiles,
  (entries) => {
    if (!streamsStore.currentStreamConfig || !props.connectionId) {
      return
    }
    const existing = streamsStore.currentStreamConfig.files || []
    const updated: FileEntry[] = entries.map((entry) => {
      const previous = existing.find((item) => item.path === entry.path)
      return {
        name: entry.name,
        path: entry.path,
        size: entry.size,
        selected: previous ? previous.selected : true
      }
    })
    streamsStore.currentStreamConfig.files = updated
  },
  { immediate: true }
)

function refresh() {
  if (props.connectionId) {
    void fileExplorerStore.loadEntries(props.connectionId, true)
  }
}

function fileFormat(file: FileEntry | FileSystemEntry) {
  return getFileFormat(file.name)
}

function fileFormatLogoPath(file: FileEntry | FileSystemEntry) {
  return getFileFormatLogoPath(fileFormat(file))
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`
}
</script>
