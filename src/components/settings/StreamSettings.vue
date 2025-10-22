<template>
  <div>
    <!-- Header -->
    <div class="border-b border-gray-200 pb-5">
      <h3 class="text-lg font-medium leading-6 text-gray-900">Global Stream Settings</h3>
    </div>

    <!-- Form with improved organization -->
    <div class="mt-6 space-y-8">
      <!-- Basic Configuration Section -->
      <div class="bg-white">
        <h4 class="text-base font-medium text-gray-900 mb-4">Basic Configuration</h4>
        <div class="space-y-6">
          <!-- Mode Selection -->
          <div>
            <ModeButtons />
          </div>

          <!-- CDC Operations -->
          <div v-if="currentStreamConfig.mode === 'cdc'">
            <Operations v-model="operations" />
          </div>
        </div>
      </div>

      <!-- Performance & Monitoring Section -->
      <div class="bg-white">
        <h4 class="text-base font-medium text-gray-900 mb-4">Performance & Monitoring</h4>
        <div class="space-y-6">
          <!-- Data Bundle Size -->
          <div>
            <label for="dataBundleSize" class="block text-sm font-medium text-gray-700"
              >Data Bundle Size</label
            >
            <div class="mt-1">
              <input
                id="dataBundleSize"
                v-model.number="dataBundleSize"
                type="number"
                min="10"
                max="1000"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
                placeholder="Enter a value between 10 and 1000"
              />
            </div>
            <p class="mt-2 text-sm text-gray-500">Please enter a value between 10 and 1000.</p>
            <p
              v-if="dataBundleSize < 10 || dataBundleSize > 1000"
              class="mt-1 text-sm text-red-600"
            >
              Value must be between 10 and 1000.
            </p>
          </div>

          <!-- Reporting Intervals -->
          <div>
            <h5 class="text-sm font-medium text-gray-900 mb-3">Reporting Intervals (seconds)</h5>
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label
                  for="sourceReaderReportingInterval"
                  class="block text-sm font-medium text-gray-700"
                  >Source Reader</label
                >
                <div class="mt-1">
                  <input
                    id="sourceReaderReportingInterval"
                    v-model="reportingIntervalsSource"
                    type="number"
                    class="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
                  />
                </div>
              </div>
              <div>
                <label
                  for="targetReaderReportingInterval"
                  class="block text-sm font-medium text-gray-700"
                  >Target Writers</label
                >
                <div class="mt-1">
                  <input
                    id="targetReaderReportingInterval"
                    v-model="reportingIntervalsTarget"
                    type="number"
                    class="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Limits Section -->
      <div class="bg-white">
        <h4 class="text-base font-medium text-gray-900 mb-4">Execution Limits</h4>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label for="numberOfEvents" class="block text-sm font-medium text-gray-700"
              >Number of Events</label
            >
            <div class="mt-1">
              <input
                id="numberOfEvents"
                v-model="limitsNumberOfEvents"
                type="number"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
                placeholder="0 = no limit"
              />
            </div>
            <p class="mt-1 text-xs text-gray-500">
              Maximum number of events to process (0 = no limit)
            </p>
          </div>
          <div>
            <label for="elapsedTime" class="block text-sm font-medium text-gray-700"
              >Elapsed Time (seconds)</label
            >
            <div class="mt-1">
              <input
                id="elapsedTime"
                v-model="limitsElapsedTime"
                type="number"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
                placeholder="0 = no limit"
              />
            </div>
            <p class="mt-1 text-xs text-gray-500">
              Maximum execution time in seconds (0 = no limit)
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStreamsStore, defaultStreamConfigOptions } from '@/stores/streamConfig'
import ModeButtons from './ModeButtons.vue'
import Operations from './Operations.vue'
import { type StreamConfig } from '@/types/streamConfig'

const streamsStore = useStreamsStore()
const currentStreamConfig = streamsStore.currentStreamConfig as StreamConfig

const dataBundleSize = computed<number>({
  get: () => currentStreamConfig.dataBundleSize ?? defaultStreamConfigOptions.dataBundleSize,
  set: (newValue) => {
    const clampedValue = Math.min(Math.max(newValue, 10), 1000)
    currentStreamConfig.dataBundleSize = clampedValue
  }
})

const operations = computed<string[]>({
  get: () => currentStreamConfig.operations ?? defaultStreamConfigOptions.operations ?? [],
  set: (value) => {
    currentStreamConfig.operations = value
  }
})

const reportingIntervalsSource = computed<number>({
  get: () =>
    currentStreamConfig.reportingIntervals?.source ??
    defaultStreamConfigOptions.reportingIntervals.source,
  set: (value) => {
    if (currentStreamConfig.reportingIntervals) {
      currentStreamConfig.reportingIntervals.source = value
    }
  }
})
const reportingIntervalsTarget = computed<number>({
  get: () =>
    currentStreamConfig.reportingIntervals?.target ??
    defaultStreamConfigOptions.reportingIntervals.target,
  set: (value) => {
    if (currentStreamConfig.reportingIntervals) {
      currentStreamConfig.reportingIntervals.target = value
    }
  }
})

const limitsNumberOfEvents = computed<number>({
  get: () =>
    currentStreamConfig.limits?.numberOfEvents ?? defaultStreamConfigOptions.limits.numberOfEvents,
  set: (value) => {
    if (currentStreamConfig.limits) {
      currentStreamConfig.limits.numberOfEvents = value
    }
  }
})

const limitsElapsedTime = computed<number>({
  get: () =>
    currentStreamConfig.limits?.elapsedTime ?? defaultStreamConfigOptions.limits.elapsedTime,
  set: (value) => {
    if (currentStreamConfig.limits) {
      currentStreamConfig.limits.elapsedTime = value
    }
  }
})
</script>
