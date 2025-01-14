<template>
  <div>
    <!-- Header -->
    <div class="border-b border-gray-200 pb-5">
      <h3 class="text-lg font-medium leading-6 text-gray-900">Global Stream Settings</h3>
    </div>

    <!-- Form -->
    <div class="mt-6 space-y-6">
      <!-- Stream Name -->
      <div>
        <label for="streamName" class="block text-sm font-medium text-gray-700">Stream Name</label>
        <div class="mt-1">
          <input id="streamName" v-model="streamName" type="text"
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
            placeholder="Enter custom name or leave blank for auto-generation" />
        </div>
        <p class="mt-2 text-sm text-gray-500">
          You can leave this field blank for an auto-generated name or enter a custom name.
        </p>
      </div>

      <!-- Mode Selection -->
      <div class="pt-2">
        <ModeButtons />
      </div>

      <!-- CDC Operations -->
      <div v-if="currentStreamConfig.mode === 'cdc'" class="pt-2">
        <Operations v-model="operations" />
      </div>

      <!-- Data Bundle Size -->
      <div>
        <label for="dataBundleSize" class="block text-sm font-medium text-gray-700">Data Bundle Size</label>
        <div class="mt-1">
          <input id="dataBundleSize" v-model.number="dataBundleSize" type="number" min="10" max="1000"
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
            placeholder="Enter a value between 10 and 1000" />
        </div>
        <p class="mt-2 text-sm text-gray-500">Please enter a value between 10 and 1000.</p>
        <p v-if="dataBundleSize < 10 || dataBundleSize > 1000" class="mt-1 text-sm text-red-600">
          Value must be between 10 and 1000.
        </p>
      </div>

      <!-- Reporting Intervals -->
      <div class="pt-2">
        <h3 class="text-sm font-medium text-gray-900 mb-4">Reporting Intervals (seconds)</h3>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label for="sourceReaderReportingInterval" class="block text-sm font-medium text-gray-700">Source
              Reader</label>
            <div class="mt-1">
              <input id="sourceReaderReportingInterval" v-model="reportingIntervalsSource" type="number"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm" />
            </div>
          </div>
          <div>
            <label for="targetReaderReportingInterval" class="block text-sm font-medium text-gray-700">Target
              Writers</label>
            <div class="mt-1">
              <input id="targetReaderReportingInterval" v-model="reportingIntervalsTarget" type="number"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm" />
            </div>
          </div>
        </div>
      </div>

      <!-- Checkboxes -->
      <div class="space-y-4">
        <div class="relative flex items-start">
          <div class="flex h-5 items-center">
            <input id="create-target-structure" v-model="createStructure" name="create-target-structure" type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-500" />
          </div>
          <div class="ml-3 text-sm">
            <label for="create-target-structure" class="font-medium text-gray-700">Create Structure on Target</label>
          </div>
        </div>

        <div class="relative flex items-start">
          <div class="flex h-5 items-center">
            <input id="skip-index-creation" v-model="skipIndexCreation" name="skip-index-creation" type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-500" />
          </div>
          <div class="ml-3 text-sm">
            <label for="skip-index-creation" class="font-medium text-gray-700">Skip Index Creation for All
              Tables</label>
          </div>
        </div>
      </div>

      <!-- Limits -->
      <div class="pt-2">
        <h3 class="text-sm font-medium text-gray-900 mb-4">Limits</h3>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label for="numberOfEvents" class="block text-sm font-medium text-gray-700">Number of Events</label>
            <div class="mt-1">
              <input id="numberOfEvents" v-model="limitsNumberOfEvents" type="number"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm" />
            </div>
          </div>
          <div>
            <label for="elapsedTime" class="block text-sm font-medium text-gray-700">Elapsed Time (seconds)</label>
            <div class="mt-1">
              <input id="elapsedTime" v-model="limitsElapsedTime" type="number"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm" />
            </div>
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
import { StreamConfig } from '@/types/streamConfig'

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

const createStructure = computed<boolean>({
  get: () =>
    currentStreamConfig.createStructure !== undefined
      ? currentStreamConfig.createStructure
      : defaultStreamConfigOptions.createStructure,
  set: (value) => {
    currentStreamConfig.createStructure = value
  }
})

const skipIndexCreation = computed<boolean>({
  get: () =>
    currentStreamConfig.skipIndexCreation !== undefined
      ? currentStreamConfig.skipIndexCreation
      : defaultStreamConfigOptions.skipIndexCreation,
  set: (value) => {
    currentStreamConfig.skipIndexCreation = value
  }
})

const streamName = computed({
  get: () => currentStreamConfig.name,
  set: (value) => {
    currentStreamConfig.name = value
  }
})
</script>
