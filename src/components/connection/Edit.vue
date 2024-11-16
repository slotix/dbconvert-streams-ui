<template>
  <Modal @ok="ok">
    <template #connection-params>
      <ConnectionParams v-if="currentConnection" :connectionType="currentConnection.type" />
    </template>
  </Modal>
</template>

<script>
import { computed } from 'vue'
import Modal from './Modal.vue'
import ConnectionParams from './params/ConnectionParams.vue'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'

export default {
  components: {
    Modal,
    ConnectionParams
  },
  setup() {
    const connectionsStore = useConnectionsStore()
    const commonStore = useCommonStore()
    const currentConnection = computed(() => connectionsStore.currentConnection)

    const ok = async () => {
      try {
        await connectionsStore.updateConnection()
        commonStore.showNotification('Connection updated', 'success')
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
