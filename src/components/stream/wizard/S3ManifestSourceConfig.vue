<template>
  <div class="border-b border-gray-200 px-4 py-4 dark:border-gray-700">
    <div class="flex flex-col gap-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Manifest source</h4>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Pick a manifest JSON file to avoid recursive S3 listing for large datasets.
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <BaseButton size="sm" variant="secondary" @click="showPicker = true">
            Browse manifest
          </BaseButton>
          <BaseButton v-if="hasManifestPath" size="sm" variant="ghost" @click="clearManifestPath">
            Clear
          </BaseButton>
        </div>
      </div>

      <div class="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div class="min-w-0 flex-1">
          <FormInput
            v-model="manifestPath"
            label="Manifest path"
            :placeholder="manifestPlaceholder"
            helper-text="Accepts local paths or s3:// URIs. Manifest entries for S3 sources must all be S3 objects."
          />
        </div>
        <div class="flex shrink-0 items-center gap-2 pt-0 lg:pt-6">
          <BaseButton
            size="sm"
            :loading="isLoading"
            :disabled="!trimmedManifestPath"
            @click="handleValidateClick"
          >
            Validate
          </BaseButton>
        </div>
      </div>

      <p v-if="validationError" class="text-xs text-red-600 dark:text-red-300">
        {{ validationError }}
      </p>
      <p v-else-if="validationWarning" class="text-xs text-amber-700 dark:text-amber-300">
        {{ validationWarning }}
      </p>

      <div
        v-if="manifestResponse"
        class="rounded-md border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-900/20 dark:text-emerald-100"
      >
        <div class="flex flex-wrap gap-x-4 gap-y-1">
          <span><strong>Files:</strong> {{ manifestResponse.stats.file_count }}</span>
          <span><strong>S3:</strong> {{ manifestResponse.stats.s3_files }}</span>
          <span><strong>Local:</strong> {{ manifestResponse.stats.local_files }}</span>
          <span><strong>Version:</strong> {{ manifestResponse.stats.version }}</span>
          <span v-if="totalSizeLabel"><strong>Total size:</strong> {{ totalSizeLabel }}</span>
        </div>
      </div>

      <div
        v-if="hasManifestPath"
        class="rounded-md border border-sky-200 bg-sky-50/70 px-3 py-2 text-xs text-sky-900 dark:border-sky-700/60 dark:bg-sky-900/20 dark:text-sky-100"
      >
        Manifest mode is active for this source. Bucket browsing selections are ignored until the
        manifest path is cleared.
      </div>
    </div>

    <S3ManifestPickerModal
      v-model:is-open="showPicker"
      :connection-id="props.connectionId"
      :bucket="bucket"
      :lock-bucket="!!bucket"
      @select="handleManifestPicked"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import FormInput from '@/components/base/FormInput.vue'
import S3ManifestPickerModal from '@/components/stream/wizard/S3ManifestPickerModal.vue'
import { readS3Manifest, validateS3Path } from '@/api/files'
import { useStreamsStore } from '@/stores/streamConfig'
import { formatDataSize } from '@/utils/formats'
import { manifestContainsLocalFiles, S3_MANIFEST_ONLY_S3_URIS_ERROR } from '@/utils/s3Manifest'
import type { S3ManifestResponse } from '@/types/s3'

interface Props {
  connectionId: string
}

const props = defineProps<Props>()

const streamsStore = useStreamsStore()

const isLoading = ref(false)
const validationError = ref('')
const validationWarning = ref('')
const manifestResponse = ref<S3ManifestResponse | null>(null)
const lastValidatedPath = ref('')
const showPicker = ref(false)

const sourceConnection = computed(() =>
  streamsStore.currentStreamConfig?.source?.connections?.find(
    (connection) => connection.connectionId === props.connectionId
  )
)

const bucket = computed(() => sourceConnection.value?.s3?.bucket || '')
const manifestPlaceholder = computed(() =>
  bucket.value ? `s3://${bucket.value}/manifests/orders.json` : 's3://bucket/manifests/orders.json'
)

const manifestPath = computed({
  get: () => sourceConnection.value?.s3?.manifestPath || '',
  set: (value: string | number) => {
    updateManifestPath(String(value))
  }
})

const trimmedManifestPath = computed(() => manifestPath.value.trim())
const hasManifestPath = computed(() => trimmedManifestPath.value.length > 0)

const totalSizeLabel = computed(() => {
  const totalSize = manifestResponse.value?.manifest?.metadata?.total_size
  return typeof totalSize === 'number' ? formatDataSize(totalSize) : ''
})

watch(trimmedManifestPath, (nextPath) => {
  if (nextPath === lastValidatedPath.value) {
    return
  }
  manifestResponse.value = null
  validationError.value = ''
  validationWarning.value = ''
  streamsStore.setManifestValidationError(props.connectionId, null)
})

onMounted(() => {
  if (trimmedManifestPath.value) {
    void validateManifestPath()
  }
})

function updateManifestPath(value: string) {
  const streamConfig = streamsStore.currentStreamConfig
  if (!streamConfig?.source?.connections) {
    return
  }

  const normalizedValue = value.trim()
  streamConfig.source.connections = streamConfig.source.connections.map((connection) => {
    if (connection.connectionId !== props.connectionId) {
      return connection
    }

    const nextS3 = {
      ...(connection.s3 || { bucket: bucket.value }),
      ...(normalizedValue ? { manifestPath: normalizedValue } : {})
    }
    if (!normalizedValue) {
      delete nextS3.manifestPath
    }

    return {
      ...connection,
      s3: nextS3
    }
  })
}

function clearManifestPath() {
  updateManifestPath('')
  lastValidatedPath.value = ''
  manifestResponse.value = null
  validationError.value = ''
  validationWarning.value = ''
  streamsStore.setManifestValidationError(props.connectionId, null)
}

async function handleManifestPicked(path: string) {
  updateManifestPath(path)
  await validateManifestPath(path)
}

function handleValidateClick() {
  void validateManifestPath()
}

async function validateManifestPath(explicitPath?: string) {
  const path = explicitPath?.trim() || trimmedManifestPath.value
  if (!path) {
    validationError.value = 'Manifest path is required'
    manifestResponse.value = null
    streamsStore.setManifestValidationError(props.connectionId, validationError.value)
    return
  }

  isLoading.value = true
  validationError.value = ''
  validationWarning.value = ''

  try {
    if (path.startsWith('s3://')) {
      const validation = await validateS3Path(path)
      if (!validation.valid) {
        throw new Error(validation.reason)
      }
      if (validation.recommendedMode !== 'manifest') {
        validationWarning.value = validation.reason
      }
    }

    const response = await readS3Manifest(path, props.connectionId)
    manifestResponse.value = response
    lastValidatedPath.value = path

    if (manifestContainsLocalFiles(response)) {
      validationError.value = S3_MANIFEST_ONLY_S3_URIS_ERROR
      streamsStore.setManifestValidationError(props.connectionId, validationError.value)
      return
    }

    updateManifestPath(path)
    streamsStore.setManifestValidationError(props.connectionId, null)
  } catch (error) {
    validationError.value =
      error instanceof Error ? error.message : 'Failed to validate manifest path'
    manifestResponse.value = null
    lastValidatedPath.value = ''
    streamsStore.setManifestValidationError(props.connectionId, validationError.value)
  } finally {
    isLoading.value = false
  }
}
</script>
