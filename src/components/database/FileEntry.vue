<script setup lang="ts">
import { computed, inject } from 'vue'
import type { ComputedRef } from 'vue'
import type { FileSystemEntry } from '@/api/fileSystem'
import { getFileFormat, isSupportedFile } from '@/utils/fileFormat'
import { highlightParts } from '@/utils/highlight'
import FileIcon from '@/components/common/FileIcon.vue'
import { SUPPORTED_FILE_FORMATS } from '@/constants/fileFormats'

const props = defineProps<{
  entry: FileSystemEntry
  connectionId: string
  selected: boolean
}>()

// Inject search query from parent
const searchQuery = inject<ComputedRef<string>>('treeSearchQuery')!

const emit = defineEmits<{
  (e: 'select'): void
  (
    e: 'open',
    payload: { entry: FileSystemEntry; mode: 'preview' | 'pinned'; openInRightSplit?: boolean }
  ): void
  (e: 'context-menu', payload: { event: MouseEvent; entry: FileSystemEntry }): void
}>()

const fileFormat = computed(() => getFileFormat(props.entry.name))
const isSupported = computed(() => props.entry.type === 'dir' || isSupportedFile(props.entry.name))

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

// Metadata loading removed - no longer eager loaded on mount
// Metadata will be loaded lazily when the file is selected/opened
// This significantly improves performance when expanding file connections
</script>

<template>
  <div
    class="flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 cursor-pointer select-none"
    :class="{
      'bg-gray-100 ring-1 ring-gray-300': selected,
      'opacity-60': !isSupported && entry.type !== 'dir'
    }"
    :title="unsupportedTooltip"
    @click="emit('select')"
    @dblclick.stop="emit('open', { entry, mode: 'pinned' })"
    @click.middle.stop="emit('open', { entry, mode: 'pinned' })"
    @contextmenu.stop.prevent="
      $event.shiftKey
        ? emit('open', { entry, mode: 'preview', openInRightSplit: true })
        : emit('context-menu', { event: $event, entry })
    "
  >
    <!-- File/Folder icon -->
    <FileIcon :file-format="fileFormat" :is-directory="entry.type === 'dir'" class="mr-2" />

    <!-- File name -->
    <div class="flex-1 min-w-0 truncate">
      <template v-for="(p, i) in highlightParts(entry.name, searchQuery)" :key="i">
        <span v-if="p.match" class="bg-yellow-200/60 rounded px-0.5" v-text="p.text" />
        <span v-else v-text="p.text" />
      </template>
    </div>

    <!-- File size -->
    <span v-if="entry.size" class="text-xs text-gray-500 ml-2 shrink-0">
      {{ formatFileSize(entry.size) }}
    </span>
  </div>
</template>
