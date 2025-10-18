<script setup lang="ts">
import { computed, inject } from 'vue'
import type { ComputedRef } from 'vue'
import type { FileSystemEntry } from '@/api/fileSystem'
import { getFileFormat, getFileFormatColor, getFileFormatIconPath } from '@/utils/fileFormat'
import { highlightParts } from '@/utils/highlight'

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
const fileFormatColor = computed(() => getFileFormatColor(fileFormat.value))
const fileFormatIconPath = computed(() => getFileFormatIconPath(fileFormat.value))

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
      'bg-sky-50 ring-1 ring-sky-200': selected
    }"
    @click="emit('select')"
    @dblclick.stop="emit('open', { entry, mode: 'pinned' })"
    @click.middle.stop="emit('open', { entry, mode: 'pinned' })"
    @contextmenu.stop.prevent="
      $event.shiftKey
        ? emit('open', { entry, mode: 'preview', openInRightSplit: true })
        : emit('context-menu', { event: $event, entry })
    "
  >
    <!-- File format icon -->
    <div class="relative mr-2 shrink-0">
      <svg class="w-4 h-4" :class="fileFormatColor" fill="currentColor" viewBox="0 0 24 24">
        <path :d="fileFormatIconPath" />
      </svg>
    </div>

    <!-- File name -->
    <div class="flex-1 min-w-0 truncate">
      <template v-for="(p, i) in highlightParts(entry.name, searchQuery)" :key="i">
        <span v-if="p.match" class="bg-yellow-200/60 rounded px-0.5" v-text="p.text" />
        <span v-else v-text="p.text" />
      </template>
    </div>

    <!-- File size -->
    <span v-if="entry.size" class="text-xs text-gray-500 ml-2 flex-shrink-0">
      {{ formatFileSize(entry.size) }}
    </span>
  </div>
</template>
