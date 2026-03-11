<template>
  <div class="flex min-h-0 flex-col gap-4">
    <DataSelectionToolbar
      :selected-count="selectedCount"
      :total-count="loadedCount"
      selected-count-label="selected"
      total-count-label="loaded"
      counter-title="Selected manifest / loaded manifest entries"
      :search-value="searchQuery"
      search-placeholder="Filter source objects..."
      :select-all-checked="false"
      :select-all-indeterminate="false"
      selection-mode="none"
      refresh-label="Refresh"
      refresh-title="Refresh source objects"
      :refresh-disabled="!currentBucket || loadingObjects"
      @update:search-value="searchQuery = $event"
      @refresh="loadObjects(true)"
    />

    <div
      class="flex-1 min-h-0 rounded-lg bg-white shadow-sm ring-1 ring-gray-900/5 divide-y divide-gray-200 dark:bg-gray-850 dark:shadow-gray-900/30 dark:ring-gray-700 dark:divide-gray-800"
    >
      <SourceSectionHeader
        :alias="props.alias"
        :connection-name="props.connectionName"
        :selection-label="props.bucket"
        :icon="FileJson"
        icon-class="text-teal-500/80 dark:text-teal-400/80"
        class="rounded-none border-x-0 border-t-0 border-b border-b-gray-200/70 dark:border-b-gray-700/70"
      />

      <div
        v-if="selectionError"
        class="bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200"
      >
        {{ selectionError }}
      </div>

      <div v-if="loadingObjects" class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
        Loading manifest objects...
      </div>
      <div
        v-else-if="!filteredRows.length"
        class="py-10 text-center text-sm text-gray-500 dark:text-gray-400"
      >
        No manifest JSON files found
      </div>
      <div v-else class="max-h-[420px] overflow-y-auto overscroll-contain px-4 py-3 scrollbar-thin">
        <button
          v-for="row in filteredRows"
          :key="row.entry.path"
          type="button"
          class="flex h-10 w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/70"
          :style="{ paddingLeft: `${row.depth * 12 + 12}px` }"
          @click="handleRowClick(row.entry)"
          @dblclick="row.entry.type === 'file' && confirmSelection()"
        >
          <div class="flex min-w-0 flex-1 items-center">
            <span
              v-if="row.entry.type === 'dir'"
              class="mr-2 shrink-0 rounded p-0.5"
              :class="{ 'rotate-90': isExpanded(row.entry.path) }"
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
            </span>
            <span v-else class="mr-2 h-4 w-4 shrink-0" />

            <template v-if="row.entry.type === 'file' && row.entry.isManifest">
              <input
                :id="`manifest-${row.entry.path}`"
                :checked="isChecked(row.entry)"
                type="checkbox"
                class="mr-3 h-4 w-4 rounded border-gray-300 bg-white text-teal-600 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-800 dark:text-teal-500 dark:focus:ring-teal-400"
                @click.stop
                @change="onCheckboxChange(row.entry, ($event.target as HTMLInputElement).checked)"
              />
            </template>

            <FileIcon
              :file-format="fileFormat(row.entry)"
              :is-directory="row.entry.type === 'dir'"
              :is-manifest="!!row.entry.isManifest"
              class="mr-2"
            />

            <button
              type="button"
              class="min-w-0 flex-1 truncate text-left"
              @click.stop="row.entry.type === 'dir' && toggleFolder(row.entry)"
            >
              <span class="text-gray-900 dark:text-gray-100">{{ row.entry.name }}</span>
            </button>
          </div>
        </button>
      </div>

      <div class="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <p
            class="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400"
          >
            Selected manifest
          </p>
          <p class="mt-1 truncate text-sm text-gray-700 dark:text-gray-200">
            {{ selectedPath || 'No manifest selected' }}
          </p>
        </div>

        <div class="flex items-center gap-3 shrink-0">
          <BaseButton :disabled="!selectedPath" @click="confirmSelection">Use manifest</BaseButton>
          <button
            type="button"
            class="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
            :disabled="!selectedPath"
            @click="clearSelection"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FileJson } from 'lucide-vue-next'
import { listS3Objects } from '@/api/files'
import type { FileSystemEntry } from '@/api/fileSystem'
import BaseButton from '@/components/base/BaseButton.vue'
import FileIcon from '@/components/common/FileIcon.vue'
import DataSelectionToolbar from '@/components/stream/wizard/DataSelectionToolbar.vue'
import SourceSectionHeader from '@/components/stream/wizard/SourceSectionHeader.vue'
import { getFileFormat } from '@/utils/fileFormat'
import type { S3Object } from '@/types/s3'

interface Props {
  connectionId: string
  connectionName: string
  alias?: string
  bucket: string
  prefix?: string
  selectedPath?: string
}

const props = withDefaults(defineProps<Props>(), {
  alias: '',
  prefix: '',
  selectedPath: ''
})

const emit = defineEmits<{
  (e: 'select', path: string): void
}>()

type TreeRow = { entry: FileSystemEntry; depth: number }

const loadingObjects = ref(false)
const treeEntries = ref<FileSystemEntry[]>([])
const currentBucket = ref('')
const currentPrefix = ref('')
const selectedPath = ref('')
const selectionError = ref('')
const searchQuery = ref('')
const expandedPaths = ref<Set<string>>(new Set())

function flattenVisible(entries: FileSystemEntry[], depth: number): TreeRow[] {
  const rows: TreeRow[] = []
  for (const entry of entries) {
    rows.push({ entry, depth })
    if (entry.type === 'dir' && isExpanded(entry.path) && entry.children?.length) {
      rows.push(...flattenVisible(entry.children, depth + 1))
    }
  }
  return rows
}

function flattenAllLoaded(entries: FileSystemEntry[], depth: number): TreeRow[] {
  const rows: TreeRow[] = []
  for (const entry of entries) {
    rows.push({ entry, depth })
    if (entry.type === 'dir' && entry.children?.length) {
      rows.push(...flattenAllLoaded(entry.children, depth + 1))
    }
  }
  return rows
}

const rows = computed<TreeRow[]>(() => flattenVisible(treeEntries.value, 0))

const filteredRows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) {
    return rows.value
  }

  return flattenAllLoaded(treeEntries.value, 0).filter((row) =>
    `${row.entry.name} ${row.entry.path}`.toLowerCase().includes(query)
  )
})

const selectedCount = computed(() => (selectedPath.value ? 1 : 0))
const loadedCount = computed(() => flattenAllLoaded(treeEntries.value, 0).length)

watch(
  () => [props.bucket, props.prefix, props.selectedPath],
  () => {
    currentBucket.value = props.bucket
    currentPrefix.value = props.prefix || ''
    selectedPath.value = props.selectedPath || ''
    treeEntries.value = []
    expandedPaths.value = new Set()

    if (currentBucket.value) {
      void loadObjects()
    }
  },
  { immediate: true }
)

function toS3Path(objectKey: string): string {
  if (!currentBucket.value) {
    return ''
  }
  return `s3://${currentBucket.value}/${objectKey}`
}

function parseObjectKey(path: string): string {
  const bucketPrefix = `s3://${currentBucket.value}/`
  return path.startsWith(bucketPrefix) ? path.slice(bucketPrefix.length) : path
}

function formatPrefixName(prefix: string): string {
  const trimmed = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
  return trimmed.split('/').pop() || prefix
}

function isExpanded(path: string): boolean {
  return expandedPaths.value.has(path)
}

function isChecked(entry: FileSystemEntry): boolean {
  return entry.type === 'file' && selectedPath.value === entry.path
}

function onCheckboxChange(entry: FileSystemEntry, checked: boolean) {
  if (entry.type !== 'file') {
    return
  }
  selectedPath.value = checked ? entry.path : ''
}

function sortEntries(entries: FileSystemEntry[]): FileSystemEntry[] {
  return [...entries].sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === 'dir' ? -1 : 1
    }
    return left.name.localeCompare(right.name)
  })
}

function buildLevelEntries(prefixes: string[], objects: S3Object[]): FileSystemEntry[] {
  const prefixEntries: FileSystemEntry[] = prefixes.map((prefix) => ({
    name: formatPrefixName(prefix),
    path: toS3Path(prefix),
    type: 'dir',
    size: 0,
    children: [],
    isLoaded: false
  }))

  const fileEntries: FileSystemEntry[] = objects
    .filter((object) => object.key.toLowerCase().endsWith('.json'))
    .map((object) => ({
      name: object.key.split('/').pop() || object.key,
      path: toS3Path(object.key),
      type: 'file',
      size: object.size,
      isManifest: true
    }))

  return sortEntries([...prefixEntries, ...fileEntries])
}

async function listLevel(prefix: string, force = false): Promise<FileSystemEntry[]> {
  const response = await listS3Objects({
    bucket: currentBucket.value,
    prefix: prefix || undefined,
    connectionId: props.connectionId,
    recursive: false,
    maxKeys: 500,
    refresh: force
  })

  return buildLevelEntries(response.prefixes || [], response.objects || [])
}

function updateFolderChildren(
  entries: FileSystemEntry[],
  folderPath: string,
  children: FileSystemEntry[]
): FileSystemEntry[] {
  return entries.map((entry) => {
    if (entry.path === folderPath) {
      return {
        ...entry,
        children,
        isLoaded: true
      }
    }

    if (entry.children?.length) {
      return {
        ...entry,
        children: updateFolderChildren(entry.children, folderPath, children)
      }
    }

    return entry
  })
}

function findEntryByPath(entries: FileSystemEntry[], targetPath: string): FileSystemEntry | null {
  for (const entry of entries) {
    if (entry.path === targetPath) {
      return entry
    }
    if (entry.children?.length) {
      const found = findEntryByPath(entry.children, targetPath)
      if (found) {
        return found
      }
    }
  }
  return null
}

function setExpanded(path: string, expanded: boolean) {
  const next = new Set(expandedPaths.value)
  if (expanded) {
    next.add(path)
  } else {
    next.delete(path)
  }
  expandedPaths.value = next
}

function getSingleChildDirectory(entries: FileSystemEntry[]): FileSystemEntry | null {
  const directories = entries.filter((entry) => entry.type === 'dir')
  const files = entries.filter((entry) => entry.type === 'file')
  if (directories.length !== 1 || files.length > 0) {
    return null
  }
  return directories[0]
}

async function autoExpandLinearChainFrom(folderPath: string, force = false) {
  let currentFolder = findEntryByPath(treeEntries.value, folderPath)
  if (!currentFolder || currentFolder.type !== 'dir') {
    return
  }

  let nextFolder = getSingleChildDirectory(currentFolder.children || [])
  while (nextFolder) {
    setExpanded(nextFolder.path, true)
    if (!nextFolder.isLoaded) {
      const children = await listLevel(parseObjectKey(nextFolder.path), force)
      treeEntries.value = updateFolderChildren(treeEntries.value, nextFolder.path, children)
      const refreshedFolder = findEntryByPath(treeEntries.value, nextFolder.path)
      if (!refreshedFolder || refreshedFolder.type !== 'dir') {
        return
      }
      currentFolder = refreshedFolder
    } else {
      currentFolder = nextFolder
    }

    nextFolder = getSingleChildDirectory(currentFolder.children || [])
  }
}

async function autoExpandRootLinearChain(force = false) {
  let nextFolder = getSingleChildDirectory(treeEntries.value)
  while (nextFolder) {
    setExpanded(nextFolder.path, true)
    if (!nextFolder.isLoaded) {
      const children = await listLevel(parseObjectKey(nextFolder.path), force)
      treeEntries.value = updateFolderChildren(treeEntries.value, nextFolder.path, children)
      const refreshedFolder = findEntryByPath(treeEntries.value, nextFolder.path)
      if (!refreshedFolder || refreshedFolder.type !== 'dir') {
        return
      }
      nextFolder = getSingleChildDirectory(refreshedFolder.children || [])
      continue
    }

    nextFolder = getSingleChildDirectory(nextFolder.children || [])
  }
}

async function loadObjects(force = false) {
  if (!currentBucket.value) {
    selectionError.value = 'S3 bucket is required'
    return
  }

  loadingObjects.value = true
  selectionError.value = ''
  try {
    treeEntries.value = await listLevel(currentPrefix.value, force)
    await autoExpandRootLinearChain(force)
  } catch (error) {
    selectionError.value =
      error instanceof Error ? error.message : 'Failed to load manifest objects'
    treeEntries.value = []
  } finally {
    loadingObjects.value = false
  }
}

function clearSelection() {
  selectedPath.value = ''
}

async function toggleFolder(entry: FileSystemEntry) {
  if (entry.type !== 'dir') {
    return
  }

  if (isExpanded(entry.path)) {
    setExpanded(entry.path, false)
    return
  }

  if (!entry.isLoaded) {
    const children = await listLevel(parseObjectKey(entry.path))
    treeEntries.value = updateFolderChildren(treeEntries.value, entry.path, children)
  }

  setExpanded(entry.path, true)
  await autoExpandLinearChainFrom(entry.path)
}

function handleRowClick(entry: FileSystemEntry) {
  if (entry.type === 'dir') {
    void toggleFolder(entry)
    return
  }

  selectedPath.value = entry.path
}

function fileFormat(entry: FileSystemEntry) {
  return getFileFormat(entry.name)
}

function confirmSelection() {
  if (!selectedPath.value) {
    return
  }
  emit('select', selectedPath.value)
}
</script>
