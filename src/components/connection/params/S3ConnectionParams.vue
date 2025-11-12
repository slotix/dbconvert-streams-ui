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
          <img
            v-if="logo"
            :src="logo"
            alt="S3 logo"
            class="h-6 w-6 mr-2.5 object-contain dark:brightness-0 dark:invert dark:opacity-70"
          />
          <CloudIcon v-else class="h-6 w-6 mr-2.5 text-teal-600 dark:text-teal-400" />
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
                <option value="MinIO">MinIO</option>
                <option value="DigitalOcean Spaces">DigitalOcean Spaces</option>
                <option value="Wasabi">Wasabi</option>
                <option value="Ceph RADOS Gateway">Ceph RADOS Gateway</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
          </div>

          <!-- Credential Source -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
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

          <!-- Static Credentials (conditional) -->
          <template v-if="credentialSource === 'static'">
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

          <!-- Endpoint -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
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

          <!-- Advanced Settings (collapsible) -->
          <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
              type="button"
              @click="showAdvanced = !showAdvanced"
              class="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
            >
              <ChevronDownIcon
                :class="[showAdvanced ? 'rotate-180' : '', 'h-5 w-5 mr-1 transition-transform']"
              />
              Advanced Settings
            </button>

            <div v-if="showAdvanced" class="mt-4 space-y-4">
              <!-- URL Style -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >URL Style</label
                >
                <div class="md:col-span-2">
                  <select
                    v-model="urlStyle"
                    class="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500 dark:focus:border-teal-400 transition-colors"
                  >
                    <option value="auto">Auto</option>
                    <option value="path">Path</option>
                    <option value="virtual">Virtual-hosted</option>
                  </select>
                </div>
              </div>

              <!-- Use SSL -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Use SSL</label>
                <div class="md:col-span-2">
                  <label class="flex items-center cursor-pointer">
                    <input
                      v-model="useSSL"
                      type="checkbox"
                      class="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span class="ml-2 text-sm text-gray-700 dark:text-gray-300"
                      >Enable SSL/TLS</span
                    >
                  </label>
                </div>
              </div>

              <!-- Thread Count -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >Thread Count</label
                >
                <div class="md:col-span-2">
                  <input
                    v-model.number="threadCount"
                    type="number"
                    min="1"
                    max="32"
                    class="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500 dark:focus:border-teal-400 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Optional Scope -->
          <div class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Optional Scope</h4>

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
                  placeholder="my-data-bucket"
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
              AWS S3, MinIO, DigitalOcean Spaces, Wasabi, Ceph, and any S3-compatible storage
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CloudIcon, DocumentTextIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
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
const credentialSource = ref<'aws' | 'static'>('static')
const accessKeyId = ref<string>('')
const secretAccessKey = ref<string>('')
const sessionToken = ref<string>('')
const region = ref<string>('us-east-1')
const endpoint = ref<string>('')
const urlStyle = ref<'auto' | 'path' | 'virtual'>('auto')
const useSSL = ref<boolean>(true)
const threadCount = ref<number>(8)
const bucket = ref<string>('')
const prefix = ref<string>('')
const showAdvanced = ref<boolean>(false)

// Check if we're in edit mode (connection has an ID)
const isEdit = computed(() => !!connection.value?.id)

// Apply provider preset when selected
watch(selectedProvider, (provider) => {
  const preset = S3_PROVIDER_PRESETS[provider]
  if (preset) {
    endpoint.value = preset.endpoint
    region.value = preset.region
    urlStyle.value = preset.urlStyle
    useSSL.value = preset.useSSL
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
const applyConnectionDefaults = (connectionType: string) => {
  if (connection.value) {
    connection.value.type = connectionType.toLowerCase()

    // Load existing S3 config if in edit mode
    if (isEdit.value) {
      // Try to load from storage_config first (backend format)
      if (connection.value.storage_config) {
        const sc = connection.value.storage_config
        region.value = sc.region || 'us-east-1'
        endpoint.value = sc.endpoint || ''

        // Extract bucket and prefix from URI
        if (sc.uri && sc.uri.startsWith('s3://')) {
          const uriPath = sc.uri.substring(5) // Remove "s3://"
          const parts = uriPath.split('/')
          bucket.value = parts[0] || ''
          prefix.value = parts.slice(1).join('/') || ''
        }

        // Determine credential source
        credentialSource.value = sc.credentials ? 'static' : 'aws'

        // Load credentials
        if (sc.credentials) {
          accessKeyId.value = sc.credentials.aws_access_key || connection.value.username || ''
          secretAccessKey.value = sc.credentials.aws_secret_key || connection.value.password || ''
          sessionToken.value = sc.credentials.aws_session_token || ''
        }
      } else if (connection.value.s3Config) {
        // Fall back to s3Config (UI format)
        credentialSource.value = connection.value.s3Config.credentialSource || 'static'
        region.value = connection.value.s3Config.region || 'us-east-1'
        endpoint.value = connection.value.s3Config.endpoint || ''
        urlStyle.value = connection.value.s3Config.urlStyle || 'auto'
        useSSL.value = connection.value.s3Config.useSSL !== false
        bucket.value = connection.value.s3Config.bucket || ''
        prefix.value = connection.value.s3Config.prefix || ''
        sessionToken.value = connection.value.s3Config.sessionToken || ''

        // Load credentials if static
        if (credentialSource.value === 'static') {
          accessKeyId.value = connection.value.username || ''
          secretAccessKey.value = connection.value.password || ''
        }
      }
    } else {
      // New connection defaults
      connection.value.host = ''
      connection.value.port = 443
      connection.value.database = ''
      connection.value.path = ''
    }

    // Update name after applying defaults (for new connections only)
    if (!isEdit.value) {
      updateConnectionName()
    }
  }
}

// Sync S3 config back to connection object
const syncS3ConfigToConnection = () => {
  if (!connection.value) return

  // Build S3 URI
  const bucketName = bucket.value || 'my-bucket'
  const prefixPath = prefix.value || ''
  const s3URI = `s3://${bucketName}${prefixPath ? '/' + prefixPath : ''}`

  // Build storage credentials if using static credentials
  const credentials =
    credentialSource.value === 'static' && accessKeyId.value
      ? {
          aws_access_key: accessKeyId.value,
          aws_secret_key: secretAccessKey.value,
          aws_session_token: sessionToken.value || undefined
        }
      : undefined

  // Build storage config for backend
  connection.value.storage_config = {
    provider: 's3' as const,
    uri: s3URI,
    region: region.value,
    endpoint: endpoint.value || undefined,
    credentials: credentials
  }

  // Keep S3 config for UI state management
  connection.value.s3Config = {
    credentialSource: credentialSource.value,
    endpoint: endpoint.value || undefined,
    region: region.value,
    urlStyle: urlStyle.value,
    useSSL: useSSL.value,
    bucket: bucket.value || undefined,
    prefix: prefix.value || undefined,
    sessionToken: sessionToken.value || undefined
  }

  // Map credentials to username/password fields for backward compatibility
  if (credentialSource.value === 'static') {
    connection.value.username = accessKeyId.value
    connection.value.password = secretAccessKey.value
  } else {
    connection.value.username = 'aws-default'
    connection.value.password = ''
  }

  // Set other fields
  connection.value.host = endpoint.value || 's3.amazonaws.com'
  connection.value.port = 443
  connection.value.database = bucket.value || ''
  connection.value.path = s3URI
}

// Watch for connection type changes and update defaults
watch(
  () => props.connectionType,
  (newConnectionType) => {
    if (!isEdit.value && newConnectionType) {
      applyConnectionDefaults(newConnectionType)
    }
  },
  { immediate: true }
)

// Watch for S3 config changes to sync back to connection
watch(
  [
    credentialSource,
    accessKeyId,
    secretAccessKey,
    sessionToken,
    region,
    endpoint,
    urlStyle,
    useSSL,
    bucket,
    prefix
  ],
  () => {
    syncS3ConfigToConnection()
  }
)

// Watch for bucket/prefix changes to update connection name
watch([bucket, selectedProvider], () => {
  if (!isEdit.value) {
    updateConnectionName()
  }
})
</script>
