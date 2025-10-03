<script setup lang="ts">
import { type FileSystemEntry } from '@/api/fileSystem'
import { type FileMetadata } from '@/types/files'
import AGGridFileDataView from './AGGridFileDataView.vue'

defineProps<{
  entry: FileSystemEntry
  metadata: FileMetadata | null
  connectionId: string
}>()
</script>

<template>
  <div
    :class="[
      'bg-white',
      $attrs.class ? $attrs.class : 'shadow-sm ring-1 ring-gray-900/5 rounded-lg'
    ]"
  >
    <div class="p-4">
      <AGGridFileDataView :entry="entry" :metadata="metadata" :connection-id="connectionId" />
    </div>
  </div>
</template>
