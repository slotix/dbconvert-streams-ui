<script setup lang="ts">
import { type FileSystemEntry } from '@/api/fileSystem'
import { type FileMetadata } from '@/types/files'
import AGGridFileDataView from './AGGridFileDataView.vue'

defineProps<{
  entry: FileSystemEntry
  metadata: FileMetadata | null
  connectionId: string
  objectKey: string
}>()
</script>

<template>
  <div
    :class="[
      'bg-white dark:bg-gray-850',
      $attrs.class ? $attrs.class : 'shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 rounded-lg'
    ]"
  >
    <div class="p-4">
      <AGGridFileDataView
        :entry="entry"
        :metadata="metadata"
        :connection-id="connectionId"
        :object-key="objectKey"
      />
    </div>
  </div>
</template>
