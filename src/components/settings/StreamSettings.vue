<template>
  <div class="lg:px-10">
    <div class="px-2 flex items-center">
      <div class="flex-auto border-b border-gray-400 pb-5">
        <h3 class="text-base font-semibold leading-6 text-gray-900">Global Stream Settings</h3>
      </div>
    </div>
    <div class="px-2 overflow-x-auto mt-6">
      <div>
        <label for="streamName" class="block text-sm font-medium text-gray-700">Stream Name:</label>
        <input
          id="streamName"
          v-model="streamName"
          type="text"
          class="mt-1 focus:ring-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
          placeholder="Enter custom name or leave blank for auto-generation"
        />
        <p class="mt-2 text-sm text-gray-500">
          You can leave this field blank for an auto-generated name or enter a custom name.
        </p>
      </div>
      <ModeButtons class="mt-4" />
      <div v-if="currentStreamConfig.mode === 'cdc'">
        <div class="mt-2">
          <Operations v-model="operations" />
        </div>
      </div>
      <div class="mt-4">
        <label for="dataBundleSize" class="block text-sm font-medium text-gray-700"
          >Data Bundle Size:</label
        >
        <input
          id="dataBundleSize"
          v-model.number="dataBundleSize"
          type="number"
          min="0"
          max="1000"
          class="mt-1 focus:ring-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
          placeholder="Enter a value between 10 and 1000"
        />
        <p class="mt-2 text-sm text-gray-500">Please enter a value between 10 and 1000.</p>
        <p v-if="dataBundleSize < 10 || dataBundleSize > 1000" class="mt-1 text-sm text-red-600">
          Value must be between 10 and 1000.
        </p>
      </div>
      <h3 class="text-base mt-6 font-semibold leading-6 text-gray-900">
        Reporting Intervals (seconds)
      </h3>
      <div class="mt-2 grid grid-cols-1 gap-x-2 gap-y-8 sm:grid-cols-2">
        <div class="">
          <label for="elapsedTime" class="block text-sm font-medium text-gray-700"
            >Source Reader</label
          >
          <input
            id="sourceReaderReportingInterval"
            v-model="reportingIntervalsSource"
            type="number"
            class="mt-1 focus:ring-gray-500 focus:border-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label for="targetReaderReportingInterval" class="block text-sm font-medium text-gray-700"
            >Target Writers</label
          >
          <input
            id="targetReaderReportingInterval"
            v-model="reportingIntervalsTarget"
            type="number"
            class="mt-1 focus:ring-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
          />
        </div>
      </div>
      <div class="mt-4">
        <input
          id="create-target-structure"
          v-model="createStructure"
          name="create-target-structure"
          type="checkbox"
          class="h-4 w-4 text-sm rounded border-gray-300 text-gray-600 focus:ring-gray-600"
        />
        <label for="create-target-structure" class="text-sm font-medium text-gray-700 pl-2"
          >Create Structure on Target</label
        >
      </div>

      <div class="mt-4">
        <input
          id="skip-index-creation"
          v-model="skipIndexCreation"
          name="skip-index-creation"
          type="checkbox"
          class="h-4 w-4 text-sm rounded border-gray-300 text-gray-600 focus:ring-gray-600"
        />
        <label for="skip-index-creation" class="text-sm font-medium text-gray-700 pl-2">
          Skip Index Creation for All Tables
        </label>
      </div>
    </div>
    <div class="px-2">
      <h3 class="text-base mt-6 font-semibold leading-6 text-gray-900">Limits</h3>
      <div class="mt-2 grid grid-cols-1 gap-x-2 gap-y-8 sm:grid-cols-2">
        <div>
          <label for="numberOfEvents" class="block text-sm font-medium text-gray-700"
            >Number of Events:</label
          >
          <input
            id="numberOfEvents"
            v-model="limitsNumberOfEvents"
            type="number"
            class="mt-1 focus:ring-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label for="elapsedTime" class="block text-sm font-medium text-gray-700"
            >Elapsed Time (seconds):</label
          >
          <input
            id="elapsedTime"
            v-model="limitsElapsedTime"
            type="number"
            class="mt-1 focus:ring-gray-500 focus:border-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
          />
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
