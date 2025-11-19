<script setup lang="ts">
import { computed } from 'vue'
import { type FileSystemEntry } from '@/api/fileSystem'
import { type FileMetadata } from '@/types/files'
import { getFileFormat } from '@/utils/fileFormat'
import UnsupportedFileMessage from './UnsupportedFileMessage.vue'
import { ref } from 'vue'
import {
  DocumentTextIcon,
  CircleStackIcon,
  InformationCircleIcon,
  TableCellsIcon,
  ClipboardDocumentIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  entry: FileSystemEntry
  metadata: FileMetadata | null
  connectionId: string
}>()

const emit = defineEmits<{
  (e: 'refresh-metadata'): void
}>()

const fileFormat = computed(() => props.entry.format || getFileFormat(props.entry.name))
const isUnsupportedFile = computed(() => fileFormat.value === null)

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

const formatNumber = (num: number): string => {
  return num.toLocaleString()
}

// Copy to clipboard functionality
const isCopied = ref(false)
const copyTimeout = ref<NodeJS.Timeout | null>(null)

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    isCopied.value = true

    // Clear existing timeout if any
    if (copyTimeout.value) {
      clearTimeout(copyTimeout.value)
    }

    // Reset after 2 seconds
    copyTimeout.value = setTimeout(() => {
      isCopied.value = false
      copyTimeout.value = null
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

// Expose refresh method for parent container
defineExpose({
  refresh: () => emit('refresh-metadata')
})
</script>

<template>
  <div class="p-4">
    <!-- Unsupported File Type Message -->
    <UnsupportedFileMessage v-if="isUnsupportedFile" :file-name="entry.name" variant="structure" />

    <!-- Grid Layout matching DatabaseOverviewPanel -->
    <div v-if="!isUnsupportedFile" class="grid grid-cols-1 md:grid-cols-6 gap-4">
      <!-- File Essentials Card -->
      <div
        class="group bg-white dark:bg-gray-900/40 ring-1 ring-slate-200/70 dark:ring-gray-800 rounded-xl p-4 md:col-span-3 hover:shadow-lg dark:hover:shadow-gray-900/40 hover:ring-slate-300 dark:hover:ring-gray-600 transition-all duration-200"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div
              class="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-gradient-to-br group-hover:from-blue-100 group-hover:to-teal-100 dark:group-hover:from-blue-900/30 dark:group-hover:to-teal-900/30 transition-all duration-200"
            >
              <DocumentTextIcon class="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span class="text-sm font-semibold text-gray-700 dark:text-gray-300"
              >File Information</span
            >
          </div>
          <span
            v-if="fileFormat"
            class="inline-flex items-center text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium ring-1 ring-inset ring-slate-200 dark:ring-slate-700"
          >
            {{ fileFormat.toUpperCase() }}
          </span>
        </div>
        <div class="mt-3 text-sm space-y-3">
          <!-- Path with copy button -->
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-gray-600 dark:text-gray-400">Path:</span>
              <button
                type="button"
                class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                :class="
                  isCopied
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-400'
                "
                :title="isCopied ? 'Copied!' : 'Copy path'"
                @click="copyToClipboard(entry.path)"
              >
                <CheckIcon v-if="isCopied" class="h-3.5 w-3.5" />
                <ClipboardDocumentIcon v-else class="h-3.5 w-3.5" />
                {{ isCopied ? 'Copied' : 'Copy' }}
              </button>
            </div>
            <div
              class="px-2 py-1.5 bg-gray-50 dark:bg-gray-800/60 rounded text-xs font-mono text-gray-900 dark:text-gray-100 break-all"
            >
              {{ entry.path }}
            </div>
          </div>

          <!-- Size -->
          <div class="flex justify-between items-center">
            <span class="text-gray-600 dark:text-gray-400">Size:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">
              {{ formatFileSize(entry.size) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Data Statistics Card -->
      <div
        v-if="metadata"
        class="group bg-white dark:bg-gray-900/40 ring-1 ring-slate-200/70 dark:ring-gray-800 rounded-xl p-4 md:col-span-3 hover:shadow-lg dark:hover:shadow-gray-900/40 hover:ring-slate-300 dark:hover:ring-gray-600 transition-all duration-200"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div
              class="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg group-hover:bg-gradient-to-br group-hover:from-teal-100 group-hover:to-blue-100 dark:group-hover:from-teal-900/30 dark:group-hover:to-blue-900/30 transition-all duration-200"
            >
              <CircleStackIcon class="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <span class="text-sm font-semibold text-gray-700 dark:text-gray-300"
              >Data Statistics</span
            >
          </div>
        </div>
        <div class="mt-3 text-sm space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-gray-600 dark:text-gray-400">Rows:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">
              {{ formatNumber(metadata.rowCount) }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-600 dark:text-gray-400">Columns:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">
              {{ metadata.columnCount }}
            </span>
          </div>
        </div>
      </div>

      <!-- Columns Structure Card -->
      <div
        v-if="metadata?.columns"
        class="group bg-white dark:bg-gray-900/40 ring-1 ring-slate-200/70 dark:ring-gray-800 rounded-xl p-4 md:col-span-6 hover:shadow-lg dark:hover:shadow-gray-900/40 hover:ring-slate-300 dark:hover:ring-gray-600 transition-all duration-200"
      >
        <div class="flex items-center gap-2 mb-3">
          <div
            class="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg group-hover:bg-gradient-to-br group-hover:from-purple-100 group-hover:to-pink-100 dark:group-hover:from-purple-900/30 dark:group-hover:to-pink-900/30 transition-all duration-200"
          >
            <TableCellsIcon class="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Columns</span>
        </div>
        <div class="mt-3 overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr class="bg-gray-50 dark:bg-gray-900/60">
                <th
                  class="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Column
                </th>
                <th
                  class="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Type
                </th>
                <th
                  class="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Nullable
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr
                v-for="col in metadata.columns"
                :key="col.name"
                class="hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 transition-all duration-150"
              >
                <td class="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ col.name }}
                </td>
                <td class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 uppercase">
                  {{ col.type }}
                </td>
                <td class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                  {{ col.nullable ? 'Yes' : 'No' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Format Details Card (CSV) -->
      <div
        v-if="metadata?.csvDialect"
        class="group bg-white dark:bg-gray-900/40 ring-1 ring-slate-200/70 dark:ring-gray-800 rounded-xl p-4 md:col-span-6 hover:shadow-lg dark:hover:shadow-gray-900/40 hover:ring-slate-300 dark:hover:ring-gray-600 transition-all duration-200"
      >
        <div class="flex items-center gap-2 mb-3">
          <div
            class="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg group-hover:bg-gradient-to-br group-hover:from-orange-100 group-hover:to-amber-100 dark:group-hover:from-orange-900/30 dark:group-hover:to-amber-900/30 transition-all duration-200"
          >
            <InformationCircleIcon class="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300"
            >CSV Configuration</span
          >
        </div>
        <div class="mt-3 text-sm space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-gray-600 dark:text-gray-400">Delimiter:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">
              "{{ metadata.csvDialect.delimiter }}"
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-600 dark:text-gray-400">Quote:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">
              "{{ metadata.csvDialect.quote }}"
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-600 dark:text-gray-400">Has Header:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">
              {{ metadata.csvDialect.hasHeader ? 'Yes' : 'No' }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-600 dark:text-gray-400">Line Terminator:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">
              {{
                metadata.csvDialect.lineTerminator === '\n'
                  ? '\\n'
                  : metadata.csvDialect.lineTerminator
              }}
            </span>
          </div>
        </div>
      </div>

      <!-- Format Details Card (JSON) -->
      <div
        v-if="metadata?.jsonStructure"
        class="group bg-white dark:bg-gray-900/40 ring-1 ring-slate-200/70 dark:ring-gray-800 rounded-xl p-4 md:col-span-6 hover:shadow-lg dark:hover:shadow-gray-900/40 hover:ring-slate-300 dark:hover:ring-gray-600 transition-all duration-200"
      >
        <div class="flex items-center gap-2 mb-3">
          <div
            class="p-2 bg-sky-50 dark:bg-sky-900/20 rounded-lg group-hover:bg-gradient-to-br group-hover:from-sky-100 group-hover:to-blue-100 dark:group-hover:from-sky-900/30 dark:group-hover:to-blue-900/30 transition-all duration-200"
          >
            <InformationCircleIcon class="h-4 w-4 text-sky-600 dark:text-sky-400" />
          </div>
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">JSON Structure</span>
        </div>
        <div class="mt-3 text-sm space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-gray-600 dark:text-gray-400">Root Type:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">
              {{ metadata.jsonStructure.rootType }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-600 dark:text-gray-400">Homogeneous:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">
              {{ metadata.jsonStructure.isHomogeneous ? 'Yes' : 'No' }}
            </span>
          </div>
          <div v-if="metadata.jsonStructure.arrayInfo" class="flex justify-between items-center">
            <span class="text-gray-600 dark:text-gray-400">Array Elements:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">
              {{ formatNumber(metadata.jsonStructure.arrayInfo.elementCount) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!isUnsupportedFile && !metadata" class="text-center py-8">
      <p class="text-sm text-gray-500 dark:text-gray-400">No metadata available</p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">File metadata could not be loaded</p>
    </div>
  </div>
</template>
