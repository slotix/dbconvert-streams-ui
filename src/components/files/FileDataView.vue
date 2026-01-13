<script setup lang="ts">
import { ref, computed } from 'vue'
import { type FileSystemEntry } from '@/api/fileSystem'
import { type FileMetadata } from '@/types/files'
import AGGridFileDataView from './AGGridFileDataView.vue'

defineProps<{
  entry: FileSystemEntry
  metadata: FileMetadata | null
  connectionId: string
  objectKey: string
}>()

// Ref to AGGridFileDataView
const agGridRef = ref<InstanceType<typeof AGGridFileDataView> | null>(null)

// Expose refresh function to parent
function refresh() {
  agGridRef.value?.refresh()
}

// Expose filterPanelRef for header controls
const filterPanelRef = computed(() => agGridRef.value?.filterPanelRef)

defineExpose({
  refresh,
  filterPanelRef
})
</script>

<template>
  <div
    :class="[
      'bg-white dark:bg-gray-850 h-full min-h-0 flex flex-col',
      $attrs.class ? $attrs.class : 'shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 rounded-lg'
    ]"
  >
    <div class="p-4 flex-1 min-h-0">
      <AGGridFileDataView
        ref="agGridRef"
        :entry="entry"
        :metadata="metadata"
        :connection-id="connectionId"
        :object-key="objectKey"
      />
    </div>
  </div>
</template>
