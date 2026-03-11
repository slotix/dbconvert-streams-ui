<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { AlertTriangle, FileJson, HardDrive, RefreshCw } from 'lucide-vue-next'
import type { FileSystemEntry } from '@/api/fileSystem'
import { readS3Manifest } from '@/api/files'
import type { S3ManifestMetadata, S3ManifestResponse } from '@/types/s3'
import { formatDataSize } from '@/utils/formats'

type ViewMode = 'data' | 'structure' | 'summary'

const props = defineProps<{
  entry: FileSystemEntry
  connectionId: string
  mode: ViewMode
}>()

const isLoading = ref(false)
const errorMessage = ref('')
const response = ref<S3ManifestResponse | null>(null)

const manifest = computed(() => response.value?.manifest ?? null)
const stats = computed(() => response.value?.stats ?? null)
const manifestMetadata = computed<S3ManifestMetadata>(() => manifest.value?.metadata ?? {})
const manifestFiles = computed(() => manifest.value?.files ?? [])
const rawManifestJson = computed(() =>
  manifest.value ? JSON.stringify(manifest.value, null, 2) : ''
)

const totalSizeLabel = computed(() => {
  const totalSize = stats.value?.total_size_bytes
  return typeof totalSize === 'number' ? formatDataSize(totalSize) : ''
})

const totalRowCountLabel = computed(() => {
  const totalRowCount = stats.value?.total_row_count
  return typeof totalRowCount === 'number' ? totalRowCount.toLocaleString() : ''
})

const createdAtLabel = computed(() => {
  const createdAt = stats.value?.created_at
  if (!createdAt) return ''
  const parsed = new Date(createdAt)
  if (Number.isNaN(parsed.getTime())) return createdAt
  return parsed.toLocaleString()
})

const structuredMetadataEntries = computed(() =>
  Object.entries(manifestMetadata.value).map(([key, value]) => ({
    key,
    value: formatMetadataValue(value),
    isComplex: isComplexMetadataValue(value)
  }))
)

async function refresh() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    response.value = await readS3Manifest(props.entry.path, props.connectionId)
  } catch (error) {
    response.value = null
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load manifest'
  } finally {
    isLoading.value = false
  }
}

function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value, null, 2)
}

function isComplexMetadataValue(value: unknown): boolean {
  return typeof value === 'object' && value !== null
}

defineExpose({ refresh })

watch(
  () => [props.entry.path, props.connectionId],
  () => {
    void refresh()
  }
)

onMounted(() => {
  void refresh()
})
</script>

<template>
  <div class="h-full overflow-auto bg-white p-4 dark:bg-gray-850">
    <div
      class="mx-auto flex max-w-6xl flex-col gap-4"
      :class="{ 'justify-center': isLoading || !!errorMessage }"
    >
      <div
        v-if="isLoading"
        class="flex min-h-[260px] items-center justify-center rounded-lg border border-gray-200 bg-white/80 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400"
      >
        <RefreshCw class="mr-2 h-4 w-4 animate-spin" />
        Loading manifest
      </div>

      <div
        v-else-if="errorMessage"
        class="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50/70 px-6 text-center dark:border-red-800/70 dark:bg-red-900/20"
      >
        <AlertTriangle class="mb-3 h-8 w-8 text-red-500 dark:text-red-300" />
        <p class="text-sm font-semibold text-red-700 dark:text-red-200">Failed to load manifest</p>
        <p class="mt-2 max-w-2xl text-sm text-red-600 dark:text-red-300">
          {{ errorMessage }}
        </p>
      </div>

      <template v-else-if="manifest && stats">
        <div
          class="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900/60"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <FileJson class="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Manifest preview
                </p>
              </div>
              <p class="mt-1 break-all text-xs text-gray-500 dark:text-gray-400">
                {{ entry.path }}
              </p>
            </div>
            <div
              class="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-200"
            >
              Version {{ stats.version }}
            </div>
          </div>
        </div>

        <div
          v-if="mode === 'data' || mode === 'summary'"
          class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/60"
        >
          <div class="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700">
            <div class="px-3 py-2.5 sm:px-4 sm:py-3">
              <p
                class="truncate text-[10px] uppercase tracking-[0.16em] text-gray-500 sm:text-xs dark:text-gray-400"
              >
                Files
              </p>
              <p class="mt-1 text-base font-semibold text-gray-900 sm:text-xl dark:text-gray-100">
                {{ stats.file_count.toLocaleString() }}
              </p>
            </div>
            <div class="px-3 py-2.5 sm:px-4 sm:py-3">
              <p
                class="truncate text-[10px] uppercase tracking-[0.16em] text-gray-500 sm:text-xs dark:text-gray-400"
              >
                Total size
              </p>
              <p class="mt-1 text-base font-semibold text-gray-900 sm:text-xl dark:text-gray-100">
                {{ totalSizeLabel || 'N/A' }}
              </p>
            </div>
            <div class="px-3 py-2.5 sm:px-4 sm:py-3">
              <p
                class="truncate text-[10px] uppercase tracking-[0.16em] text-gray-500 sm:text-xs dark:text-gray-400"
              >
                Rows
              </p>
              <p class="mt-1 text-base font-semibold text-gray-900 sm:text-xl dark:text-gray-100">
                {{ totalRowCountLabel || 'N/A' }}
              </p>
            </div>
          </div>
          <div
            v-if="stats.local_files > 0"
            class="border-t border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-700 sm:px-4 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-300"
          >
            {{ stats.local_files }} local {{ stats.local_files === 1 ? 'path' : 'paths' }} —
            manifest cannot be used as an S3 source
          </div>
        </div>

        <div
          v-if="mode === 'data'"
          class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/60"
        >
          <div
            class="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700"
          >
            <div>
              <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Referenced files</p>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Paths listed in this manifest.
              </p>
            </div>
            <div
              class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              <HardDrive class="h-3.5 w-3.5" />
              {{ manifestFiles.length.toLocaleString() }} items
            </div>
          </div>

          <div v-if="manifestFiles.length" class="max-h-[480px] overflow-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-800/80">
                <tr>
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
                  >
                    #
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
                  >
                    Path
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                <tr v-for="(filePath, index) in manifestFiles" :key="filePath">
                  <td class="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {{ index + 1 }}
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    <code class="break-all text-xs sm:text-sm">{{ filePath }}</code>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
            This manifest has no file entries.
          </div>
        </div>

        <div
          v-if="mode === 'structure'"
          class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
        >
          <div
            class="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/60"
          >
            <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Metadata</p>
            </div>
            <div
              v-if="structuredMetadataEntries.length"
              class="divide-y divide-gray-200 dark:divide-gray-800"
            >
              <div v-for="entry in structuredMetadataEntries" :key="entry.key" class="px-4 py-3">
                <p class="text-xs uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                  {{ entry.key }}
                </p>
                <pre
                  v-if="entry.isComplex"
                  class="mt-2 whitespace-pre-wrap break-words rounded-md bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-950 dark:text-gray-200"
                  >{{ entry.value }}</pre
                >
                <p v-else class="mt-2 break-words text-sm text-gray-900 dark:text-gray-100">
                  {{ entry.value }}
                </p>
              </div>
            </div>
            <div v-else class="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
              No manifest metadata is present.
            </div>
          </div>

          <div
            class="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/60"
          >
            <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Raw manifest</p>
            </div>
            <pre
              class="max-h-[520px] overflow-auto px-4 py-4 text-xs text-gray-700 dark:text-gray-200"
              >{{ rawManifestJson }}</pre
            >
          </div>
        </div>

        <div
          v-if="mode === 'summary'"
          class="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/60"
        >
          <div class="grid gap-4 px-4 py-4 md:grid-cols-2">
            <div>
              <p class="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                Manifest path
              </p>
              <p class="mt-2 break-all text-sm text-gray-900 dark:text-gray-100">
                {{ entry.path }}
              </p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                Created at
              </p>
              <p class="mt-2 text-sm text-gray-900 dark:text-gray-100">
                {{ createdAtLabel || 'N/A' }}
              </p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                Local paths
              </p>
              <p class="mt-2 text-sm text-gray-900 dark:text-gray-100">
                {{ stats.local_files.toLocaleString() }}
              </p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                Metadata fields
              </p>
              <p class="mt-2 text-sm text-gray-900 dark:text-gray-100">
                {{ structuredMetadataEntries.length.toLocaleString() }}
              </p>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
