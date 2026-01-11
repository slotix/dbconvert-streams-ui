<script setup lang="ts">
import { computed, watch } from 'vue'
import { getTableSummary } from '@/api/tableSummary'
import type { TableSummaryResponse } from '@/types/tableSummary'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import SummaryPanel from '@/components/common/SummaryPanel.vue'
import SummarySampleControls from '@/components/common/SummarySampleControls.vue'
import SummaryExportActions from '@/components/common/SummaryExportActions.vue'
import { useSummarySampling } from '@/composables/useSummarySampling'
import { useSummaryFetch } from '@/composables/useSummaryFetch'

const props = defineProps<{
  tableMeta: SQLTableMeta | SQLViewMeta
  connectionId: string
  database: string
  isView?: boolean
  isActive?: boolean
}>()

const tabIdentityKey = computed(() => {
  const schema = props.tableMeta.schema ?? ''
  const parts = [props.connectionId, props.database, schema, props.tableMeta.name]
  return parts.map((p) => encodeURIComponent(p)).join('|')
})

const sampleStorageKey = computed(() => `dbconvert.summary.sample:${tabIdentityKey.value}`)
const {
  SAMPLE_PRESETS,
  selectedSamplePreset,
  customSamplePercent,
  effectiveSamplePercent,
  requestSamplePercent
} = useSummarySampling(sampleStorageKey)

const exportBaseName = computed(() => {
  const schema = props.tableMeta.schema
  return schema ? `${schema}.${props.tableMeta.name}` : props.tableMeta.name
})

const {
  loading,
  error,
  summary,
  showSlowHint,
  fetch: fetchSummary,
  cancel: cancelFetch,
  cleanup
} = useSummaryFetch<TableSummaryResponse>({
  fetcher: async (signal, forceRefresh) => {
    return getTableSummary(
      {
        connectionId: props.connectionId,
        database: props.database,
        schema: props.tableMeta.schema,
        table: props.tableMeta.name,
        samplePercent: requestSamplePercent.value
      },
      signal,
      forceRefresh ? { refresh: true } : undefined
    )
  },
  onError: (e) => {
    console.error('Failed to fetch table summary:', e)
  }
})

async function refresh() {
  await fetchSummary(true)
}

defineExpose({ refresh })

watch(
  () => tabIdentityKey.value,
  () => {
    if (props.isActive) {
      fetchSummary(false)
    }
  }
)

watch(
  () => effectiveSamplePercent.value,
  () => {
    if (!props.isActive) return
    fetchSummary(false)
  }
)

watch(
  () => props.isActive,
  (active) => {
    if (active) {
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
  </div>
</template>
