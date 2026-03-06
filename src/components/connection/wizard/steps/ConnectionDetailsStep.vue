<template>
  <div class="space-y-6">
    <ConnectionParams
      v-if="connectionType"
      :connectionType="connectionType"
      :logo="getDBTypeLogo(connectionType)"
      :layout="layout"
    />

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
  layout?: 'default' | 'workspace'
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'default'
})
const connectionsStore = useConnectionsStore()

const emit = defineEmits<{
  'update:can-proceed': [canProceed: boolean]
}>()

const connectionCategory = computed(() =>
  props.connectionType
    ? getConnectionCategory(props.connectionType, connectionsStore.dbTypes)
    : null
)

const canProceed = computed(() => {
  const connection = connectionsStore.currentConnection
  if (!connection) return false

  if (connectionCategory.value === 'file') {
    const hasName = !!connection.name?.trim()

    if (connection.spec?.files) {
      const hasBasePath = !!connection.spec.files.basePath?.trim()
      return hasName && hasBasePath
    }

    if (connection.spec?.s3) {
      const hasRegion = !!connection.spec.s3.region
      return hasName && hasRegion
    }

    if (connection.spec?.gcs) {
      return hasName
    }

    if (connection.spec?.azure) {
      return hasName && !!connection.spec.azure.accountName
    }

    return hasName
  }

  const spec = connection.spec?.database
  return !!(connection.name?.trim() && spec?.host?.trim() && spec?.port && spec?.username?.trim())
})

const publicIp = ref<string>('Loading...')

async function updatePublicIp() {
  try {
    const connection = connectionsStore.currentConnection
    const host = connection?.spec?.database?.host

    if (host && isLocalIp(host)) {
      publicIp.value = '127.0.0.1'
    } else if (host) {
      publicIp.value = await getPublicIp()
    } else {
      publicIp.value = 'Loading...'
    }
  } catch (error) {
    console.warn('Failed to get public IP:', error)
    publicIp.value = 'Unable to detect'
  }
}

onMounted(() => {
  updatePublicIp()
})

watch(
  () => connectionsStore.currentConnection?.spec?.database?.host,
  () => {
    updatePublicIp()
  }
)

const showAccessNotice = computed(() => {
  if (connectionCategory.value === 'file') {
    return false
  }
  const connection = connectionsStore.currentConnection
  const host = connection?.spec?.database?.host
  const port = connection?.spec?.database?.port
  return !!(host && port)
})

watchEffect(() => {
  emit('update:can-proceed', canProceed.value)
})

function getDBTypeLogo(type: string): string {
  const dbType = connectionsStore.dbTypes.find((db) => db.type === type)
  return dbType?.logo || '/images/db-logos/default.svg'
}
</script>
