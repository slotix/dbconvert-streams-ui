<script setup lang="ts">
import { computed, watch } from 'vue'
import { getFileSummary } from '@/api/fileSummary'
import type { FileSummaryResponse } from '@/types/fileSummary'
import type { FileSystemEntry } from '@/api/fileSystem'
import { getFileFormat } from '@/utils/fileFormat'
import SummaryPanel from '@/components/common/SummaryPanel.vue'
import SummarySampleControls from '@/components/common/SummarySampleControls.vue'
import SummaryExportActions from '@/components/common/SummaryExportActions.vue'
import UnsupportedFileMessage from '@/components/files/UnsupportedFileMessage.vue'
import { useSummarySampling } from '@/composables/useSummarySampling'
import { useSummaryFetch } from '@/composables/useSummaryFetch'

const props = defineProps<{
  fileEntry: FileSystemEntry
  connectionId: string
  isActive?: boolean
}>()

const fileFormat = computed(() => props.fileEntry.format || getFileFormat(props.fileEntry.name))
const isUnsupportedFile = computed(() => fileFormat.value === null)

const tabIdentityKey = computed(() => {
  const parts = [props.connectionId, props.fileEntry.path]
  return parts.map((p) => encodeURIComponent(p)).join('|')
})

const sampleStorageKey = computed(() => `dbconvert.summary.sample.file:${tabIdentityKey.value}`)
const {
  SAMPLE_PRESETS,
  selectedSamplePreset,
  customSamplePercent,
  effectiveSamplePercent,
  requestSamplePercent
} = useSummarySampling(sampleStorageKey)

const exportBaseName = computed(() => props.fileEntry.name || 'file')

const {
  loading,
  error,
  summary,
  showSlowHint,
  fetch: fetchSummary,
  cancel: cancelFetch,
  cleanup
} = useSummaryFetch<FileSummaryResponse>({
  fetcher: async (signal, forceRefresh) => {
    if (!fileFormat.value) {
      throw new Error('Unsupported file format')
    }
    return getFileSummary(
      {
        path: props.fileEntry.path,
        format: fileFormat.value,
        samplePercent: requestSamplePercent.value,
        connectionId: props.connectionId
      },
      signal,
      forceRefresh ? { refresh: true } : undefined
    )
  },
  onError: (e) => {
    console.error('Failed to fetch file summary:', e)
  }
})

async function refresh() {
  if (isUnsupportedFile.value) return
  await fetchSummary(true)
}

defineExpose({ refresh })

watch(
  () => tabIdentityKey.value,
  () => {
    if (props.isActive && !isUnsupportedFile.value) {
      fetchSummary(false)
    }
  }
)

watch(
  () => effectiveSamplePercent.value,
  () => {
    if (!props.isActive || isUnsupportedFile.value) return
    fetchSummary(false)
  }
)

watch(
  () => props.isActive,
  (active) => {
    if (active && !isUnsupportedFile.value) {
      fetchSummary(false)
      return
    }
    cleanup()
  },
  { immediate: true }
)
</script>

<template>
  <div class="p-4">
    <UnsupportedFileMessage v-if="isUnsupportedFile" :file-name="fileEntry.name" variant="summary" />

    <template v-else>
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SummarySampleControls
          v-model:selected-preset="selectedSamplePreset"
          v-model:custom-percent="customSamplePercent"
          :presets="SAMPLE_PRESETS"
          :loading="loading"
        />
        <SummaryExportActions
          :summary="summary"
          :export-base-name="exportBaseName"
          :disabled="loading || !summary"
        />
      </div>

      <SummaryPanel
        :summary="summary"
        :loading="loading"
        :error="error"
        :show-slow-hint="showSlowHint"
        @cancel="cancelFetch"
        @retry="() => fetchSummary(false)"
      />
    </template>
  </div>
</template>
