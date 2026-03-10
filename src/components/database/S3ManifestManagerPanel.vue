<template>
  <section class="ui-surface-panel p-4">
    <div class="flex flex-col gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Manifest workflow</h4>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Manage manifests in the context of the current S3 bucket or prefix.
          </p>
        </div>
        <BaseButton v-if="currentManifest" size="sm" variant="ghost" @click="clearCurrentManifest">
          Reset
        </BaseButton>
      </div>

      <div
        class="rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-3 text-xs text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100"
      >
        <span class="font-semibold">Context:</span>
        <span class="ml-1 break-all">{{
          contextUri || 'Select a bucket in the explorer first.'
        }}</span>
      </div>
    </div>

    <div
      v-if="pageError"
      class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
    >
      {{ pageError }}
    </div>

    <div
      v-if="!hasBucketContext"
      class="mt-4 rounded-xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
    >
      Navigate to an S3 bucket or prefix in the explorer to browse manifests and build one from the
      visible objects.
    </div>

    <div v-else class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div class="space-y-4">
        <div class="rounded-2xl border border-gray-200 dark:border-gray-700">
          <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h5 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Manifest files in current location
                </h5>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Open an existing manifest from the current bucket or prefix.
                </p>
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {{ manifestEntries.length }} files
              </span>
            </div>
          </div>

          <div class="max-h-[260px] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
            <button
              v-for="entry in manifestEntries"
              :key="entry.path"
              type="button"
              class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
              :class="
                entry.path === currentManifestPath
                  ? 'bg-teal-50 text-teal-900 dark:bg-teal-950/40 dark:text-teal-100'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              "
              data-test="context-manifest-entry"
              @click="loadManifest(entry.path)"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ entry.name }}
                </p>
                <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                  {{ entry.path }}
                </p>
              </div>
            </button>
            <div
              v-if="manifestEntries.length === 0"
              class="px-4 py-6 text-sm text-gray-500 dark:text-gray-400"
            >
              No manifest JSON files in the current location.
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-gray-200 dark:border-gray-700">
          <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h5 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Create from visible S3 objects
                </h5>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Use the objects visible in the explorer for this bucket or prefix.
                </p>
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {{ selectedObjectPaths.length }}/{{ dataEntries.length }} selected
              </span>
            </div>
          </div>

          <div class="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div class="rounded-xl border border-gray-200 dark:border-gray-700">
              <div
                class="max-h-[320px] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800"
              >
                <label
                  v-for="entry in dataEntries"
                  :key="entry.path"
                  class="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <input
                    v-model="selectedObjectPaths"
                    type="checkbox"
                    :value="entry.path"
                    data-test="context-object-checkbox"
                    class="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-900"
                  />
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {{ entry.name }}
                    </p>
                    <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                      {{ entry.path }}
                    </p>
                  </div>
                </label>
                <div
                  v-if="dataEntries.length === 0"
                  class="px-4 py-6 text-sm text-gray-500 dark:text-gray-400"
                >
                  No file objects in the current location.
                </div>
              </div>
            </div>

            <div
              class="space-y-3 rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-950/40"
            >
              <FormInput
                v-model="metadataRowCount"
                label="Estimated rows"
                type="number"
                min="0"
                placeholder="100000"
              />
              <FormInput
                v-model="metadataTotalSize"
                label="Total size bytes"
                type="number"
                min="0"
                placeholder="3145728"
              />
              <FormInput
                v-model="metadataCreatedAt"
                label="Created at"
                placeholder="2026-03-10T18:00:00Z"
              />
              <BaseButton
                class="w-full"
                :disabled="selectedObjectPaths.length === 0"
                :loading="createLoading"
                data-test="context-create-manifest"
                @click="createManifestFromSelection"
              >
                Create manifest from selection
              </BaseButton>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div
          class="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-950/40"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h5 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Current manifest
              </h5>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Filter, merge, preview, and save the currently loaded manifest.
              </p>
            </div>
          </div>

          <div
            v-if="currentManifestResponse"
            class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-950/30 dark:text-emerald-100"
          >
            <div class="flex flex-wrap gap-x-4 gap-y-2">
              <span><strong>Files:</strong> {{ currentManifestResponse.stats.file_count }}</span>
              <span><strong>S3:</strong> {{ currentManifestResponse.stats.s3_files }}</span>
              <span><strong>Version:</strong> {{ currentManifestResponse.stats.version }}</span>
              <span v-if="currentManifestResponse.stats.total_size_bytes">
                <strong>Total size:</strong>
                {{ formatDataSize(currentManifestResponse.stats.total_size_bytes) }}
              </span>
            </div>
          </div>

          <div class="mt-4 grid gap-3">
            <FormInput
              v-model="filterPattern"
              label="Filter pattern"
              placeholder="orders-*.parquet"
              helper-text="Matches against the manifest file basename."
            />
            <BaseButton
              :disabled="!currentManifest"
              :loading="filterLoading"
              data-test="context-filter-manifest"
              @click="applyFilter"
            >
              Filter current manifest
            </BaseButton>
          </div>

          <div
            class="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <h6 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Merge sources
                </h6>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Merge the current manifest with other manifest files from this location.
                </p>
              </div>
              <BaseButton
                size="sm"
                :disabled="!currentManifest || selectedMergePaths.length === 0"
                :loading="mergeLoading"
                data-test="context-merge-manifests"
                @click="mergeSelectedManifests"
              >
                Merge
              </BaseButton>
            </div>

            <div
              class="mt-3 max-h-[180px] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800"
            >
              <label
                v-for="entry in mergeCandidates"
                :key="entry.path"
                class="flex cursor-pointer items-start gap-3 px-1 py-3"
              >
                <input
                  v-model="selectedMergePaths"
                  type="checkbox"
                  :value="entry.path"
                  data-test="context-merge-checkbox"
                  class="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-900"
                />
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {{ entry.name }}
                  </p>
                  <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                    {{ entry.path }}
                  </p>
                </div>
              </label>
              <div
                v-if="mergeCandidates.length === 0"
                class="px-1 py-4 text-sm text-gray-500 dark:text-gray-400"
              >
                No additional manifest files available in this location.
              </div>
            </div>
          </div>

          <div class="mt-4 grid gap-3">
            <FormInput
              v-model="saveOutputPath"
              label="Save output path"
              :placeholder="suggestedManifestPath"
              helper-text="Persist the current manifest back to S3."
            />
            <BaseButton
              :disabled="!currentManifest || !saveOutputPath.trim()"
              :loading="saveLoading"
              data-test="context-save-manifest"
              @click="saveCurrentManifest"
            >
              Save manifest
            </BaseButton>
          </div>
        </div>

        <div class="rounded-2xl border border-gray-200 dark:border-gray-700">
          <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <h5 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Manifest entries</h5>
          </div>
          <div class="max-h-[360px] overflow-y-auto">
            <div
              v-for="filePath in currentManifest?.files || []"
              :key="filePath"
              class="border-b border-gray-100 px-4 py-3 text-sm text-gray-700 last:border-b-0 dark:border-gray-800 dark:text-gray-200"
            >
              <span class="break-all">{{ filePath }}</span>
            </div>
            <div
              v-if="!currentManifest?.files?.length"
              class="px-4 py-6 text-sm text-gray-500 dark:text-gray-400"
            >
              No manifest loaded yet.
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import FormInput from '@/components/base/FormInput.vue'
import { useCommonStore } from '@/stores/common'
import {
  createS3Manifest,
  filterS3Manifest,
  mergeS3Manifests,
  readS3Manifest,
  writeS3Manifest
} from '@/api/files'
import type { S3ManifestFile, S3ManifestResponse } from '@/types/s3'
import { formatDataSize } from '@/utils/formats'
import { manifestContainsLocalFiles, S3_MANIFEST_ONLY_S3_URIS_ERROR } from '@/utils/s3Manifest'

interface ExplorerEntry {
  name: string
  path: string
  type: 'file' | 'dir'
  size?: number
  children?: ExplorerEntry[]
}

interface Props {
  connectionId: string
  directoryPath?: string
  selectedPath?: string
  fileEntries?: ExplorerEntry[]
}

const props = defineProps<Props>()

const commonStore = useCommonStore()

const metadataRowCount = ref('')
const metadataTotalSize = ref('')
const metadataCreatedAt = ref('')
const selectedObjectPaths = ref<string[]>([])
const selectedMergePaths = ref<string[]>([])
const currentManifestResponse = ref<S3ManifestResponse | null>(null)
const currentManifestPath = ref('')
const saveOutputPath = ref('')
const filterPattern = ref('')
const pageError = ref('')

const createLoading = ref(false)
const filterLoading = ref(false)
const mergeLoading = ref(false)
const saveLoading = ref(false)

const currentManifest = computed<S3ManifestFile | null>(
  () => currentManifestResponse.value?.manifest || null
)
const contextUri = computed(() => resolveContextUri(props.selectedPath, props.directoryPath))
const parsedContext = computed(() => parseS3Uri(contextUri.value))
const hasBucketContext = computed(() => !!parsedContext.value?.bucket)
const contextPrefix = computed(() => parsedContext.value?.prefix || '')

const visibleEntries = computed(() =>
  resolveVisibleEntries(props.fileEntries || [], props.selectedPath, contextUri.value)
)

const manifestEntries = computed(() =>
  visibleEntries.value.filter(
    (entry) => entry.type === 'file' && entry.name.toLowerCase().endsWith('.json')
  )
)

const dataEntries = computed(() =>
  visibleEntries.value.filter(
    (entry) => entry.type === 'file' && !entry.name.toLowerCase().endsWith('.json')
  )
)

const mergeCandidates = computed(() =>
  manifestEntries.value.filter((entry) => entry.path !== currentManifestPath.value)
)

const suggestedManifestPath = computed(() => {
  const bucket = parsedContext.value?.bucket
  if (!bucket) {
    return 's3://bucket/manifests/generated.json'
  }

  const prefix = normalizePrefixForManifest(contextPrefix.value)
  return prefix
    ? `s3://${bucket}/${prefix}generated.json`
    : `s3://${bucket}/manifests/generated.json`
})

watch(
  () => contextUri.value,
  () => {
    selectedObjectPaths.value = []
    selectedMergePaths.value = []
    clearCurrentManifest()
    if (hasBucketContext.value) {
      saveOutputPath.value = suggestedManifestPath.value
    }
  },
  { immediate: true }
)

function parseS3Uri(uri: string): { bucket: string; prefix: string } | null {
  const match = uri.match(/^s3:\/\/([^/]+)(?:\/(.*))?$/)
  if (!match) return null
  return {
    bucket: match[1] || '',
    prefix: match[2] || ''
  }
}

function resolveContextUri(selectedPath?: string, directoryPath?: string): string {
  const selected = normalizeContextPath(selectedPath)
  if (selected) {
    return selected
  }
  return directoryPath?.startsWith('s3://') ? directoryPath : ''
}

function normalizeContextPath(path?: string): string {
  if (!path?.startsWith('s3://')) {
    return ''
  }
  const trimmed = path.replace(/\/+$/, '')
  const lastSegment = trimmed.split('/').pop() || ''
  if (lastSegment.includes('.')) {
    return getParentS3Path(trimmed)
  }
  return trimmed
}

function getParentS3Path(path: string): string {
  const trimmed = path.replace(/\/+$/, '')
  const withoutScheme = trimmed.slice('s3://'.length)
  const slashIndex = withoutScheme.indexOf('/')
  if (slashIndex === -1) {
    return trimmed
  }
  const bucket = withoutScheme.slice(0, slashIndex)
  const key = withoutScheme.slice(slashIndex + 1)
  const lastSlash = key.lastIndexOf('/')
  if (lastSlash === -1) {
    return `s3://${bucket}`
  }
  return `s3://${bucket}/${key.slice(0, lastSlash)}`
}

function resolveVisibleEntries(
  entries: ExplorerEntry[],
  selectedPath: string | undefined,
  resolvedContextUri: string
): ExplorerEntry[] {
  if (!selectedPath?.startsWith('s3://')) {
    return entries
  }

  const selectedEntry = findEntryByPath(entries, selectedPath)
  if (selectedEntry?.type === 'dir') {
    return selectedEntry.children || []
  }

  if (resolvedContextUri) {
    const parentEntry = findEntryByPath(entries, ensureFolderPath(resolvedContextUri))
    if (parentEntry?.type === 'dir') {
      return parentEntry.children || []
    }
  }

  return entries
}

function ensureFolderPath(path: string): string {
  if (!path.startsWith('s3://')) {
    return path
  }
  const parsed = parseS3Uri(path)
  if (!parsed?.prefix) {
    return path
  }
  return path.endsWith('/') ? path : `${path}/`
}

function findEntryByPath(entries: ExplorerEntry[], path: string): ExplorerEntry | null {
  for (const entry of entries) {
    if (entry.path === path) {
      return entry
    }
    if (entry.children?.length) {
      const found = findEntryByPath(entry.children, path)
      if (found) {
        return found
      }
    }
  }
  return null
}

function normalizePrefixForManifest(prefix: string): string {
  const trimmed = prefix.replace(/^\/+|\/+$/g, '')
  if (!trimmed) {
    return 'manifests/'
  }
  if (trimmed === 'manifests' || trimmed.endsWith('/manifests')) {
    return `${trimmed}/`
  }
  return `${trimmed}/manifests/`
}

function buildMetadata(): Record<string, unknown> | undefined {
  const metadata: Record<string, unknown> = {}
  if (metadataRowCount.value.trim()) {
    metadata.row_count = Number(metadataRowCount.value)
  }
  if (metadataTotalSize.value.trim()) {
    metadata.total_size = Number(metadataTotalSize.value)
  }
  if (metadataCreatedAt.value.trim()) {
    metadata.created_at = metadataCreatedAt.value.trim()
  }
  return Object.keys(metadata).length > 0 ? metadata : undefined
}

async function createManifestFromSelection() {
  if (!selectedObjectPaths.value.length) {
    return
  }

  createLoading.value = true
  pageError.value = ''
  try {
    const response = await createS3Manifest({
      files: selectedObjectPaths.value,
      metadata: buildMetadata()
    })
    currentManifestResponse.value = response
    currentManifestPath.value = ''
    if (!saveOutputPath.value.trim()) {
      saveOutputPath.value = suggestedManifestPath.value
    }
    commonStore.showNotification('Manifest created from visible S3 objects', 'success')
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Failed to create manifest'
  } finally {
    createLoading.value = false
  }
}

async function loadManifest(path: string) {
  pageError.value = ''
  try {
    const response = await readS3Manifest(path, props.connectionId)
    if (manifestContainsLocalFiles(response)) {
      throw new Error(S3_MANIFEST_ONLY_S3_URIS_ERROR)
    }
    currentManifestResponse.value = response
    currentManifestPath.value = path
    if (!saveOutputPath.value.trim()) {
      saveOutputPath.value = path
    }
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Failed to load manifest'
  }
}

async function applyFilter() {
  if (!currentManifest.value || !filterPattern.value.trim()) {
    return
  }

  filterLoading.value = true
  pageError.value = ''
  try {
    currentManifestResponse.value = await filterS3Manifest({
      pattern: filterPattern.value.trim(),
      manifest: currentManifest.value
    })
    commonStore.showNotification('Manifest filtered', 'success')
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Failed to filter manifest'
  } finally {
    filterLoading.value = false
  }
}

async function mergeSelectedManifests() {
  if (!currentManifest.value || selectedMergePaths.value.length === 0) {
    return
  }

  mergeLoading.value = true
  pageError.value = ''
  try {
    const loadedSources = await Promise.all(
      selectedMergePaths.value.map(async (path) => {
        const response = await readS3Manifest(path, props.connectionId)
        if (manifestContainsLocalFiles(response)) {
          throw new Error(S3_MANIFEST_ONLY_S3_URIS_ERROR)
        }
        return response.manifest
      })
    )

    currentManifestResponse.value = await mergeS3Manifests({
      manifests: [currentManifest.value, ...loadedSources],
      connectionId: props.connectionId
    })
    selectedMergePaths.value = []
    commonStore.showNotification('Manifests merged', 'success')
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Failed to merge manifests'
  } finally {
    mergeLoading.value = false
  }
}

async function saveCurrentManifest() {
  if (!currentManifest.value || !saveOutputPath.value.trim()) {
    return
  }

  saveLoading.value = true
  pageError.value = ''
  try {
    const response = await writeS3Manifest({
      connectionId: props.connectionId,
      manifest: currentManifest.value,
      outputPath: saveOutputPath.value.trim()
    })
    currentManifestResponse.value = response
    currentManifestPath.value = response.outputPath || saveOutputPath.value.trim()
    commonStore.showNotification('Manifest saved to S3', 'success')
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Failed to save manifest'
  } finally {
    saveLoading.value = false
  }
}

function clearCurrentManifest() {
  currentManifestResponse.value = null
  currentManifestPath.value = ''
  filterPattern.value = ''
  pageError.value = ''
  if (hasBucketContext.value) {
    saveOutputPath.value = suggestedManifestPath.value
  } else {
    saveOutputPath.value = ''
  }
}
</script>
