<template>
  <div :class="containerClass">
    <div v-if="!connection && isEdit" class="text-center">
      <Spinner text="Loading connection..." size="sm" />
    </div>

    <div
      v-if="connection"
      class="ui-surface-raised ui-border-default mb-6 rounded-xl border p-6 shadow-sm dark:shadow-gray-900/30"
    >
      <div class="space-y-4">
        <div v-if="connection.id" class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Connection ID</label>
          <div class="md:col-span-2">
            <div
              class="ui-surface-muted ui-border-default w-full rounded-lg border px-4 py-2.5 text-sm text-gray-700 shadow-sm dark:text-gray-300"
            >
              {{ connection.id }}
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
          <div class="md:col-span-2">
            <input
              v-model="connection.name"
              type="text"
              class="ui-surface-raised ui-border-default ui-accent-focus w-full rounded-lg border px-4 py-2.5 text-sm text-gray-700 shadow-sm transition-colors dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Connection Name"
            />
          </div>
        </div>
      </div>
    </div>

    <div v-if="connection && ((isEdit && connection.id) || !isEdit)">
      <div
        class="ui-surface-raised ui-border-default mb-6 rounded-xl border p-6 shadow-sm dark:shadow-gray-900/30"
      >
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-6 flex items-center">
          <Cloud class="ui-accent-icon h-5 w-5 mr-2" />
          S3 Configuration
        </h3>

        <div class="space-y-4">
          <!-- Provider Preset -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >Provider Preset</label
            >
            <div class="md:col-span-2">
              <FormSelect v-model="selectedProvider" :options="providerOptions" />
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
                    class="ui-accent-icon mr-2 focus:ring-0"
                  />
                  <span class="text-sm text-gray-700 dark:text-gray-300">AWS Default Chain</span>
                </label>
                <label class="flex items-center cursor-pointer">
                  <input
                    v-model="credentialSource"
                    type="radio"
                    value="static"
                    class="ui-accent-icon mr-2 focus:ring-0"
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
                  class="ui-surface-raised ui-border-default ui-accent-focus w-full rounded-lg border px-4 py-2.5 text-sm text-gray-700 shadow-sm transition-colors dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500"
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
                  class="ui-surface-raised ui-border-default ui-accent-focus w-full rounded-lg border px-4 py-2.5 text-sm text-gray-700 shadow-sm transition-colors dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500"
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
                  class="ui-surface-raised ui-border-default ui-accent-focus w-full rounded-lg border px-4 py-2.5 text-sm text-gray-700 shadow-sm transition-colors dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Temporary session token"
                />
              </div>
            </div>
          </template>

          <!-- Region -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Region</label>
            <div class="md:col-span-2">
              <div class="relative">
                <input
                  v-model="region"
                  type="text"
                  class="ui-surface-raised ui-border-default ui-accent-focus w-full rounded-lg border px-4 py-2.5 text-sm text-gray-700 shadow-sm transition-colors dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500"
                  :class="{ 'pr-24': regionAutoDetected }"
                  placeholder="us-east-1"
                  @input="regionAutoDetected = false"
                />
                <span
                  v-if="regionAutoDetected"
                  class="ui-chip-muted absolute right-3 top-1/2 -translate-y-1/2 rounded px-2 py-0.5 text-xs"
                >
                  auto-detected
                </span>
              </div>
              <p v-if="regionAutoDetected" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Region extracted from endpoint. You can override it if needed.
              </p>
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
                class="ui-accent-focus ui-surface-raised ui-border-default w-full rounded-lg border px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm transition-colors"
                placeholder="Leave empty for AWS S3"
              />
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Leave empty for AWS S3, or specify custom endpoint (e.g., localhost:9000 for MinIO)
              </p>
            </div>
          </div>

          <!-- Optional Scope -->
          <div class="ui-border-default space-y-4 border-t pt-4">
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
                  class="ui-surface-raised ui-border-default ui-accent-focus w-full rounded-lg border px-4 py-2.5 text-sm text-gray-700 shadow-sm transition-colors dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500"
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
                  class="ui-surface-raised ui-border-default ui-accent-focus w-full rounded-lg border px-4 py-2.5 text-sm text-gray-700 shadow-sm transition-colors dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500"
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

      <div class="ui-border-default rounded-xl border bg-transparent p-5">
        <div class="flex items-start">
          <FileText class="mr-3 mt-0.5 h-5 w-5 shrink-0 text-sky-500 dark:text-sky-400" />
          <div>
            <h4 class="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Supported File Formats
            </h4>
            <p class="mb-3 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
              Parquet, CSV, JSON, JSONL (with .gz/.zst compression)
            </p>
            <p class="text-xs font-medium text-gray-700 dark:text-gray-200">Supported Providers:</p>
            <p class="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
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
import { Cloud, FileText } from 'lucide-vue-next'
import Spinner from '@/components/common/Spinner.vue'
import FormSelect from '@/components/base/FormSelect.vue'
import { useConnectionsStore } from '@/stores/connections'
import { S3_PROVIDER_PRESETS } from '@/types/s3'

interface Props {
  connectionType: string
  logo?: string
  layout?: 'default' | 'workspace'
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'default'
})

const connectionsStore = useConnectionsStore()
const containerClass = computed(() => (props.layout === 'workspace' ? '' : 'px-4 md:px-6'))

// Direct store access - single source of truth
const connection = computed(() => connectionsStore.currentConnection)

const providerOptions = Object.keys(S3_PROVIDER_PRESETS).map((name) => ({
  value: name,
  label: name
}))

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
const regionAutoDetected = ref<boolean>(false)

// Extract region from endpoint for known S3-compatible providers
const extractRegionFromEndpoint = (endpointValue: string): string | null => {
  if (!endpointValue) return null

  // DigitalOcean Spaces: {region}.digitaloceanspaces.com
  const doMatch = endpointValue.match(/^([a-z]{3}\d)\.digitaloceanspaces\.com$/i)
  if (doMatch) return doMatch[1].toLowerCase()

  // Backblaze B2: s3.{region}.backblazeb2.com
  const b2Match = endpointValue.match(/^s3\.([a-z]+-[a-z]+-\d+)\.backblazeb2\.com$/i)
  if (b2Match) return b2Match[1].toLowerCase()

  // Linode Object Storage: {region}.linodeobjects.com
  const linodeMatch = endpointValue.match(/^([a-z]+-[a-z]+-\d+)\.linodeobjects\.com$/i)
  if (linodeMatch) return linodeMatch[1].toLowerCase()

  // Wasabi: s3.{region}.wasabisys.com
  const wasabiMatch = endpointValue.match(/^s3\.([a-z]+-[a-z]+-\d+)\.wasabisys\.com$/i)
  if (wasabiMatch) return wasabiMatch[1].toLowerCase()

  return null
}

// Check if we're in edit mode (connection has an ID)
const isEdit = computed(() => !!connection.value?.id)

// Flag to skip preset application during edit mode load
const isLoadingEditData = ref(false)

function hydrateFromS3Spec() {
  const s3Spec = connection.value?.spec?.s3
  if (!s3Spec) return

  region.value = s3Spec.region || 'us-east-1'
  endpoint.value = s3Spec.endpoint || ''

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

  bucket.value = s3Spec.scope?.bucket || ''
  prefix.value = s3Spec.scope?.prefix || ''
  credentialSource.value = s3Spec.credentials ? 'static' : 'aws'

  if (s3Spec.credentials) {
    accessKeyId.value = s3Spec.credentials.accessKey || connection.value?.username || ''
    secretAccessKey.value = s3Spec.credentials.secretKey || connection.value?.password || ''
    sessionToken.value = s3Spec.credentials.sessionToken || ''
  } else {
    accessKeyId.value = ''
    secretAccessKey.value = ''
    sessionToken.value = ''
  }
}

// Apply provider preset when selected (skip during edit mode load)
watch(selectedProvider, (provider) => {
  if (isLoadingEditData.value) return
  const preset = S3_PROVIDER_PRESETS[provider]
  if (preset) {
    endpoint.value = preset.endpoint
    region.value = preset.region
    // Reset auto-detected flag since values came from preset
    regionAutoDetected.value = false
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

    if (connection.value.spec?.s3) {
      isLoadingEditData.value = true
      hydrateFromS3Spec()

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

// Watch endpoint changes to auto-extract region (skip during edit mode load)
watch(endpoint, (newEndpoint) => {
  if (isLoadingEditData.value) return

  const extractedRegion = extractRegionFromEndpoint(newEndpoint)
  if (extractedRegion) {
    region.value = extractedRegion
    regionAutoDetected.value = true
  } else {
    regionAutoDetected.value = false
  }
})
</script>
