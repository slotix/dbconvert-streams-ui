<template>
  <div class="relative mt-20 pb-5">
    <h3 class="text-xl font-semibold leading-6 text-gray-900">Stream Performance</h3>
  </div>

  <div
    class="grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-md md:grid-cols-2 md:divide-x md:divide-y-0"
  >
    <!-- Source Stats -->
    <div class="flex flex-col">
      <div
        :class="[
          'px-6 py-4 bg-gradient-to-br',
          isRunning
            ? 'from-blue-50 via-blue-100 to-indigo-50'
            : 'from-gray-50 via-gray-100 to-gray-50'
        ]"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <img
                :src="sourceIcon"
                alt="Source Reader"
                class="h-10 w-10 object-contain drop-shadow-sm"
                :class="{ 'opacity-50': !isRunning }"
              />
            </div>
            <div>
              <div class="text-lg font-bold text-gray-900">Source Reader</div>
              <div class="text-sm text-gray-600 font-medium">Data Producer</div>
            </div>
          </div>
          <StatusBadge v-if="isRunning && sourceStats" :status="sourceStats.status" />
          <div
            v-else
            class="px-3 py-1 bg-white text-gray-600 text-xs font-medium rounded-md border border-gray-300"
          >
            Ready
          </div>
        </div>
      </div>

      <dl class="flex-1 px-6 py-5 space-y-4 bg-gradient-to-b from-white to-gray-50">
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
          :value="isRunning && sourceStats ? formatDataSize(sourceStats.dataSize) : '—'"
          :class="{ 'opacity-50': !isRunning }"
        />
        <StatRow
          label="Rate"
          :value="isRunning && sourceStats ? formatDataSize(sourceStats.avgRate) : '—'"
          :suffix="isRunning && sourceStats ? '/s' : ''"
          :class="{ 'opacity-50': !isRunning }"
        />
        <StatRow
          label="Elapsed"
          :value="isRunning && sourceStats ? formatDuration(sourceStats.elapsed) : '—'"
          :class="{ 'opacity-50': !isRunning }"
        />
      </dl>
    </div>

    <!-- Target Stats -->
    <div class="flex flex-col">
      <div
        :class="[
          'px-6 py-4 bg-gradient-to-br',
          isRunning
            ? 'from-green-50 via-emerald-100 to-teal-50'
            : 'from-gray-50 via-gray-100 to-gray-50'
        ]"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <img
                :src="targetIcon"
                alt="Target Writer"
                class="h-10 w-10 object-contain drop-shadow-sm"
                :class="{ 'opacity-50': !isRunning }"
              />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-lg font-bold text-gray-900 flex items-center gap-2">
                Target Writer{{
                  isRunning && targetStats && targetStats.activeNodes > 1 ? 's' : ''
                }}
                <span
                  v-if="isRunning && targetStats && targetStats.activeNodes > 1"
                  class="inline-flex items-center rounded-full bg-green-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm"
                >
                  {{ targetStats.activeNodes }}×
                </span>
              </div>
              <div class="text-sm text-gray-600 font-medium">
                Data Consumer{{
                  isRunning && targetStats && targetStats.activeNodes > 1 ? 's' : ''
                }}
              </div>
            </div>
          </div>
          <StatusBadge v-if="isRunning && targetStats" :status="targetStats.status" />
          <div
            v-else
            class="px-3 py-1 bg-white text-gray-600 text-xs font-medium rounded-md border border-gray-300"
          >
            Ready
          </div>
        </div>
      </div>

      <dl class="flex-1 px-6 py-5 space-y-4 bg-gradient-to-b from-white to-gray-50">
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
          :value="isRunning && targetStats ? formatDataSize(targetStats.dataSize) : '—'"
          :class="{ 'opacity-50': !isRunning }"
        />
        <StatRow
          label="Avg Rate"
          :value="isRunning && targetStats ? formatDataSize(targetStats.avgRate) : '—'"
          :suffix="isRunning && targetStats ? '/s' : ''"
          :class="{ 'opacity-50': !isRunning }"
        />
        <StatRow
          label="Elapsed"
          :value="isRunning && targetStats ? formatDuration(targetStats.elapsed) : '—'"
          :class="{ 'opacity-50': !isRunning }"
        />
      </dl>
    </div>
  </div>

  <!-- Pipeline Health Indicator -->
  <div
    :class="[
      'mt-6 p-5 bg-white rounded-lg shadow-md border',
      isRunning ? 'border-gray-200' : 'border-gray-200 opacity-50'
    ]"
  >
    <div class="flex items-center justify-between text-sm mb-3">
      <span class="text-gray-700 font-semibold">Pipeline Health</span>
      <span :class="isRunning ? pipelineHealthColor : 'text-gray-600'" class="font-bold text-base">
        {{ isRunning ? pipelineHealthText : 'Awaiting data' }}
      </span>
    </div>
    <div class="w-full bg-gray-200 rounded-full h-3 shadow-inner">
      <div
        :class="isRunning ? pipelineHealthBarColor : 'bg-gray-400'"
        class="h-3 rounded-full transition-all duration-500 shadow-sm"
        :style="{ width: isRunning ? pipelineHealthPercentage + '%' : '0%' }"
      ></div>
    </div>
    <div class="mt-2 text-xs text-gray-500 text-center">
      {{
        isRunning ? pipelineHealthPercentage + '% synced' : 'Start stream to track sync progress'
      }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMonitoringStore } from '@/stores/monitoring'
import { formatDataSize, formatDuration, formatNumber } from '@/utils/formats'
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
