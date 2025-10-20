<template>
  <div class="space-y-6">
    <section class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
      <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">{{ connection.name }}</h2>
          <p class="text-sm text-gray-500" :title="currentPath">
            {{ currentPath || connection.path || 'No folder selected' }}
          </p>
        </div>
        <div class="flex flex-wrap gap-3 text-sm text-gray-600 items-center">
          <div v-if="stats.totalFiles > 0" class="flex items-center gap-1">
            <span class="font-medium">{{ stats.totalFiles }}</span>
            <span>files</span>
          </div>
          <div v-if="stats.totalFiles > 0" class="flex items-center gap-1">
            <span class="font-medium">{{ stats.totalSizeLabel }}</span>
            <span>total</span>
          </div>
          <div v-if="stats.formats.length" class="flex items-center gap-1">
            <span class="font-medium">{{ stats.formats.join(', ') }}</span>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            @click="emit('refresh')"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v6h6M20 20v-6h-6M5 19A9 9 0 015 5m14 14a9 9 0 010-14"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>
      <p v-if="loadError" class="mt-3 text-sm text-red-600">{{ loadError }}</p>
      <p v-else-if="!connection.path" class="mt-3 text-sm text-gray-500">
        This connection does not have a folder path configured yet. Edit the connection to choose a
        folder.
      </p>
      <p v-else-if="entries.length === 0" class="mt-3 text-sm text-gray-500">
        No supported files found in this folder.
      </p>
    </section>

    <section class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6 min-h-[520px]">
      <div
        v-if="!selectedEntry && entries.length > 0"
        class="text-sm text-gray-500 text-center py-16"
      >
        Select a file from the sidebar to preview its contents.
      </div>
      <div v-else-if="!selectedEntry" class="text-sm text-gray-500 text-center py-16">
        No files available to preview.
      </div>
      <div v-else>
        <header class="mb-4">
          <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">{{ selectedEntry.name }}</h3>
              <p class="text-sm text-gray-500" :title="selectedEntry.path">
                {{ selectedEntry.path }}
              </p>
            </div>
            <div class="flex flex-wrap gap-3 text-sm text-gray-600">
              <span v-if="selectedFormat" class="inline-flex items-center gap-1">
                <span class="font-medium">Format</span>
                <span>{{ selectedFormat.toUpperCase() }}</span>
              </span>
              <span class="inline-flex items-center gap-1">
                <span class="font-medium">Size</span>
                <span>{{ formatFileSize(selectedEntry.size || 0) }}</span>
              </span>
            </div>
          </div>
        </header>

        <div
          v-if="previewError"
          class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {{ previewError }}
        </div>
        <div
          v-else-if="isLoadingPreview"
          class="flex items-center justify-center py-16 text-sm text-gray-500"
        >
          <svg class="animate-spin h-5 w-5 mr-2 text-gray-400" viewBox="0 0 24 24" fill="none">
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
          Loading preview...
        </div>
        <div v-else-if="metadata && preview">
          <TabGroup>
            <div class="border-b border-gray-200">
              <nav class="-mb-px flex space-x-8" aria-label="Tabs">
                <TabList class="flex space-x-8">
                  <Tab
                    class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium ui-selected:border-blue-500 ui-selected:text-blue-600"
                  >
                    Data
                  </Tab>
                  <Tab
                    class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium ui-selected:border-blue-500 ui-selected:text-blue-600"
                  >
                    Structure
                  </Tab>
                </TabList>
                <div class="ml-auto flex items-center">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                    @click="refreshMetadata"
                  >
                    <ArrowPathIcon class="h-3 w-3" />
                    Refresh Metadata
                  </button>
                </div>
              </nav>
            </div>

            <TabPanels class="mt-4">
              <TabPanel>
                <!-- Data Tab Content -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="text-sm font-semibold text-gray-900">Data Preview</h4>
                    <p class="text-xs text-gray-500">
                      Showing first {{ preview.data.length }} row{{
                        preview.data.length === 1 ? '' : 's'
                      }}
                      of {{ formatNumber(preview.total) }}
                    </p>
                  </div>
                  <div class="overflow-x-auto border border-gray-200 rounded-md">
                    <table class="min-w-full divide-y divide-gray-200 text-sm">
                      <thead class="bg-gray-50">
                        <tr>
                          <th
                            v-for="column in preview.schema"
                            :key="column.name"
                            class="px-3 py-2 text-left font-medium text-gray-600"
                          >
                            {{ column.name }}
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-100 bg-white">
                        <tr v-if="preview.data.length === 0">
                          <td
                            :colspan="preview.schema.length"
                            class="px-3 py-6 text-center text-gray-500"
                          >
                            No data available in this file
                          </td>
                        </tr>
                        <tr v-for="(row, rowIndex) in preview.data" :key="rowIndex">
                          <td
                            v-for="column in preview.schema"
                            :key="column.name"
                            class="px-3 py-2 whitespace-pre-wrap text-gray-800"
                          >
                            {{ formatCell(row[column.name]) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabPanel>

              <TabPanel>
                <!-- Structure Tab Content -->
                <div class="space-y-6">
                  <!-- File Information -->
                  <section>
                    <h4 class="text-sm font-semibold text-gray-900 mb-3">File Information</h4>
                    <div class="grid gap-4 md:grid-cols-2">
                      <div
                        class="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700"
                      >
                        <p>
                          <span class="font-medium">Rows:</span>
                          {{ formatNumber(metadata.rowCount) }}
                        </p>
                        <p><span class="font-medium">Columns:</span> {{ metadata.columnCount }}</p>
                        <p v-if="selectedFormat">
                          <span class="font-medium">Format:</span>
                          {{ selectedFormat.toUpperCase() }}
                        </p>
                      </div>
                      <div
                        class="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700"
                      >
                        <p><span class="font-medium">Path:</span> {{ selectedEntry.path }}</p>
                        <p>
                          <span class="font-medium">Size:</span>
                          {{ formatFileSize(selectedEntry.size || 0) }}
                        </p>
                        <p v-if="metadata.samplingInfo">
                          <span class="font-medium">Sample size:</span>
                          {{ formatNumber(metadata.samplingInfo.rowsProcessed) }} rows ({{
                            metadata.samplingInfo.isComplete ? 'complete' : 'sampled'
                          }})
                        </p>
                      </div>
                    </div>
                  </section>

                  <!-- Columns Structure -->
                  <section>
                    <h4 class="text-sm font-semibold text-gray-900 mb-3">Columns</h4>
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
                            <tbody class="bg-white divide-y divide-gray-200">
                              <tr
                                v-for="col in metadata.columns"
                                :key="col.name"
                                class="hover:bg-gray-50"
                              >
                                <td
                                  class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                                >
                                  {{ col.name }}
                                </td>
                                <td
                                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 uppercase"
                                >
                                  {{ col.type }}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {{ col.nullable ? 'Yes' : 'No' }}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import type { Connection } from '@/types/connections'
import type { FileSystemEntry } from '@/api/fileSystem'
import filesApi from '@/api/files'
import type { FileDataResponse, FileMetadata } from '@/types/files'
import { getFileFormat, type FileFormat } from '@/utils/fileFormat'

interface Props {
  connection: Connection
  entries: FileSystemEntry[]
  currentPath: string
  selectedPath?: string | null
  loadError?: string
}

const props = withDefaults(defineProps<Props>(), {
  entries: () => [],
  currentPath: '',
  selectedPath: null,
  loadError: ''
})

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const metadata = ref<FileMetadata | null>(null)
const preview = ref<FileDataResponse | null>(null)
const previewError = ref('')
const isLoadingPreview = ref(false)

const selectedEntry = computed(
  () => props.entries.find((entry) => entry.path === props.selectedPath) || null
)

const selectedFormat = computed<FileFormat | null>(() => {
  if (!selectedEntry.value) return null
  return getFileFormat(selectedEntry.value.name)
})

const stats = computed(() => {
  const files = props.entries
  const totalSize = files.reduce((sum, entry) => sum + (entry.size || 0), 0)
  const uniqueFormats = Array.from(
    new Set(
      files
        .map((entry) => getFileFormat(entry.name)?.toUpperCase())
        .filter((format): format is string => Boolean(format))
    )
  )

  return {
    totalFiles: files.length,
    totalSize,
    totalSizeLabel: formatFileSize(totalSize),
    formats: uniqueFormats
  }
})

watch(
  () => props.selectedPath,
  async (path) => {
    if (!path || !selectedEntry.value) {
      metadata.value = null
      preview.value = null
      previewError.value = ''
      return
    }
    await loadPreview(selectedEntry.value)
  },
  { immediate: true }
)

async function loadPreview(entry: FileSystemEntry) {
  const format = getFileFormat(entry.name)
  if (!format) {
    previewError.value = 'This file format is not supported for preview yet.'
    metadata.value = null
    preview.value = null
    return
  }

  isLoadingPreview.value = true
  previewError.value = ''
  preview.value = null

  try {
    // Only fetch file data preview here
    // Metadata is fetched by parent component (DatabaseExplorerView) to avoid double-fetching
    const data = await filesApi.getFileData(entry.path, format, { limit: 200, skipCount: false })
    preview.value = data
  } catch (error: unknown) {
    previewError.value = (error as Error).message || 'Failed to load file preview'
  } finally {
    isLoadingPreview.value = false
  }
}

function refreshMetadata() {
  if (selectedEntry.value) {
    void loadPreview(selectedEntry.value)
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value)
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}
</script>
