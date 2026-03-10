<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <DisconnectedOverlay />

    <main class="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div class="mx-auto flex max-w-7xl flex-col gap-6">
        <section
          class="rounded-3xl border border-gray-200 bg-white px-6 py-6 shadow-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p
                class="text-xs font-semibold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400"
              >
                Manifest Manager
              </p>
              <h1 class="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-100">
                Build and manage S3 manifests
              </h1>
              <p class="mt-2 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
                Browse existing manifest JSON files, build new manifests from S3 objects, filter or
                merge them, then save the result back to S3.
              </p>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <FormSelect
                v-model="selectedConnectionId"
                label="S3 connection"
                :options="connectionOptions"
                placeholder="Select S3 connection"
              />
              <FormSelect
                v-model="selectedBucket"
                label="Bucket"
                :options="bucketOptions"
                placeholder="Select bucket"
              />
            </div>
          </div>
        </section>

        <section class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div class="space-y-6">
            <article
              class="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Existing manifests
                  </h2>
                  <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Open a manifest from the selected connection and bucket.
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <BaseButton
                    size="sm"
                    variant="secondary"
                    :disabled="!selectedConnectionId"
                    data-test="open-manifest-picker"
                    @click="openPicker('load')"
                  >
                    Browse manifests
                  </BaseButton>
                  <BaseButton
                    size="sm"
                    variant="ghost"
                    :disabled="!currentManifestPath"
                    @click="reloadCurrentManifest"
                  >
                    Reload
                  </BaseButton>
                </div>
              </div>

              <div
                class="mt-4 rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-950/50"
              >
                <p
                  class="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400"
                >
                  Active manifest
                </p>
                <p class="mt-2 break-all text-sm text-gray-700 dark:text-gray-200">
                  {{ currentManifestPath || 'No manifest selected' }}
                </p>
              </div>

              <div class="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <FormInput
                  v-model="saveOutputPath"
                  label="Save output path"
                  placeholder="s3://bucket/manifests/orders-generated.json"
                  helper-text="Save the current manifest state to S3."
                />
                <div class="flex items-end">
                  <BaseButton
                    class="w-full sm:w-auto"
                    :disabled="!selectedConnectionId || !currentManifest"
                    :loading="saveLoading"
                    data-test="save-manifest"
                    @click="saveCurrentManifest"
                  >
                    Save manifest
                  </BaseButton>
                </div>
              </div>
            </article>

            <article
              class="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Create from S3 objects
                  </h2>
                  <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Load objects from a bucket/prefix and turn the checked files into a manifest.
                  </p>
                </div>
                <BaseButton
                  size="sm"
                  variant="secondary"
                  :disabled="!selectedBucket"
                  :loading="objectsLoading"
                  data-test="load-objects"
                  @click="loadObjects"
                >
                  Load objects
                </BaseButton>
              </div>

              <div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div>
                  <FormInput
                    v-model="objectPrefix"
                    label="Prefix"
                    placeholder="data/orders/"
                    helper-text="Leave empty to scan the whole bucket. Objects are loaded recursively."
                  />

                  <div class="mt-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                      <div class="flex items-center justify-between gap-3">
                        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Objects
                        </h3>
                        <span class="text-xs text-gray-500 dark:text-gray-400">
                          {{ selectedObjectKeys.length }}/{{ availableObjects.length }} selected
                        </span>
                      </div>
                    </div>
                    <div
                      v-if="objectsLoading"
                      class="px-4 py-8 text-sm text-gray-500 dark:text-gray-400"
                    >
                      Loading S3 objects...
                    </div>
                    <div
                      v-else
                      class="max-h-[360px] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800"
                    >
                      <label
                        v-for="objectKey in availableObjects"
                        :key="objectKey"
                        class="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <input
                          v-model="selectedObjectKeys"
                          type="checkbox"
                          :value="objectKey"
                          data-test="object-checkbox"
                          class="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-900"
                        />
                        <div class="min-w-0">
                          <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                            {{ objectKey.split('/').pop() }}
                          </p>
                          <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                            {{ objectKey }}
                          </p>
                        </div>
                      </label>
                      <div
                        v-if="!availableObjects.length"
                        class="px-4 py-8 text-sm text-gray-500 dark:text-gray-400"
                      >
                        No objects loaded yet.
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  class="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-950/40"
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
                    :disabled="!selectedConnectionId || !selectedObjectKeys.length"
                    :loading="createLoading"
                    data-test="create-manifest"
                    @click="createManifestFromObjects"
                  >
                    Create manifest from selection
                  </BaseButton>
                </div>
              </div>
            </article>
          </div>

          <div class="space-y-6">
            <article
              class="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Current manifest
                  </h2>
                  <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Preview entries and run filter or merge operations on the current manifest.
                  </p>
                </div>
                <BaseButton
                  size="sm"
                  variant="ghost"
                  :disabled="!currentManifest"
                  @click="clearCurrentManifest"
                >
                  Reset
                </BaseButton>
              </div>

              <div
                v-if="pageError"
                class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
              >
                {{ pageError }}
              </div>

              <div
                v-if="currentManifestResponse"
                class="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-950/30 dark:text-emerald-100"
              >
                <div class="flex flex-wrap gap-x-4 gap-y-2">
                  <span
                    ><strong>Files:</strong> {{ currentManifestResponse.stats.file_count }}</span
                  >
                  <span><strong>S3:</strong> {{ currentManifestResponse.stats.s3_files }}</span>
                  <span><strong>Version:</strong> {{ currentManifestResponse.stats.version }}</span>
                  <span v-if="currentManifestResponse.stats.total_size_bytes"
                    ><strong>Total size:</strong>
                    {{ formatDataSize(currentManifestResponse.stats.total_size_bytes) }}</span
                  >
                </div>
              </div>

              <div class="mt-4 grid gap-3">
                <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <FormInput
                    v-model="filterPattern"
                    label="Filter pattern"
                    placeholder="orders-*.parquet"
                    helper-text="Matches against the manifest file basename."
                  />
                  <div class="flex items-end">
                    <BaseButton
                      class="w-full sm:w-auto"
                      :disabled="!currentManifest"
                      :loading="filterLoading"
                      data-test="filter-manifest"
                      @click="applyFilter"
                    >
                      Filter current manifest
                    </BaseButton>
                  </div>
                </div>

                <div
                  class="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-950/50"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Merge sources
                      </h3>
                      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Add one or more existing manifest files and merge them into the current
                        state.
                      </p>
                    </div>
                    <div class="flex gap-2">
                      <BaseButton
                        size="sm"
                        variant="secondary"
                        :disabled="!selectedConnectionId"
                        data-test="open-merge-picker"
                        @click="openPicker('merge')"
                      >
                        Add manifest
                      </BaseButton>
                      <BaseButton
                        size="sm"
                        :disabled="!selectedConnectionId || mergeSourcePaths.length === 0"
                        :loading="mergeLoading"
                        data-test="merge-manifests"
                        @click="mergeSelectedManifests"
                      >
                        Merge
                      </BaseButton>
                    </div>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <span
                      v-for="path in mergeSourcePaths"
                      :key="path"
                      class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-gray-700 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-700"
                    >
                      <span class="max-w-[220px] truncate">{{ path }}</span>
                      <button
                        type="button"
                        class="text-gray-400 hover:text-red-500"
                        @click="removeMergeSource(path)"
                      >
                        <X class="h-3.5 w-3.5" />
                      </button>
                    </span>
                    <span
                      v-if="mergeSourcePaths.length === 0"
                      class="text-xs text-gray-500 dark:text-gray-400"
                    >
                      No merge sources selected.
                    </span>
                  </div>
                </div>

                <div class="rounded-2xl border border-gray-200 dark:border-gray-700">
                  <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                    <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Manifest entries
                    </h3>
                  </div>
                  <div class="max-h-[420px] overflow-y-auto">
                    <div
                      v-for="filePath in currentManifest?.files || []"
                      :key="filePath"
                      class="border-b border-gray-100 px-4 py-3 text-sm text-gray-700 last:border-b-0 dark:border-gray-800 dark:text-gray-200"
                    >
                      <span class="break-all">{{ filePath }}</span>
                    </div>
                    <div
                      v-if="!currentManifest?.files?.length"
                      class="px-4 py-8 text-sm text-gray-500 dark:text-gray-400"
                    >
                      No manifest loaded yet.
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>

    <S3ManifestPickerModal
      v-model:is-open="showPicker"
      :connection-id="selectedConnectionId"
      @select="handlePickerSelection"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import BaseButton from '@/components/base/BaseButton.vue'
import FormInput from '@/components/base/FormInput.vue'
import FormSelect from '@/components/base/FormSelect.vue'
import DisconnectedOverlay from '@/components/common/DisconnectedOverlay.vue'
import S3ManifestPickerModal from '@/components/stream/wizard/S3ManifestPickerModal.vue'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import {
  createS3Manifest,
  filterS3Manifest,
  listS3Buckets,
  listS3Objects,
  mergeS3Manifests,
  readS3Manifest,
  writeS3Manifest
} from '@/api/files'
import type { S3ManifestFile, S3ManifestResponse } from '@/types/s3'
import { getConnectionKindFromSpec } from '@/types/specs'
import { formatDataSize } from '@/utils/formats'
import { manifestContainsLocalFiles, S3_MANIFEST_ONLY_S3_URIS_ERROR } from '@/utils/s3Manifest'

const connectionsStore = useConnectionsStore()
const commonStore = useCommonStore()

const selectedConnectionId = ref<string | null>(null)
const selectedBucket = ref<string | null>(null)
const buckets = ref<string[]>([])
const objectPrefix = ref('')
const availableObjects = ref<string[]>([])
const selectedObjectKeys = ref<string[]>([])
const metadataRowCount = ref('')
const metadataTotalSize = ref('')
const metadataCreatedAt = ref('')

const currentManifestResponse = ref<S3ManifestResponse | null>(null)
const currentManifestPath = ref('')
const mergeSourcePaths = ref<string[]>([])
const saveOutputPath = ref('')
const filterPattern = ref('')
const pageError = ref('')
const showPicker = ref(false)
const pickerMode = ref<'load' | 'merge'>('load')

const objectsLoading = ref(false)
const createLoading = ref(false)
const filterLoading = ref(false)
const mergeLoading = ref(false)
const saveLoading = ref(false)

const s3Connections = computed(() =>
  connectionsStore.connections.filter(
    (connection) => getConnectionKindFromSpec(connection.spec) === 's3'
  )
)

const connectionOptions = computed(() =>
  s3Connections.value.map((connection) => ({
    value: connection.id,
    label: connection.name || connection.id
  }))
)

const bucketOptions = computed(() =>
  buckets.value.map((bucketName) => ({
    value: bucketName,
    label: bucketName
  }))
)

const currentManifest = computed<S3ManifestFile | null>(
  () => currentManifestResponse.value?.manifest || null
)

watch(selectedConnectionId, async (connectionId) => {
  buckets.value = []
  selectedBucket.value = null
  availableObjects.value = []
  selectedObjectKeys.value = []
  mergeSourcePaths.value = []
  currentManifestResponse.value = null
  currentManifestPath.value = ''
  saveOutputPath.value = ''
  if (connectionId) {
    await loadBuckets()
  }
})

onMounted(async () => {
  if (connectionsStore.connections.length === 0) {
    await connectionsStore.refreshConnections()
  }
  if (!selectedConnectionId.value && s3Connections.value.length > 0) {
    selectedConnectionId.value = s3Connections.value[0].id
  }
})

async function loadBuckets() {
  if (!selectedConnectionId.value) {
    return
  }
  try {
    const response = await listS3Buckets(selectedConnectionId.value)
    buckets.value = response.buckets
    selectedBucket.value = response.buckets.includes(selectedBucket.value || '')
      ? selectedBucket.value
      : response.buckets[0] || null
    pageError.value = ''
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Failed to load buckets'
  }
}

async function loadObjects() {
  if (!selectedConnectionId.value || !selectedBucket.value) {
    return
  }

  objectsLoading.value = true
  pageError.value = ''
  try {
    const response = await listS3Objects({
      bucket: selectedBucket.value,
      prefix: objectPrefix.value.trim() || undefined,
      connectionId: selectedConnectionId.value,
      recursive: true,
      maxKeys: 1000
    })
    availableObjects.value = response.objects.map((object) => object.key)
    selectedObjectKeys.value = []
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Failed to load S3 objects'
  } finally {
    objectsLoading.value = false
  }
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

async function createManifestFromObjects() {
  if (
    !selectedConnectionId.value ||
    !selectedBucket.value ||
    selectedObjectKeys.value.length === 0
  ) {
    return
  }

  createLoading.value = true
  pageError.value = ''
  try {
    const files = selectedObjectKeys.value.map((key) => `s3://${selectedBucket.value}/${key}`)
    const response = await createS3Manifest({
      files,
      metadata: buildMetadata()
    })
    currentManifestResponse.value = response
    currentManifestPath.value = ''
    commonStore.showNotification('Manifest created from selected S3 objects', 'success')
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Failed to create manifest'
  } finally {
    createLoading.value = false
  }
}

async function reloadCurrentManifest() {
  if (!currentManifestPath.value || !selectedConnectionId.value) {
    return
  }
  await loadManifest(currentManifestPath.value)
}

async function loadManifest(path: string) {
  if (!selectedConnectionId.value) {
    return
  }
  pageError.value = ''
  try {
    const response = await readS3Manifest(path, selectedConnectionId.value)
    if (manifestContainsLocalFiles(response)) {
      throw new Error(S3_MANIFEST_ONLY_S3_URIS_ERROR)
    }
    currentManifestResponse.value = response
    currentManifestPath.value = path
    if (!saveOutputPath.value) {
      saveOutputPath.value = path
    }
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Failed to load manifest'
  }
}

function openPicker(mode: 'load' | 'merge') {
  pickerMode.value = mode
  showPicker.value = true
}

async function handlePickerSelection(path: string) {
  if (pickerMode.value === 'merge') {
    if (!mergeSourcePaths.value.includes(path)) {
      mergeSourcePaths.value = [...mergeSourcePaths.value, path]
    }
    return
  }
  await loadManifest(path)
}

function removeMergeSource(path: string) {
  mergeSourcePaths.value = mergeSourcePaths.value.filter((item) => item !== path)
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
  if (!selectedConnectionId.value || mergeSourcePaths.value.length === 0) {
    return
  }
  mergeLoading.value = true
  pageError.value = ''
  try {
    const loadedSources = await Promise.all(
      mergeSourcePaths.value.map(async (path) => {
        const response = await readS3Manifest(path, selectedConnectionId.value || undefined)
        if (manifestContainsLocalFiles(response)) {
          throw new Error(S3_MANIFEST_ONLY_S3_URIS_ERROR)
        }
        return response.manifest
      })
    )
    const manifests = currentManifest.value
      ? [currentManifest.value, ...loadedSources]
      : loadedSources
    currentManifestResponse.value = await mergeS3Manifests({
      manifests,
      connectionId: selectedConnectionId.value
    })
    mergeSourcePaths.value = []
    commonStore.showNotification('Manifests merged', 'success')
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Failed to merge manifests'
  } finally {
    mergeLoading.value = false
  }
}

async function saveCurrentManifest() {
  if (!selectedConnectionId.value || !currentManifest.value || !saveOutputPath.value.trim()) {
    return
  }
  saveLoading.value = true
  pageError.value = ''
  try {
    const response = await writeS3Manifest({
      connectionId: selectedConnectionId.value,
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
  saveOutputPath.value = ''
  filterPattern.value = ''
  mergeSourcePaths.value = []
  pageError.value = ''
}
</script>
