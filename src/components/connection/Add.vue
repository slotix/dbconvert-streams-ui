<template>
  <Modal @ok="ok">
    <template #dbtypes-combo>
      <ConnectionStringInput @update:connection-params="updateConnectionParams" />
      <DBTypesListBox 
        v-model="connection"
        @update:selected-db-type="selectDB" 
      />
    </template>
    <template #connection-params>
      <ConnectionParams v-if="connection?.type" :connectionType="connection.type" />
    </template>
  </Modal>
</template>

<script>
import { ref, computed } from 'vue'
import api from '@/api/connections'
import Modal from './Modal.vue'
import ConnectionParams from './params/ConnectionParams.vue'
import DBTypesListBox from './DBTypesListBox.vue'
import ConnectionStringInput from './ConnectionStringInput.vue'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'

export default {
  components: {
    Modal,
    ConnectionParams,
    DBTypesListBox,
    ConnectionStringInput
  },
  setup() {
    const connectionsStore = useConnectionsStore()
    const commonStore = useCommonStore()

    const connectionDBType = ref(null)
    const showDBCombo = ref(false)
    const currentConnection = computed(() => connectionsStore.currentConnection)

    const selectDBType = (dbType) => {
      connectionDBType.value = dbType
    }

    const updateConnectionParams = (params) => {
      const dbType = connectionsStore.dbTypes.find(dbType => dbType.type === params.type)
      if (dbType) {
        selectDBType(dbType)
        connectionsStore.updateConnectionParams(params)
      }
    }

    const ok = async () => {
      try {
        currentConnection.value.type = connectionDBType.value.type
        const json = JSON.stringify(currentConnection.value)
        const connectionResponse = await api.createConnection(json)
        const databases = await api.getDatabases(connectionResponse.id)
        currentConnection.value.databases = databases

        if (currentConnection.value.type.toLowerCase() === 'postgresql') {
          const schemas = await api.getSchemas(connectionResponse.id)
          currentConnection.value.schemas = schemas
        }

        currentConnection.value.id = connectionResponse.id
        currentConnection.value.created = connectionResponse.created
        // test connection is performed on backend before saving
        await connectionsStore.saveConnection()
        await connectionsStore.refreshConnections()
        commonStore.showNotification('Connection added', 'success')
      } catch (err) {
        commonStore.showNotification(err.message)
      }
    }

    return {
      connection: connectionDBType,
      showDBCombo,
      currentConnection,
      selectDB: selectDBType,
      updateConnectionParams,
      ok
    }
  }
}
</script>
