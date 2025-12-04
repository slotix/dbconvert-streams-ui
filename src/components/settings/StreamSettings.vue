<template>
  <div class="space-y-8">
    <!-- Output Configuration Section (for file and S3 targets) -->
    <div
      v-if="isFileTarget || isS3Target"
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

      <!-- DuckDB Writer Toggle (only for local files) -->
      <div v-if="isFileTarget" class="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
        <FormSwitch
          v-model="useDuckDBWriter"
          label="Use DuckDB Writer"
          description="Enable DuckDB Appender API for file writing. DuckDB writer provides optimized performance for CSV, JSONL, and Parquet formats with advanced compression support."
        />
      </div>
    </div>

    <!-- S3 Upload Configuration (only for S3 targets) -->
    <div
      v-if="isS3Target"
      class="bg-white dark:bg-gray-850 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm dark:shadow-gray-900/30"
    >
      <div class="flex items-center mb-4">
        <CloudIcon class="h-5 w-5 mr-2 text-teal-600 dark:text-teal-400" />
        <h4 class="text-base font-medium text-gray-900 dark:text-gray-100">
          S3 Upload Configuration
        </h4>
      </div>

      <!-- Show selected bucket as read-only info (selected in Step 1) -->
      <div
        class="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4 mb-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-teal-800 dark:text-teal-200">Target Bucket</p>
            <p class="text-lg font-semibold text-teal-900 dark:text-teal-100">
              {{ s3Bucket || 'Not selected' }}
            </p>
          </div>
          <div class="text-teal-600 dark:text-teal-400">
            <CloudIcon class="h-8 w-8" />
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <!-- Prefix (Optional) -->
        <div>
          <label
            for="s3-prefix"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Prefix (Optional)
          </label>
          <input
            id="s3-prefix"
            v-model="s3Prefix"
            type="text"
            class="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-900 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-1 focus:ring-teal-500 dark:focus:ring-teal-400 sm:text-sm"
            placeholder="data/exports/"
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            S3 key prefix (folder path). Files will be organized as:
            bucket/prefix/tableName/part-N-M.ext
          </p>
        </div>

        <!-- Grid for Storage Options -->
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <!-- Storage Class -->
          <FormSelect
            v-model="s3StorageClass"
            label="Storage Class"
            :options="storageClassOptions"
            helper-text="AWS S3 storage class for cost optimization"
          />

          <!-- Server-Side Encryption -->
          <FormSelect
            v-model="s3ServerSideEnc"
            label="Server-Side Encryption"
            :options="encryptionOptions"
            helper-text="Encryption method for uploaded files"
          />
        </div>

        <!-- KMS Key ID (conditional - only if encryption is aws:kms) -->
        <div v-if="s3ServerSideEnc === 'aws:kms'">
          <label
            for="s3-kms-key"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            KMS Key ID
          </label>
          <input
            id="s3-kms-key"
            v-model="s3KmsKeyId"
            type="text"
            class="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-900 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-1 focus:ring-teal-500 dark:focus:ring-teal-400 sm:text-sm"
            placeholder="arn:aws:kms:us-east-1:123456789012:key/12345678..."
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            AWS KMS key ARN for encryption
          </p>
        </div>

        <!-- Keep Local Files Toggle -->
        <div class="pt-4 border-t border-gray-100 dark:border-gray-700">
          <FormSwitch
            v-model="s3KeepLocalFiles"
            label="Keep Local Files After Upload"
            description="Retain staging files on disk after successful S3 upload. Useful for local backup or debugging."
          />
        </div>
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
import { computed, watch } from 'vue'
import { CloudIcon } from '@heroicons/vue/24/outline'
import { useStreamsStore, defaultStreamConfigOptions } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { type StreamConfig } from '@/types/streamConfig'
import { useTargetSpec, getFileSpec } from '@/composables/useTargetSpec'
import { buildFileTargetSpec, buildS3TargetSpec } from '@/utils/specBuilder'
import SelectionButtonGroup from '@/components/base/SelectionButtonGroup.vue'
import FormSelect from '@/components/base/FormSelect.vue'
import FormSwitch from '@/components/base/FormSwitch.vue'

const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()

// Use computed to ensure reactivity with the store's current stream config
const currentStreamConfig = computed(() => streamsStore.currentStreamConfig as StreamConfig)

// Use the composable for target spec fields
// The composable works with the reactive config
const targetSpec = computed(() => {
  const config = currentStreamConfig.value
  if (!config) return null
  return useTargetSpec(config)
})

const fileFormats = [
  {
    value: 'csv' as const,
    label: 'CSV'
  },
  {
    value: 'jsonl' as const,
    label: 'JSONL'
  },
  {
    value: 'parquet' as const,
    label: 'Parquet'
  }
]

// Compression options - dynamic based on file format
// Parquet uses internal compression (no file extension), CSV/JSONL add compression extension
const compressionOptions = computed(() => {
  const isParquet = targetFileFormat.value === 'parquet'

  if (isParquet) {
    // Parquet has built-in compression - no file extension added
    return [
      { value: 'zstd', label: 'ZSTD - Recommended' },
      { value: 'gzip', label: 'GZIP - Legacy Compatibility' },
      { value: 'uncompressed', label: 'Uncompressed - No Compression' }
    ]
  }

  // CSV/JSONL - compression adds file extension (.zst, .gz)
  return [
    { value: 'zstd', label: 'ZSTD (.zst) - Recommended' },
    { value: 'gzip', label: 'GZIP (.gz) - Legacy Compatibility' },
    { value: 'uncompressed', label: 'Uncompressed - No Compression' }
  ]
})

const storageClassOptions = [
  { value: 'STANDARD', label: 'Standard - Frequently accessed data' },
  { value: 'INTELLIGENT_TIERING', label: 'Intelligent-Tiering - Auto cost optimization' },
  { value: 'STANDARD_IA', label: 'Standard-IA - Infrequent access' },
  { value: 'ONEZONE_IA', label: 'One Zone-IA - Single AZ infrequent access' },
  { value: 'GLACIER_IR', label: 'Glacier Instant Retrieval - Archive with instant access' },
  { value: 'GLACIER', label: 'Glacier Flexible Retrieval - Long-term archive' },
  { value: 'DEEP_ARCHIVE', label: 'Glacier Deep Archive - Lowest cost archive' }
]

const encryptionOptions = [
  { value: '', label: 'None - No encryption' },
  { value: 'AES256', label: 'AES256 - Server-side encryption (SSE-S3)' },
  { value: 'aws:kms', label: 'AWS KMS - Key Management Service (SSE-KMS)' }
]

// Get target connection
const targetConnection = computed(() => {
  const targetId = currentStreamConfig.value?.target?.id
  if (!targetId) return null
  return connectionsStore.connectionByID(targetId)
})

// Check if target is a file connection (local files)
const isFileTarget = computed(() => {
  const conn = targetConnection.value
  if (!conn) return false
  // Check if it's a local file connection via spec.files
  // FileConnectionSpec is only for local files - cloud storage uses dedicated specs
  return conn.type?.toLowerCase() === 'files' && !!conn.spec?.files
})

// Check if target is an S3 connection
const isS3Target = computed(() => {
  const conn = targetConnection.value
  if (!conn) return false
  // Check if spec.s3 is present - S3 connections use dedicated spec
  return !!conn.spec?.s3
})

// Ensure target spec is properly initialized for file/S3 targets
// This is critical for create mode where spec may not exist yet
function ensureTargetSpec() {
  const config = currentStreamConfig.value
  if (!config) return

  const conn = targetConnection.value
  if (!conn) return

  // Check if spec already has the correct structure
  const existingFileSpec = getFileSpec(config.target.spec)
  if (existingFileSpec) return // Already initialized

  // Initialize spec based on connection type
  if (conn.spec?.files) {
    // Local file target
    config.target.spec = buildFileTargetSpec('csv', 'zstd', undefined, undefined, true)
  } else if (conn.spec?.s3) {
    // S3 target - get bucket from connection scope if available
    const bucket = conn.spec.s3.scope?.bucket || ''
    config.target.spec = buildS3TargetSpec(
      '/tmp/dbconvert',
      'csv',
      bucket,
      conn.spec.s3.scope?.prefix,
      undefined,
      undefined,
      'zstd',
      undefined,
      undefined,
      undefined,
      undefined,
      true
    )
  }
}

// Watch for target connection changes and initialize spec
watch(
  targetConnection,
  () => {
    if (isFileTarget.value || isS3Target.value) {
      ensureTargetSpec()
    }
  },
  { immediate: true }
)

// File format - reads/writes directly to target.spec via composable
const targetFileFormat = computed({
  get: () => targetSpec.value?.fileFormat.value ?? 'csv',
  set: (value) => {
    if (targetSpec.value) {
      targetSpec.value.fileFormat.value = value
    }
  }
})

// Compression type - reads/writes directly to target.spec via composable
const compressionType = computed({
  get: () => targetSpec.value?.compression.value ?? 'zstd',
  set: (value) => {
    if (targetSpec.value) {
      targetSpec.value.compression.value = value
    }
  }
})

// Compression descriptions
const compressionDescription = computed(() => {
  const isParquet = targetFileFormat.value === 'parquet'
  const parquetNote = isParquet ? ' (embedded in Parquet file)' : ''

  switch (compressionType.value) {
    case 'zstd':
      return `Best compression ratio with fast decompression - modern standard (recommended)${parquetNote}`
    case 'gzip':
      return `Good balance of compression and speed - for legacy system compatibility${parquetNote}`
    case 'uncompressed':
      return 'No compression - fastest write speed, largest file size'
    default:
      return 'Select compression method'
  }
})

// DuckDB Writer toggle - reads/writes directly to target.spec via composable
const useDuckDBWriter = computed({
  get: () => targetSpec.value?.useDuckDB.value ?? true,
  set: (value) => {
    if (targetSpec.value) {
      targetSpec.value.useDuckDB.value = value
    }
  }
})

// Note: S3 staging directory is now automatically set by the backend based on
// the connection's spec.files.basePath (typically /tmp/dbconvert-s3-staging).
// The backend computes the final path as: <basePath>/<streamID>/<table>/
// We no longer need to specify outputDirectory in the stream configuration.

// S3 Upload Configuration - reads/writes directly to target.spec.s3.upload via composable
const s3Bucket = computed({
  get: () => targetSpec.value?.s3Bucket.value ?? '',
  set: (value) => {
    if (targetSpec.value) {
      targetSpec.value.s3Bucket.value = value
    }
  }
})

const s3Prefix = computed({
  get: () => targetSpec.value?.s3Prefix.value ?? '',
  set: (value) => {
    if (targetSpec.value) {
      targetSpec.value.s3Prefix.value = value
    }
  }
})

const s3StorageClass = computed({
  get: () => targetSpec.value?.s3StorageClass.value ?? 'STANDARD',
  set: (value) => {
    if (targetSpec.value) {
      targetSpec.value.s3StorageClass.value = value
    }
  }
})

const s3ServerSideEnc = computed({
  get: () => targetSpec.value?.s3ServerSideEnc.value ?? '',
  set: (value) => {
    if (targetSpec.value) {
      targetSpec.value.s3ServerSideEnc.value = value
    }
  }
})

const s3KmsKeyId = computed({
  get: () => targetSpec.value?.s3KmsKeyId.value ?? '',
  set: (value) => {
    if (targetSpec.value) {
      targetSpec.value.s3KmsKeyId.value = value
    }
  }
})

const s3KeepLocalFiles = computed({
  get: () => targetSpec.value?.s3KeepLocalFiles.value ?? false,
  set: (value) => {
    if (targetSpec.value) {
      targetSpec.value.s3KeepLocalFiles.value = value
    }
  }
})

const dataBundleSize = computed<number>({
  get: () => {
    return (
      currentStreamConfig.value?.source?.options?.dataBundleSize ??
      defaultStreamConfigOptions.source.options!.dataBundleSize ??
      500
    )
  },
  set: (newValue) => {
    const clampedValue = Math.min(Math.max(newValue, 10), 1000)
    const config = currentStreamConfig.value
    if (!config) return
    if (!config.source.options) {
      config.source.options = {}
    }
    config.source.options.dataBundleSize = clampedValue
  }
})

// Single reporting interval for both source and target
const reportingInterval = computed<number>({
  get: () => {
    return (
      currentStreamConfig.value?.reportingInterval ??
      defaultStreamConfigOptions.reportingInterval ??
      3
    )
  },
  set: (value) => {
    const config = currentStreamConfig.value
    if (config) {
      config.reportingInterval = value
    }
  }
})

const limitsNumberOfEvents = computed<number>({
  get: () => {
    return (
      currentStreamConfig.value?.limits?.numberOfEvents ??
      defaultStreamConfigOptions.limits?.numberOfEvents ??
      0
    )
  },
  set: (value) => {
    const config = currentStreamConfig.value
    if (!config) return
    if (!config.limits) {
      config.limits = {}
    }
    config.limits.numberOfEvents = value
  }
})

const limitsElapsedTime = computed<number>({
  get: () => {
    return (
      currentStreamConfig.value?.limits?.elapsedTime ??
      defaultStreamConfigOptions.limits?.elapsedTime ??
      0
    )
  },
  set: (value) => {
    const config = currentStreamConfig.value
    if (!config) return
    if (!config.limits) {
      config.limits = {}
    }
    config.limits.elapsedTime = value
  }
})

// Dynamic labels based on stream mode
const numberOfEventsLabel = computed(() => {
  return currentStreamConfig.value?.mode === 'convert'
    ? 'Maximum rows to transfer'
    : 'Maximum events to process'
})

const numberOfEventsDescription = computed(() => {
  return currentStreamConfig.value?.mode === 'convert'
    ? 'Total rows copied from all tables'
    : 'INSERT + UPDATE + DELETE counted as events'
})
</script>
