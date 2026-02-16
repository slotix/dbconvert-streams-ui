<script setup lang="ts">
import { computed, inject, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import type { FileSystemEntry } from '@/api/fileSystem'
import { getFileFormat, isSupportedFile } from '@/utils/fileFormat'
import FileIcon from '@/components/common/FileIcon.vue'
import HighlightedText from '@/components/common/HighlightedText.vue'
import { SUPPORTED_FILE_FORMATS } from '@/constants/fileFormats'
import { useFileExplorerStore } from '@/stores/fileExplorer'

const props = withDefaults(
  defineProps<{
    entry: FileSystemEntry
    connectionId: string
    selectedPath: string | null
    depth?: number
  }>(),
  {
    depth: 0
  }
)

// Inject search query and caret class from parent
const searchQuery = inject<ComputedRef<string>>('treeSearchQuery')!
const caretClass = inject<string>('treeCaretClass', 'w-4 h-4')

const fileExplorerStore = useFileExplorerStore()

const emit = defineEmits<{
  (e: 'select', payload: { path: string; entry: FileSystemEntry }): void
  (
    e: 'open',
    payload: { entry: FileSystemEntry; mode: 'preview' | 'pinned'; openInRightSplit?: boolean }
  ): void
  (e: 'context-menu', payload: { event: MouseEvent; entry: FileSystemEntry }): void
  (e: 'expand-folder', payload: { entry: FileSystemEntry }): void
}>()

const fileFormat = computed(() => props.entry.format || getFileFormat(props.entry.name))
const isFolder = computed(() => props.entry.type === 'dir')
const isTableFolder = computed(() => isFolder.value && !!props.entry.isTable)
const isSelectableFile = computed(() => props.entry.type === 'file' || isTableFolder.value)
const isSupported = computed(
  () => isTableFolder.value || props.entry.type === 'dir' || isSupportedFile(props.entry.name)
)
const isSelected = computed(() => props.selectedPath === props.entry.path)
const isExpanded = computed(() =>
  fileExplorerStore.isFolderExpanded(props.connectionId, props.entry.path)
)
const hasChildren = computed(() => props.entry.children && props.entry.children.length > 0)

// Auto-load children when folder is expanded but not loaded
watch(
  () => isExpanded.value && isFolder.value && !props.entry.isLoaded,
  (shouldLoad) => {
    if (shouldLoad) {
      fileExplorerStore.loadFolderContents(props.connectionId, props.entry.path)
    }
  },
  { immediate: true }
)

// Generate tooltip for unsupported files
const unsupportedTooltip = computed(() => {
  if (isSupported.value || props.entry.type === 'dir') return ''
  const formats = SUPPORTED_FILE_FORMATS.map((f) => f.extensions.join(', ')).join(', ')
  return `Unsupported file format. Supported: ${formats}`
})

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

// Indentation for nested items
const indentStyle = computed(() => ({
  paddingLeft: `${props.depth * 12 + 8}px`
}))

// Handle folder chevron click
const handleChevronClick = (event: MouseEvent) => {
  event.stopPropagation()
  if (isFolder.value) {
    emit('expand-folder', { entry: props.entry })
  }
}

// Handle entry selection
const handleSelect = () => {
  if (isTableFolder.value) {
    emit('select', { path: props.entry.path, entry: props.entry })
    // Table folders are selectable (open consolidated preview) but should also be expandable
    // so users can drill into individual part files.
    if (!isExpanded.value) {
      emit('expand-folder', { entry: props.entry })
    }
  } else if (isFolder.value) {
    // Single-click on folder: expand/collapse it
    emit('expand-folder', { entry: props.entry })
  } else {
    // Single-click on file: select it for preview
    emit('select', { path: props.entry.path, entry: props.entry })
  }
}

// Handle double-click - expand folder or open file
const handleDoubleClick = () => {
  if (isTableFolder.value || !isFolder.value) {
    emit('open', { entry: props.entry, mode: 'pinned' })
  } else {
    emit('expand-folder', { entry: props.entry })
  }
}

// Propagate events from child entries
const handleChildSelect = (payload: { path: string; entry: FileSystemEntry }) => {
  emit('select', payload)
}

const handleChildOpen = (payload: {
  entry: FileSystemEntry
  mode: 'preview' | 'pinned'
  openInRightSplit?: boolean
}) => {
  emit('open', payload)
}

const handleChildContextMenu = (payload: { event: MouseEvent; entry: FileSystemEntry }) => {
  emit('context-menu', payload)
}

const handleChildExpandFolder = (payload: { entry: FileSystemEntry }) => {
  emit('expand-folder', payload)
}

// Metadata loading removed - no longer eager loaded on mount
// Metadata will be loaded lazily when the file is selected/opened
// This significantly improves performance when expanding file connections
</script>

<template>
  <div class="file-entry-container">
    <!-- Entry row -->
    <div
      class="flex items-center py-1.5 text-sm text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer select-none"
      :class="{
        'bg-gray-100 dark:bg-gray-800 ring-1 ring-gray-300 dark:ring-gray-600':
          isSelected && isSelectableFile,
        'opacity-60': !isSupported && entry.type !== 'dir'
      }"
      data-tree-node="true"
      :data-node-kind="isFolder ? 'file-folder' : 'file'"
      :data-tree-depth="depth + 1"
      :data-connection-id="connectionId"
      :data-file-path="entry.path"
      :data-is-dir="isFolder ? 'true' : 'false'"
      tabindex="-1"
      :style="indentStyle"
      :title="unsupportedTooltip"
      @click="handleSelect"
      @dblclick.stop="handleDoubleClick"
      @click.middle.stop="isSelectableFile && emit('open', { entry, mode: 'pinned' })"
      @contextmenu.stop.prevent="
        $event.shiftKey && isSelectableFile
          ? emit('open', { entry, mode: 'preview', openInRightSplit: true })
          : emit('context-menu', { event: $event, entry })
      "
    >
      <!-- Chevron for folders -->
      <button
        v-if="isFolder"
        class="shrink-0 mr-1 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-transform duration-150"
        :class="{ 'rotate-90': isExpanded }"
        @click.stop="handleChevronClick"
      >
        <ChevronRight :class="caretClass" />
      </button>

      <!-- Spacer for files to align with folders -->
      <span v-else :class="caretClass" class="shrink-0 mr-1"></span>

      <!-- File/Folder icon -->
      <FileIcon
        :file-format="fileFormat"
        :is-directory="entry.type === 'dir'"
        :is-table-folder="isTableFolder"
        :is-bucket="entry.isBucket"
        class="mr-2"
      />

      <!-- File/Folder name -->
      <HighlightedText class="flex-1 min-w-0 truncate" :text="entry.name" :query="searchQuery" />

      <!-- File size -->
      <span v-if="entry.size" class="text-xs text-gray-500 dark:text-gray-400 ml-2 shrink-0">
        {{ formatFileSize(entry.size) }}
      </span>
    </div>

    <!-- Recursively render children if expanded -->
    <div v-if="isFolder && isExpanded && hasChildren" class="folder-children">
      <FileEntry
        v-for="child in entry.children"
        :key="child.path"
        :entry="child"
        :connection-id="connectionId"
        :selected-path="selectedPath"
        :depth="depth + 1"
        @select="handleChildSelect"
        @open="handleChildOpen"
        @context-menu="handleChildContextMenu"
        @expand-folder="handleChildExpandFolder"
      />
    </div>
  </div>
</template>
