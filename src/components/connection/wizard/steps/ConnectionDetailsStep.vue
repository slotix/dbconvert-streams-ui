<template>
  <div class="space-y-6">
    <!-- Connection Parameters with Tabs -->
    <ConnectionParams
      v-if="connectionType"
      :connectionType="connectionType"
      :logo="getDBTypeLogo(connectionType)"
    />

    <!-- Database Access Configuration Notice -->
    <AccessNotice v-if="showAccessNotice" :publicIp="publicIp" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect, onMounted, watch } from 'vue'
import ConnectionParams from '../../params/ConnectionParams.vue'
import AccessNotice from '../../AccessNotice.vue'
import { useConnectionsStore } from '@/stores/connections'
import { getPublicIp, isLocalIp } from '@/utils/ipUtils'
import { getConnectionCategory } from '@/types/connections'

interface Props {
  connectionType?: string
  hideTypeDisplay?: boolean
}

const props = defineProps<Props>()
const connectionsStore = useConnectionsStore()

const emit = defineEmits<{
  'update:can-proceed': [canProceed: boolean]
}>()

const connectionCategory = computed(() =>
  props.connectionType
    ? getConnectionCategory(props.connectionType, connectionsStore.dbTypes)
    : null
)

// Check if we have minimum required connection details
const canProceed = computed(() => {
  const connection = connectionsStore.currentConnection
  if (!connection) return false

  if (connectionCategory.value === 'file') {
    // For file connections: name is required
    const hasName = !!connection.name?.trim()

    // For local files: need spec.files.basePath
    if (connection.spec?.files) {
      const hasBasePath = !!connection.spec.files.basePath?.trim()
      return hasName && hasBasePath
    }

    // For cloud storage (S3): need spec.s3 with region
    if (connection.spec?.s3) {
      const hasRegion = !!connection.spec.s3.region
      return hasName && hasRegion
    }

    // For GCS: need spec.gcs
    if (connection.spec?.gcs) {
      return hasName
    }

    // For Azure: need spec.azure
    if (connection.spec?.azure) {
      return hasName && !!connection.spec.azure.accountName
    }

    // Fallback: just need a name for new connections
    return hasName
  }

  const spec = connection.spec?.database
  return !!(connection.name?.trim() && spec?.host?.trim() && spec?.port && spec?.username?.trim())
})

// Store the user's actual public IP address
const publicIp = ref<string>('Loading...')

// Function to update IP based on connection host
async function updatePublicIp() {
  try {
    const connection = connectionsStore.currentConnection
    const host = connection?.spec?.database?.host

    // If connecting to localhost/local IP, show local IP
    if (host && isLocalIp(host)) {
      publicIp.value = '127.0.0.1'
    } else if (host) {
      // For remote databases, show the user's actual public IP
      publicIp.value = await getPublicIp()
    } else {
      publicIp.value = 'Loading...'
    }
  } catch (error) {
    console.warn('Failed to get public IP:', error)
    publicIp.value = 'Unable to detect'
  }
}

// Fetch IP on mount
onMounted(() => {
  updatePublicIp()
})

// Watch for connection host changes and update IP accordingly
watch(
  () => connectionsStore.currentConnection?.spec?.database?.host,
  () => {
    updatePublicIp()
  }
)

// Only show the access notice for database-style connections
const showAccessNotice = computed(() => {
  if (connectionCategory.value === 'file') {
    return false
  }
  const connection = connectionsStore.currentConnection
  const host = connection?.spec?.database?.host
  const port = connection?.spec?.database?.port
  return !!(host && port)
})

// Watch for changes and emit can-proceed updates
watchEffect(() => {
  emit('update:can-proceed', canProceed.value)
})

function getDBTypeLogo(type: string): string {
  const dbType = connectionsStore.dbTypes.find((db) => db.type === type)
  return dbType?.logo || '/images/db-logos/default.svg'
}
</script>
