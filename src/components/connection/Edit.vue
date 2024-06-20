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
import { useCommonStore } from '@/stores/common'
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

    // update connection
    async ok() {
      useCommonStore().showNotificationBar = false
      try {
        const json = JSON.stringify(this.currentConnection)
        await api.updateConnection(json)

        //test connection is performed on backend
        // get the list of databases and schemas
        const databases = await api.getDatabases(this.currentConnection.id)
        this.currentConnection.databases = databases

        if (this.currentConnection.type.toLowerCase() === 'postgresql') {
          const schemas = await api.getSchemas(this.currentConnection.id)
          this.currentConnection.schemas = schemas
        }

        await this.save()
        await this.refresh()
      } catch (err) {
        useCommonStore().showNotification(err.message);
      }
    }
  }
}
</script>
