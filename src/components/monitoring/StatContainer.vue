<template>
  <div class="relative mt-20 pb-5">
    <h3 class="text-xl font-semibold leading-6 text-gray-900">Stream Performance</h3>
  </div>

  <div v-if="!sourceStats && !targetStats" class="text-center py-8 text-gray-500">
    <p>No statistics available yet. Start the stream to see performance data.</p>
  </div>

  <div
    v-else
    class="grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-md md:grid-cols-2 md:divide-x md:divide-y-0"
  >
    <!-- Source Stats -->
    <div v-if="sourceStats" class="flex flex-col">
      <div class="px-6 py-4 bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-50">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <img
                :src="sourceIcon"
                alt="Source Reader"
                class="h-10 w-10 object-contain drop-shadow-sm"
              />
            </div>
            <div>
              <div class="text-lg font-bold text-gray-900">Source Reader</div>
              <div class="text-sm text-gray-600 font-medium">Data Producer</div>
            </div>
          </div>
          <StatusBadge :status="sourceStats.status" />
        </div>
      </div>

      <dl class="flex-1 px-6 py-5 space-y-4 bg-gradient-to-b from-white to-gray-50">
        <StatRow label="Produced" :value="formatNumber(sourceStats.counter)" :suffix="modeLabel" />
        <StatRow
          v-if="sourceStats.failedEvents > 0"
          label="Failed"
          :value="formatNumber(sourceStats.failedEvents)"
          suffix="rows"
          variant="error"
        />
        <StatRow label="Data Size" :value="formatDataSize(sourceStats.dataSize)" />
        <StatRow label="Rate" :value="formatDataSize(sourceStats.avgRate)" suffix="/s" />
        <StatRow label="Elapsed" :value="formatDuration(sourceStats.elapsed)" />
      </dl>
    </div>

    <!-- Target Stats -->
    <div v-if="targetStats" class="flex flex-col">
      <div class="px-6 py-4 bg-gradient-to-br from-green-50 via-emerald-100 to-teal-50">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <img
                :src="targetIcon"
                alt="Target Writer"
                class="h-10 w-10 object-contain drop-shadow-sm"
              />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-lg font-bold text-gray-900 flex items-center gap-2">
                Target Writer{{ targetStats.activeNodes > 1 ? 's' : '' }}
                <span
                  v-if="targetStats.activeNodes > 1"
                  class="inline-flex items-center rounded-full bg-green-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm"
                >
                  {{ targetStats.activeNodes }}×
                </span>
              </div>
              <div class="text-sm text-gray-600 font-medium">
                Data Consumer{{ targetStats.activeNodes > 1 ? 's' : '' }}
              </div>
            </div>
          </div>
          <StatusBadge :status="targetStats.status" />
        </div>
      </div>

      <dl class="flex-1 px-6 py-5 space-y-4 bg-gradient-to-b from-white to-gray-50">
        <StatRow label="Consumed" :value="formatNumber(targetStats.counter)" :suffix="modeLabel" />
        <StatRow
          v-if="targetStats.failedEvents > 0"
          label="Failed"
          :value="formatNumber(targetStats.failedEvents)"
          suffix="rows"
          variant="error"
        />
        <StatRow label="Data Size" :value="formatDataSize(targetStats.dataSize)" />
        <StatRow label="Avg Rate" :value="formatDataSize(targetStats.avgRate)" suffix="/s" />
        <StatRow label="Elapsed" :value="formatDuration(targetStats.elapsed)" />
      </dl>
    </div>
  </div>

  <!-- Pipeline Health Indicator -->
  <div
    v-if="sourceStats && targetStats"
    class="mt-6 p-5 bg-white rounded-lg shadow-md border border-gray-200"
  >
    <div class="flex items-center justify-between text-sm mb-3">
      <span class="text-gray-700 font-semibold">Pipeline Health</span>
      <span :class="pipelineHealthColor" class="font-bold text-base">
        {{ pipelineHealthText }}
      </span>
    </div>
    <div class="w-full bg-gray-200 rounded-full h-3 shadow-inner">
      <div
        :class="pipelineHealthBarColor"
        class="h-3 rounded-full transition-all duration-500 shadow-sm"
        :style="{ width: pipelineHealthPercentage + '%' }"
      ></div>
    </div>
    <div class="mt-2 text-xs text-gray-500 text-center">{{ pipelineHealthPercentage }}% synced</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMonitoringStore } from '@/stores/monitoring'
import { formatDataSize, formatDuration, formatNumber } from '@/utils/formats'
import StatusBadge from './StatusBadge.vue'
import StatRow from './StatRow.vue'

const store = useMonitoringStore()

const sourceStats = computed(() => store.aggregatedSourceStats)
const targetStats = computed(() => store.aggregatedTargetStats)

const modeLabel = computed(() => (store.streamConfig?.mode === 'convert' ? 'rows' : 'events'))

const sourceIcon = '/images/steps/source-step.svg'
const targetIcon = '/images/steps/target-step.svg'

// Pipeline health calculation
const pipelineHealthPercentage = computed(() => {
  if (!sourceStats.value || !targetStats.value) return 0

  const produced = sourceStats.value.counter
  const consumed = targetStats.value.counter

  if (produced === 0) return 0
  return Math.min(100, Math.round((consumed / produced) * 100))
})

const pipelineHealthText = computed(() => {
  const pct = pipelineHealthPercentage.value
  if (pct >= 95) return 'Excellent'
  if (pct >= 80) return 'Good'
  if (pct >= 60) return 'Fair'
  return 'Lagging'
})

const pipelineHealthColor = computed(() => {
  const pct = pipelineHealthPercentage.value
  if (pct >= 95) return 'text-green-600'
  if (pct >= 80) return 'text-blue-600'
  if (pct >= 60) return 'text-yellow-600'
  return 'text-red-600'
})

const pipelineHealthBarColor = computed(() => {
  const pct = pipelineHealthPercentage.value
  if (pct >= 95) return 'bg-green-500'
  if (pct >= 80) return 'bg-blue-500'
  if (pct >= 60) return 'bg-yellow-500'
  return 'bg-red-500'
})
</script>
