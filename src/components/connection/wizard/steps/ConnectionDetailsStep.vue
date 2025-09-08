<template>
  <div class="space-y-6">
    <!-- Connection Type Display -->
    <div v-if="connectionType" class="flex items-center p-3 bg-gray-50 rounded-lg">
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
  </div>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import ConnectionParams from '../../params/ConnectionParams.vue'
import { useConnectionsStore } from '@/stores/connections'

interface Props {
  connectionType?: string
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
  
  // Basic validation - check if required fields are present
  return !!(
    connection.name?.trim() &&
    connection.host?.trim() &&
    connection.port &&
    connection.username?.trim()
    // Note: password can be empty for some configurations
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