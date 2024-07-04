<template>
  <Modal @ok="ok">
    <template #connection-params>
      <ConnectionParams v-if="currentConnection" :connectionType="currentConnection.type" />
    </template>
  </Modal>
</template>

<script>
import { ref, computed } from 'vue'
import api from '@/api/connections'
import Modal from './Modal.vue'
import ConnectionParams from './params/ConnectionParams.vue'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
// import { useAuth } from 'vue-clerk'

export default {
  components: {
    Modal,
    ConnectionParams,
    // useAuth
  },
  setup() {
    const connectionsStore = useConnectionsStore()
    const commonStore = useCommonStore()
    // const { getToken } = useAuth()
    const currentConnection = computed(() => connectionsStore.currentConnection)

    // const save = connectionsStore.saveConnection
    // const refresh = connectionsStore.refreshConnections

    const ok = async () => {
      commonStore.showNotificationBar = false
      try {
        // const token = await getToken.value()
        const json = JSON.stringify(currentConnection.value)
        await api.updateConnection(json)

        const databases = await api.getDatabases(currentConnection.value.id)
        currentConnection.value.databases = databases

        if (currentConnection.value.type.toLowerCase() === 'postgresql') {
          const schemas = await api.getSchemas(currentConnection.value.id)
          currentConnection.value.schemas = schemas
        }

        await connectionsStore.saveConnection();
        await connectionsStore.refreshConnections();
      } catch (err) {
        commonStore.showNotification(err.message)
      }
    }

    return {
      currentConnection,
      ok
    }
  }
}
</script>
