<template>
  <div class="space-y-4">
    <!-- Header with file count, filter, select all, and refresh -->
    <div class="flex items-center gap-4">
      <!-- File count -->
      <div class="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
        {{ selectedCount }} / {{ selectableCount }}
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
          class="h-4 w-4 text-teal-600 dark:text-teal-500 focus:ring-teal-500 dark:focus:ring-teal-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
          @change="toggleSelectAll"
        />
        <label for="select-all-files" class="ml-2 text-sm text-gray-700 dark:text-gray-300">
          Select All
        </label>
      </div>

      <!-- Refresh button -->
      <button
        type="button"
        class="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-gray-400 dark:focus:ring-offset-gray-900 whitespace-nowrap"
        :disabled="isLoading"
        @click="refresh"
      >
        Refresh files
      </button>
    </div>

    <!-- File List -->
    <div
      class="bg-white dark:bg-gray-850 shadow-sm dark:shadow-gray-900/30 ring-1 ring-gray-900/5 dark:ring-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-800"
    >
      <div v-if="isLoading" class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
        Loading files…
      </div>
      <div v-else-if="error" class="py-10 text-center text-sm text-red-600 dark:text-red-400">
        {{ error }}
      </div>
      <div
        v-else-if="!filteredRows.length"
        class="py-10 text-center text-sm text-gray-500 dark:text-gray-400"
      >
        No files found
      </div>
      <div v-else class="p-4">
        <div class="space-y-1">
          <div
            v-for="row in paginatedRows"
            :key="row.entry.path"
            class="flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/70"
            :style="{ paddingLeft: `${row.depth * 12 + 12}px` }"
          >
            <div class="flex items-center flex-1 min-w-0">
              <!-- Expand chevron (folders only) -->
              <button
                v-if="row.entry.type === 'dir'"
                type="button"
                class="shrink-0 mr-2 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                :class="{ 'rotate-90': isExpanded(row.entry.path) }"
                @click="toggleFolder(row.entry)"
              >
                <svg
                  class="h-4 w-4 text-gray-500 dark:text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M7.21 14.77a.75.75 0 01.02-1.06L10.94 10 7.23 6.29a.75.75 0 011.06-1.06l4.24 4.24a.75.75 0 010 1.06l-4.24 4.24a.75.75 0 01-1.06.02z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <span v-else class="h-4 w-4 shrink-0 mr-2" />

              <!-- Checkbox (files always; folders only for S3 prefixes) -->
              <input
                :id="`file-${row.entry.path}`"
                :checked="isSelected(row.entry.path)"
                :disabled="!isSelectable(row.entry)"
                type="checkbox"
                class="h-4 w-4 text-teal-600 dark:text-teal-500 focus:ring-teal-500 dark:focus:ring-teal-400 border-gray-300 dark:border-gray-600 rounded mr-3 bg-white dark:bg-gray-800"
                @click.stop
                @change="onToggle(row.entry, ($event.target as HTMLInputElement)?.checked || false)"
              />

              <FileIcon
                :file-format="fileFormat(row.entry)"
                :is-directory="row.entry.type === 'dir'"
                :is-table-folder="!!row.entry.isTable"
                :is-bucket="!!row.entry.isBucket"
                class="mr-2"
              />

              <button
                type="button"
                class="text-left flex-1 min-w-0 truncate"
                @click="row.entry.type === 'dir' && toggleFolder(row.entry)"
              >
                <span class="text-gray-900 dark:text-gray-100">{{ row.entry.name }}</span>
              </button>
            </div>

            <span class="text-xs text-gray-500 dark:text-gray-400 ml-4 shrink-0">
              {{ formatDataSize(row.entry.size || 0) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="mt-4">
      <Pagination
        :total-items="filteredRows.length"
        :itemsPerPage="itemsPerPage"
        :current-page="currentPage"
        @update:currentPage="updateCurrentPage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useStreamsStore } from '@/stores/streamConfig'
import { getFileFormat } from '@/utils/fileFormat'
import { formatDataSize } from '@/utils/formats'
import FormInput from '@/components/base/FormInput.vue'
import Pagination from '@/components/common/Pagination.vue'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { FileEntry } from '@/types/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import FileIcon from '@/components/common/FileIcon.vue'

interface Props {
  connectionId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  connectionId: null
})

const fileExplorerStore = useFileExplorerStore()
const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()
const searchQuery = ref('')

const isS3Connection = computed(() => {
  if (!props.connectionId) return false
  const conn = connectionsStore.connectionByID(props.connectionId)
  return !!conn?.spec?.s3
})

const s3Bucket = computed(() => {
  if (!isS3Connection.value) return ''
  // In the wizard, bucket is currently stored as sourceDatabase.
  return streamsStore.currentStreamConfig?.sourceDatabase || ''
})

const rawFiles = computed<FileSystemEntry[]>(() => {
  if (!props.connectionId) {
    return []
  }
  return fileExplorerStore.getEntries(props.connectionId)
})

type TreeRow = { entry: FileSystemEntry; depth: number }

function flattenVisible(entries: FileSystemEntry[], depth: number): TreeRow[] {
  const out: TreeRow[] = []
  for (const e of entries) {
    out.push({ entry: e, depth })
    if (e.type === 'dir' && isExpanded(e.path) && e.children && e.children.length > 0) {
      out.push(...flattenVisible(e.children, depth + 1))
    }
  }
  return out
}

function flattenAllLoaded(entries: FileSystemEntry[], depth: number): TreeRow[] {
  const out: TreeRow[] = []
  for (const e of entries) {
    out.push({ entry: e, depth })
    if (e.type === 'dir' && e.children && e.children.length > 0) {
      out.push(...flattenAllLoaded(e.children, depth + 1))
    }
  }
  return out
}

const visibleRows = computed<TreeRow[]>(() => {
  if (!props.connectionId) return []
  // Default: show the expandable tree (only expanded folders reveal children)
  return flattenVisible(rawFiles.value, 0)
})

const filteredRows = computed<TreeRow[]>(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return visibleRows.value
  // When filtering, search across all currently loaded nodes.
  // (Deep nodes will appear after user expands to load them.)
  return flattenAllLoaded(rawFiles.value, 0).filter((r) => r.entry.name.toLowerCase().includes(q))
})

const currentPage = ref(1)
const itemsPerPage = 10

const totalPages = computed(() =>
  itemsPerPage > 0 ? Math.max(1, Math.ceil(filteredRows.value.length / itemsPerPage)) : 1
)

const paginatedRows = computed(() => {
  if (itemsPerPage <= 0) {
    return filteredRows.value
  }
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredRows.value.slice(start, start + itemsPerPage)
})

const configFiles = computed<FileEntry[]>(() => streamsStore.currentStreamConfig?.files || [])

function isSelectable(entry: FileSystemEntry): boolean {
  if (entry.type === 'file') return true
  // For S3 sources, allow selecting folder prefixes.
  if (entry.type === 'dir' && isS3Connection.value) return true
  return false
}

function isSelected(path: string): boolean {
  return !!configFiles.value.find((f) => f.path === path)?.selected
}

function upsertConfigFile(entry: FileSystemEntry, selected: boolean) {
  if (!streamsStore.currentStreamConfig) return
  const files = streamsStore.currentStreamConfig.files || []
  const idx = files.findIndex((f) => f.path === entry.path)
  const next: FileEntry = {
    name: entry.name,
    path: entry.path,
    type: entry.type,
    size: entry.size,
    selected
  }
  if (idx >= 0) {
    files[idx] = { ...files[idx], ...next }
  } else {
    files.push(next)
  }
  streamsStore.currentStreamConfig.files = files
}

function onToggle(entry: FileSystemEntry, checked: boolean) {
  if (!isSelectable(entry)) return
  upsertConfigFile(entry, checked)
}

function syncConfigFilesWithLoadedTree(entries: FileSystemEntry[]) {
  if (!streamsStore.currentStreamConfig) return

  const existing = new Map<string, FileEntry>()
  for (const f of streamsStore.currentStreamConfig.files || []) {
    existing.set(f.path, f)
  }

  // Preserve the old behavior where the initial root list is selected by default,
  // but avoid auto-selecting newly loaded child entries when expanding folders.
  const isFirstSync = existing.size === 0

  const all = flattenAllLoaded(entries, 0).map((r) => r.entry)
  for (const e of all) {
    const prev = existing.get(e.path)
    const selected = prev ? !!prev.selected : isFirstSync && isSelectable(e)
    // Never auto-select non-selectable folders (e.g. local navigation dirs)
    const safeSelected = isSelectable(e) ? selected : false
    existing.set(e.path, {
      name: e.name,
      path: e.path,
      type: e.type,
      size: e.size,
      selected: safeSelected
    })
  }

  streamsStore.currentStreamConfig.files = Array.from(existing.values())
}

const selectableCount = computed(() => {
  return flattenAllLoaded(rawFiles.value, 0).filter((r) => isSelectable(r.entry)).length
})

const selectedCount = computed(() => {
  return (streamsStore.currentStreamConfig?.files || []).filter((f) => f.selected).length
})

const indeterminate = computed(() => {
  const selected = selectedCount.value
  const total = selectableCount.value
  return selected > 0 && selected < total
})

const selectAllCheckboxState = computed(() => {
  const total = selectableCount.value
  if (total === 0) return false
  const selected = selectedCount.value
  return selected === total
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

function toggleSelectAll(event: Event) {
  const selectAll = (event.target as HTMLInputElement).checked
  // Apply to the currently filtered rows (so filter + select all works predictably)
  filteredRows.value.forEach((r) => {
    if (!isSelectable(r.entry)) return
    upsertConfigFile(r.entry, selectAll)
  })
}

function updateCurrentPage(page: number) {
  currentPage.value = page
}

// Reset to page 1 when search changes
watch(searchQuery, () => {
  currentPage.value = 1
})

watch(
  () => props.connectionId,
  async (connectionId) => {
    if (connectionId) {
      const overridePath =
        isS3Connection.value && s3Bucket.value ? `s3://${s3Bucket.value}/` : undefined
      await fileExplorerStore.loadEntries(connectionId, false, overridePath)
    }
  },
  { immediate: true }
)

watch(
  rawFiles,
  (entries) => {
    if (!streamsStore.currentStreamConfig || !props.connectionId) return
    syncConfigFilesWithLoadedTree(entries)
  },
  { immediate: true }
)

function isExpanded(path: string): boolean {
  if (!props.connectionId) return false
  return fileExplorerStore.isFolderExpanded(props.connectionId, path)
}

async function toggleFolder(entry: FileSystemEntry) {
  if (!props.connectionId) return
  if (entry.type !== 'dir') return

  const expanded = fileExplorerStore.isFolderExpanded(props.connectionId, entry.path)
  if (expanded) {
    fileExplorerStore.collapseFolder(props.connectionId, entry.path)
    return
  }

  if (!entry.isLoaded) {
    await fileExplorerStore.loadFolderContents(props.connectionId, entry.path)
  } else {
    fileExplorerStore.expandFolder(props.connectionId, entry.path)
  }
}

function refresh() {
  if (props.connectionId) {
    const overridePath =
      isS3Connection.value && s3Bucket.value ? `s3://${s3Bucket.value}/` : undefined
    void fileExplorerStore.loadEntries(props.connectionId, true, overridePath)
  }
}

function fileFormat(file: FileEntry | FileSystemEntry) {
  return getFileFormat(file.name)
}
</script>
