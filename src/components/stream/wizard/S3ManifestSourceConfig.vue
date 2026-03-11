<template>
  <div v-if="variant === 'header'" class="flex items-center gap-2">
    <div
      class="inline-flex overflow-hidden rounded-md border border-gray-300/80 bg-white/30 dark:border-gray-600/80 dark:bg-gray-900/80"
    >
      <button
        type="button"
        class="border-r border-gray-300/80 px-4 py-1.5 text-sm font-semibold transition-colors dark:border-gray-600/80"
        :class="
          sourceMode === 'selection'
            ? 'bg-teal-950/80 text-gray-50 shadow-[inset_0_0_0_1px_rgba(20,184,166,0.55)]'
            : 'bg-transparent text-gray-600 hover:bg-gray-50/70 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100'
        "
        data-test="s3-source-mode-selection"
        @click="setSourceMode('selection')"
      >
        Files
      </button>
      <button
        type="button"
        class="px-4 py-1.5 text-sm font-semibold transition-colors"
        :class="
          sourceMode === 'manifest'
            ? 'bg-teal-950/80 text-gray-50 shadow-[inset_0_0_0_1px_rgba(20,184,166,0.55)]'
            : 'bg-transparent text-gray-600 hover:bg-gray-50/70 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100'
        "
        data-test="s3-source-mode-manifest"
        @click="setSourceMode('manifest')"
      >
        Manifest
      </button>
    </div>
  </div>

  <div
    v-else-if="sourceMode === 'manifest'"
    class="border-b border-gray-200/70 px-4 py-4 text-sm dark:border-gray-700/70"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <p class="font-medium text-gray-900 dark:text-gray-100">Manifest source</p>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Pick one manifest file and use its object list as the exact source snapshot.
        </p>
      </div>

      <button
        v-if="manifestPath"
        type="button"
        class="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        data-test="clear-manifest"
        @click="clearManifest"
      >
        Clear manifest
      </button>
    </div>

    <S3ManifestBrowser
      :connection-id="connectionId"
      :bucket="pickerBucket"
      :prefix="pickerPrefix"
      :selected-path="manifestPath"
      @select="applyManifestPath"
    />

    <div
      v-if="manifestValidationError"
      class="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
    >
      {{ manifestValidationError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import S3ManifestBrowser from '@/components/stream/wizard/S3ManifestBrowser.vue'
import { useStreamsStore } from '@/stores/streamConfig'
import type { S3SourceMode, StreamConnectionMapping } from '@/types/streamConfig'

interface Props {
  connectionId: string
  variant?: 'header' | 'panel'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'panel'
})

const streamsStore = useStreamsStore()

const sourceConnection = computed(() =>
  streamsStore.currentStreamConfig?.source?.connections?.find(
    (connection) => connection.connectionId === props.connectionId
  )
)

const manifestValidationError = computed(
  () => streamsStore.getManifestValidationError(props.connectionId) || ''
)

const manifestPath = computed(() => sourceConnection.value?.s3?.manifestPath?.trim() || '')
const sourceMode = computed<S3SourceMode>(() =>
  streamsStore.getS3SourceMode(props.connectionId, manifestPath.value)
)
const pickerBucket = computed(() => sourceConnection.value?.s3?.bucket || '')
const pickerPrefix = computed(() => {
  const currentPath = manifestPath.value
  if (!currentPath.startsWith('s3://')) {
    return ''
  }

  const withoutScheme = currentPath.slice(5)
  const slashIndex = withoutScheme.indexOf('/')
  if (slashIndex < 0) {
    return ''
  }

  const objectKey = withoutScheme.slice(slashIndex + 1)
  const lastSlash = objectKey.lastIndexOf('/')
  if (lastSlash < 0) {
    return ''
  }

  return objectKey.slice(0, lastSlash + 1)
})

function updateSourceConnection(
  transform: (connection: StreamConnectionMapping) => StreamConnectionMapping
) {
  const streamConfig = streamsStore.currentStreamConfig
  if (!streamConfig?.source?.connections) {
    return
  }

  streamConfig.source.connections = streamConfig.source.connections.map((connection) =>
    connection.connectionId === props.connectionId ? transform(connection) : connection
  )
}

function clearConnectionFileSelections(bucket: string) {
  if (!streamsStore.currentStreamConfig?.files) {
    return
  }

  const bucketPrefix = bucket ? `s3://${bucket}/` : ''
  streamsStore.currentStreamConfig.files = streamsStore.currentStreamConfig.files.filter((file) => {
    if (file.connectionId) {
      return file.connectionId !== props.connectionId
    }
    if (!bucketPrefix) {
      return true
    }
    return !file.path.startsWith(bucketPrefix)
  })
}

function setSourceMode(nextMode: S3SourceMode) {
  streamsStore.setS3SourceMode(props.connectionId, nextMode)
  updateSourceConnection((connection) => {
    const nextS3 = {
      bucket: connection.s3?.bucket || '',
      ...(connection.s3 || {})
    }

    if (nextMode === 'selection') {
      delete nextS3.manifestPath
    } else {
      delete nextS3.prefixes
      delete nextS3.objects
      clearConnectionFileSelections(nextS3.bucket)
    }

    return {
      ...connection,
      s3: nextS3
    }
  })

  streamsStore.setManifestValidationError(props.connectionId, null)
}

function applyManifestPath(path: string) {
  streamsStore.setS3SourceMode(props.connectionId, 'manifest')
  updateSourceConnection((connection) => {
    const nextS3 = {
      bucket: connection.s3?.bucket || '',
      ...(connection.s3 || {}),
      manifestPath: path
    }
    delete nextS3.prefixes
    delete nextS3.objects
    clearConnectionFileSelections(nextS3.bucket)

    return {
      ...connection,
      s3: nextS3
    }
  })

  streamsStore.setManifestValidationError(props.connectionId, null)
}

function clearManifest() {
  streamsStore.setS3SourceMode(props.connectionId, 'selection')
  updateSourceConnection((connection) => {
    const nextS3 = {
      bucket: connection.s3?.bucket || '',
      ...(connection.s3 || {})
    }
    delete nextS3.manifestPath

    return {
      ...connection,
      s3: nextS3
    }
  })

  streamsStore.setManifestValidationError(props.connectionId, null)
}
</script>
