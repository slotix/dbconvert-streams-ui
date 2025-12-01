<template>
  <div class="px-4 md:px-6">
    <!-- Connection ID (for existing connections) -->
    <div
      v-if="connection?.id"
      class="bg-white dark:bg-gray-850 rounded-xl border border-gray-100 dark:border-gray-700 p-6 mb-6 shadow-sm dark:shadow-gray-900/30"
    >
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Connection ID</label>
        <div class="md:col-span-2">
          <div
            class="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 px-4 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-sm text-sm"
          >
            {{ connection?.id }}
          </div>
        </div>
      </div>
    </div>

    <!-- Loading state for edit mode -->
    <div v-else class="text-center" :class="isEdit ? '' : 'hidden'">
      <Spinner text="Loading connection..." size="sm" />
    </div>

    <!-- Connection Name -->
    <div
      v-if="connection"
      class="bg-white dark:bg-gray-850 rounded-xl border border-gray-100 dark:border-gray-700 p-6 mb-6 shadow-sm dark:shadow-gray-900/30"
    >
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
        <div class="md:col-span-2">
          <input
            v-model="connection.name"
            type="text"
            class="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500 dark:focus:border-teal-400 transition-colors"
            placeholder="Connection Name"
          />
        </div>
      </div>
    </div>

    <!-- S3 Configuration -->
    <div v-if="connection && ((isEdit && connection.id) || !isEdit)">
      <!-- S3 Configuration Group -->
      <div
        class="bg-white dark:bg-gray-850 rounded-xl border border-gray-100 dark:border-gray-700 p-6 mb-6 shadow-sm dark:shadow-gray-900/30"
      >
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-6 flex items-center">
          <CloudIcon class="h-5 w-5 mr-2 text-teal-600 dark:text-teal-400" />
          S3 Configuration
        </h3>

        <div class="space-y-4">
          <!-- Provider Preset -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >Provider Preset</label
            >
            <div class="md:col-span-2">
              <select
                v-model="selectedProvider"
                class="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500 dark:focus:border-teal-400 transition-colors"
              >
                <option value="AWS S3">AWS S3</option>
                <option value="Google Cloud Storage">Google Cloud Storage</option>
                <option value="Cloudflare R2">Cloudflare R2</option>
                <option value="DigitalOcean Spaces">DigitalOcean Spaces</option>
                <option value="Backblaze B2">Backblaze B2</option>
                <option value="MinIO">MinIO</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
          </div>

          <!-- Credential Source (only show for AWS S3) -->
          <div
            v-if="selectedProvider === 'AWS S3'"
            class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center"
          >
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >Credential Source</label
            >
            <div class="md:col-span-2">
              <div class="flex gap-4">
                <label class="flex items-center cursor-pointer">
                  <input
                    v-model="credentialSource"
                    type="radio"
                    value="aws"
                    class="mr-2 text-teal-600 focus:ring-teal-500"
                  />
                  <span class="text-sm text-gray-700 dark:text-gray-300">AWS Default Chain</span>
                </label>
                <label class="flex items-center cursor-pointer">
                  <input
                    v-model="credentialSource"
                    type="radio"
                    value="static"
                    class="mr-2 text-teal-600 focus:ring-teal-500"
                  />
                  <span class="text-sm text-gray-700 dark:text-gray-300">Static Credentials</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Static Credentials (always show for non-AWS, conditional for AWS) -->
          <template v-if="selectedProvider !== 'AWS S3' || credentialSource === 'static'">
            <!-- Access Key ID -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300"
                >Access Key ID</label
              >
              <div class="md:col-span-2">
                <input
                  v-model="accessKeyId"
                  type="text"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500 dark:focus:border-teal-400 transition-colors"
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                />
              </div>
            </div>

            <!-- Secret Access Key -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300"
                >Secret Access Key</label
              >
              <div class="md:col-span-2">
                <input
                  v-model="secretAccessKey"
                  type="password"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500 dark:focus:border-teal-400 transition-colors"
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                />
              </div>
            </div>

            <!-- Session Token (optional) -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300"
                >Session Token (optional)</label
              >
              <div class="md:col-span-2">
                <input
                  v-model="sessionToken"
                  type="password"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500 dark:focus:border-teal-400 transition-colors"
                  placeholder="Temporary session token"
                />
              </div>
            </div>
          </template>

          <!-- Region -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Region</label>
            <div class="md:col-span-2">
              <input
                v-model="region"
                type="text"
                class="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500 dark:focus:border-teal-400 transition-colors"
                placeholder="us-east-1"
              />
            </div>
          </div>

          <!-- Endpoint (hide for AWS S3 with Default Chain - AWS SDK auto-resolves endpoint) -->
          <div
            v-if="selectedProvider !== 'AWS S3' || credentialSource === 'static'"
            class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center"
          >
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Endpoint</label>
            <div class="md:col-span-2">
              <input
                v-model="endpoint"
                type="text"
                class="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500 dark:focus:border-teal-400 transition-colors"
                placeholder="Leave empty for AWS S3"
              />
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Leave empty for AWS S3, or specify custom endpoint (e.g., localhost:9000 for MinIO)
              </p>
            </div>
          </div>

          <!-- Optional Scope -->
          <div class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Scope (Optional)</h4>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Optional: Scope the Data Explorer view to a specific bucket/prefix. When using this
              connection as a stream target, bucket/prefix are configured in stream settings.
            </p>

            <!-- Bucket -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300"
                >Bucket (optional)</label
              >
              <div class="md:col-span-2">
                <input
                  v-model="bucket"
                  type="text"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500 dark:focus:border-teal-400 transition-colors"
                  placeholder="my-data-bucket (optional)"
                />
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Scope this connection to a specific bucket
                </p>
              </div>
            </div>

            <!-- Prefix -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300"
                >Prefix (optional)</label
              >
              <div class="md:col-span-2">
                <input
                  v-model="prefix"
                  type="text"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500 dark:focus:border-teal-400 transition-colors"
                  placeholder="data/exports/"
                />
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Scope this connection to a specific prefix (folder)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- File Formats Info -->
      <div
        class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 shadow-sm dark:shadow-gray-900/20"
      >
        <div class="flex items-start">
          <DocumentTextIcon class="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 shrink-0" />
          <div>
            <h4 class="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Supported File Formats
            </h4>
            <p class="text-xs text-blue-700 dark:text-blue-300 leading-relaxed mb-3">
              Parquet, CSV, JSON, JSONL (with .gz/.zst compression)
            </p>
            <p class="text-xs text-blue-600 dark:text-blue-400 font-medium">Supported Providers:</p>
            <p class="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              AWS S3, Google Cloud Storage, Cloudflare R2, DigitalOcean Spaces, Backblaze B2, MinIO,
              and any S3-compatible storage
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { CloudIcon, DocumentTextIcon } from '@heroicons/vue/24/outline'
import Spinner from '@/components/common/Spinner.vue'
import { useConnectionsStore } from '@/stores/connections'
import { S3_PROVIDER_PRESETS } from '@/types/s3'

interface Props {
  connectionType: string
  logo?: string
}

const props = defineProps<Props>()

const connectionsStore = useConnectionsStore()

// Direct store access - single source of truth
const connection = computed(() => connectionsStore.currentConnection)

// S3-specific reactive state
const selectedProvider = ref<string>('AWS S3')
const credentialSource = ref<'aws' | 'static'>('aws')
const accessKeyId = ref<string>('')
const secretAccessKey = ref<string>('')
const sessionToken = ref<string>('')
const region = ref<string>('us-east-1')
const endpoint = ref<string>('')
const bucket = ref<string>('')
const prefix = ref<string>('')

// Check if we're in edit mode (connection has an ID)
const isEdit = computed(() => !!connection.value?.id)

// Flag to skip preset application during edit mode load
const isLoadingEditData = ref(false)

// Apply provider preset when selected (skip during edit mode load)
watch(selectedProvider, (provider) => {
  if (isLoadingEditData.value) return
  const preset = S3_PROVIDER_PRESETS[provider]
  if (preset) {
    endpoint.value = preset.endpoint
    region.value = preset.region
  }
  // Set appropriate credential source based on provider
  if (provider === 'AWS S3') {
    credentialSource.value = 'aws'
  } else {
    credentialSource.value = 'static'
  }
  updateConnectionName()
})

// Auto-generate connection name based on connection details
const buildConnectionName = computed(() => {
  if (!connection.value?.type) {
    return ''
  }
  const providerPart = selectedProvider.value.replace(/\s+/g, '-')
  const bucketPart = bucket.value || region.value || 'S3'
  return `S3-${providerPart}-${bucketPart}`
})

// Update connection name based on mode
const updateConnectionName = () => {
  if (!connection.value) return

  if (!isEdit.value) {
    // New connections: Auto-generate name from connection details
    if (buildConnectionName.value) {
      connection.value.name = buildConnectionName.value
    } else if (connection.value.type) {
      connection.value.name = 'S3-Connection'
    }
  } else {
    // Edit mode: Keep existing name unless it's empty
    if (!connection.value.name && buildConnectionName.value) {
      connection.value.name = buildConnectionName.value
    }
  }
}

// Helper function to apply connection defaults for S3
const applyConnectionDefaults = (_connectionType: string) => {
  if (connection.value) {
    // S3 connections should have type="files" with spec.s3
    connection.value.type = 'files'

    // Load existing S3 config if in edit mode
    if (isEdit.value) {
      isLoadingEditData.value = true

      // Load from spec.s3 (new format)
      const s3Spec = connection.value.spec?.s3
      if (s3Spec) {
        region.value = s3Spec.region || 'us-east-1'
        endpoint.value = s3Spec.endpoint || ''

        // Detect provider preset from endpoint
        if (s3Spec.endpoint?.includes('localhost') || s3Spec.endpoint?.includes('127.0.0.1')) {
          selectedProvider.value = 'MinIO'
        } else if (s3Spec.endpoint?.includes('digitaloceanspaces')) {
          selectedProvider.value = 'DigitalOcean Spaces'
        } else if (s3Spec.endpoint?.includes('storage.googleapis.com')) {
          selectedProvider.value = 'Google Cloud Storage'
        } else if (s3Spec.endpoint?.includes('backblazeb2')) {
          selectedProvider.value = 'Backblaze B2'
        } else if (s3Spec.endpoint?.includes('r2.cloudflarestorage')) {
          selectedProvider.value = 'Cloudflare R2'
        } else if (!s3Spec.endpoint) {
          selectedProvider.value = 'AWS S3'
        } else {
          selectedProvider.value = 'Custom'
        }

        // Load scope (bucket/prefix)
        bucket.value = s3Spec.scope?.bucket || ''
        prefix.value = s3Spec.scope?.prefix || ''

        // Determine credential source
        credentialSource.value = s3Spec.credentials ? 'static' : 'aws'

        // Load credentials
        if (s3Spec.credentials) {
          accessKeyId.value = s3Spec.credentials.accessKey || connection.value.username || ''
          secretAccessKey.value = s3Spec.credentials.secretKey || connection.value.password || ''
          sessionToken.value = s3Spec.credentials.sessionToken || ''
        }
      }

      // Reset flag after loading (use nextTick to ensure watchers have processed)
      nextTick(() => {
        isLoadingEditData.value = false
      })
    } else {
      // New connection defaults
      connection.value.host = ''
      connection.value.port = 443
    }

    // Update name after applying defaults (for new connections only)
    if (!isEdit.value) {
      updateConnectionName()
    }

    // Sync initial S3 config to connection object immediately
    // This ensures spec.s3 is set with defaults (region, etc.) for validation
    syncS3ConfigToConnection()
  }
}

// Sync S3 config back to connection object
const syncS3ConfigToConnection = () => {
  if (!connection.value) return

  // Build S3 credentials if using static credentials
  const credentials =
    credentialSource.value === 'static' && accessKeyId.value
      ? {
          accessKey: accessKeyId.value,
          secretKey: secretAccessKey.value,
          sessionToken: sessionToken.value || undefined
        }
      : undefined

  // Build S3 scope from bucket/prefix if specified
  const scope =
    bucket.value || prefix.value
      ? {
          bucket: bucket.value || undefined,
          prefix: prefix.value || undefined
        }
      : undefined

  // Build spec.s3 for backend (new format)
  connection.value.spec = {
    s3: {
      region: region.value,
      endpoint: endpoint.value || undefined,
      credentials: credentials,
      scope: scope
    }
  }

  // Map credentials to username/password fields for backward compatibility
  if (credentialSource.value === 'static') {
    connection.value.username = accessKeyId.value
    connection.value.password = secretAccessKey.value
  } else {
    connection.value.username = 'aws-default'
    connection.value.password = ''
  }

  // Set other fields for S3 connections
  // For S3, endpoint can include port (e.g., "localhost:9010"), so parse it
  const endpointValue = endpoint.value || 's3.amazonaws.com'
  const endpointParts = endpointValue.split(':')

  // Determine SSL based on endpoint (local endpoints don't use SSL)
  const isLocalEndpoint =
    endpointValue.includes('localhost') ||
    endpointValue.includes('127.0.0.1') ||
    endpointValue.startsWith('0.0.0.0')

  if (endpointParts.length === 2) {
    // Has port in endpoint (e.g., "localhost:9010")
    connection.value.host = endpointParts[0]
    connection.value.port = parseInt(endpointParts[1], 10)
  } else {
    // No port in endpoint, use default port based on SSL
    connection.value.host = endpointValue
    connection.value.port = isLocalEndpoint ? 80 : 443
  }
}

// Watch for connection type changes and update defaults (new connections)
watch(
  () => props.connectionType,
  (newConnectionType) => {
    if (!isEdit.value && newConnectionType) {
      applyConnectionDefaults(newConnectionType)
    }
  },
  { immediate: true }
)

// Watch for connection ID to load existing data (edit mode)
watch(
  () => connection.value?.id,
  (newId) => {
    if (newId && isEdit.value) {
      applyConnectionDefaults(props.connectionType)
    }
  },
  { immediate: true }
)

// Watch for S3 config changes to sync back to connection
watch(
  [credentialSource, accessKeyId, secretAccessKey, sessionToken, region, endpoint, bucket, prefix],
  () => {
    syncS3ConfigToConnection()
  },
  { immediate: true }
)

// Watch for bucket/prefix changes to update connection name
watch([bucket, selectedProvider], () => {
  if (!isEdit.value) {
    updateConnectionName()
  }
})
</script>
