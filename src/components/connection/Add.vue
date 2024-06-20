<template>
  <Modal @ok="ok">
    <template #dbtypes-combo>
      <DBTypesListBox @update:selected-db-type="selectDB" />
    </template>
    <template #connection-params>
      <ConnectionParams v-if="connection" :connectionType="connection.type" />
    </template>
  </Modal>
</template>

<script>
import api from '@/api/connections.js'
import Modal from './Modal.vue'
import ConnectionParams from './params/ConnectionParams.vue'
import DBTypesListBox from './DBTypesListBox.vue'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import { mapActions, mapState } from 'pinia'

export default {
  components: {
    Modal,
    ConnectionParams,
    DBTypesListBox
  },
  data: () => ({
    connection: null,
    showDBCombo: false
  }),
  computed: {
    ...mapState(useConnectionsStore, ['currentConnection'])
  },
  methods: {
    ...mapActions(useConnectionsStore, { save: 'saveConnection', refresh: 'refreshConnections' }),
    selectDB(conn) {
      this.connection = conn
    },
    // create new connection
    async ok() {
      useCommonStore().showNotificationBar = false
      try {
        const json = JSON.stringify(this.currentConnection)
        const connection = await api.createConnection(json)
        //test connection is performed on backend
        // get the list of databases and schemas
        const databases = await api.getDatabases(connection.id)
        this.currentConnection.databases = databases

        if (this.currentConnection.type.toLowerCase() === 'postgresql') {
          const schemas = await api.getSchemas(connection.id)
          this.currentConnection.schemas = schemas
        }

        this.currentConnection.id = connection.id
        this.currentConnection.created = connection.created

        await this.save()
        await this.refresh()
      } catch (err) {

        useCommonStore().showNotification(err.message);
      }
    }
  }
}
</script>
