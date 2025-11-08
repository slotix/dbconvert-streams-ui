<template>
  <div class="relative mt-4 mb-3">
    <h2 class="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
      Stream Performance
    </h2>
  </div>

  <!-- Source and Target Stats -->
  <div
    class="grid grid-cols-1 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden rounded-xl bg-white dark:bg-gray-850 shadow-lg dark:shadow-gray-900/30 lg:grid-cols-2 lg:divide-x lg:divide-y-0"
  >
    <!-- Source Stats - Orange Theme -->
    <div class="flex flex-col">
      <div
        :class="[
          'px-4 py-3 bg-gradient-to-br border-b',
          isRunning
            ? 'from-orange-50 via-orange-100 to-orange-50 border-orange-200 dark:from-orange-900/20 dark:via-orange-900/10 dark:to-orange-900/5 dark:border-orange-800/60'
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
                    ? 'text-orange-700 dark:text-orange-300'
                    : 'text-gray-900 dark:text-gray-100'
                "
              >
                Source Reader
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400 font-medium">Data Producer</div>
            </div>
          </div>
          <div class="flex-shrink-0">
            <StatusBadge v-if="isRunning && sourceStats" :status="sourceStats.status" />
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
          :value="isRunning && sourceStats ? formatNumber(sourceStats.counter) : '—'"
          :suffix="isRunning && sourceStats ? modeLabel : ''"
          :class="{ 'opacity-50': !isRunning }"
        />
        <StatRow
          v-if="isRunning && sourceStats && sourceStats.failedEvents > 0"
          label="Failed"
          :value="formatNumber(sourceStats.failedEvents)"
          suffix="rows"
          variant="error"
        />
        <StatRow
          label="Data Size"
          :value="
            isRunning && sourceStats ? formatDataSizeWithUnit(sourceStats.dataSize).value : '—'
          "
          :suffix="
            isRunning && sourceStats ? formatDataSizeWithUnit(sourceStats.dataSize).unit : ''
          "
          :class="{ 'opacity-50': !isRunning }"
        />
        <StatRow
          label="Rate"
          :value="
            isRunning && sourceStats ? formatDataRateWithUnit(sourceStats.avgRate).value : '—'
          "
          :suffix="isRunning && sourceStats ? formatDataRateWithUnit(sourceStats.avgRate).unit : ''"
          :class="{ 'opacity-50': !isRunning }"
        />
        <StatRow
          label="Elapsed"
          :value="
            isRunning && sourceStats ? formatElapsedTimeWithUnit(sourceStats.elapsed).value : '—'
          "
          :suffix="
            isRunning && sourceStats ? formatElapsedTimeWithUnit(sourceStats.elapsed).unit : ''
          "
          :class="{ 'opacity-50': !isRunning }"
        />
      </dl>
    </div>

    <!-- Target Stats - Teal Theme -->
    <div class="flex flex-col">
      <div
        :class="[
          'px-4 py-3 bg-gradient-to-br border-b',
          isRunning
            ? 'from-teal-50 via-teal-100 to-teal-50 border-teal-200 dark:from-teal-900/20 dark:via-teal-900/10 dark:to-teal-900/5 dark:border-teal-800/60'
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
                    ? 'text-teal-700 dark:text-teal-300'
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
                  class="inline-flex items-center rounded-full bg-teal-600 dark:bg-teal-500 px-1.5 py-0.5 text-xs font-semibold text-white dark:text-gray-900 shadow-sm flex-shrink-0"
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
            <StatusBadge v-if="isRunning && targetStats" :status="targetStats.status" />
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
          :value="isRunning && targetStats ? formatNumber(targetStats.counter) : '—'"
          :suffix="isRunning && targetStats ? modeLabel : ''"
          :class="{ 'opacity-50': !isRunning }"
        />
        <StatRow
          v-if="isRunning && targetStats && targetStats.failedEvents > 0"
          label="Failed"
          :value="formatNumber(targetStats.failedEvents)"
          suffix="rows"
          variant="error"
        />
        <StatRow
          label="Data Size"
          :value="
            isRunning && targetStats ? formatDataSizeWithUnit(targetStats.dataSize).value : '—'
          "
          :suffix="
            isRunning && targetStats ? formatDataSizeWithUnit(targetStats.dataSize).unit : ''
          "
          :class="{ 'opacity-50': !isRunning }"
        />
        <StatRow
          label="Avg Rate"
          :value="
            isRunning && targetStats ? formatDataRateWithUnit(targetStats.avgRate).value : '—'
          "
          :suffix="isRunning && targetStats ? formatDataRateWithUnit(targetStats.avgRate).unit : ''"
          :class="{ 'opacity-50': !isRunning }"
        />
        <StatRow
          label="Elapsed"
          :value="
            isRunning && targetStats ? formatElapsedTimeWithUnit(targetStats.elapsed).value : '—'
          "
          :suffix="
            isRunning && targetStats ? formatElapsedTimeWithUnit(targetStats.elapsed).unit : ''
          "
          :class="{ 'opacity-50': !isRunning }"
        />
      </dl>
    </div>
  </div>

  <!-- Tables Section - Full Width Below -->
  <div class="mt-4">
    <TableStatsCard @compare-table="(tableName) => $emit('compare-table', tableName)" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMonitoringStore } from '@/stores/monitoring'
import {
  formatDataSizeWithUnit,
  formatDataRateWithUnit,
  formatElapsedTimeWithUnit,
  formatNumber
} from '@/utils/formats'
import StatusBadge from './StatusBadge.vue'
import StatRow from './StatRow.vue'
import TableStatsCard from './TableStatsCard.vue'

const props = defineProps<{
  isRunning: boolean
}>()

const emit = defineEmits<{
  (e: 'compare-table', tableName: string): void
}>()

const store = useMonitoringStore()

const sourceStats = computed(() => store.aggregatedSourceStats)
const targetStats = computed(() => store.aggregatedTargetStats)

const modeLabel = computed(() => (store.streamConfig?.mode === 'convert' ? 'rows' : 'events'))

const sourceIcon = '/images/steps/source-step.svg'
const targetIcon = '/images/steps/target-step.svg'
</script>
