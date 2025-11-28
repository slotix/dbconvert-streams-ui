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

      <div
        class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6"
      >
        <p class="text-sm text-blue-700 dark:text-blue-300">
          <strong>Required for S3 targets:</strong> Specify the destination bucket and upload
          settings for this stream. Files are staged locally at the path configured in the S3
          connection before uploading.
        </p>
      </div>

      <div class="space-y-6">
        <!-- Bucket (Required) - Combobox with bucket listing -->
        <BucketCombobox
          v-model="s3Bucket"
          :buckets="availableBuckets"
          :loading="loadingBuckets"
          :error="bucketLoadError"
          label="Bucket"
          placeholder="Select or type bucket name..."
          helper-text="S3 bucket where files will be uploaded. Select from existing buckets or type a custom name."
          required
        />

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
import { computed, ref, watch, onMounted } from 'vue'
import { CloudIcon } from '@heroicons/vue/24/outline'
import { useStreamsStore, defaultStreamConfigOptions } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import { type StreamConfig } from '@/types/streamConfig'
import SelectionButtonGroup from '@/components/base/SelectionButtonGroup.vue'
import FormSelect from '@/components/base/FormSelect.vue'
import FormSwitch from '@/components/base/FormSwitch.vue'
import BucketCombobox from '@/components/base/BucketCombobox.vue'
import { listS3Buckets, configureS3Session } from '@/api/files'

const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()
const commonStore = useCommonStore()
const currentStreamConfig = streamsStore.currentStreamConfig as StreamConfig

// S3 bucket listing state
const availableBuckets = ref<string[]>([])
const loadingBuckets = ref(false)
const bucketLoadError = ref<string | null>(null)

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
  const targetId = currentStreamConfig.target?.id
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

// Note: S3 staging directory is now automatically set by the backend based on
// the connection's spec.files.basePath (typically /tmp/dbconvert-s3-staging).
// The backend computes the final path as: <basePath>/<streamID>/<table>/
// We no longer need to specify outputDirectory in the stream configuration.

// S3 Upload Configuration computed properties
const s3Bucket = computed({
  get: () => currentStreamConfig.target?.options?.s3UploadConfig?.bucket || '',
  set: (value) => {
    if (!currentStreamConfig.target.options) {
      currentStreamConfig.target.options = {}
    }
    if (!currentStreamConfig.target.options.s3UploadConfig) {
      currentStreamConfig.target.options.s3UploadConfig = {}
    }
    currentStreamConfig.target.options.s3UploadConfig.bucket = value
  }
})

const s3Prefix = computed({
  get: () => currentStreamConfig.target?.options?.s3UploadConfig?.prefix || '',
  set: (value) => {
    if (!currentStreamConfig.target.options) {
      currentStreamConfig.target.options = {}
    }
    if (!currentStreamConfig.target.options.s3UploadConfig) {
      currentStreamConfig.target.options.s3UploadConfig = {}
    }
    currentStreamConfig.target.options.s3UploadConfig.prefix = value
  }
})

const s3StorageClass = computed({
  get: () => currentStreamConfig.target?.options?.s3UploadConfig?.storageClass || 'STANDARD',
  set: (value) => {
    if (!currentStreamConfig.target.options) {
      currentStreamConfig.target.options = {}
    }
    if (!currentStreamConfig.target.options.s3UploadConfig) {
      currentStreamConfig.target.options.s3UploadConfig = {}
    }
    currentStreamConfig.target.options.s3UploadConfig.storageClass = value
  }
})

const s3ServerSideEnc = computed({
  get: () => currentStreamConfig.target?.options?.s3UploadConfig?.serverSideEnc || '',
  set: (value) => {
    if (!currentStreamConfig.target.options) {
      currentStreamConfig.target.options = {}
    }
    if (!currentStreamConfig.target.options.s3UploadConfig) {
      currentStreamConfig.target.options.s3UploadConfig = {}
    }
    currentStreamConfig.target.options.s3UploadConfig.serverSideEnc = value
    // Clear KMS key if encryption is not aws:kms
    if (value !== 'aws:kms') {
      currentStreamConfig.target.options.s3UploadConfig.kmsKeyId = undefined
    }
  }
})

const s3KmsKeyId = computed({
  get: () => currentStreamConfig.target?.options?.s3UploadConfig?.kmsKeyId || '',
  set: (value) => {
    if (!currentStreamConfig.target.options) {
      currentStreamConfig.target.options = {}
    }
    if (!currentStreamConfig.target.options.s3UploadConfig) {
      currentStreamConfig.target.options.s3UploadConfig = {}
    }
    currentStreamConfig.target.options.s3UploadConfig.kmsKeyId = value
  }
})

const s3KeepLocalFiles = computed({
  get: () => currentStreamConfig.target?.options?.s3UploadConfig?.keepLocalFiles ?? false,
  set: (value) => {
    if (!currentStreamConfig.target.options) {
      currentStreamConfig.target.options = {}
    }
    if (!currentStreamConfig.target.options.s3UploadConfig) {
      currentStreamConfig.target.options.s3UploadConfig = {}
    }
    currentStreamConfig.target.options.s3UploadConfig.keepLocalFiles = value
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

// Load S3 buckets function
async function loadS3Buckets() {
  if (!isS3Target.value) return

  const conn = targetConnection.value
  if (!conn) return

  // Get S3 config from spec.s3 (S3 connections use dedicated spec)
  const s3Spec = conn.spec?.s3

  if (!s3Spec) {
    bucketLoadError.value = 'No S3 configuration found'
    return
  }

  try {
    loadingBuckets.value = true
    bucketLoadError.value = null

    // Configure S3 session with connection credentials from spec.s3
    const hasStaticCredentials = s3Spec.credentials?.accessKey && s3Spec.credentials?.secretKey

    await configureS3Session({
      credentialSource: hasStaticCredentials ? 'static' : 'aws',
      region: s3Spec.region || 'us-east-1',
      endpoint: s3Spec.endpoint,
      urlStyle: 'auto',
      useSSL: !s3Spec.endpoint?.includes('localhost'),
      credentials: hasStaticCredentials
        ? {
            accessKeyId: s3Spec.credentials!.accessKey!,
            secretAccessKey: s3Spec.credentials!.secretKey!,
            sessionToken: s3Spec.credentials?.sessionToken
          }
        : undefined
    })

    // Then list buckets
    const response = await listS3Buckets()
    availableBuckets.value = response.buckets
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load buckets'
    bucketLoadError.value = errorMessage
    commonStore.showNotification(`Failed to load S3 buckets: ${errorMessage}`, 'error')
  } finally {
    loadingBuckets.value = false
  }
}

// Watch for S3 target changes and load buckets
watch(
  isS3Target,
  (newValue) => {
    if (newValue) {
      loadS3Buckets()
    } else {
      // Clear buckets when switching away from S3 target
      availableBuckets.value = []
      bucketLoadError.value = null
    }
  },
  { immediate: true }
)

// Load buckets on mount if S3 target is already selected
onMounted(() => {
  if (isS3Target.value) {
    loadS3Buckets()
  }
})
</script>
