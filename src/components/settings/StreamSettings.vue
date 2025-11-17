<template>
  <div class="space-y-8">
    <!-- Output Configuration Section (only for file targets) -->
    <div
      v-if="isFileTarget"
      class="bg-white dark:bg-gray-850 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm dark:shadow-gray-900/30"
    >
      <h4 class="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">
        Output Configuration
      </h4>
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <!-- File Format Selection -->
        <SelectionButtonGroup
          v-model="targetFileFormat"
          label="File Format"
          :options="fileFormats"
          :columns="3"
          required
        />

        <!-- Compression Selection -->
        <FormSelect
          v-model="compressionType"
          label="Compression"
          :options="compressionOptions"
          :helper-text="compressionDescription"
          required
        />
      </div>

      <!-- DuckDB Writer Toggle -->
      <div class="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
        <FormSwitch
          v-model="useDuckDBWriter"
          label="Use DuckDB Writer"
          description="Enable DuckDB Appender API for file writing. DuckDB writer provides optimized performance for CSV, JSONL, and Parquet formats with advanced compression support."
        />
      </div>
    </div>

    <!-- Performance & Monitoring + Execution Limits -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Performance & Monitoring Section -->
      <div
        class="bg-white dark:bg-gray-850 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm dark:shadow-gray-900/30"
      >
        <h4 class="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">
          Performance & Monitoring
        </h4>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <!-- Data Bundle Size -->
          <div>
            <label
              for="dataBundleSize"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >Data Bundle Size</label
            >
            <input
              id="dataBundleSize"
              v-model.number="dataBundleSize"
              type="number"
              min="10"
              max="1000"
              class="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-900 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-1 focus:ring-teal-500 dark:focus:ring-teal-400 sm:text-sm"
              placeholder="10-1000"
            />
            <p
              v-if="dataBundleSize < 10 || dataBundleSize > 1000"
              class="mt-1 text-xs text-red-600 dark:text-red-400"
            >
              Value must be 10-1000
            </p>
          </div>

          <!-- Reporting Interval -->
          <div>
            <label
              for="readerReportingInterval"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >Reporting Interval (sec)</label
            >
            <input
              id="readerReportingInterval"
              v-model="reportingInterval"
              type="number"
              class="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-1 focus:ring-teal-500 dark:focus:ring-teal-400 sm:text-sm"
            />
          </div>
        </div>
      </div>

      <!-- Limits Section -->
      <div
        class="bg-white dark:bg-gray-850 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm dark:shadow-gray-900/30"
      >
        <h4 class="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">
          Execution Limits
        </h4>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label
              for="numberOfEvents"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >{{ numberOfEventsLabel }}</label
            >
            <div class="mt-1">
              <input
                id="numberOfEvents"
                v-model="limitsNumberOfEvents"
                type="number"
                class="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-900 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-1 focus:ring-teal-500 dark:focus:ring-teal-400 sm:text-sm"
                placeholder="0"
              />
            </div>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{ numberOfEventsDescription }}
            </p>
          </div>
          <div>
            <label
              for="elapsedTime"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Maximum execution time (seconds)</label
            >
            <div class="mt-1">
              <input
                id="elapsedTime"
                v-model="limitsElapsedTime"
                type="number"
                class="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-900 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-1 focus:ring-teal-500 dark:focus:ring-teal-400 sm:text-sm"
                placeholder="0"
              />
            </div>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Optional safety limit</p>
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
import SelectionButtonGroup from '@/components/base/SelectionButtonGroup.vue'
import FormSelect from '@/components/base/FormSelect.vue'
import FormSwitch from '@/components/base/FormSwitch.vue'

const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()
const currentStreamConfig = streamsStore.currentStreamConfig as StreamConfig

const fileFormats = [
  {
    value: 'csv' as const,
    label: 'CSV',
    description: 'Comma-separated values - widely compatible, good for spreadsheets'
  },
  {
    value: 'jsonl' as const,
    label: 'JSONL',
    description: 'JSON Lines - one JSON object per line, ideal for streaming'
  },
  {
    value: 'parquet' as const,
    label: 'Parquet',
    description: 'Columnar format - highly compressed, optimized for analytics'
  }
]

const compressionOptions = [
  { value: 'zstd', label: 'ZSTD (.zst) - Recommended' },
  { value: 'gzip', label: 'GZIP (.gz) - Legacy Compatibility' },
  { value: 'uncompressed', label: 'Uncompressed - No Compression' }
]

// Check if target is a file connection
const isFileTarget = computed(() => {
  const targetId = currentStreamConfig.target?.id
  if (!targetId) return false
  // Check connection type (only 'files' is valid file connection type now)
  const conn = connectionsStore.connectionByID(targetId)
  return conn?.type?.toLowerCase() === 'files'
})

// File format computed property
const targetFileFormat = computed({
  get: () => currentStreamConfig.target?.fileFormat || undefined,
  set: (value) => {
    if (currentStreamConfig.target) {
      currentStreamConfig.target.fileFormat = value
    }
  }
})

// Compression type computed property
const compressionType = computed({
  get: () => currentStreamConfig.target?.options?.compressionType || 'zstd',
  set: (value) => {
    if (!currentStreamConfig.target.options) {
      currentStreamConfig.target.options = {}
    }
    currentStreamConfig.target.options.compressionType = value
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

// DuckDB Writer toggle
const useDuckDBWriter = computed({
  get: () => currentStreamConfig.target?.options?.useDuckDBWriter ?? false,
  set: (value) => {
    if (!currentStreamConfig.target.options) {
      currentStreamConfig.target.options = {}
    }
    currentStreamConfig.target.options.useDuckDBWriter = value
  }
})

const dataBundleSize = computed<number>({
  get: () => {
    return (
      currentStreamConfig.source?.options?.dataBundleSize ??
      defaultStreamConfigOptions.source.options!.dataBundleSize ??
      500
    )
  },
  set: (newValue) => {
    const clampedValue = Math.min(Math.max(newValue, 10), 1000)
    if (!currentStreamConfig.source.options) {
      currentStreamConfig.source.options = {}
    }
    currentStreamConfig.source.options.dataBundleSize = clampedValue
  }
})

// Single reporting interval for both source and target
const reportingInterval = computed<number>({
  get: () => {
    return (
      currentStreamConfig.reportingInterval ?? defaultStreamConfigOptions.reportingInterval ?? 3
    )
  },
  set: (value) => {
    currentStreamConfig.reportingInterval = value
  }
})

const limitsNumberOfEvents = computed<number>({
  get: () => {
    return (
      currentStreamConfig.limits?.numberOfEvents ??
      defaultStreamConfigOptions.limits?.numberOfEvents ??
      0
    )
  },
  set: (value) => {
    if (!currentStreamConfig.limits) {
      currentStreamConfig.limits = {}
    }
    currentStreamConfig.limits.numberOfEvents = value
  }
})

const limitsElapsedTime = computed<number>({
  get: () => {
    return (
      currentStreamConfig.limits?.elapsedTime ?? defaultStreamConfigOptions.limits?.elapsedTime ?? 0
    )
  },
  set: (value) => {
    if (!currentStreamConfig.limits) {
      currentStreamConfig.limits = {}
    }
    currentStreamConfig.limits.elapsedTime = value
  }
})

// Dynamic labels based on stream mode
const numberOfEventsLabel = computed(() => {
  return currentStreamConfig.mode === 'convert'
    ? 'Maximum rows to transfer'
    : 'Maximum events to process'
})

const numberOfEventsDescription = computed(() => {
  return currentStreamConfig.mode === 'convert'
    ? 'Total rows copied from all tables'
    : 'INSERT + UPDATE + DELETE counted as events'
})
</script>
