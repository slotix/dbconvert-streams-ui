<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import type { ComputedRef } from 'vue'
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

const metadata = ref<FileMetadata | null>(null)
const isLoadingMetadata = ref(false)
const metadataError = ref<string | null>(null)

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

const hasWarnings = computed(() => {
  return metadata.value?.warnings && metadata.value.warnings.length > 0
})

async function loadMetadata() {
  if (!fileFormat.value || isLoadingMetadata.value || metadata.value) return

  isLoadingMetadata.value = true
  metadataError.value = null
  try {
    metadata.value = await filesApi.getFileMetadata(props.entry.path, fileFormat.value)
  } catch (error) {
    console.warn('Failed to load file metadata:', error)
    metadataError.value = error instanceof Error ? error.message : 'Failed to load metadata'
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
    <div class="relative">
      <DocumentIcon class="w-[16px] h-[16px] text-gray-400 shrink-0 flex-none mr-1.5" />
      <!-- Warning indicator badge -->
      <div
        v-if="hasWarnings"
        class="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full ring-1 ring-white"
        :title="metadata?.warnings?.join('; ')"
      />
    </div>
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
            v-if="metadata || isLoadingMetadata || metadataError"
            class="flex items-center gap-2 text-xs mt-0.5"
          >
            <template v-if="isLoadingMetadata">
              <svg class="animate-spin h-3 w-3 text-gray-400" viewBox="0 0 24 24" fill="none">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"
                />
              </svg>
            </template>
            <template v-else-if="metadataError">
              <span class="text-red-600" :title="metadataError">⚠ Error loading metadata</span>
            </template>
            <template v-else-if="metadata">
              <span
                v-if="hasWarnings"
                class="inline-flex items-center text-amber-600"
                :title="metadata.warnings?.join('; ')"
              >
                <svg class="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
                Corrupted
              </span>
              <span v-if="fileFormat" class="inline-flex items-center text-gray-500">
                {{ fileFormat.toUpperCase() }}
              </span>
              <span v-if="metadata.rowCount > 0" class="inline-flex items-center text-gray-500">
                {{ formatRowCount(metadata.rowCount) }} rows
              </span>
              <span v-if="metadata.columnCount > 0" class="inline-flex items-center text-gray-500">
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
