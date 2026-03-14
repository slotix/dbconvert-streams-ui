<template>
  <div class="space-y-4">
    <StreamSettings />

    <TabGroup :selected-index="selectedViewIndex" @change="selectedViewIndex = $event">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h4 class="text-base font-semibold text-gray-900 dark:text-gray-100">
            Stream Configuration Summary
          </h4>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Final review before updating the stream
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400">View</span>
          <TabList class="ui-surface-muted ui-border-default flex rounded-lg p-0.5 border">
            <Tab v-slot="{ selected }" as="template">
              <button
                :class="[
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                  selected
                    ? 'ui-surface-raised text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                ]"
              >
                <Columns2 class="w-4 h-4" />
                Visual
              </button>
            </Tab>
            <Tab v-slot="{ selected }" as="template">
              <button
                :class="[
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                  selected
                    ? 'ui-surface-raised text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                ]"
              >
                <Code class="w-4 h-4" />
                JSON
              </button>
            </Tab>
          </TabList>
        </div>
      </div>

      <div class="ui-surface-panel ui-border-muted rounded-xl border">
        <TabPanels class="p-4">
          <!-- Visual View -->
          <TabPanel>
            <div>
              <section class="py-3 first:pt-0 last:pb-0">
                <div class="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h5
                      class="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide"
                    >
                      Flow Overview
                    </h5>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Review the source, operation, and output destination before updating the
                      stream.
                    </p>
                  </div>
                  <div
                    class="hidden xl:flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500"
                  >
                    <span>Source</span>
                    <ArrowRight class="w-3.5 h-3.5" />
                    <span>Operation</span>
                    <ArrowRight class="w-3.5 h-3.5" />
                    <span>Target</span>
                  </div>
                </div>

                <div
                  class="ui-border-default relative -mx-4 overflow-hidden border-y px-4 py-5 sm:px-5"
                >
                  <div
                    class="pointer-events-none absolute left-12 right-12 top-[4.2rem] hidden xl:block"
                  >
                    <div
                      class="h-px bg-gray-200 dark:bg-gray-700/60"
                    />
                  </div>

                  <div
                    class="relative grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_3rem_minmax(16rem,0.85fr)_3rem_minmax(0,1fr)] xl:items-start"
                  >
                    <section class="min-w-0 border-t-2 border-t-blue-500 dark:border-t-blue-400 pt-4">
                      <div class="flex items-start gap-3">
                        <div
                          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ui-surface-muted ui-border-default border text-gray-600 dark:text-gray-300"
                        >
                          <component :is="sourceKindIcon" class="w-5 h-5" />
                        </div>
                        <div class="min-w-0 flex-1">
                          <div class="flex flex-wrap items-center gap-2">
                            <p
                              class="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
                            >
                              Source
                            </p>
                            <span
                              class="ui-chip-muted ui-border-default inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                            >
                              {{ sourceTypeLabel }}
                            </span>
                          </div>
                          <p
                            class="mt-2 text-xl font-semibold leading-tight text-gray-900 dark:text-gray-100"
                          >
                            {{ sourceConnectionName }}
                          </p>
                          <p
                            v-if="sourceLocation"
                            class="mt-2 max-w-xl text-sm leading-6 text-gray-600 dark:text-gray-300 break-all"
                          >
                            {{ sourceLocation }}
                          </p>
                        </div>
                      </div>

                      <div class="mt-5 flex flex-wrap gap-2.5">
                        <div
                          v-for="fact in sourceSummaryFacts"
                          :key="fact.label"
                          class="ui-chip-muted ui-border-default inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
                        >
                          <span
                            class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                          >
                            {{ fact.label }}
                          </span>
                          <span class="font-medium text-gray-900 dark:text-gray-100">
                            {{ fact.value }}
                          </span>
                        </div>
                      </div>
                    </section>

                    <div
                      class="flex items-center justify-center text-gray-400 dark:text-gray-500 xl:pt-10"
                    >
                      <ArrowDown class="w-4 h-4 xl:hidden" />
                      <ArrowRight class="hidden xl:block w-4 h-4" />
                    </div>

                    <section class="min-w-0 xl:pt-2">
                      <p
                        class="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
                      >
                        Operation
                      </p>
                      <p class="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        {{ modeLabel }}
                      </p>
                      <p class="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                        {{ operationSummary }}
                      </p>

                      <dl class="mt-5 space-y-2.5">
                        <div
                          v-for="detail in operationSummaryFacts"
                          :key="detail.label"
                          class="ui-border-default flex items-baseline justify-between gap-4 border-b pb-2"
                        >
                          <dt
                            class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                          >
                            {{ detail.label }}
                          </dt>
                          <dd
                            class="text-right text-sm font-medium text-gray-900 dark:text-gray-100"
                          >
                            {{ detail.value }}
                          </dd>
                        </div>
                      </dl>
                    </section>

                    <div
                      class="flex items-center justify-center text-gray-400 dark:text-gray-500 xl:pt-10"
                    >
                      <ArrowDown class="w-4 h-4 xl:hidden" />
                      <ArrowRight class="hidden xl:block w-4 h-4" />
                    </div>

                    <section class="min-w-0 border-t-2 border-t-red-500 dark:border-t-red-400 pt-4">
                      <div class="flex items-start gap-3">
                        <div
                          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ui-surface-muted ui-border-default border text-gray-600 dark:text-gray-300"
                        >
                          <component :is="targetKindIcon" class="w-5 h-5" />
                        </div>
                        <div class="min-w-0 flex-1">
                          <div class="flex flex-wrap items-center gap-2">
                            <p
                              class="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
                            >
                              Target
                            </p>
                            <span
                              class="ui-chip-muted ui-border-default inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                            >
                              {{ targetTypeLabel }}
                            </span>
                          </div>
                          <p
                            class="mt-2 text-xl font-semibold leading-tight text-gray-900 dark:text-gray-100"
                          >
                            {{ targetConnectionName }}
                          </p>
                          <p
                            v-if="targetLocation"
                            class="mt-2 max-w-xl text-sm leading-6 text-gray-600 dark:text-gray-300 break-all"
                          >
                            {{ targetLocation }}
                          </p>
                        </div>
                      </div>

                      <div v-if="targetSummaryFacts.length > 0" class="mt-5 flex flex-wrap gap-2.5">
                        <div
                          v-for="fact in targetSummaryFacts"
                          :key="fact.label"
                          class="ui-chip-muted ui-border-default inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
                        >
                          <span
                            class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                          >
                            {{ fact.label }}
                          </span>
                          <span class="font-medium text-gray-900 dark:text-gray-100">
                            {{ fact.value }}
                          </span>
                        </div>
                      </div>

                      <dl
                        v-if="isS3Target && currentStreamConfig?.target?.spec?.s3?.upload"
                        class="mt-5 space-y-2 text-sm"
                      >
                        <div class="flex items-start justify-between gap-4">
                          <dt class="text-gray-600 dark:text-gray-400">S3 Bucket</dt>
                          <dd
                            class="max-w-[65%] text-right font-medium text-gray-900 dark:text-gray-100 break-all"
                          >
                            {{ currentStreamConfig.target.spec.s3.upload.bucket || 'Not set' }}
                          </dd>
                        </div>
                        <div
                          v-if="currentStreamConfig.target.spec.s3.upload.prefix"
                          class="flex items-start justify-between gap-4"
                        >
                          <dt class="text-gray-600 dark:text-gray-400">Prefix</dt>
                          <dd
                            class="max-w-[65%] text-right font-medium text-gray-900 dark:text-gray-100 break-all"
                          >
                            {{ currentStreamConfig.target.spec.s3.upload.prefix }}
                          </dd>
                        </div>
                      </dl>
                    </section>
                  </div>
                </div>
              </section>

              <section class="py-3">
                <h5
                  class="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3"
                >
                  {{ isCDCMode ? 'CDC Run Notes' : 'Estimated Load Preview' }}
                </h5>
                <template v-if="!isCDCMode">
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div class="ui-surface-muted rounded-md px-3 py-2.5">
                      <p
                        class="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400"
                      >
                        Estimated initial transfer
                      </p>
                      <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {{ estimatedRowsLabel }}
                      </p>
                    </div>
                    <div class="ui-surface-muted rounded-md px-3 py-2.5">
                      <p
                        class="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400"
                      >
                        Estimated size
                      </p>
                      <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {{ estimatedSizeLabel }}
                      </p>
                    </div>
                    <div class="ui-surface-muted rounded-md px-3 py-2.5">
                      <p
                        class="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400"
                      >
                        Estimated time
                      </p>
                      <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {{ estimatedDurationLabel }}
                      </p>
                    </div>
                  </div>
                  <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {{ estimatedLoadHint }}
                  </p>
                </template>
                <template v-else>
                  <div class="ui-surface-muted rounded-md px-3 py-2.5">
                    <p class="text-sm text-gray-700 dark:text-gray-300">
                      CDC streams run continuously and are stopped manually by the user.
                    </p>
                  </div>
                </template>
              </section>

              <section v-if="riskWarningMessage" class="py-3">
                <div class="flex items-start gap-2.5 rounded-lg border border-amber-300/50 px-3.5 py-3 dark:border-amber-600/30">
                  <AlertTriangle class="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400/70 mt-px" />
                  <p class="text-sm text-amber-800/80 dark:text-amber-200/70">
                    {{ riskWarningMessage }}
                  </p>
                </div>
              </section>

              <section v-if="customQueriesCount > 0" class="py-3 last:pb-0">
                <h5
                  class="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3"
                >
                  Custom Queries
                </h5>
                <div class="space-y-2">
                  <div
                    v-for="table in customQueryTables.slice(0, 5)"
                    :key="table.name"
                    class="text-sm"
                  >
                    <div class="flex items-start gap-2">
                      <span class="text-gray-600 dark:text-gray-400 font-mono">
                        {{ table.name }}:
                      </span>
                      <code
                        class="ui-surface-muted ui-border-default flex-1 text-xs text-gray-700 dark:text-gray-300 px-2 py-1 rounded border truncate"
                      >
                        {{ table.query }}
                      </code>
                    </div>
                  </div>
                  <div
                    v-if="customQueriesCount > 5"
                    class="text-xs text-gray-500 dark:text-gray-400 italic pt-1"
                  >
                    ... and {{ customQueriesCount - 5 }} more custom
                    {{ customQueriesCount - 5 > 1 ? 'queries' : 'query' }}
                  </div>
                </div>
              </section>
            </div>
          </TabPanel>

          <!-- JSON View -->
          <TabPanel>
            <JsonViewer
              :json="configJson"
              title="Stream Configuration"
              height="min(70vh, 720px)"
              compact
            />
          </TabPanel>
        </TabPanels>
      </div>
    </TabGroup>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/vue'
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Cloud,
  Code,
  Columns2,
  Database,
  Folder
} from 'lucide-vue-next'
import { apiClient } from '@/api/apiClient'
import { useStreamsStore, buildStreamPayload } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import type { Connection } from '@/types/connections'
import type { StreamRun } from '@/types/streamHistory'
import JsonViewer from '@/components/common/JsonViewer.vue'
import { getFileSpec, getFormatSpec } from '@/composables/useTargetSpec'
import { defaultCompressionForFileFormat } from '@/utils/specBuilder'
import { getConnectionKindFromSpec } from '@/types/specs'
import { formatDataSize, formatNumber, parseDataSize } from '@/utils/formats'
import StreamSettings from '@/components/settings/StreamSettings.vue'

interface Props {
  sourceConnectionId?: string | null
  targetConnectionId?: string | null
  sourceDatabase?: string | null
  targetDatabase?: string | null
  targetSchema?: string | null
  createStructure?: boolean
  copyData?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:can-proceed': [value: boolean]
}>()

const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()

const selectedViewIndex = ref(0)
const DEFAULT_ROWS_PER_TABLE_ESTIMATE = 75000
const DEFAULT_BYTES_PER_ROW_ESTIMATE = 700
const DEFAULT_THROUGHPUT_BYTES_PER_SECOND = 20 * 1024 * 1024
const MIN_DATA_BUNDLE_SIZE = 10
const MAX_DATA_BUNDLE_SIZE = 1000
const historyEstimatedRows = ref(0)
const historyEstimatedBytes = ref(0)
const historyEstimatedDurationMs = ref(0)

const currentStreamConfig = computed(() => streamsStore.currentStreamConfig)

const sourceConnection = computed<Connection | null>(() => {
  if (!props.sourceConnectionId) return null
  return connectionsStore.connectionByID(props.sourceConnectionId) || null
})

const targetConnection = computed<Connection | null>(() => {
  const targetId = currentStreamConfig.value?.target?.id || props.targetConnectionId
  if (!targetId) return null
  return connectionsStore.connectionByID(targetId) || null
})

function getTypeLabel(connection: Connection | null): string {
  if (!connection) return 'UNKNOWN'
  const kind = getConnectionKindFromSpec(connection.spec)
  if (kind === 'database') return (connection.type || 'database').toUpperCase()
  if (kind === 'snowflake') return 'SNOWFLAKE'
  if (kind === 'files') return 'FILES'
  if (kind === 's3') return 'S3'
  if (kind === 'gcs') return 'GCS'
  if (kind === 'azure') return 'AZURE'
  return 'UNKNOWN'
}

const sourceTypeLabel = computed(() => getTypeLabel(sourceConnection.value))
const targetTypeLabel = computed(() => getTypeLabel(targetConnection.value))

const sourceConnectionName = computed(() => sourceConnection.value?.name || 'Not selected')
const targetConnectionName = computed(() => targetConnection.value?.name || 'Not selected')

const sourceKind = computed(() => getConnectionKindFromSpec(sourceConnection.value?.spec))
const targetKind = computed(() => getConnectionKindFromSpec(targetConnection.value?.spec))

const sourceKindIcon = computed(() => {
  if (sourceKind.value === 'files') return Folder
  if (sourceKind.value === 's3' || sourceKind.value === 'gcs' || sourceKind.value === 'azure')
    return Cloud
  return Database
})

const targetKindIcon = computed(() => {
  if (targetKind.value === 'files') return Folder
  if (targetKind.value === 's3' || targetKind.value === 'gcs' || targetKind.value === 'azure')
    return Cloud
  return Database
})

const sourceLocation = computed(() => {
  if (sourceKind.value === 'files') {
    return sourceConnection.value?.spec?.files?.basePath || ''
  }
  if (sourceKind.value === 's3') {
    return props.sourceDatabase || ''
  }
  if (props.sourceDatabase) {
    return props.sourceDatabase
  }
  const firstConnection = currentStreamConfig.value?.source?.connections?.[0]
  return firstConnection?.database || firstConnection?.s3?.bucket || ''
})

const targetLocation = computed(() => {
  const pathSegments: string[] = []
  if (props.targetDatabase) pathSegments.push(props.targetDatabase)
  if (props.targetSchema) pathSegments.push(props.targetSchema)
  if (pathSegments.length > 0) return pathSegments.join(' / ')

  if (currentStreamConfig.value?.targetPath) return currentStreamConfig.value.targetPath
  return ''
})

const isFileSource = computed(() => sourceKind.value === 'files')
const isS3Source = computed(() => sourceKind.value === 's3')
const isFileTarget = computed(() => targetKind.value === 'files')
const isS3Target = computed(() => targetKind.value === 's3')

const tableCount = computed(() => {
  const files = currentStreamConfig.value?.files || []
  const selectedFilesCount = files.filter((file) => file.selected).length
  if (selectedFilesCount > 0) {
    return selectedFilesCount
  }

  const connections = currentStreamConfig.value?.source?.connections || []
  let count = 0
  for (const connection of connections) {
    if (connection.tables) {
      count += connection.tables.filter((table) => table.selected !== false).length
    }
  }
  return count
})

const modeLabel = computed(() => (currentStreamConfig.value?.mode === 'cdc' ? 'CDC' : 'Convert'))
const isCDCMode = computed(() => currentStreamConfig.value?.mode === 'cdc')

const structureModeLabel = computed(() => {
  if (typeof props.createStructure === 'boolean') {
    return props.createStructure ? 'Create structure' : 'Skip structure'
  }

  const options = currentStreamConfig.value?.structureOptions
  if (!options) {
    return 'Create'
  }

  const shouldCreateStructure =
    options.tables || options.indexes || options.foreignKeys || options.checkConstraints
  return shouldCreateStructure ? 'Create structure' : 'Skip structure'
})

const copyDataModeLabel = computed(() => {
  if (typeof props.copyData === 'boolean') {
    return props.copyData ? 'Copy data' : 'Skip data copy'
  }

  return currentStreamConfig.value?.skipData ? 'Skip data copy' : 'Copy data'
})

const fileFormatDisplay = computed(() => {
  const spec = currentStreamConfig.value?.target?.spec
  return getFileSpec(spec)?.fileFormat
})

const sourceManifestPath = computed(() => {
  const sourceConnections = currentStreamConfig.value?.source?.connections || []
  for (const connection of sourceConnections) {
    const manifestPath = connection.s3?.manifestPath?.trim()
    if (manifestPath) {
      return manifestPath
    }
  }
  return ''
})

const compressionDisplay = computed(() => {
  const spec = currentStreamConfig.value?.target?.spec
  const format = getFormatSpec(spec)
  return format?.compression || defaultCompressionForFileFormat(fileFormatDisplay.value)
})

interface SummaryDetailCard {
  label: string
  value: string
}

const selectedItemsLabel = computed(() => {
  if (sourceManifestPath.value) {
    return 'Manifest snapshot'
  }

  if (tableCount.value > 0) {
    const unit = isFileSource.value || isS3Source.value ? 'file' : 'table'
    const suffix = tableCount.value === 1 ? unit : `${unit}s`
    return `${formatNumber(tableCount.value)} ${suffix}`
  }

  if (isFileSource.value || isS3Source.value) {
    return 'Selection resolved at runtime'
  }

  return 'No tables selected'
})

const sourceSummaryFacts = computed<SummaryDetailCard[]>(() => {
  const cards: SummaryDetailCard[] = [{ label: 'Selection', value: selectedItemsLabel.value }]

  if (isS3Source.value) {
    cards.push({
      label: 'Source mode',
      value: sourceManifestPath.value ? 'Manifest snapshot' : 'Folders / Files'
    })
  }

  return cards
})

const operationSummary = computed(() => {
  if (isCDCMode.value) {
    return 'Continuous replication from source changes into the configured target.'
  }

  return 'One-time transfer using the selected data and structure options.'
})

const operationSummaryFacts = computed<SummaryDetailCard[]>(() => [
  { label: 'Data', value: copyDataModeLabel.value },
  { label: 'Structure', value: structureModeLabel.value },
  {
    label: isFileSource.value || isS3Source.value ? 'Files' : 'Tables',
    value: selectedItemsLabel.value
  },
  {
    label: 'Batch',
    value: `${currentStreamConfig.value?.source?.options?.dataBundleSize || 500} rows`
  }
])

const targetSummaryFacts = computed<SummaryDetailCard[]>(() => {
  const cards: SummaryDetailCard[] = []

  if ((isFileTarget.value || isS3Target.value) && fileFormatDisplay.value) {
    cards.push({ label: 'Format', value: fileFormatDisplay.value.toUpperCase() })
    cards.push({ label: 'Compression', value: compressionDisplay.value.toUpperCase() })
  }

  if (isS3Target.value && !isCDCMode.value) {
    cards.push({ label: 'Output manifest', value: 'Automatic' })
  }

  return cards
})

function getPositiveMetric(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0
  }
  return numeric
}

const selectedTableMetrics = computed(() => {
  let estimatedRows = 0
  let estimatedSizeBytes = 0
  let hasRows = false
  let hasSize = false

  for (const connection of currentStreamConfig.value?.source?.connections || []) {
    for (const table of connection.tables || []) {
      if (table.selected === false) {
        continue
      }

      const tableWithMetrics = table as {
        estimatedRows?: unknown
        estimatedSizeBytes?: unknown
      }

      const rowMetric = getPositiveMetric(tableWithMetrics.estimatedRows)
      const sizeMetric = getPositiveMetric(tableWithMetrics.estimatedSizeBytes)

      if (rowMetric > 0) {
        estimatedRows += rowMetric
        hasRows = true
      }
      if (sizeMetric > 0) {
        estimatedSizeBytes += sizeMetric
        hasSize = true
      }
    }
  }

  return {
    estimatedRows,
    estimatedSizeBytes,
    hasRows,
    hasSize
  }
})

async function loadHistoryEstimates() {
  const configId = currentStreamConfig.value?.id
  if (!configId) {
    historyEstimatedRows.value = 0
    historyEstimatedBytes.value = 0
    historyEstimatedDurationMs.value = 0
    return
  }

  try {
    const response = await apiClient.get(`/stream-configs/${configId}/history`)
    const runs = Array.isArray(response.data) ? (response.data as StreamRun[]) : []

    if (runs.length === 0) {
      historyEstimatedRows.value = 0
      historyEstimatedBytes.value = 0
      historyEstimatedDurationMs.value = 0
      return
    }

    const latestRun = runs.reduce((latest, run) =>
      run.timestamp > latest.timestamp ? run : latest
    )

    const rowsInserted = Number(latestRun.rowsInserted || 0)
    const rowsSkipped = Number(latestRun.rowsSkipped || 0)
    historyEstimatedRows.value = Math.max(0, Math.floor(rowsInserted + rowsSkipped))
    historyEstimatedBytes.value = Math.max(0, Math.floor(parseDataSize(latestRun.dataSize)))
    historyEstimatedDurationMs.value = Math.max(0, Math.floor(Number(latestRun.durationMs || 0)))
  } catch {
    historyEstimatedRows.value = 0
    historyEstimatedBytes.value = 0
    historyEstimatedDurationMs.value = 0
  }
}

watch(
  () => currentStreamConfig.value?.id,
  () => {
    void loadHistoryEstimates()
  },
  { immediate: true }
)

const estimatedRows = computed(() => {
  if (historyEstimatedRows.value > 0) {
    return historyEstimatedRows.value
  }

  const configuredRowLimit = currentStreamConfig.value?.limits?.numberOfEvents || 0
  if (configuredRowLimit > 0) {
    return configuredRowLimit
  }
  if (selectedTableMetrics.value.hasRows) {
    return Math.round(selectedTableMetrics.value.estimatedRows)
  }
  if (tableCount.value > 0) {
    return tableCount.value * DEFAULT_ROWS_PER_TABLE_ESTIMATE
  }
  return 0
})

const estimatedSizeBytes = computed(() => {
  if (historyEstimatedBytes.value > 0) {
    return historyEstimatedBytes.value
  }

  if (selectedTableMetrics.value.hasSize) {
    return Math.round(selectedTableMetrics.value.estimatedSizeBytes)
  }
  if (estimatedRows.value > 0) {
    return estimatedRows.value * DEFAULT_BYTES_PER_ROW_ESTIMATE
  }
  return 0
})

const estimatedDurationSeconds = computed(() => {
  if (isCDCMode.value) {
    return 0
  }
  if (historyEstimatedDurationMs.value > 0) {
    return Math.max(1, Math.round(historyEstimatedDurationMs.value / 1000))
  }

  if (estimatedSizeBytes.value <= 0) {
    return 0
  }
  return Math.max(1, Math.round(estimatedSizeBytes.value / DEFAULT_THROUGHPUT_BYTES_PER_SECOND))
})

const estimatedRowsLabel = computed(() => {
  if (estimatedRows.value <= 0) {
    return 'N/A'
  }
  return `~${formatNumber(estimatedRows.value)} rows`
})

const estimatedSizeLabel = computed(() => {
  if (estimatedSizeBytes.value <= 0) {
    return 'N/A'
  }
  return `~${formatDataSize(estimatedSizeBytes.value)}`
})

const estimatedDurationLabel = computed(() => {
  if (isCDCMode.value) {
    return 'Manual stop'
  }
  const seconds = estimatedDurationSeconds.value
  if (seconds <= 0) return 'N/A'
  if (historyEstimatedDurationMs.value > 0 && seconds < 10) {
    return `~${(historyEstimatedDurationMs.value / 1000).toFixed(2)}s`
  }
  if (seconds < 60) return `~${seconds}s`
  if (seconds < 3600) return `~${Math.round(seconds / 60)}m`
  return `~${Math.round(seconds / 3600)}h`
})

const estimatedLoadHint = computed(() => {
  if (isCDCMode.value) {
    return 'CDC streams run continuously and are typically stopped manually by the user.'
  }
  if (
    historyEstimatedRows.value > 0 ||
    historyEstimatedBytes.value > 0 ||
    historyEstimatedDurationMs.value > 0
  ) {
    return 'Based on the latest completed run for this stream.'
  }
  return 'Rough estimate from selected tables, configured limits, and a default throughput of 20 MB/s.'
})

const riskWarningMessage = computed(() => {
  const config = currentStreamConfig.value
  if (!config || config.mode !== 'convert') {
    return ''
  }

  const schemaPolicy =
    config.schemaPolicy ||
    config.target?.spec?.db?.schemaPolicy ||
    config.target?.spec?.snowflake?.schemaPolicy ||
    'fail_if_exists'
  const writeMode =
    config.writeMode ||
    config.target?.spec?.db?.writeMode ||
    config.target?.spec?.snowflake?.writeMode ||
    'fail_if_not_empty'

  const targetMayExist =
    schemaPolicy === 'validate_existing' ||
    schemaPolicy === 'create_missing_only' ||
    schemaPolicy === 'drop_and_recreate'
  const dataMayChangeExisting =
    writeMode === 'append' || writeMode === 'truncate_and_load' || writeMode === 'upsert'

  if (!targetMayExist && !dataMayChangeExisting) {
    return ''
  }

  return 'Target tables may already exist. Data may be appended or overwritten depending on structure settings.'
})

const customQueryTables = computed(() => {
  const connections = currentStreamConfig.value?.source?.connections || []
  const queries: Array<{ name: string; query: string }> = []
  for (const connection of connections) {
    if (connection.queries) {
      queries.push(...connection.queries)
    }
  }
  return queries
})

const customQueriesCount = computed(() => customQueryTables.value.length)

const configJson = computed(() => {
  const config = currentStreamConfig.value
  if (!config) return '{}'
  const refinedConfig = buildStreamPayload(config)
  return JSON.stringify(refinedConfig, null, 2)
})

const isDataBundleSizeValid = computed(() => {
  const value = currentStreamConfig.value?.source?.options?.dataBundleSize ?? 500
  if (!Number.isFinite(value)) {
    return false
  }
  return value >= MIN_DATA_BUNDLE_SIZE && value <= MAX_DATA_BUNDLE_SIZE
})

watch(
  isDataBundleSizeValid,
  (isValid) => {
    emit('update:can-proceed', isValid)
  },
  { immediate: true }
)
</script>

<style>
/* Component-specific styles only - code highlighting styles are centralized in src/styles/codeHighlighting.css */
</style>
