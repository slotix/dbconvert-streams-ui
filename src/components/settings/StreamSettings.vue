<template>
  <div>
    <!-- Form with improved organization -->
    <div class="mt-6 space-y-8">
      <!-- Output Configuration Section (only for file targets) -->
      <div v-if="isFileTarget" class="bg-white">
        <h4 class="text-base font-medium text-gray-900 mb-4">Output Configuration</h4>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <!-- File Format Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              File Format <span class="text-red-500">*</span>
            </label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="format in fileFormats"
                :key="format.value"
                type="button"
                :class="[
                  'px-4 py-2 rounded-md text-sm font-medium border transition-all duration-150',
                  targetFileFormat === format.value
                    ? 'bg-teal-600 text-white border-teal-600 ring-2 ring-teal-500 ring-offset-1'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                ]"
                @click="selectFormat(format.value)"
              >
                {{ format.label }}
              </button>
            </div>
            <p class="mt-2 text-sm text-gray-500">{{ formatDescription }}</p>
          </div>

          <!-- Compression Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Compression <span class="text-red-500">*</span>
            </label>
            <select
              v-model="compressionType"
              class="block w-full rounded-md border-gray-300 shadow-sm text-gray-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 sm:text-sm"
            >
              <option value="zstd">ZSTD (.zst) - Recommended</option>
              <option value="gzip">GZIP (.gz) - Legacy Compatibility</option>
              <option value="uncompressed">Uncompressed - No Compression</option>
            </select>
            <p class="mt-2 text-sm text-gray-500">{{ compressionDescription }}</p>
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
                class="block w-full rounded-md border-gray-300 shadow-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 sm:text-sm"
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
                    class="block w-full rounded-md border-gray-300 shadow-sm text-gray-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 sm:text-sm"
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
                    class="block w-full rounded-md border-gray-300 shadow-sm text-gray-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 sm:text-sm"
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
                class="block w-full rounded-md border-gray-300 shadow-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 sm:text-sm"
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
                class="block w-full rounded-md border-gray-300 shadow-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 sm:text-sm"
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
import { useConnectionsStore } from '@/stores/connections'
import { type StreamConfig } from '@/types/streamConfig'

const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()
const currentStreamConfig = streamsStore.currentStreamConfig as StreamConfig

const fileFormats = [
  { value: 'csv' as const, label: 'CSV' },
  { value: 'jsonl' as const, label: 'JSONL' },
  { value: 'parquet' as const, label: 'Parquet' }
]

// Check if target is a file connection
const isFileTarget = computed(() => {
  const target = currentStreamConfig.target
  if (!target) return false
  // Check if it's a file connection (starts with / or file://)
  if (target.startsWith('/') || target.startsWith('file://')) return true
  // Or check connection type
  const conn = connectionsStore.connectionByID(target)
  return conn?.type?.toLowerCase().includes('file')
})

// File format computed property
const targetFileFormat = computed({
  get: () => currentStreamConfig.targetFileFormat || undefined,
  set: (value) => {
    currentStreamConfig.targetFileFormat = value
  }
})

// Compression type computed property
const compressionType = computed({
  get: () => currentStreamConfig.compressionType || 'zstd',
  set: (value) => {
    currentStreamConfig.compressionType = value
  }
})

// Format descriptions
const formatDescription = computed(() => {
  switch (targetFileFormat.value) {
    case 'csv':
      return 'Comma-separated values - widely compatible, good for spreadsheets'
    case 'jsonl':
      return 'JSON Lines - one JSON object per line, ideal for streaming'
    case 'parquet':
      return 'Columnar format - highly compressed, optimized for analytics'
    default:
      return 'Select output file format'
  }
})

// Compression descriptions
const compressionDescription = computed(() => {
  switch (compressionType.value) {
    case 'zstd':
      return 'Best compression ratio with fast decompression - modern standard (recommended)'
    case 'gzip':
      return 'Good balance of compression and speed - for legacy system compatibility'
    case 'uncompressed':
      return 'No compression - fastest write speed, largest file size'
    default:
      return 'Select compression method'
  }
})

// Select format handler
const selectFormat = (format: 'csv' | 'jsonl' | 'parquet') => {
  targetFileFormat.value = format
  // Set default compression to zstd if not already set
  if (!currentStreamConfig.compressionType) {
    compressionType.value = 'zstd'
  }
}

const dataBundleSize = computed<number>({
  get: () => currentStreamConfig.dataBundleSize ?? defaultStreamConfigOptions.dataBundleSize,
  set: (newValue) => {
    const clampedValue = Math.min(Math.max(newValue, 10), 1000)
    currentStreamConfig.dataBundleSize = clampedValue
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
