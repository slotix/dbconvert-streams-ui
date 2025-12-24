<template>
  <div class="relative mt-4 mb-3">
    <h2 class="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Stream Flow</h2>
    <!-- Status Summary Message -->
    <div
      v-if="statusMessage"
      :class="['mt-2 px-3 py-2 rounded-md text-sm font-medium', statusMessageClass]"
    >
      {{ statusMessage }}
    </div>
  </div>

  <!-- Source and Target Stats -->
  <div
    class="grid grid-cols-1 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden rounded-xl bg-white dark:bg-gray-850 shadow-lg dark:shadow-gray-900/30 lg:grid-cols-2 lg:divide-x lg:divide-y-0"
  >
    <!-- Source Stats - Blue Theme -->
    <div class="flex flex-col">
      <div
        :class="[
          'px-4 py-3 bg-gradient-to-br border-b',
          isRunning
            ? 'from-blue-50 via-blue-100 to-blue-50 border-blue-200 dark:from-blue-900/20 dark:via-blue-900/10 dark:to-blue-900/5 dark:border-blue-800/60'
            : 'from-gray-50 via-gray-100 to-gray-50 border-gray-100 dark:from-gray-900/20 dark:via-gray-900/10 dark:to-gray-900/5 dark:border-gray-800/70'
        ]"
      >
        <div class="flex items-center justify-between gap-3 sm:gap-4">
          <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div class="flex-shrink-0">
              <img
                :src="sourceIcon"
                alt="Source Reader"
                class="h-8 sm:h-10 w-8 sm:w-10 object-contain drop-shadow-sm"
                :class="{ 'opacity-50': !isRunning }"
              />
            </div>
            <div class="min-w-0">
              <div
                class="text-sm sm:text-base font-bold leading-tight"
                :class="
                  isRunning
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-gray-900 dark:text-gray-100'
                "
              >
                Source Reader
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400 font-medium">Data Producer</div>
            </div>
          </div>
          <div class="shrink-0">
            <StatusBadge v-if="sourceStats" :status="sourceStats.status" />
            <div
              v-else
              class="px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full border border-gray-300 dark:border-gray-700"
            >
              Ready
            </div>
          </div>
        </div>
      </div>

      <dl
        class="flex-1 px-4 py-4 space-y-3 bg-gradient-to-b from-white to-gray-50 dark:from-gray-850 dark:to-gray-900"
      >
        <StatRow
          label="Produced"
          :value="sourceStats ? formatNumber(sourceStats.counter) : '—'"
          :suffix="sourceStats ? modeLabel : ''"
        />
        <StatRow
          v-if="sourceStats && sourceStats.failedEvents > 0"
          label="Failed"
          :value="formatNumber(sourceStats.failedEvents)"
          suffix="rows"
          variant="error"
        />
        <StatRow
          label="Data Size"
          :value="sourceStats ? formatDataSizeWithUnit(sourceStats.dataSize).value : '—'"
          :suffix="sourceStats ? formatDataSizeWithUnit(sourceStats.dataSize).unit : ''"
        />
        <StatRow
          label="Rate"
          :value="sourceStats ? formatDataRateWithUnit(sourceStats.avgRate).value : '—'"
          :suffix="sourceStats ? formatDataRateWithUnit(sourceStats.avgRate).unit : ''"
        />
        <StatRow
          label="Elapsed"
          :value="sourceStats ? formatElapsedTimeWithUnit(sourceStats.elapsed).value : '—'"
          :suffix="sourceStats ? formatElapsedTimeWithUnit(sourceStats.elapsed).unit : ''"
        />
      </dl>
    </div>

    <!-- Target Stats - Emerald Theme -->
    <div class="flex flex-col">
      <div
        :class="[
          'px-4 py-3 bg-gradient-to-br border-b',
          isRunning
            ? 'from-emerald-50 via-emerald-100 to-emerald-50 border-emerald-200 dark:from-emerald-900/20 dark:via-emerald-900/10 dark:to-emerald-900/5 dark:border-emerald-800/60'
            : 'from-gray-50 via-gray-100 to-gray-50 border-gray-100 dark:from-gray-900/20 dark:via-gray-900/10 dark:to-gray-900/5 dark:border-gray-800/70'
        ]"
      >
        <div class="flex items-center justify-between gap-3 sm:gap-4">
          <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div class="flex-shrink-0">
              <img
                :src="targetIcon"
                alt="Target Writer"
                class="h-8 sm:h-10 w-8 sm:w-10 object-contain drop-shadow-sm"
                :class="{ 'opacity-50': !isRunning }"
              />
            </div>
            <div class="flex-1 min-w-0">
              <div
                class="text-sm sm:text-base font-bold leading-tight flex items-center justify-between gap-2"
                :class="
                  isRunning
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-gray-900 dark:text-gray-100'
                "
              >
                <span>
                  Target Writer{{
                    isRunning && targetStats && targetStats.activeNodes > 1 ? 's' : ''
                  }}
                </span>
                <span
                  v-if="isRunning && targetStats && targetStats.activeNodes > 1"
                  class="inline-flex items-center rounded-full bg-emerald-600 dark:bg-emerald-500 px-1.5 py-0.5 text-xs font-semibold text-white dark:text-gray-900 shadow-sm flex-shrink-0"
                >
                  {{ targetStats.activeNodes }}×
                </span>
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400 font-medium">
                Data Consumer{{
                  isRunning && targetStats && targetStats.activeNodes > 1 ? 's' : ''
                }}
              </div>
            </div>
          </div>
          <div class="flex-shrink-0">
            <StatusBadge v-if="targetStats" :status="targetStats.status" />
            <div
              v-else
              class="px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full border border-gray-300 dark:border-gray-700"
            >
              Ready
            </div>
          </div>
        </div>
      </div>

      <dl
        class="flex-1 px-4 py-4 space-y-3 bg-gradient-to-b from-white to-gray-50 dark:from-gray-850 dark:to-gray-900"
      >
        <StatRow
          label="Consumed"
          :value="targetStats ? formatNumber(targetStats.counter) : '—'"
          :suffix="targetStats ? modeLabel : ''"
        />
        <StatRow
          v-if="targetStats && targetStats.failedEvents > 0"
          label="Failed"
          :value="formatNumber(targetStats.failedEvents)"
          suffix="rows"
          variant="error"
        />
        <StatRow
          label="Data Size"
          :value="targetStats ? formatDataSizeWithUnit(targetStats.dataSize).value : '—'"
          :suffix="targetStats ? formatDataSizeWithUnit(targetStats.dataSize).unit : ''"
        />
        <StatRow
          label="Avg Rate"
          :value="targetStats ? formatDataRateWithUnit(targetStats.avgRate).value : '—'"
          :suffix="targetStats ? formatDataRateWithUnit(targetStats.avgRate).unit : ''"
        />
        <StatRow
          label="Elapsed"
          :value="targetStats ? formatElapsedTimeWithUnit(targetStats.elapsed).value : '—'"
          :suffix="targetStats ? formatElapsedTimeWithUnit(targetStats.elapsed).unit : ''"
        />
      </dl>
    </div>
  </div>

  <!-- Tables Section - Full Width Below -->
  <div class="mt-4">
    <TableStatsCard @compare-table="(tableName) => $emit('compare-table', tableName)" />
  </div>

  <!-- S3 Upload Section - Show for S3/GCS/Azure targets -->
  <div v-if="isS3Target" class="mt-4">
    <S3UploadStatsCard />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMonitoringStore } from '@/stores/monitoring'
import type { StreamConfig } from '@/types/streamConfig'
import {
  formatDataSizeWithUnit,
  formatDataRateWithUnit,
  formatElapsedTimeWithUnit,
  formatNumber
} from '@/utils/formats'
import StatusBadge from '@/components/common/StatusBadge.vue'
import StatRow from './StatRow.vue'
import TableStatsCard from './TableStatsCard.vue'
import S3UploadStatsCard from './S3UploadStatsCard.vue'

interface Props {
  stream: StreamConfig
  isRunning: boolean
  isStreamFinished?: boolean
  isStopped?: boolean
  isPaused?: boolean
  streamStatus?: string
}

const props = withDefaults(defineProps<Props>(), {
  isStreamFinished: false,
  isStopped: false,
  isPaused: false,
  streamStatus: ''
})

defineEmits<{
  (e: 'compare-table', tableName: string): void
}>()

const store = useMonitoringStore()

// Only show stats if they belong to the currently viewed stream config
// AND there is an active or recently finished stream
const isCurrentStreamData = computed(() => {
  const configMatches = store.streamConfig?.id === props.stream.id
  const hasStreamId = store.streamID !== ''
  return configMatches && hasStreamId
})

const sourceStats = computed(() => {
  if (!isCurrentStreamData.value) return null
  return store.aggregatedSourceStats
})

const targetStats = computed(() => {
  if (!isCurrentStreamData.value) return null
  return store.aggregatedTargetStats
})

const modeLabel = computed(() => (store.streamConfig?.mode === 'convert' ? 'rows' : 'events'))

// Check if target is S3/GCS/Azure cloud storage
const isS3Target = computed(() => {
  const spec = store.streamConfig?.target?.spec
  return !!(spec?.s3 || spec?.gcs || spec?.azure)
})

// Status message for completed/stopped/failed states
const statusMessage = computed(() => {
  if (!props.isStreamFinished) return null

  // Check for failed state
  const hasFailed = store.stats.some((stat) => stat.status === 'FAILED')
  if (hasFailed) {
    const currentStage = store.currentStage?.title || 'Unknown Stage'
    // Try to get first error message from logs
    const errorLog = store.logs
      .filter((log) => log.level === 'error')
      .slice(-5)
      .reverse()
      .find((log) => log.msg && log.msg.trim().length > 0)
    const errorMsg = errorLog?.msg || 'An error occurred'
    return `✖ Failed during: ${currentStage} — Error: ${errorMsg}`
  }

  // Check for stopped state
  if (props.isStopped) {
    const currentStage = store.currentStage?.title || 'Unknown Stage'
    // Try to find stop reason in logs (optional)
    const stopLog = store.logs
      .filter((log) => log.msg?.toLowerCase().includes('stop'))
      .slice(-3)
      .reverse()
      .find((log) => log.msg && !log.msg.includes('Stopped'))
    const reason = stopLog?.msg || ''
    return reason
      ? `⚠️ Stopped during: ${currentStage} — Reason: ${reason}`
      : `⚠️ Stopped during: ${currentStage}`
  }

  // Finished successfully
  return '✓ Completed all stages successfully'
})

const statusMessageClass = computed(() => {
  if (!props.isStreamFinished) return ''

  const hasFailed = store.stats.some((stat) => stat.status === 'FAILED')
  if (hasFailed) {
    return 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
  }

  if (props.isStopped) {
    return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800'
  }

  return 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
})

const sourceIcon = '/images/steps/source-step.svg'
const targetIcon = '/images/steps/target-step.svg'
</script>
