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
import { useSettingsStore } from '@/stores/settings'
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
    async ok() {
      try {
        await this.save()
        await this.refresh()
        const json = JSON.stringify(this.currentConnection)
        await api.createConnection(json)
      } catch (error) {
        useSettingsStore().showNotificationBar = false;
        useSettingsStore().notificationBar = {
          msg: "Error: " + error.message,
          type: "error",
        };
        useSettingsStore().showNotificationBar = true;
      }
    }
  }
}
</script>
