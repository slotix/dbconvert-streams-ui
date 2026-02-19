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
      <div v-else-if="error" class="py-10 text-center text-sm text-red-600 dark:text-red-300">
        {{ error }}
      </div>
      <div
        v-else-if="!filteredRows.length"
        class="py-10 text-center text-sm text-gray-500 dark:text-gray-400"
      >
        No files found
      </div>
      <div v-else class="p-4">
        <div
          ref="listContainer"
          class="max-h-[420px] overflow-y-auto overscroll-contain scrollbar-thin"
          @scroll="onScroll"
        >
          <div class="relative" :style="{ height: `${totalHeight}px` }">
            <div class="absolute inset-x-0" :style="{ transform: `translateY(${translateY}px)` }">
              <div
                v-for="row in virtualRows"
                :key="row.entry.path"
                class="flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/70 h-10"
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
                    :checked="getCheckboxState(row.entry).checked"
                    :indeterminate="getCheckboxState(row.entry).indeterminate"
                    :disabled="!isSelectable(row.entry)"
                    type="checkbox"
                    class="h-4 w-4 text-teal-600 dark:text-teal-500 focus:ring-teal-500 dark:focus:ring-teal-400 border-gray-300 dark:border-gray-600 rounded mr-3 bg-white dark:bg-gray-800"
                    @click.stop
                    @change="
                      onToggle(row.entry, ($event.target as HTMLInputElement)?.checked || false)
                    "
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useStreamsStore } from '@/stores/streamConfig'
import { getFileFormat } from '@/utils/fileFormat'
import { formatDataSize } from '@/utils/formats'
import FormInput from '@/components/base/FormInput.vue'
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

const localBasePath = computed(() => {
  if (!props.connectionId) return ''
  const conn = connectionsStore.connectionByID(props.connectionId)
  return conn?.spec?.files?.basePath || ''
})

// Get bucket directly from stream config - doesn't depend on connectionsStore being loaded
const s3Bucket = computed(() => {
  const sourceConn = streamsStore.currentStreamConfig?.source?.connections?.find(
    (c) => c.connectionId === props.connectionId
  )
  return sourceConn?.s3?.bucket || ''
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

const listContainer = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const viewportHeight = ref(0)
const rowHeight = 40
const overscan = 8

const totalHeight = computed(() => filteredRows.value.length * rowHeight)
const startIndex = computed(() => {
  return Math.max(0, Math.floor(scrollTop.value / rowHeight) - overscan)
})
const endIndex = computed(() => {
  const visibleCount = Math.ceil(viewportHeight.value / rowHeight) + overscan * 2
  return Math.min(filteredRows.value.length, startIndex.value + visibleCount)
})
const virtualRows = computed(() => filteredRows.value.slice(startIndex.value, endIndex.value))
const translateY = computed(() => startIndex.value * rowHeight)

function trimTrailingSeparators(value: string): string {
  let end = value.length
  while (end > 0) {
    const ch = value[end - 1]
    if (ch !== '/' && ch !== '\\') {
      break
    }
    end -= 1
  }
  return value.slice(0, end)
}

function normalizeLocalPath(value: string): string {
  return value.trim().split('\\').join('/')
}

function relativePathFromBase(basePath: string, fullPath: string): string {
  const normalizedBase = trimTrailingSeparators(normalizeLocalPath(basePath))
  const normalizedFull = normalizeLocalPath(fullPath)
  if (!normalizedBase) {
    return normalizedFull
  }
  if (normalizedFull === normalizedBase) {
    return ''
  }
  const basePrefix = normalizedBase + '/'
  if (normalizedFull.startsWith(basePrefix)) {
    return normalizedFull.slice(basePrefix.length)
  }
  return normalizedFull
}

function ensureTrailingSlash(value: string): string {
  const trimmed = trimTrailingSeparators(value)
  if (!trimmed) {
    return ''
  }
  return `${trimmed}/`
}

function selectionPathForEntry(entry: { path: string; type?: 'file' | 'dir' }): string {
  if (isS3Connection.value) {
    return entry.path
  }
  const basePath = localBasePath.value
  if (!basePath) {
    return entry.path
  }
  const relative = relativePathFromBase(basePath, entry.path)
  if (!relative) {
    return relative
  }
  if (entry.type === 'dir') {
    return ensureTrailingSlash(relative)
  }
  return relative
}

function fileEntryKey(e: Pick<FileEntry, 'connectionId' | 'path' | 'type'>): string {
  return `${e.connectionId || ''}::${selectionPathForEntry({ path: e.path, type: e.type })}`
}

// Filter files by connectionId when available (required for same-bucket multi-source)
const configFiles = computed<FileEntry[]>(() => {
  const allFiles = streamsStore.currentStreamConfig?.files || []

  // If any entry is tagged with connectionId, use that as the source of truth.
  const hasTaggedEntries = allFiles.some((f) => !!f.connectionId)
  if (props.connectionId && hasTaggedEntries) {
    return allFiles.filter((f) => f.connectionId === props.connectionId)
  }

  // Legacy fallback (older configs): filter by bucket.
  if (s3Bucket.value) {
    const bucketPrefix = `s3://${s3Bucket.value}/`
    return allFiles.filter((f) => f.path.startsWith(bucketPrefix))
  }

  return allFiles
})

function isSelectable(entry: FileSystemEntry): boolean {
  if (entry.type === 'file') return true
  // Allow selecting folders for both S3 prefixes and local directories
  if (entry.type === 'dir') return true
  return false
}

/**
 * Check if item is explicitly selected in the store
 */
function isExplicitlySelected(entry: FileSystemEntry): boolean {
  const selectionPath = selectionPathForEntry(entry)
  return !!configFiles.value.find((f) => f.path === selectionPath)?.selected
}

/**
 * Check if any ancestor folder of the given path is explicitly selected.
 * If ancestor is selected, the item is implicitly included.
 */
function isAncestorSelected(entry: FileSystemEntry): boolean {
  // Find all explicitly selected folders
  const selectedFolders = configFiles.value
    .filter((f) => f.selected && f.type === 'dir')
    .map((f) => (f.path.endsWith('/') ? f.path : `${f.path}/`))

  // Check if path falls under any selected folder
  const selectionPath = selectionPathForEntry(entry)
  if (!selectionPath) return false
  const normalizedSelection = selectionPath.endsWith('/') ? selectionPath : `${selectionPath}/`
  return selectedFolders.some(
    (folder) => normalizedSelection.startsWith(folder) && normalizedSelection !== folder
  )
}

/**
 * Computes checkbox state for an entry:
 * - Checked: explicitly selected OR ancestor folder is selected
 * - Indeterminate (folders only): has explicitly selected descendants but folder itself not selected
 */
function getCheckboxState(entry: FileSystemEntry): { checked: boolean; indeterminate: boolean } {
  const explicitlySelected = isExplicitlySelected(entry)
  const ancestorSelected = isAncestorSelected(entry)

  // If explicitly selected or ancestor is selected, show as checked
  if (explicitlySelected || ancestorSelected) {
    return { checked: true, indeterminate: false }
  }

  // For folders: check if any descendants are explicitly selected (indeterminate state)
  if (entry.type === 'dir') {
    const hasSelectedDescendants = hasExplicitlySelectedDescendants(entry)
    if (hasSelectedDescendants) {
      return { checked: false, indeterminate: true }
    }
  }

  return { checked: false, indeterminate: false }
}

/**
 * Check if any descendant is explicitly selected.
 * Also checks configFiles for selected paths that are descendants,
 * even if children aren't loaded yet (for edit mode).
 */
function hasExplicitlySelectedDescendants(entry: FileSystemEntry): boolean {
  // First check loaded children
  if (entry.children && entry.children.length > 0) {
    for (const child of entry.children) {
      if (isExplicitlySelected(child)) {
        return true
      }
      if (child.type === 'dir' && hasExplicitlySelectedDescendants(child)) {
        return true
      }
    }
  }

  // Also check configFiles for selected descendants (handles unloaded children in edit mode)
  // A path is a descendant if it starts with the folder path (which ends with /)
  const selectionPath = selectionPathForEntry(entry)
  const folderPrefix = selectionPath.endsWith('/') ? selectionPath : `${selectionPath}/`
  return configFiles.value.some(
    (f) => f.selected && f.path.startsWith(folderPrefix) && f.path !== selectionPath
  )
}

function upsertConfigFile(entry: FileSystemEntry, selected: boolean) {
  if (!streamsStore.currentStreamConfig) return
  const files = streamsStore.currentStreamConfig.files || []
  const selectionPath = selectionPathForEntry(entry)
  const idx = files.findIndex(
    (f) =>
      f.path === selectionPath &&
      (props.connectionId ? f.connectionId === props.connectionId : !f.connectionId)
  )
  const next: FileEntry = {
    name: entry.name,
    connectionId: props.connectionId || undefined,
    path: selectionPath,
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

async function onToggle(entry: FileSystemEntry, checked: boolean) {
  if (!isSelectable(entry)) return

  if (entry.type === 'dir') {
    const state = getCheckboxState(entry)
    if (state.checked || state.indeterminate) {
      if (isAncestorSelected(entry)) {
        explodeAncestorSelection(entry)
        return
      }
      removeDescendantSelections(entry)
      upsertConfigFile(entry, false)
      return
    }

    const expanded = await expandSelectionToTableFolders(entry)
    if (!expanded) {
      // When selecting a folder, remove explicit selections of descendants
      // (they're now implicitly included via the folder prefix)
      removeDescendantSelections(entry)
    }
    upsertConfigFile(entry, true)
    return
  }

  // When unchecking an item that was implicitly selected via ancestor,
  // we need to "explode" the ancestor into explicit sibling selections
  if (!checked && isAncestorSelected(entry)) {
    explodeAncestorSelection(entry)
    return
  }

  upsertConfigFile(entry, checked)
}

/**
 * When deselecting a child that was implicitly selected via an ancestor,
 * remove the ancestor selection and add all siblings as explicit selections.
 */
function explodeAncestorSelection(entry: FileSystemEntry) {
  if (!streamsStore.currentStreamConfig) return

  const entryPath = selectionPathForEntry(entry)

  // Find the selected ancestor folder that covers this entry
  const files = streamsStore.currentStreamConfig.files || []
  const selectedAncestor = files.find((f) => {
    if (!f.selected || f.type !== 'dir') return false
    const folderPath = f.path.endsWith('/') ? f.path : `${f.path}/`
    const normalizedEntry = entryPath.endsWith('/') ? entryPath : `${entryPath}/`
    return normalizedEntry.startsWith(folderPath) && normalizedEntry !== folderPath
  })

  if (!selectedAncestor) return

  const ancestorPath = selectedAncestor.path.endsWith('/')
    ? selectedAncestor.path
    : `${selectedAncestor.path}/`

  // Find the ancestor entry in the loaded tree to get its children
  const ancestorEntry = findEntryBySelectionPath(ancestorPath)
  if (!ancestorEntry || !ancestorEntry.children) {
    // If ancestor not loaded, just remove ancestor and mark entry as deselected
    streamsStore.currentStreamConfig.files = files.filter(
      (f) => f.path !== selectedAncestor.path || f.connectionId !== props.connectionId
    )
    return
  }

  // Remove the ancestor selection
  const updatedFiles = files.filter(
    (f) => f.path !== selectedAncestor.path || f.connectionId !== props.connectionId
  )

  // Add all children of the ancestor EXCEPT the one being deselected
  for (const child of ancestorEntry.children) {
    const childPath = selectionPathForEntry(child)
    if (childPath !== entryPath && isSelectable(child)) {
      updatedFiles.push({
        name: child.name,
        connectionId: props.connectionId || undefined,
        path: childPath,
        type: child.type,
        size: child.size,
        selected: true
      })
    }
  }

  streamsStore.currentStreamConfig.files = updatedFiles
}

/**
 * Find an entry in the loaded tree by its selection path
 */
function findEntryBySelectionPath(targetPath: string): FileSystemEntry | null {
  function search(entries: FileSystemEntry[]): FileSystemEntry | null {
    for (const e of entries) {
      const ePath = selectionPathForEntry(e)
      if (ePath === targetPath || ePath === targetPath.slice(0, -1)) {
        return e
      }
      if (e.children) {
        const found = search(e.children)
        if (found) return found
      }
    }
    return null
  }
  return search(rawFiles.value)
}

/**
 * Remove explicit selections for all descendants of a folder
 * (called when folder is selected, making descendants implicit)
 */
function removeDescendantSelections(entry: FileSystemEntry) {
  if (!streamsStore.currentStreamConfig) return

  const files = streamsStore.currentStreamConfig.files || []
  const pathsToRemove = new Set<string>()
  const selectionPath = selectionPathForEntry(entry)
  if (!selectionPath) return
  const folderPrefix = selectionPath.endsWith('/') ? selectionPath : `${selectionPath}/`

  function collectDescendantPaths(e: FileSystemEntry) {
    if (e.children) {
      for (const child of e.children) {
        pathsToRemove.add(selectionPathForEntry(child))
        if (child.type === 'dir') {
          collectDescendantPaths(child)
        }
      }
    }
  }

  collectDescendantPaths(entry)

  // Remove or deselect descendants
  streamsStore.currentStreamConfig.files = files.filter((f) => {
    if (props.connectionId && f.connectionId && f.connectionId !== props.connectionId) {
      return true
    }
    if (pathsToRemove.has(f.path)) {
      return false
    }
    const candidatePath =
      f.type === 'dir' || f.path.endsWith('/') ? ensureTrailingSlash(f.path) : f.path
    return !(candidatePath.startsWith(folderPrefix) && f.path !== selectionPath)
  })
}

async function expandSelectionToTableFolders(entry: FileSystemEntry): Promise<boolean> {
  if (!props.connectionId || isS3Connection.value) return false
  if (entry.type !== 'dir' || entry.isTable) return false

  if (!entry.isLoaded) {
    await fileExplorerStore.loadFolderContents(props.connectionId, entry.path)
  }

  const entryPath = selectionPathForEntry(entry)
  const refreshedEntry = findEntryBySelectionPath(entryPath) || entry
  const children = refreshedEntry.children || []
  if (children.length === 0) return false

  const tableChildren = children.filter((child) => child.type === 'dir' && child.isTable)
  if (tableChildren.length === 0) return false

  removeDescendantSelections(refreshedEntry)
  for (const child of tableChildren) {
    upsertConfigFile(child, true)
  }

  fileExplorerStore.expandFolder(props.connectionId, refreshedEntry.path)

  return true
}

function syncConfigFilesWithLoadedTree(entries: FileSystemEntry[]) {
  if (!streamsStore.currentStreamConfig) return

  // Only sync metadata for existing entries, don't auto-select anything
  const existing = new Map<string, FileEntry>()
  for (const f of streamsStore.currentStreamConfig.files || []) {
    existing.set(fileEntryKey(f), f)
  }

  const all = flattenAllLoaded(entries, 0).map((r) => r.entry)
  for (const e of all) {
    const prev = existing.get(
      fileEntryKey({
        connectionId: props.connectionId || undefined,
        path: e.path,
        type: e.type
      })
    )
    if (prev) {
      // Update metadata but keep selection state
      existing.set(fileEntryKey(prev), {
        ...prev,
        name: e.name,
        size: e.size,
        type: e.type
      })
    }
    // Don't create new entries - user must explicitly select
  }

  streamsStore.currentStreamConfig.files = Array.from(existing.values())
}

const selectableCount = computed(() => {
  return flattenAllLoaded(rawFiles.value, 0).filter((r) => isSelectable(r.entry)).length
})

/**
 * Count items that are effectively selected (explicitly or via ancestor).
 * Also counts selected items from configFiles that may not be visible in tree yet.
 */
const selectedCount = computed(() => {
  const allRows = flattenAllLoaded(rawFiles.value, 0)
  const visibleSelected = allRows.filter((r) => {
    if (!isSelectable(r.entry)) return false
    const state = getCheckboxState(r.entry)
    return state.checked
  }).length

  // Also count selected items from configFiles that aren't in the visible tree
  const visiblePaths = new Set(
    allRows.map((r) => selectionPathForEntry({ path: r.entry.path, type: r.entry.type }))
  )
  const hiddenSelected = configFiles.value.filter(
    (f) => f.selected && !visiblePaths.has(f.path)
  ).length

  return visibleSelected + hiddenSelected
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

function updateViewportHeight() {
  if (!listContainer.value) return
  viewportHeight.value = listContainer.value.clientHeight
}

function onScroll() {
  if (!listContainer.value) return
  scrollTop.value = listContainer.value.scrollTop
}

function resetScroll() {
  scrollTop.value = 0
  if (listContainer.value) {
    listContainer.value.scrollTop = 0
  }
}

onMounted(() => {
  updateViewportHeight()
  window.addEventListener('resize', updateViewportHeight)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportHeight)
})

watch(filteredRows, async () => {
  await nextTick()
  updateViewportHeight()
  resetScroll()
})

/**
 * Get all parent folder paths for a given file/folder path.
 * For example, 's3://bucket/sakila/actor/' returns ['s3://bucket/sakila/']
 * For 's3://bucket/sakila/address/file.parquet' returns ['s3://bucket/sakila/', 's3://bucket/sakila/address/']
 */
function getParentPaths(filePath: string): string[] {
  const parents: string[] = []

  // Handle S3 paths: s3://bucket/folder1/folder2/...
  const s3Match = filePath.match(/^(s3:\/\/[^/]+\/)(.*)$/)
  if (!s3Match) {
    const basePath = trimTrailingSeparators(normalizeLocalPath(localBasePath.value))
    if (!basePath) return parents
    const relative = trimTrailingSeparators(relativePathFromBase(basePath, filePath))
    if (!relative) return parents
    const segments = relative.split('/').filter(Boolean)
    for (let i = 0; i < segments.length - 1; i++) {
      parents.push(`${basePath}/${segments.slice(0, i + 1).join('/')}`)
    }
    return parents
  }

  const bucketPrefix = s3Match[1] // 's3://bucket/'
  const relativePath = s3Match[2] // 'folder1/folder2/file.parquet' or 'folder1/folder2/'

  // Split path and build parent paths
  const segments = relativePath.split('/').filter(Boolean)
  // For 'sakila/actor/' we get ['sakila', 'actor']
  // For 'sakila/address/file.parquet' we get ['sakila', 'address', 'file.parquet']

  // Build parent paths (all ancestors except the item itself)
  for (let i = 0; i < segments.length - 1; i++) {
    const parentPath = bucketPrefix + segments.slice(0, i + 1).join('/') + '/'
    parents.push(parentPath)
  }

  return parents
}

// Track if we've already auto-expanded for current connection
const hasAutoExpanded = ref(false)

/**
 * Auto-expand parent folders of selected items when editing a stream config.
 */
async function autoExpandSelectedParents() {
  if (!props.connectionId || hasAutoExpanded.value) return

  const selectedFiles = configFiles.value.filter((f) => f.selected)
  if (selectedFiles.length === 0 || rawFiles.value.length === 0) return

  // Collect unique parent paths and sort by depth (shortest first)
  const parentsToExpand = new Set<string>()
  for (const file of selectedFiles) {
    getParentPaths(file.path).forEach((p) => parentsToExpand.add(p))
  }
  if (parentsToExpand.size === 0) return

  const sortedParents = Array.from(parentsToExpand).sort((a, b) => a.length - b.length)

  // Load and expand each parent folder
  for (const parentPath of sortedParents) {
    await fileExplorerStore.loadFolderContents(props.connectionId, parentPath)
  }

  hasAutoExpanded.value = true
}

// Load files when connection or bucket changes
watch(
  [() => props.connectionId, s3Bucket],
  async ([connectionId, bucket]) => {
    hasAutoExpanded.value = false
    if (connectionId) {
      const overridePath = bucket ? `s3://${bucket}/` : undefined
      await fileExplorerStore.loadEntries(connectionId, false, overridePath)
    }
  },
  { immediate: true }
)

// Sync config files and auto-expand when tree loads
watch(
  rawFiles,
  async (entries) => {
    if (!streamsStore.currentStreamConfig || !props.connectionId) return
    syncConfigFilesWithLoadedTree(entries)
    await autoExpandSelectedParents()
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
