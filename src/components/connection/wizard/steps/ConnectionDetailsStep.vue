<template>
  <div class="space-y-6">
    <!-- Connection Type Display -->
    <div v-if="connectionType && !hideTypeDisplay" class="flex items-center p-3 bg-gray-50 rounded-lg">
      <img
        :src="getDBTypeLogo(connectionType)"
        :alt="connectionType + ' logo'"
        class="h-8 w-8 object-contain mr-3"
      />
      <div>
        <span class="text-sm font-medium text-gray-900">{{ connectionType }} Connection</span>
        <p class="text-xs text-gray-500">Configure your connection parameters</p>
      </div>
    </div>

    <!-- Connection Parameters with Tabs -->
    <ConnectionParams v-if="connectionType" :connectionType="connectionType" />

    <!-- Database Access Configuration Notice -->
    <AccessNotice :publicIp="publicIp" v-if="showAccessNotice" />
  </div>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import ConnectionParams from '../../params/ConnectionParams.vue'
import AccessNotice from '../../AccessNotice.vue'
import { useConnectionsStore } from '@/stores/connections'

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
    connection.name?.trim() &&
    connection.host?.trim() &&
    connection.port &&
    connection.username?.trim()
    // Note: password can be empty for some configurations
  )
})

// Compute the IP to show in AccessNotice based on connection host
const publicIp = computed(() => {
  const host = connectionsStore.currentConnection?.host
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return '127.0.0.1'
  }
  return host
})

// Only show the access notice when we have connection details filled out (not for Files)
const showAccessNotice = computed(() => {
  const connection = connectionsStore.currentConnection
  return !!(
    props.connectionType?.toLowerCase() !== 'files' &&
    connection?.host && 
    connection?.port
  )
})

// Watch for changes and emit can-proceed updates
watchEffect(() => {
  emit('update:can-proceed', canProceed.value)
})

function getDBTypeLogo(type: string): string {
  const dbType = connectionsStore.dbTypes.find(db => db.type === type)
  return dbType?.logo || '/images/db-logos/default.svg'
}
</script>