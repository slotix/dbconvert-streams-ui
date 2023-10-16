<template>
  <Modal @ok="ok">
    <template #connection-params>
      <ConnectionParams v-if="currentConnection" :connectionType="currentConnection.type" />
    </template>
  </Modal>
</template>

<script>
import api from '@/api/connections.js'
import Modal from './Modal.vue'
import ConnectionParams from './params/ConnectionParams.vue'
import { useConnectionsStore } from '@/stores/connections.js'
import { useSettingsStore } from '@/stores/settings'
import { mapActions, mapState } from 'pinia'

export default {
  components: {
    Modal,
    ConnectionParams
  },
  computed: {
    ...mapState(useConnectionsStore, ['currentConnection'])
  },
  methods: {
    ...mapActions(useConnectionsStore, { save: 'saveConnection', refresh: 'refreshConnections' }),
    async ok() {
      useSettingsStore().showNotificationBar = false
      try {
        const json = JSON.stringify(this.currentConnection)
        const connection = await api.updateConnection(this.currentConnection.id, json)
        await this.save()
        await this.refresh()
      } catch (error) {
        useSettingsStore().notificationBar = {
          msg: 'Error: ' + error.message,
          type: 'error'
        }
        useSettingsStore().showNotificationBar = true
      }
    }
  }
}
</script>
