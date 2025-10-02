<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { DocumentIcon } from '@heroicons/vue/24/outline'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { FileMetadata } from '@/types/files'
import filesApi from '@/api/files'
import { getFileFormat } from '@/utils/fileFormat'
import { highlightParts } from '@/utils/highlight'

const props = defineProps<{
  entry: FileSystemEntry
  connectionId: string
  selected: boolean
  searchQuery: string
}>()

const emit = defineEmits<{
  (e: 'select'): void
  (
    e: 'open',
    payload: { entry: FileSystemEntry; mode: 'preview' | 'pinned'; openInRightSplit?: boolean }
  ): void
  (e: 'context-menu', payload: { event: MouseEvent; entry: FileSystemEntry }): void
}>()

const metadata = ref<FileMetadata | null>(null)
const isLoadingMetadata = ref(false)

const fileFormat = computed(() => getFileFormat(props.entry.name))

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

const formatRowCount = (count: number): string => {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`
  return `${(count / 1000000).toFixed(1)}M`
}

async function loadMetadata() {
  if (!fileFormat.value || isLoadingMetadata.value || metadata.value) return

  isLoadingMetadata.value = true
  try {
    metadata.value = await filesApi.getFileMetadata(props.entry.path, fileFormat.value)
  } catch (error) {
    console.warn('Failed to load file metadata:', error)
  } finally {
    isLoadingMetadata.value = false
  }
}

// Load metadata when component mounts if file format is supported
onMounted(() => {
  if (fileFormat.value) {
    loadMetadata()
  }
})
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
    <DocumentIcon class="w-[16px] h-[16px] text-gray-400 shrink-0 flex-none mr-1.5" />
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between">
        <div class="flex-1 min-w-0">
          <div class="truncate">
            <template v-for="(p, i) in highlightParts(entry.name, searchQuery)" :key="i">
              <span v-if="p.match" class="bg-yellow-200/60 rounded px-0.5" v-text="p.text" />
              <span v-else v-text="p.text" />
            </template>
          </div>
          <!-- Metadata display similar to database tables -->
          <div
            v-if="metadata || isLoadingMetadata"
            class="flex items-center gap-2 text-xs text-gray-500 mt-0.5"
          >
            <template v-if="isLoadingMetadata">
              <span class="animate-pulse">Loading...</span>
            </template>
            <template v-else-if="metadata">
              <span v-if="fileFormat" class="inline-flex items-center">
                {{ fileFormat.toUpperCase() }}
              </span>
              <span v-if="metadata.rowCount > 0" class="inline-flex items-center">
                {{ formatRowCount(metadata.rowCount) }} rows
              </span>
              <span v-if="metadata.columnCount > 0" class="inline-flex items-center">
                {{ metadata.columnCount }} col{{ metadata.columnCount !== 1 ? 's' : '' }}
              </span>
            </template>
          </div>
        </div>
        <span v-if="entry.size" class="text-xs text-gray-500 ml-2 flex-shrink-0">
          {{ formatFileSize(entry.size) }}
        </span>
      </div>
    </div>
  </div>
</template>
