<template>
  <Modal @ok="ok">
    <template #dbtypes-combo>
      <ConnectionStringInput @update:connection-params="updateConnectionParams" />
      <DBTypesListBox v-model="connection" @update:selected-db-type="selectDB" />
    </template>
    <template #connection-params>
      <ConnectionParams v-if="connection?.type" :connectionType="connection.type" />
    </template>
  </Modal>
</template>

<script>
import { ref, computed } from 'vue'
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
      if (dbType)
      {
        selectDBType(dbType)
        connectionsStore.updateConnectionParams(params)
      }
    }

    const ok = async () => {
      try
      {
        // if currentConnection has no id, it's a new connection
        if (!currentConnection.value.id)
        {
          currentConnection.value.type = connectionDBType.value.type
          await connectionsStore.createConnection()
          commonStore.showNotification('Connection added', 'success')
        } else
        {
          await connectionsStore.updateConnection()
          commonStore.showNotification('Connection updated', 'success')
        }
        await connectionsStore.refreshConnections()
      } catch (err)
      {
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
