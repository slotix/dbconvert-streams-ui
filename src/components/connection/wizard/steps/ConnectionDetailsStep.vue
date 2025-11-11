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

interface Props {
  connectionType?: string
  hideTypeDisplay?: boolean
}

const props = defineProps<Props>()
const connectionsStore = useConnectionsStore()

const emit = defineEmits<{
  'update:can-proceed': [canProceed: boolean]
}>()

// Check if we have minimum required connection details
const canProceed = computed(() => {
  const connection = connectionsStore.currentConnection
  if (!connection) return false

  // For Files connections, only require name and folder path (case-insensitive)
  if (props.connectionType?.toLowerCase() === 'files') {
    return !!(
      connection.name?.trim() &&
      connection.path?.trim() // path field contains the folder path for files
    )
  }

  // Basic validation for database connections - check if required fields are present
  return !!(
    (
      connection.name?.trim() &&
      connection.host?.trim() &&
      connection.port &&
      connection.username?.trim()
    )
    // Note: password can be empty for some configurations
  )
})

// Store the user's actual public IP address
const publicIp = ref<string>('Loading...')

// Function to update IP based on connection host
async function updatePublicIp() {
  try {
    const connection = connectionsStore.currentConnection
    const host = connection?.host

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
  () => connectionsStore.currentConnection?.host,
  () => {
    updatePublicIp()
  }
)

// Only show the access notice when we have connection details filled out (not for Files)
const showAccessNotice = computed(() => {
  const connection = connectionsStore.currentConnection
  return !!(props.connectionType?.toLowerCase() !== 'files' && connection?.host && connection?.port)
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
