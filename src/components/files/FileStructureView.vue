<script setup lang="ts">
import { computed } from 'vue'
import { type FileSystemEntry } from '@/api/fileSystem'
import { type FileMetadata } from '@/types/files'
import { getFileFormat } from '@/utils/fileFormat'

const props = defineProps<{
  entry: FileSystemEntry
  metadata: FileMetadata | null
  connectionId: string
}>()

const emit = defineEmits<{
  (e: 'refresh-metadata'): void
}>()

const fileFormat = computed(() => getFileFormat(props.entry.name))

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

const formatNumber = (num: number): string => {
  return num.toLocaleString()
}

// Expose refresh method for parent container
defineExpose({
  refresh: () => emit('refresh-metadata')
})
</script>

<template>
  <div class="p-4 space-y-6">
    <!-- File Information -->
    <section>
      <h3 class="text-sm font-semibold text-gray-900 mb-3">File Information</h3>
      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700">
          <p><span class="font-medium">Path:</span> {{ entry.path }}</p>
          <p><span class="font-medium">Size:</span> {{ formatFileSize(entry.size) }}</p>
          <p v-if="fileFormat">
            <span class="font-medium">Format:</span> {{ fileFormat.toUpperCase() }}
          </p>
        </div>
        <div
          v-if="metadata"
          class="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700"
        >
          <p><span class="font-medium">Rows:</span> {{ formatNumber(metadata.rowCount) }}</p>
          <p><span class="font-medium">Columns:</span> {{ metadata.columnCount }}</p>
        </div>
      </div>
    </section>

    <!-- Columns Structure -->
    <section v-if="metadata?.columns">
      <h3 class="text-sm font-semibold text-gray-900 mb-3">Columns</h3>
      <div class="overflow-x-auto">
        <div class="min-w-[640px]">
          <div class="ring-1 ring-gray-200 rounded-lg">
            <table class="min-w-full divide-y divide-gray-300">
              <thead>
                <tr class="bg-gray-50">
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Column
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Type
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Nullable
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr v-for="col in metadata.columns" :key="col.name" class="hover:bg-gray-50">
                  <td class="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-900">
                    {{ col.name }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-500 uppercase">
                    {{ col.type }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                    {{ col.nullable ? 'Yes' : 'No' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- Format-specific Information -->
    <section v-if="metadata?.csvDialect || metadata?.jsonStructure">
      <h3 class="text-sm font-semibold text-gray-900 mb-3">Format Details</h3>

      <!-- CSV Dialect -->
      <div v-if="metadata.csvDialect" class="rounded-md border border-gray-200 p-4">
        <h4 class="text-sm font-medium text-gray-900 mb-2">CSV Configuration</h4>
        <div class="grid gap-2 text-sm text-gray-700">
          <p><span class="font-medium">Delimiter:</span> "{{ metadata.csvDialect.delimiter }}"</p>
          <p><span class="font-medium">Quote:</span> "{{ metadata.csvDialect.quote }}"</p>
          <p>
            <span class="font-medium">Has Header:</span>
            {{ metadata.csvDialect.hasHeader ? 'Yes' : 'No' }}
          </p>
          <p>
            <span class="font-medium">Line Terminator:</span>
            {{
              metadata.csvDialect.lineTerminator === '\n'
                ? '\\n'
                : metadata.csvDialect.lineTerminator
            }}
          </p>
        </div>
      </div>

      <!-- JSON Structure -->
      <div v-if="metadata.jsonStructure" class="rounded-md border border-gray-200 p-4">
        <h4 class="text-sm font-medium text-gray-900 mb-2">JSON Structure</h4>
        <div class="grid gap-2 text-sm text-gray-700">
          <p><span class="font-medium">Root Type:</span> {{ metadata.jsonStructure.rootType }}</p>
          <p>
            <span class="font-medium">Homogeneous:</span>
            {{ metadata.jsonStructure.isHomogeneous ? 'Yes' : 'No' }}
          </p>
          <p v-if="metadata.jsonStructure.arrayInfo">
            <span class="font-medium">Array Elements:</span>
            {{ formatNumber(metadata.jsonStructure.arrayInfo.elementCount) }}
          </p>
        </div>
      </div>
    </section>

    <!-- Empty State -->
    <div v-if="!metadata" class="text-center py-8">
      <p class="text-sm text-gray-500">No metadata available</p>
      <p class="text-xs text-gray-400 mt-1">File metadata could not be loaded</p>
    </div>
  </div>
</template>
