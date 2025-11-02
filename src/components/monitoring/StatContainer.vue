<template>
  <div class="relative mt-6 mb-6">
    <h2 class="text-2xl font-bold tracking-tight text-gray-900">Stream Performance</h2>
  </div>

  <div
    class="grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-lg md:grid-cols-2 md:divide-x md:divide-y-0"
  >
    <!-- Source Stats -->
    <div class="flex flex-col">
      <div
        :class="[
          'px-6 py-5 bg-gradient-to-br border-b border-gray-100',
          isRunning
            ? 'from-blue-50 via-blue-100 to-indigo-50'
            : 'from-gray-50 via-gray-100 to-gray-50'
        ]"
      >
        <div class="flex items-center justify-between gap-3 sm:gap-4">
          <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div class="flex-shrink-0">
              <img
                :src="sourceIcon"
                alt="Source Reader"
                class="h-10 sm:h-12 w-10 sm:w-12 object-contain drop-shadow-sm"
                :class="{ 'opacity-50': !isRunning }"
              />
            </div>
            <div class="min-w-0">
              <div class="text-sm sm:text-base font-bold text-gray-900 leading-tight">Source Reader</div>
              <div class="text-xs text-gray-600 font-medium">Data Producer</div>
            </div>
          </div>
          <div class="flex-shrink-0">
            <StatusBadge v-if="isRunning && sourceStats" :status="sourceStats.status" />
            <div
              v-else
              class="px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-full border border-gray-300"
            >
              Ready
            </div>
          </div>
        </div>
      </div>

      <dl class="flex-1 px-6 py-6 space-y-5 bg-gradient-to-b from-white to-gray-50">
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

    <!-- Target Stats -->
    <div class="flex flex-col">
      <div
        :class="[
          'px-6 py-5 bg-gradient-to-br border-b border-gray-100',
          isRunning
            ? 'from-green-50 via-emerald-100 to-teal-50'
            : 'from-gray-50 via-gray-100 to-gray-50'
        ]"
      >
        <div class="flex items-center justify-between gap-3 sm:gap-4">
          <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div class="flex-shrink-0">
              <img
                :src="targetIcon"
                alt="Target Writer"
                class="h-10 sm:h-12 w-10 sm:w-12 object-contain drop-shadow-sm"
                :class="{ 'opacity-50': !isRunning }"
              />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm sm:text-base font-bold text-gray-900 leading-tight flex items-center justify-between gap-2">
                <span>
                  Target Writer{{
                    isRunning && targetStats && targetStats.activeNodes > 1 ? 's' : ''
                  }}
                </span>
                <span
                  v-if="isRunning && targetStats && targetStats.activeNodes > 1"
                  class="inline-flex items-center rounded-full bg-green-600 px-1.5 py-0.5 text-xs font-semibold text-white shadow-sm flex-shrink-0"
                >
                  {{ targetStats.activeNodes }}×
                </span>
              </div>
              <div class="text-xs text-gray-600 font-medium">
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
              class="px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-full border border-gray-300"
            >
              Ready
            </div>
          </div>
        </div>
      </div>

      <dl class="flex-1 px-6 py-6 space-y-5 bg-gradient-to-b from-white to-gray-50">
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

const props = defineProps<{
  isRunning: boolean
}>()

const store = useMonitoringStore()

const sourceStats = computed(() => store.aggregatedSourceStats)
const targetStats = computed(() => store.aggregatedTargetStats)

const modeLabel = computed(() => (store.streamConfig?.mode === 'convert' ? 'rows' : 'events'))

const sourceIcon = '/images/steps/source-step.svg'
const targetIcon = '/images/steps/target-step.svg'
</script>
